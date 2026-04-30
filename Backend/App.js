import express from "express";
import cors from "cors";
import https from "https";
import axios from "axios";
import dotenv from "dotenv";
import session from "express-session";

import { getLDAPUserDetails } from "./API/login.js";
import { initADFS, getADFSClient, generateAuthState, generateCodeChallenge} from "./Auth/adfs.js";
import * as oidc from "openid-client";
import { syncAuthenticatedUser, getLDAPConfig, updateLDAPConfig, getUsersFromLDAP} from "./Database/Queries/LDAP.js";
import {encrypt, decrypt } from "./Utils/Crypto.js";
import multer from "multer";
import { updateQuickAccessLink, getQuickAccessLinks, getQuickAccessImage, createQuickAccessLink, deleteQuickAccessLink } from "./Database/Queries/LANDING_QUICK_ACCESS.js";
import {
  getFAQs,
  createFAQ,
  updateFAQ,
  deleteFAQ,
  createFAQCategory,
  updateFAQCategory,
  deleteFAQCategory,
  createFAQStep,
  updateFAQStep,
  deleteFAQStep,
  createFAQStepImage,
  updateFAQStepImage,
  deleteFAQStepImage,
  getFAQStepImage
} from "./Database/Queries/FAQ.js";

import {
  getInventorySummary,
  getInventoryTree,
  getInventoryCategories,
  createInventoryCategory,
  updateInventoryCategory,
  deleteInventoryCategory,
  getInventorySubcategories,
  createInventorySubcategory,
  updateInventorySubcategory,
  deleteInventorySubcategory,
  getInventoryAssets,
  createInventoryAsset,
  updateInventoryAsset,
  deleteInventoryAsset,
  decommissionInventoryAsset,
  searchInventoryUsers,
  assignInventoryAsset,
  returnInventoryAsset
} from "./Database/Queries/Inventory.js";
import { syncAllLDAPUsers } from "./API/ldapSync.js";
import {
  createServiceStatusReport,
  getLatestServiceStatus
} from "./Database/Queries/ServiceStatus.js";


dotenv.config();

const app = express();
app.set("trust proxy", 1);
export default app;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.use(session({
  name: "sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 2
  }
}));


app.get("/auth/login", async (req, res, next) => {
  try {
    const config = await getADFSClient();

    if (req.session.user) {
      return res.redirect(process.env.FRONTEND_URL);
    }

    const { state, nonce, codeVerifier } = generateAuthState();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    req.session.oidcState = state;
    req.session.oidcNonce = nonce;
    req.session.codeVerifier = codeVerifier;
    req.session.authInProgress = true;

    const parameters = {
      redirect_uri: process.env.ADFS_REDIRECT_URI,
      scope: "openid profile email",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
      state,
      nonce
    };

    const authorizationUrl = oidc.buildAuthorizationUrl(config, parameters);

    return res.redirect(authorizationUrl.href);
  } catch (err) {
    next(err);
  }
});

app.get("/auth/callback", async (req, res, next) => {
  try {
    if (req.session.user) {
      return res.redirect(process.env.FRONTEND_URL);
    }

    if (!req.session.authInProgress) {
      return res.redirect(process.env.FRONTEND_URL);
    }

    const config = await getADFSClient();

    const expectedState = req.session.oidcState;
    const expectedNonce = req.session.oidcNonce;
    const codeVerifier = req.session.codeVerifier;

    if (!expectedState || !expectedNonce || !codeVerifier) {
      throw new Error("OIDC session values missing");
    }

    const currentUrl = new URL(
      `${req.protocol}://${req.get("host")}${req.originalUrl}`
    );

    const tokenSet = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedState,
      expectedNonce,
      idTokenExpected: true
    });

    delete req.session.oidcState;
    delete req.session.oidcNonce;
    delete req.session.codeVerifier;
    delete req.session.authInProgress;

    req.session.idToken = tokenSet.id_token;

    const claims = tokenSet.claims();
    console.log("ADFS claims:", claims);

    let username =
      claims.upn ||
      claims.unique_name ||
      claims.email;

    if (!username) {
      throw new Error("No username claim returned by ADFS");
    }

    if (username.includes("\\")) {
      username = username.split("\\").pop();
    }

    if (username.includes("@")) {
      username = username.split("@")[0];
    }

    const ldapUser = await getLDAPUserDetails(username);

    const user = {
      username: ldapUser.username,
      displayName: ldapUser.displayName,
      email: ldapUser.email,
      groups: ldapUser.groups,
      dn: ldapUser.dn,
      givenName: ldapUser.givenName,
      sn: ldapUser.sn,
      employeeID: ldapUser.employeeID,
      department: ldapUser.department,
      manager: ldapUser.manager,
      title: ldapUser.title
    };

    console.log("Final user being synced:", {
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      userRoles: user.groups
    });

    await syncAuthenticatedUser({
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      userRoles: user.groups,
      distinguishedName: user.dn,
      givenName: user.givenName,
      surname: user.sn,
      employeeID: user.employeeID,
      department: user.department,
      managerDN: user.manager,
      title: user.title,
      changedBy: user.username
    });

    req.session.user = user;

    return res.redirect(process.env.FRONTEND_URL);
  } catch (err) {
    delete req.session.oidcState;
    delete req.session.oidcNonce;
    delete req.session.codeVerifier;
    delete req.session.authInProgress;
    next(err);
  }
});

app.get("/api/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  res.json(req.session.user);
});
////////////////////////////////////////////////////////////////////////////////
app.get("/api/settings", async (req, res) => {
  try {
    const config = await getLDAPConfig();
    const decryptedBindPassword = decrypt(config.LDAP_BIND_PASSWORD);
    if (!config) {
      return res.status(404).json({ error: "No settings found" });
    }

    res.json({
      LDAP_URL: config.LDAP_URL,
      LDAP_BASE_DN: config.LDAP_BASE_DN,
      LDAP_USER_SYNC_BASE_DN: config.LDAP_USER_SYNC_BASE_DN,
      LDAP_BIND_DN: config.LDAP_BIND_DN,
      SITE_USER_ROLE: config.SITE_USER_ROLE,
      SITE_ADMIN_ROLE: config.SITE_ADMIN_ROLE,
      LDAP_DOMAIN: config.LDAP_DOMAIN,
      LDAP_BIND_PASSWORD: decryptedBindPassword
    });
  } catch (err) {
    console.error("Failed to load settings:", err);
    res.status(500).json({ error: err.message });
  }
});
app.put("/api/settings", async (req, res) => {
  try {
    const {
      LDAP_URL,
      LDAP_BASE_DN,
      LDAP_USER_SYNC_BASE_DN,
      LDAP_BIND_DN,
      LDAP_BIND_PASSWORD,
      SITE_USER_ROLE,
      SITE_ADMIN_ROLE,
      LDAP_DOMAIN,
      UPDATED_BY
    } = req.body;



    if (
      !LDAP_URL ||
      !LDAP_BASE_DN ||
      !LDAP_BIND_DN ||
      !SITE_USER_ROLE ||
      !SITE_ADMIN_ROLE ||
      !LDAP_DOMAIN
    ) {
      return res.status(400).json({
        error: "All fields except password are required"
      });
    }

    let encryptedPassword;

    // ONLY encrypt if provided
    if (LDAP_BIND_PASSWORD) {
      encryptedPassword = encrypt(LDAP_BIND_PASSWORD);
    }


    await updateLDAPConfig({
      LDAP_URL,
      LDAP_BASE_DN,
      LDAP_USER_SYNC_BASE_DN,
      LDAP_BIND_DN,
      LDAP_BIND_PASSWORD: encryptedPassword,
      SITE_USER_ROLE,
      SITE_ADMIN_ROLE,
      LDAP_DOMAIN,
      UPDATED_BY
    });


    res.json({ message: "Settings updated" });

  } catch (err) {
    console.error("Failed to update settings:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/settings/ldap-users", async (req, res) => {
  try {
    await poolConnect;

    const result = await pool.request().query(`
      SELECT
        Id,
        AD_USERNAME,
        DISPLAY_NAME,
        EMAIL,
        USER_ROLES,
        CREATED_AT,
        LAST_LOGIN,
        UPDATED_AT,
        DISTINGUISHED_NAME,
        GIVEN_NAME,
        SURNAME,
        EMPLOYEE_ID,
        DEPARTMENT,
        MANAGER_DN,
        TITLE,
        IS_ENABLED,
        LAST_AD_SYNC
      FROM dbo.Users_From_LDAP
      ORDER BY IS_ENABLED DESC, DISPLAY_NAME ASC, AD_USERNAME ASC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Load LDAP users failed:", err);
    res.status(500).json({
      message: "Failed to load LDAP users.",
      error: err.message
    });
  }
});

app.get("/api/settings/ldap-users/:id", async (req, res) => {
  try {
    await poolConnect;

    const userResult = await pool.request()
      .input("id", sql.Int, Number(req.params.id))
      .query(`
        SELECT TOP 1
          Id,
          AD_USERNAME,
          DISPLAY_NAME,
          EMAIL,
          USER_ROLES,
          CREATED_AT,
          LAST_LOGIN,
          UPDATED_AT,
          DISTINGUISHED_NAME,
          GIVEN_NAME,
          SURNAME,
          EMPLOYEE_ID,
          DEPARTMENT,
          MANAGER_DN,
          TITLE,
          IS_ENABLED,
          LAST_AD_SYNC
        FROM dbo.Users_From_LDAP
        WHERE Id = @id
      `);

    const ldapUser = userResult.recordset[0];

    if (!ldapUser) {
      return res.status(404).json({
        message: "LDAP user not found."
      });
    }

    const activeAssignmentsResult = await pool.request()
      .input("id", sql.Int, Number(req.params.id))
      .query(`
        SELECT
          ia.Id,
          ia.ASSET_ID,
          ia.USER_ID,
          ia.ASSIGNED_AT,
          ia.ASSIGNED_BY,
          ia.RETURNED_AT,
          ia.RETURNED_BY,
          ia.NOTES,
          a.ASSET_TAG,
          a.DEVICE_NAME,
          a.SERIAL_NUMBER,
          a.MANUFACTURER,
          a.MODEL,
          a.LICENSE_KEY,
          a.VENDOR,
          a.STATUS,
          a.LOCATION
        FROM dbo.Inventory_Assignments ia
        INNER JOIN dbo.Inventory_Assets a
          ON a.Id = ia.ASSET_ID
        WHERE ia.USER_ID = @id
          AND ia.RETURNED_AT IS NULL
        ORDER BY ia.ASSIGNED_AT DESC
      `);

    const assignmentHistoryResult = await pool.request()
      .input("id", sql.Int, Number(req.params.id))
      .query(`
        SELECT
          ia.Id,
          ia.ASSET_ID,
          ia.USER_ID,
          ia.ASSIGNED_AT,
          ia.ASSIGNED_BY,
          ia.RETURNED_AT,
          ia.RETURNED_BY,
          ia.NOTES,
          a.ASSET_TAG,
          a.DEVICE_NAME,
          a.SERIAL_NUMBER,
          a.MANUFACTURER,
          a.MODEL,
          a.LICENSE_KEY,
          a.VENDOR,
          a.STATUS,
          a.LOCATION
        FROM dbo.Inventory_Assignments ia
        INNER JOIN dbo.Inventory_Assets a
          ON a.Id = ia.ASSET_ID
        WHERE ia.USER_ID = @id
        ORDER BY ia.ASSIGNED_AT DESC
      `);

    res.json({
      user: ldapUser,
      activeAssignments: activeAssignmentsResult.recordset,
      assignmentHistory: assignmentHistoryResult.recordset
    });
  } catch (err) {
    console.error("Load LDAP user details failed:", err);
    res.status(500).json({
      message: "Failed to load LDAP user details.",
      error: err.message
    });
  }
});

app.post("/api/settings/sync-ldap-users", async (req, res) => {
  try {
    const changedBy =
      req.session?.user?.username ||
      req.body?.changedBy ||
      "SYSTEM";

    const result = await syncAllLDAPUsers({
      changedBy
    });

    res.json({
      message: "LDAP user sync completed.",
      result
    });
  } catch (err) {
    console.error("LDAP user sync failed:", err);
    res.status(500).json({
      message: "LDAP user sync failed.",
      error: err.message
    });
  }
});
////////////////////////////////////////////////////////////////////////
app.post("/api/logout", (req, res) => {
  const idToken = req.session.idToken;

  req.session.destroy(() => {
    res.clearCookie("sid");

    let logoutUrl =
      `${process.env.ADFS_ISSUER}/oauth2/logout` +
      `?post_logout_redirect_uri=${encodeURIComponent(process.env.ADFS_POST_LOGOUT_REDIRECT_URI)}`;

    if (idToken) {
      logoutUrl += `&id_token_hint=${encodeURIComponent(idToken)}`;
    }

    res.json({
      message: "Logged out",
      logoutUrl
    });
  });
});

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

let pbxTokenCache = null;
let pbxTokenExpiresAt = 0;

async function getToken() {
  if (pbxTokenCache && Date.now() < pbxTokenExpiresAt) {
    return pbxTokenCache;
  }

  const res = await axios.post(
    "https://pbx.maets.net:2443/admin/api/api/token",
    new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret
    }).toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      httpsAgent
    }
  );

  console.log("TOKEN RESPONSE:", res.data);

  pbxTokenCache = res.data.access_token;
  pbxTokenExpiresAt = Date.now() + ((res.data.expires_in - 60) * 1000);

  return pbxTokenCache;
}

app.get("/api/pbx/users", async (req, res) => {
  try {
    const token = await getToken();

    const users = await axios.get(
      "https://pbx.maets.net:2443/admin/api/api/rest/userman/users",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json"
        },
        httpsAgent
      }
    );

    res.json(
      Array.isArray(users.data)
        ? users.data
        : Array.isArray(users.data?.data)
          ? users.data.data
          : []
    );
  } catch (err) {
    console.error("BACKEND ERROR STATUS:", err.response?.status);
    console.error("BACKEND ERROR DATA:", err.response?.data);
    console.error("BACKEND ERROR MESSAGE:", err.message);

    res.status(500).json({
      error: "Failed to fetch PBX users",
      status: err.response?.status || null,
      details: err.response?.data || err.message
    });
  }
});

///////////////////////////////////////////////////////////////////////////////
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads allowed"));
    }
    cb(null, true);
  }
});
app.get("/api/landing/quick-access", async (req, res) => {
  try {
    const links = await getQuickAccessLinks();
    res.json(links);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load links" });
  }
});
app.post("/api/landing/quick-access", upload.single("image"), async (req, res) => {
  try {
    const { title, subtitle, url, imageUrl, createdBy, changedBy } = req.body;

    if (!title || !subtitle || !url) {
      return res.status(400).json({
        message: "Title, subtitle, and URL are required"
      });
    }

    const auditUser = createdBy || changedBy || "SYSTEM";

    await createQuickAccessLink({
      title: title.trim(),
      subtitle: subtitle.trim(),
      url: url.trim(),
      imageUrl: imageUrl?.trim() || null,
      file: req.file,
      createdBy: auditUser
    });

    res.status(201).json({ message: "Created" });
  } catch (err) {
    console.error("Quick access create failed:", err);
    res.status(500).json({ message: "Create failed", error: err.message });
  }
});
app.get("/api/landing/quick-access/:id/image", async (req, res) => {
  try {
    const image = await getQuickAccessImage(req.params.id);

    console.log("IMAGE RESULT:", image);

    const imageData = image?.IMAGE_DATA || image?.imageData || image?.image_data;
    const mimeType =
      image?.IMAGE_MIME_TYPE ||
      image?.imageMimeType ||
      image?.image_mime_type ||
      "image/png";

    if (!imageData) {
      return res.status(404).send("No image");
    }

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.end(imageData);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to load image");
  }
});
app.delete("/api/landing/quick-access/:id", async (req, res) => {
  try {
    const { changedBy } = req.body;
    const auditUser = changedBy || "SYSTEM";

    const rows = await deleteQuickAccessLink(Number(req.params.id), auditUser);

    if (!rows) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Quick access delete failed:", err);
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
});
app.put("/api/landing/quick-access/:id", upload.single("image"), async (req, res) => {
  try {
    const { title, subtitle, url, imageUrl, changedBy } = req.body;

    if (!title || !subtitle || !url) {
      return res.status(400).json({
        message: "Title, subtitle, and URL are required"
      });
    }

    const result = await updateQuickAccessLink({
      id: Number(req.params.id),
      title: title.trim(),
      subtitle: subtitle.trim(),
      url: url.trim(),
      imageUrl: imageUrl?.trim() || null,
      file: req.file,
      changedBy: changedBy || "SYSTEM"
    });

    res.json({
      message: result?.updated === false ? "No changes detected" : "Updated",
      result
    });
  } catch (err) {
    console.error("Quick access update failed:", err);
    res.status(500).json({ message: "Update failed", error: err.message });
  }
});
////////////////////////////////////////////////////////////////////////////////////
app.get("/api/faq", async (req, res) => {
  try {
    const data = await getFAQs();
    res.json(data);
  } catch (err) {
    console.error("FAQ load failed:", err);
    res.status(500).json({ message: "Failed to load FAQs", error: err.message });
  }
});

/**
 * FAQ QUESTIONS
 */
app.post("/api/faq", async (req, res) => {
  try {
    const { categoryId, question, answer, createdBy } = req.body;

    if (!categoryId || !question?.trim()) {
      return res.status(400).json({
        message: "Category and question are required"
      });
    }

    const created = await createFAQ({
      categoryId: Number(categoryId),
      question: question.trim(),
      answer: answer?.trim() || null,
      createdBy: createdBy || "SYSTEM"
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("FAQ create failed:", err);
    res.status(500).json({ message: "Create failed", error: err.message });
  }
});

app.put("/api/faq/:id", async (req, res) => {
  try {
    const { question, answer, categoryId, changedBy } = req.body;

    if (!categoryId || !question?.trim()) {
      return res.status(400).json({
        message: "Category and question are required"
      });
    }

    const result = await updateFAQ({
      id: Number(req.params.id),
      question: question.trim(),
      answer: answer?.trim() || null,
      categoryId: Number(categoryId),
      changedBy: changedBy || "SYSTEM"
    });

    res.json({ message: "FAQ updated", result });
  } catch (err) {
    console.error("FAQ update failed:", err);
    res.status(500).json({ message: "Update failed", error: err.message });
  }
});

app.delete("/api/faq/:id", async (req, res) => {
  try {
    const { changedBy } = req.body;

    const rows = await deleteFAQ(
      Number(req.params.id),
      changedBy || "SYSTEM"
    );

    if (!rows) {
      return res.status(404).json({ message: "FAQ not found" });
    }

    res.json({ message: "FAQ deleted" });
  } catch (err) {
    console.error("FAQ delete failed:", err);
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
});

/**
 * FAQ CATEGORIES
 */
app.post("/api/faq/categories", async (req, res) => {
  try {
    const { name, description, changedBy } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        message: "Category name is required"
      });
    }

    const created = await createFAQCategory({
      name: name.trim(),
      description: description?.trim() || null,
      changedBy: changedBy || "SYSTEM"
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("FAQ category create failed:", err);
    res.status(500).json({
      message: "Category create failed",
      error: err.message
    });
  }
});

app.put("/api/faq/categories/:id", async (req, res) => {
  try {
    const { name, description, sortOrder, changedBy } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        message: "Category name is required"
      });
    }

    const result = await updateFAQCategory({
      id: Number(req.params.id),
      name: name.trim(),
      description: description?.trim() || null,
      sortOrder: Number(sortOrder || 0),
      changedBy: changedBy || "SYSTEM"
    });

    res.json({ message: "Category updated", result });
  } catch (err) {
    console.error("FAQ category update failed:", err);
    res.status(500).json({
      message: "Category update failed",
      error: err.message
    });
  }
});

app.delete("/api/faq/categories/:id", async (req, res) => {
  try {
    const { changedBy } = req.body;

    const rows = await deleteFAQCategory(
      Number(req.params.id),
      changedBy || "SYSTEM"
    );

    if (!rows) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({ message: "Category deleted" });
  } catch (err) {
    console.error("FAQ category delete failed:", err);
    res.status(500).json({
      message: "Category delete failed",
      error: err.message
    });
  }
});

/**
 * FAQ STEPS
 */
app.post("/api/faq/:faqId/steps", async (req, res) => {
  try {
    const { stepNumber, stepTitle, stepBody, changedBy } = req.body;

    if (!stepNumber || !stepBody?.trim()) {
      return res.status(400).json({
        message: "Step number and step body are required"
      });
    }

    const created = await createFAQStep({
      faqId: Number(req.params.faqId),
      stepNumber: Number(stepNumber),
      stepTitle: stepTitle?.trim() || null,
      stepBody: stepBody.trim(),
      changedBy: changedBy || "SYSTEM"
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("FAQ step create failed:", err);
    res.status(500).json({
      message: "Step create failed",
      error: err.message
    });
  }
});

app.put("/api/faq/steps/:stepId", async (req, res) => {
  try {
    const { stepNumber, stepTitle, stepBody, changedBy } = req.body;

    if (!stepNumber || !stepBody?.trim()) {
      return res.status(400).json({
        message: "Step number and step body are required"
      });
    }

    const result = await updateFAQStep({
      id: Number(req.params.stepId),
      stepNumber: Number(stepNumber),
      stepTitle: stepTitle?.trim() || null,
      stepBody: stepBody.trim(),
      changedBy: changedBy || "SYSTEM"
    });

    res.json({ message: "Step updated", result });
  } catch (err) {
    console.error("FAQ step update failed:", err);
    res.status(500).json({
      message: "Step update failed",
      error: err.message
    });
  }
});

app.delete("/api/faq/steps/:stepId", async (req, res) => {
  try {
    const { changedBy } = req.body;

    const rows = await deleteFAQStep(
      Number(req.params.stepId),
      changedBy || "SYSTEM"
    );

    if (!rows) {
      return res.status(404).json({ message: "Step not found" });
    }

    res.json({ message: "Step deleted" });
  } catch (err) {
    console.error("FAQ step delete failed:", err);
    res.status(500).json({
      message: "Step delete failed",
      error: err.message
    });
  }
});

/**
 * FAQ STEP IMAGES
 */
app.post("/api/faq/steps/:stepId/images", upload.single("image"), async (req, res) => {
  try {
    const { imageUrl, caption, uploadedBy } = req.body;

    if (!imageUrl && !req.file) {
      return res.status(400).json({
        message: "Either image URL or uploaded image file is required"
      });
    }

    const created = await createFAQStepImage({
      stepId: Number(req.params.stepId),
      imageUrl: imageUrl?.trim() || null,
      file: req.file || null,
      caption: caption?.trim() || null,
      uploadedBy: uploadedBy || "SYSTEM"
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("FAQ step image create failed:", err);
    res.status(500).json({
      message: "Image create failed",
      error: err.message
    });
  }
});

app.put("/api/faq/step-images/:imageId", upload.single("image"), async (req, res) => {
  try {
    const { imageUrl, caption, changedBy } = req.body;

    const result = await updateFAQStepImage({
      id: Number(req.params.imageId),
      imageUrl: imageUrl?.trim() || null,
      file: req.file || null,
      caption: caption?.trim() || null,
      changedBy: changedBy || "SYSTEM"
    });

    res.json({ message: "Image updated", result });
  } catch (err) {
    console.error("FAQ step image update failed:", err);
    res.status(500).json({
      message: "Image update failed",
      error: err.message
    });
  }
});

app.delete("/api/faq/step-images/:imageId", async (req, res) => {
  try {
    const { changedBy } = req.body;

    const rows = await deleteFAQStepImage(
      Number(req.params.imageId),
      changedBy || "SYSTEM"
    );

    if (!rows) {
      return res.status(404).json({ message: "Image not found" });
    }

    res.json({ message: "Image deleted" });
  } catch (err) {
    console.error("FAQ step image delete failed:", err);
    res.status(500).json({
      message: "Image delete failed",
      error: err.message
    });
  }
});

app.get("/api/faq/step-images/:imageId/image", async (req, res) => {
  try {
    const image = await getFAQStepImage(Number(req.params.imageId));

    if (!image?.IMAGE_DATA) {
      return res.status(404).send("No image found");
    }

    res.setHeader("Content-Type", image.IMAGE_MIME_TYPE || "image/png");
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.end(image.IMAGE_DATA);
  } catch (err) {
    console.error("FAQ image load failed:", err);
    res.status(500).send("Failed to load image");
  }
});

function getChangedBy(req) {
  return req.session?.user?.username || req.body?.changedBy || "SYSTEM";
}

app.get("/api/inventory/summary", async (req, res) => {
  try {
    const summary = await getInventorySummary();
    res.json(summary);
  } catch (err) {
    console.error("Inventory summary failed:", err);
    res.status(500).json({ message: "Failed to load inventory summary", error: err.message });
  }
});

app.get("/api/inventory/tree", async (req, res) => {
  try {
    const tree = await getInventoryTree();
    res.json(tree);
  } catch (err) {
    console.error("Inventory tree failed:", err);
    res.status(500).json({ message: "Failed to load inventory", error: err.message });
  }
});

/* Categories */
app.get("/api/inventory/categories", async (req, res) => {
  try {
    const categories = await getInventoryCategories();
    res.json(categories);
  } catch (err) {
    console.error("Inventory categories failed:", err);
    res.status(500).json({ message: "Failed to load categories", error: err.message });
  }
});

app.post("/api/inventory/categories", async (req, res) => {
  try {
    const { name, description, sortOrder } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        message: "Category name is required."
      });
    }

    const created = await createInventoryCategory({
      name: name.trim(),
      description: description?.trim() || null,
      sortOrder: Number(sortOrder || 0),
      changedBy: getChangedBy(req)
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("Create category failed:", err);
    res.status(500).json({
      message: "Failed to create category",
      error: err.message
    });
  }
});

app.put("/api/inventory/categories/:id", async (req, res) => {
  try {
    const { name, description, sortOrder } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        message: "Category name is required."
      });
    }

    const result = await updateInventoryCategory({
      id: Number(req.params.id),
      name: name.trim(),
      description: description?.trim() || null,
      sortOrder: Number(sortOrder || 0),
      changedBy: getChangedBy(req)
    });

    res.json({
      message: "Category updated",
      result
    });
  } catch (err) {
    console.error("Update category failed:", err);
    res.status(500).json({
      message: "Failed to update category",
      error: err.message
    });
  }
});

app.delete("/api/inventory/categories/:id", async (req, res) => {
  try {
    const rows = await deleteInventoryCategory(Number(req.params.id), getChangedBy(req));

    if (!rows) {
      return res.status(404).json({ message: "Category not found." });
    }

    res.json({ message: "Category deleted" });
  } catch (err) {
    console.error("Delete category failed:", err);
    res.status(500).json({ message: err.message });
  }
});

/* Subcategories */
app.get("/api/inventory/categories/:categoryId/subcategories", async (req, res) => {
  try {
    const subcategories = await getInventorySubcategories(Number(req.params.categoryId));
    res.json(subcategories);
  } catch (err) {
    console.error("Load subcategories failed:", err);
    res.status(500).json({ message: "Failed to load subcategories", error: err.message });
  }
});

app.post("/api/inventory/subcategories", async (req, res) => {
  try {
    const { categoryId, name, description, sortOrder } = req.body;

    if (!categoryId || !name?.trim()) {
      return res.status(400).json({ message: "Category and subcategory name are required." });
    }

    const created = await createInventorySubcategory({
      categoryId: Number(categoryId),
      name: name.trim(),
      description: description?.trim() || null,
      sortOrder: Number(sortOrder || 0),
      changedBy: getChangedBy(req)
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("Create subcategory failed:", err);
    res.status(500).json({ message: "Failed to create subcategory", error: err.message });
  }
});

app.put("/api/inventory/subcategories/:id", async (req, res) => {
  try {
    const { categoryId, name, description, sortOrder } = req.body;

    if (!categoryId || !name?.trim()) {
      return res.status(400).json({ message: "Category and subcategory name are required." });
    }

    const result = await updateInventorySubcategory({
      id: Number(req.params.id),
      categoryId: Number(categoryId),
      name: name.trim(),
      description: description?.trim() || null,
      sortOrder: Number(sortOrder || 0),
      changedBy: getChangedBy(req)
    });

    res.json({ message: "Subcategory updated", result });
  } catch (err) {
    console.error("Update subcategory failed:", err);
    res.status(500).json({ message: "Failed to update subcategory", error: err.message });
  }
});

app.delete("/api/inventory/subcategories/:id", async (req, res) => {
  try {
    const rows = await deleteInventorySubcategory(Number(req.params.id), getChangedBy(req));

    if (!rows) {
      return res.status(404).json({ message: "Subcategory not found." });
    }

    res.json({ message: "Subcategory deleted" });
  } catch (err) {
    console.error("Delete subcategory failed:", err);
    res.status(500).json({ message: err.message });
  }
});

/* Assets */
app.get("/api/inventory/subcategories/:subcategoryId/assets", async (req, res) => {
  try {
    const assets = await getInventoryAssets(Number(req.params.subcategoryId));
    res.json(assets);
  } catch (err) {
    console.error("Load assets failed:", err);
    res.status(500).json({ message: "Failed to load assets", error: err.message });
  }
});

app.post("/api/inventory/assets", async (req, res) => {
  try {
    const { subcategoryId, assetTag } = req.body;

    if (!subcategoryId || !assetTag?.trim()) {
      return res.status(400).json({ message: "Subcategory and asset tag are required." });
    }

    const created = await createInventoryAsset({
      ...req.body,
      subcategoryId: Number(subcategoryId),
      assetTag: assetTag.trim(),
      changedBy: getChangedBy(req)
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("Create asset failed:", err);
    res.status(500).json({ message: "Failed to create asset", error: err.message });
  }
});

app.put("/api/inventory/assets/:id", async (req, res) => {
  try {
    const { subcategoryId, assetTag } = req.body;

    if (!subcategoryId || !assetTag?.trim()) {
      return res.status(400).json({ message: "Subcategory and asset tag are required." });
    }

    const result = await updateInventoryAsset({
      ...req.body,
      id: Number(req.params.id),
      subcategoryId: Number(subcategoryId),
      assetTag: assetTag.trim(),
      changedBy: getChangedBy(req)
    });

    res.json({ message: "Asset updated", result });
  } catch (err) {
    console.error("Update asset failed:", err);
    res.status(500).json({ message: "Failed to update asset", error: err.message });
  }
});

app.delete("/api/inventory/assets/:id", async (req, res) => {
  try {
    const rows = await deleteInventoryAsset(Number(req.params.id), getChangedBy(req));

    if (!rows) {
      return res.status(404).json({ message: "Asset not found." });
    }

    res.json({ message: "Asset deleted" });
  } catch (err) {
    console.error("Delete asset failed:", err);
    res.status(500).json({ message: err.message });
  }
});

app.put("/api/inventory/assets/:id/decommission", async (req, res) => {
  try {
    const { reason } = req.body;

    const result = await decommissionInventoryAsset({
      id: Number(req.params.id),
      decommissionedBy: getChangedBy(req),
      decommissionReason: reason?.trim() || null
    });

    res.json({ message: "Asset decommissioned", result });
  } catch (err) {
    console.error("Decommission asset failed:", err);
    res.status(500).json({ message: "Failed to decommission asset", error: err.message });
  }
});

/* Users / assignments */
app.get("/api/inventory/users/search", async (req, res) => {
  try {
    const users = await searchInventoryUsers(req.query.q || "");
    res.json(users);
  } catch (err) {
    console.error("Search users failed:", err);
    res.status(500).json({ message: "Failed to search users", error: err.message });
  }
});

app.post("/api/inventory/assets/:id/assign", async (req, res) => {
  try {
    const { userId, notes } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User is required." });
    }

    const assignment = await assignInventoryAsset({
      assetId: Number(req.params.id),
      userId: Number(userId),
      assignedBy: getChangedBy(req),
      notes: notes?.trim() || null
    });

    res.status(201).json(assignment);
  } catch (err) {
    console.error("Assign asset failed:", err);
    res.status(500).json({ message: err.message });
  }
});

app.put("/api/inventory/assets/:id/return", async (req, res) => {
  try {
    const { notes } = req.body;

    const returned = await returnInventoryAsset({
      assetId: Number(req.params.id),
      returnedBy: getChangedBy(req),
      notes: notes?.trim() || null
    });

    res.json({ message: "Asset returned", returned });
  } catch (err) {
    console.error("Return asset failed:", err);
    res.status(500).json({ message: "Failed to return asset", error: err.message });
  }
});
/////////////////////////////////////////////////////////////////////////////////////////
app.post("/api/service-status/report", async (req, res) => {
  try {
    const apiKey = req.headers["x-status-api-key"];

    if (!apiKey || apiKey !== process.env.SERVICE_STATUS_API_KEY) {
      return res.status(401).json({
        message: "Unauthorized status report."
      });
    }

    const {
      serverName,
      category,
      overallStatus,
      message,
      checks
    } = req.body;

    if (!serverName || !category || !overallStatus || !Array.isArray(checks)) {
      return res.status(400).json({
        message: "serverName, category, overallStatus, and checks are required."
      });
    }

    const report = await createServiceStatusReport({
      serverName,
      category,
      overallStatus,
      message,
      checks
    });

    res.status(201).json({
      message: "Service status report received.",
      reportId: report.Id
    });
  } catch (err) {
    console.error("Service status report failed:", err);
    res.status(500).json({
      message: "Failed to save service status report.",
      error: err.message
    });
  }
});

app.get("/api/service-status", async (req, res) => {
  try {
    const status = await getLatestServiceStatus();
    res.json(status);
  } catch (err) {
    console.error("Load service status failed:", err);
    res.status(500).json({
      message: "Failed to load service status.",
      error: err.message
    });
  }
});



app.use((err, req, res, next) => {
  switch (err.code) {
    case "22P02":
      return res.status(400).send(err.message);
    case "23505":
    case "23503":
      return res.status(400).send(err.detail);
    default:
      return next(err);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Something went wrong.");
});