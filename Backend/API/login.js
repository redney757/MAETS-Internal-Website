
import fs from "fs";
import { Client } from "ldapts";




export async function authenticateLDAP(username, password) {
    const client = new Client({
        url: process.env.LDAP_URL,
        tlsOptions: {
            ca: [fs.readFileSync("/home/redney/MAETS/Backend/certs/MAETS-AD19-ROOT-CA.cer")]
        },
        timeout: 5000,
        connectTimeout: 10000,
    });
    try {
        console.log("Starting LDAP auth");
        console.log("Username received:", username);
        console.log("LDAP_URL:", process.env.LDAP_URL);
        console.log("LDAP_BASE_DN:", process.env.LDAP_BASE_DN);
        console.log("LDAP_BIND_DN:", process.env.LDAP_BIND_DN);

        console.log("Binding with service account...");
        await client.bind(
            process.env.LDAP_BIND_DN,
            process.env.LDAP_BIND_PASSWORD
        );
        console.log("Service bind successful");
        console.log("Searching for user...");

        const {searchEntries} = await client.search(process.env.LDAP_BASE_DN, {
            scope: "sub",
            filter: `(sAMAccountName=${username})`,
            attributes: ["cn", "mail", "memberOf", "distinguishedName"],
        })
        console.log("Search results:", searchEntries);
        
        if (!searchEntries.length) { 
            throw new Error("User not found");
        }
        const user = searchEntries[0];
        const userDN = user.distinguishedName;
        console.log("Resolved userDN:", userDN);

        if (!userDN) {
            throw new Error("User DN not found");
        }

        console.log("Binding as user...");

        await client.bind(userDN, password);
            console.log("User bind successful");

        return {
            username,
            displayName: user.cn || username,
            email: user.mail || "",
            groups: Array.isArray(user.memberOf)
            ? user.memberOf
            : user.memberOf
            ? [user.memberOf]
            : [],
            dn: userDN
        };
    } catch (err){
        console.error("AUTH LDAP ERROR:", err);
        throw err;
    } finally {
        await client.unbind().catch(()=> {});
    }
}