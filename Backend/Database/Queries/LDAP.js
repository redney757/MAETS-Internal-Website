import { pool, sql, poolConnect } from "../Client.js";

async function getUsersFromLDAP() {
  await poolConnect;

  const result = await pool.request().query(`
      SELECT *
      FROM dbo.Users_From_LDAP
      WHERE IS_ENABLED = 1
      ORDER BY DISPLAY_NAME
    `)
    return result.recordset || [];
};


async function getLDAPConfig() {
  await poolConnect;

  const result = await pool.request().query(`
    SELECT TOP 1 *
    FROM dbo.Active_Directory_Settings
  `);

  return result.recordset[0];
}

async function writeAudit({
  auditType = "AUTH",
  tableName,
  recordId,
  associatedValue = null,
  fieldName,
  oldValue = null,
  newValue = null,
  actionType,
  changedBy = "SYSTEM"
}) {
  await poolConnect;

  await pool.request()
    .input("auditType", sql.NVarChar(50), auditType)
    .input("tableName", sql.NVarChar(128), tableName)
    .input("recordId", sql.NVarChar(50), recordId ? String(recordId) : null)
    .input("associatedValue", sql.NVarChar(200), associatedValue)
    .input("fieldName", sql.NVarChar(128), fieldName)
    .input("oldValue", sql.NVarChar(sql.MAX), oldValue)
    .input("newValue", sql.NVarChar(sql.MAX), newValue)
    .input("actionType", sql.NVarChar(100), actionType)
    .input("changedBy", sql.NVarChar(100), changedBy)
    .query(`
      INSERT INTO dbo.Application_Audit
      (
        AUDIT_TYPE,
        TABLE_NAME,
        RECORD_ID,
        VALUE_OF_ASSOCIATED_RECORD_ID,
        FIELD_NAME,
        OLD_VALUE,
        NEW_VALUE,
        ACTION_TYPE,
        CHANGED_BY
      )
      VALUES
      (
        @auditType,
        @tableName,
        @recordId,
        @associatedValue,
        @fieldName,
        @oldValue,
        @newValue,
        @actionType,
        @changedBy
      )
    `);
}

export async function updateLDAPConfig({
  LDAP_URL,
  LDAP_DOMAIN,
  LDAP_BASE_DN,
  LDAP_BIND_DN,
  LDAP_BIND_PASSWORD,
  SITE_USER_ROLE,
  SITE_ADMIN_ROLE,
  LDAP_USER_SYNC_BASE_DN,
  UPDATED_BY
}) {
  await poolConnect;

  const updatedBy = UPDATED_BY || "SYSTEM";

  const existingResult = await pool.request()
    .input("Id", sql.Int, 1)
    .query(`
      SELECT TOP 1 *
      FROM dbo.Active_Directory_Settings
      WHERE Id = @Id
    `);

  const existing = existingResult.recordset[0];

  if (!existing) {
    throw new Error("Active Directory settings row not found.");
  }

  const changes = [];

  function addChange(fieldName, oldValue, newValue) {
    const oldText = oldValue ?? "";
    const newText = newValue ?? "";

    if (oldText !== newText) {
      changes.push({
        fieldName,
        oldValue: oldText,
        newValue: newText
      });
    }
  }

  addChange("LDAP_URL", existing.LDAP_URL, LDAP_URL);
  addChange("LDAP_DOMAIN", existing.LDAP_DOMAIN, LDAP_DOMAIN);
  addChange("LDAP_BASE_DN", existing.LDAP_BASE_DN, LDAP_BASE_DN);
  addChange("LDAP_BIND_DN", existing.LDAP_BIND_DN, LDAP_BIND_DN);
  addChange("SITE_USER_ROLE", existing.SITE_USER_ROLE, SITE_USER_ROLE);
  addChange("SITE_ADMIN_ROLE", existing.SITE_ADMIN_ROLE, SITE_ADMIN_ROLE);
  addChange("LDAP_USER_SYNC_BASE_DN", existing.LDAP_USER_SYNC_BASE_DN, LDAP_USER_SYNC_BASE_DN);

  if (LDAP_BIND_PASSWORD) {
    changes.push({
      fieldName: "LDAP_BIND_PASSWORD",
      oldValue: "[PASSWORD CHANGED]",
      newValue: "[PASSWORD CHANGED]"
    });
  }

  if (changes.length === 0) {
    return {
      updated: false,
      changedFields: []
    };
  }

  await pool.request()
    .input("LDAP_URL", sql.NVarChar(500), LDAP_URL)
    .input("LDAP_DOMAIN", sql.NVarChar(500), LDAP_DOMAIN)
    .input("LDAP_BASE_DN", sql.NVarChar(500), LDAP_BASE_DN)
    .input("LDAP_BIND_DN", sql.NVarChar(500), LDAP_BIND_DN)
    .input("LDAP_BIND_PASSWORD", sql.NVarChar(500), LDAP_BIND_PASSWORD || null)
    .input("SITE_USER_ROLE", sql.NVarChar(100), SITE_USER_ROLE)
    .input("SITE_ADMIN_ROLE", sql.NVarChar(100), SITE_ADMIN_ROLE)
    .input("LDAP_USER_SYNC_BASE_DN", sql.NVarChar(500), LDAP_USER_SYNC_BASE_DN)
    .input("UPDATED_BY", sql.NVarChar(100), updatedBy)
    .query(`
      UPDATE dbo.Active_Directory_Settings
      SET
        LDAP_URL = @LDAP_URL,
        LDAP_DOMAIN = @LDAP_DOMAIN,
        LDAP_BASE_DN = @LDAP_BASE_DN,
        LDAP_BIND_DN = @LDAP_BIND_DN,
        LDAP_BIND_PASSWORD = ISNULL(@LDAP_BIND_PASSWORD, LDAP_BIND_PASSWORD),
        SITE_USER_ROLE = @SITE_USER_ROLE,
        SITE_ADMIN_ROLE = @SITE_ADMIN_ROLE,
        LDAP_USER_SYNC_BASE_DN = @LDAP_USER_SYNC_BASE_DN,
        UPDATED_BY = @UPDATED_BY,
        UPDATED_AT = SYSDATETIME()
      WHERE Id = 1
    `);

  for (const change of changes) {
    await writeAudit({
      auditType: "SETTINGS",
      tableName: "Active_Directory_Settings",
      recordId: "1",
      fieldName: change.fieldName,
      oldValue: change.oldValue,
      newValue: change.newValue,
      actionType: "UPDATE",
      changedBy: updatedBy
    });
  }

  return {
    updated: true,
    changedFields: changes.map(change => change.fieldName)
  };
}

async function getUserFromLDAP(username) {
  await poolConnect;

  const result = await pool.request()
    .input("username", sql.NVarChar(100), username)
    .query(`
      SELECT TOP 1 *
      FROM dbo.Users_From_LDAP
      WHERE AD_USERNAME = @username
    `);

  return result.recordset[0] || null;
}

async function createUserFromLDAP({
  username,
  displayName,
  email,
  userRoles,
  distinguishedName = "",
  givenName = "",
  surname = "",
  employeeID = "",
  department = "",
  managerDN = "",
  title = "",
  lastLogin = true,
  changedBy = "SYSTEM"
}) {
  await poolConnect;

  const rolesString = Array.isArray(userRoles)
    ? JSON.stringify(userRoles)
    : userRoles ?? null;

  const insertResult = await pool.request()
    .input("username", sql.NVarChar(100), username)
    .input("displayName", sql.NVarChar(200), displayName || username)
    .input("email", sql.NVarChar(100), email || "")
    .input("userRoles", sql.NVarChar(sql.MAX), rolesString)
    .input("distinguishedName", sql.NVarChar(500), distinguishedName || "")
    .input("givenName", sql.NVarChar(100), givenName || "")
    .input("surname", sql.NVarChar(100), surname || "")
    .input("employeeID", sql.NVarChar(100), employeeID || "")
    .input("department", sql.NVarChar(150), department || "")
    .input("managerDN", sql.NVarChar(500), managerDN || "")
    .input("title", sql.NVarChar(150), title || "")
    .input("lastLogin", sql.Bit, lastLogin ? 1 : 0)
    .query(`
      INSERT INTO dbo.Users_From_LDAP
      (
        AD_USERNAME,
        DISPLAY_NAME,
        EMAIL,
        USER_ROLES,
        DISTINGUISHED_NAME,
        GIVEN_NAME,
        SURNAME,
        EMPLOYEE_ID,
        DEPARTMENT,
        MANAGER_DN,
        TITLE,
        IS_ENABLED,
        LAST_AD_SYNC,
        LAST_LOGIN
      )
      OUTPUT INSERTED.*
      VALUES
      (
        @username,
        @displayName,
        @email,
        @userRoles,
        @distinguishedName,
        @givenName,
        @surname,
        @employeeID,
        @department,
        @managerDN,
        @title,
        1,
        SYSDATETIME(),
        CASE WHEN @lastLogin = 1 THEN SYSDATETIME() ELSE NULL END
      )
    `);

  const newUser = insertResult.recordset[0];

  await writeAudit({
    auditType: "AUTH",
    tableName: "Users_From_LDAP",
    recordId: newUser.Id,
    associatedValue: username,
    fieldName: "USER_CREATED",
    oldValue: null,
    newValue: `User ${username} created from LDAP`,
    actionType: "INSERT",
    changedBy
  });

  return newUser;
}

async function updateUserInfoAndLoggedInTime({
  username,
  displayName,
  email,
  userRoles,
  distinguishedName = "",
  givenName = "",
  surname = "",
  employeeID = "",
  department = "",
  managerDN = "",
  title = "",
  changedBy = "SYSTEM"
}) {
  await poolConnect;

  const rolesString = Array.isArray(userRoles)
    ? JSON.stringify(userRoles)
    : userRoles ?? null;

  const existingResult = await pool.request()
    .input("username", sql.NVarChar(100), username)
    .query(`
      SELECT TOP 1 *
      FROM dbo.Users_From_LDAP
      WHERE AD_USERNAME = @username
    `);

  const user = existingResult.recordset[0];

  if (!user) {
    throw new Error("User not found in Users_From_LDAP");
  }

  const oldLastLogin = user.LAST_LOGIN ? user.LAST_LOGIN.toString() : null;
  const oldRoles = user.USER_ROLES ?? null;

  const updateResult = await pool.request()
    .input("username", sql.NVarChar(100), username)
    .input("displayName", sql.NVarChar(200), displayName || username)
    .input("email", sql.NVarChar(100), email || "")
    .input("userRoles", sql.NVarChar(sql.MAX), rolesString)
    .input("distinguishedName", sql.NVarChar(500), distinguishedName || "")
    .input("givenName", sql.NVarChar(100), givenName || "")
    .input("surname", sql.NVarChar(100), surname || "")
    .input("employeeID", sql.NVarChar(100), employeeID || "")
    .input("department", sql.NVarChar(150), department || "")
    .input("managerDN", sql.NVarChar(500), managerDN || "")
    .input("title", sql.NVarChar(150), title || "")
    .query(`
      UPDATE dbo.Users_From_LDAP
      SET
        DISPLAY_NAME = @displayName,
        EMAIL = @email,
        USER_ROLES = @userRoles,
        DISTINGUISHED_NAME = @distinguishedName,
        GIVEN_NAME = @givenName,
        SURNAME = @surname,
        EMPLOYEE_ID = @employeeID,
        DEPARTMENT = @department,
        MANAGER_DN = @managerDN,
        TITLE = @title,
        IS_ENABLED = 1,
        LAST_AD_SYNC = SYSDATETIME(),
        LAST_LOGIN = SYSDATETIME(),
        UPDATED_AT = SYSDATETIME()
      OUTPUT INSERTED.*
      WHERE AD_USERNAME = @username
    `);

  const updatedUser = updateResult.recordset[0];

  await writeAudit({
    auditType: "AUTH",
    tableName: "Users_From_LDAP",
    recordId: updatedUser.Id,
    associatedValue: username,
    fieldName: "LAST_LOGIN",
    oldValue: oldLastLogin,
    newValue: updatedUser.LAST_LOGIN?.toString() ?? null,
    actionType: "LOGIN",
    changedBy
  });

  if (oldRoles !== rolesString) {
    await writeAudit({
      auditType: "AUTH",
      tableName: "Users_From_LDAP",
      recordId: updatedUser.Id,
      associatedValue: username,
      fieldName: "USER_ROLES",
      oldValue: oldRoles,
      newValue: rolesString,
      actionType: "UPDATE",
      changedBy
    });
  }

  return updatedUser;
}

async function upsertUserFromLDAPSync({
  username,
  displayName,
  email,
  userRoles,
  distinguishedName = "",
  givenName = "",
  surname = "",
  employeeID = "",
  department = "",
  managerDN = "",
  title = "",
  changedBy = "SYSTEM"
}) {
  await poolConnect;

  const existing = await getUserFromLDAP(username);

  const rolesString = Array.isArray(userRoles)
    ? JSON.stringify(userRoles)
    : userRoles ?? null;

  if (!existing) {
    const created = await createUserFromLDAP({
      username,
      displayName,
      email,
      userRoles,
      distinguishedName,
      givenName,
      surname,
      employeeID,
      department,
      managerDN,
      title,
      lastLogin: false,
      changedBy
    });

    return {
      action: "created",
      user: created
    };
  }

  const updateResult = await pool.request()
    .input("username", sql.NVarChar(100), username)
    .input("displayName", sql.NVarChar(200), displayName || username)
    .input("email", sql.NVarChar(100), email || "")
    .input("userRoles", sql.NVarChar(sql.MAX), rolesString)
    .input("distinguishedName", sql.NVarChar(500), distinguishedName || "")
    .input("givenName", sql.NVarChar(100), givenName || "")
    .input("surname", sql.NVarChar(100), surname || "")
    .input("employeeID", sql.NVarChar(100), employeeID || "")
    .input("department", sql.NVarChar(150), department || "")
    .input("managerDN", sql.NVarChar(500), managerDN || "")
    .input("title", sql.NVarChar(150), title || "")
    .query(`
      UPDATE dbo.Users_From_LDAP
      SET
        DISPLAY_NAME = @displayName,
        EMAIL = @email,
        USER_ROLES = @userRoles,
        DISTINGUISHED_NAME = @distinguishedName,
        GIVEN_NAME = @givenName,
        SURNAME = @surname,
        EMPLOYEE_ID = @employeeID,
        DEPARTMENT = @department,
        MANAGER_DN = @managerDN,
        TITLE = @title,
        IS_ENABLED = 1,
        LAST_AD_SYNC = SYSDATETIME(),
        UPDATED_AT = SYSDATETIME()
      OUTPUT INSERTED.*
      WHERE AD_USERNAME = @username
    `);

  return {
    action: "updated",
    user: updateResult.recordset[0]
  };
}

async function disableUsersMissingFromLDAPSync(usernames, changedBy = "SYSTEM") {
  await poolConnect;

  const existingUsersResult = await pool.request().query(`
    SELECT Id, AD_USERNAME
    FROM dbo.Users_From_LDAP
    WHERE IS_ENABLED = 1
  `);

  const syncedNames = new Set(
    usernames.map(username => String(username).toLowerCase())
  );

  let disabled = 0;

  for (const dbUser of existingUsersResult.recordset) {
    if (!syncedNames.has(String(dbUser.AD_USERNAME).toLowerCase())) {
      await pool.request()
        .input("id", sql.Int, dbUser.Id)
        .query(`
          UPDATE dbo.Users_From_LDAP
          SET
            IS_ENABLED = 0,
            UPDATED_AT = SYSDATETIME()
          WHERE Id = @id
        `);

      disabled++;

      await writeAudit({
        auditType: "AUTH",
        tableName: "Users_From_LDAP",
        recordId: dbUser.Id,
        associatedValue: dbUser.AD_USERNAME,
        fieldName: "IS_ENABLED",
        oldValue: "1",
        newValue: "0",
        actionType: "LDAP_SYNC_DISABLED",
        changedBy
      });
    }
  }

  return disabled;
}

async function syncAuthenticatedUser({
  username,
  displayName,
  email,
  userRoles,
  distinguishedName = "",
  givenName = "",
  surname = "",
  employeeID = "",
  department = "",
  managerDN = "",
  title = "",
  changedBy = "LOGIN"
}) {
  console.log("syncAuthenticatedUser received:", {
    username,
    displayName,
    email,
    userRoles
  });

  let dbUser = await getUserFromLDAP(username);

  if (!dbUser) {
    dbUser = await createUserFromLDAP({
      username,
      displayName,
      email,
      userRoles,
      distinguishedName,
      givenName,
      surname,
      employeeID,
      department,
      managerDN,
      title,
      lastLogin: true,
      changedBy
    });
  } else {
    dbUser = await updateUserInfoAndLoggedInTime({
      username,
      displayName,
      email,
      userRoles,
      distinguishedName,
      givenName,
      surname,
      employeeID,
      department,
      managerDN,
      title,
      changedBy
    });
  }

  return dbUser;
}

export {
  getLDAPConfig,
  getUserFromLDAP,
  createUserFromLDAP,
  updateUserInfoAndLoggedInTime,
  upsertUserFromLDAPSync,
  disableUsersMissingFromLDAPSync,
  syncAuthenticatedUser,
  getUsersFromLDAP
};