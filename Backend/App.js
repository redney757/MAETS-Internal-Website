import express from "express"
import cors from 'cors'
const app = express()
import https from 'https'
import axios from 'axios'
import dotenv from "dotenv"
import { authenticateLDAP } from "./API/login.js"
import session from "express-session"
dotenv.config()
export default app;

app.use(express.json());
app.use(express.urlencoded({extended: true}));
const allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"]

app.use(cors({
   origin: function (origin, callback) {
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
app.post("/api/login", async (req, res) => {
    const {username, password} = req.body;

    try {
        const user = await authenticateLDAP(username, password);
        req.session.user = user;
        res.json({
            message: "Authentication successful",
            user
        });
    } catch(err) {
         console.error("LOGIN ERROR:", err);

        res.status(401).json({
        message: "Authentication failed",
        error: err.message
        })
    }
})
app.get("/api/me", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({message: "Not authenticated"});
    }
    res.json(req.session.user);
})
app.post("/api/logout", (req, res) => {
    req.session.destroy(()=> {
        res.clearCookie("sid");
        res.json({message: "Logged out"});
    })
})

//-----------------------------------------------------------------------------------------

const clientId = "3cc352de81816f9f4cd9f111c51ca35df600a2328133834e642fa0772ff8d8e6";
const clientSecret = "ea477a46a789c7170c64651a1695b9aa";

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

async function getToken() {
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
  return res.data.access_token;
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