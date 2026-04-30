import fs from "fs";
import { Client } from "ldapts";
import { decrypt } from "../Utils/Crypto.js";
import {
  getLDAPConfig,
  upsertUserFromLDAPSync,
  disableUsersMissingFromLDAPSync
} from "../Database/Queries/LDAP.js";

function normalizeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeUser(entry) {
  const username = entry.sAMAccountName || "";

  return {
    username,
    displayName: entry.cn || username,
    email: entry.mail || "",
    userRoles: normalizeArray(entry.memberOf),
    distinguishedName: entry.distinguishedName || "",
    givenName: entry.givenName || "",
    surname: entry.sn || "",
    employeeID: entry.employeeID || "",
    department: entry.department || "",
    managerDN: entry.manager || "",
    title: entry.title || ""
  };
}

export async function syncAllLDAPUsers({ changedBy = "SYSTEM" } = {}) {
  const config = await getLDAPConfig();

  if (!config) {
    throw new Error("LDAP configuration not found.");
  }

  const decryptedBindPassword = decrypt(config.LDAP_BIND_PASSWORD);

  const client = new Client({
    url: config.LDAP_URL,
    tlsOptions: {
      ca: [fs.readFileSync("/home/redney/MAETS/Backend/certs/MAETS-AD19-ROOT-CA.cer")]
    },
    timeout: 15000,
    connectTimeout: 15000
  });

  const summary = {
    created: 0,
    updated: 0,
    disabled: 0,
    skipped: 0,
    totalFromLDAP: 0,
    errors: []
  };

  const syncedUsernames = [];

  try {
    await client.bind(config.LDAP_BIND_DN, decryptedBindPassword);
const userSyncBaseDN =
  config.LDAP_USER_SYNC_BASE_DN || config.LDAP_BASE_DN;

const { searchEntries } = await client.search(userSyncBaseDN, {
      scope: "sub",
      filter: "(&(objectCategory=person)(objectClass=user)(sAMAccountName=*)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))",
      attributes: [
        "sAMAccountName",
        "cn",
        "mail",
        "memberOf",
        "distinguishedName",
        "givenName",
        "sn",
        "employeeID",
        "department",
        "manager",
        "title"
      ],
      paged: {
        pageSize: 500
      }
    });

    summary.totalFromLDAP = searchEntries.length;

    for (const entry of searchEntries) {
      const user = normalizeUser(entry);

      if (!user.username) {
        summary.skipped++;
        continue;
      }

      try {
        const result = await upsertUserFromLDAPSync({
          ...user,
          changedBy
        });

        syncedUsernames.push(user.username);

        if (result.action === "created") summary.created++;
        if (result.action === "updated") summary.updated++;
      } catch (err) {
        summary.errors.push({
          username: user.username,
          error: err.message
        });
      }
    }

    summary.disabled = await disableUsersMissingFromLDAPSync(
      syncedUsernames,
      changedBy
    );

    return summary;
  } finally {
    await client.unbind().catch(() => {});
  }
}