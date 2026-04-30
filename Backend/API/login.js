import fs from "fs";
import { Client } from "ldapts";
import { decrypt } from "../Utils/Crypto.js";
import { getLDAPConfig } from "../Database/Queries/LDAP.js";

export async function getLDAPUserDetails(username) {
  const config = await getLDAPConfig();
  const decryptedBindPassword = decrypt(config.LDAP_BIND_PASSWORD);
  const client = new Client({
    url: config.LDAP_URL,
    tlsOptions: {
      ca: [fs.readFileSync("/home/redney/MAETS/Backend/certs/MAETS-AD19-ROOT-CA.cer")]
    },
    timeout: 5000,
    connectTimeout: 10000,
  });

  try {
    console.log("Starting LDAP lookup");
    console.log("Username received:", username);

    await client.bind(config.LDAP_BIND_DN, decryptedBindPassword);
    console.log("Service bind successful");

    const { searchEntries } = await client.search(config.LDAP_BASE_DN, {
      scope: "sub",
      filter: `(sAMAccountName=${username})`,
      attributes: [
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
    });

    if (!searchEntries.length) {
      throw new Error("User not found");
    }
    console.log("LDAP search successful, user found:", searchEntries[0]);
    const user = searchEntries[0];

    return {
      username,
      displayName: user.cn || username,
      email: user.mail || "",
      groups: Array.isArray(user.memberOf)
        ? user.memberOf
        : user.memberOf
        ? [user.memberOf]
        : [],
      dn: user.distinguishedName || "",
      givenName: user.givenName || "",
      sn: user.sn || "",
      employeeID: user.employeeID || "",
      department: user.department || "",
      manager: user.manager || "",
      title: user.title || "",
    };
  } catch (err) {
    console.error("LDAP LOOKUP ERROR:", err);
    throw err;
  } finally {
    await client.unbind().catch(() => {});
  }
}