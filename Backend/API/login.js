
// LDAP Authentication Logic

// Import necessary modules
import fs from "fs"; // module imported for reading files in filesystem
import { Client } from "ldapts";



// Function that takes a username and password parameter and attempts to authenticate against the LDAP server
export async function authenticateLDAP(username, password) {
    //create a new LDAP client instance with the specified configuration options url, TLS options (ca), and timeouts for connections. Options can be adjusted inside the .env file not available on github for security reasons.
    const client = new Client({
        url: process.env.LDAP_URL,
        tlsOptions: {
            ca: [fs.readFileSync("/home/redney/MAETS/Backend/certs/MAETS-AD19-ROOT-CA.cer")]
        },
        timeout: 5000,
        connectTimeout: 10000,
    });
    // try catch statement to handle the asynchronous operations of binding and searching the LDAP server. Detailed logging is included to assist with debugging and tracing the authentication process. The function attempts to bind to the LDAP server using a service account, then searches for the user based on the provided username, and finally attempts to bind as the user to verify their credentials. If successful, it returns an object containing user information; if any step fails, it throws an error with a descriptive message. TIP: Debugging lines can be removed in production environment to clean up logs and improve performance.
    //THIS IS USING LDAPS, ENSURE CERTIFICATE VALIDITY AND PROPER CONFIGURATION OF THE LDAP SERVER FOR SECURE COMMUNICATION. ALSO, MAKE SURE TO HANDLE SENSITIVE INFORMATION LIKE USER CREDENTIALS AND CERTIFICATES SECURELY IN PRODUCTION ENVIRONMENTS.
    try {
        //Debugging logs to ensure environment variables are being read correctly and to trace the authentication flow.
        console.log("Starting LDAP auth");
        console.log("Username received:", username);
        console.log("LDAP_URL:", process.env.LDAP_URL);
        console.log("LDAP_BASE_DN:", process.env.LDAP_BASE_DN);
        console.log("LDAP_BIND_DN:", process.env.LDAP_BIND_DN);

        console.log("Binding with service account...");
        //Attempt to bind to the LDAP server using a service account specified in the environment variables. This is necessary to perform searches on the LDAP directory. TIP: Ensure that the service account has the necessary permissions to search for user entries in the LDAP directory.
        await client.bind(
            process.env.LDAP_BIND_DN,
            process.env.LDAP_BIND_PASSWORD
        );
        //Debugging log to confirm successful binding with the service account before proceeding with the user search.
        console.log("Service bind successful");
        console.log("Searching for user...");
        //Perform a search on the LDAP directory to find the user entry that matches the provided username. The search is performed under the base DN specified in the environment variables, and it looks for entries with a matching sAMAccountName attribute. The search also retrieves specific attributes such as cn, mail, memberOf, distinguishedName, givenName, sn, employeeID, department, and manager for use in the authentication response. TIP: Adjust the search filter and attributes as needed based on your LDAP schema and requirements.
        const {searchEntries} = await client.search(process.env.LDAP_BASE_DN, {
            scope: "sub",
            filter: `(sAMAccountName=${username})`,
            attributes: ["cn", "mail", "memberOf", "distinguishedName", "givenName", "sn", "employeeID", "department", "manager"],
        })
        //Debugging log to display the search results and confirm that the user entry was found before attempting to bind as the user.
        console.log("Search results:", searchEntries);
        //Check if any user entries were found using the provided username. If no entries are found, throw an error indicating that the user was not found. This is an important step to prevent further attempts to bind with invalid credentials and to provide clear feedback on authentication failures.
        if (!searchEntries.length) { 
            throw new Error("User not found");
        }
        //Create a user object based on the first search entry found.
        const user = searchEntries[0];
        //Extract the distinguished name (DN) of the user from the search entry to use for binding as the user. The DN is a unique identifier for the user in the LDAP directory and is required for the bind operation to verify the user's credentials. TIP: Ensure that the DN is correctly extracted and that the user entry contains the necessary attributes for authentication.
        const userDN = user.distinguishedName;
        //Debugging log to confirm the extracted user DN before attempting to bind as the user. This helps to verify that the correct user entry was found and that the DN is valid for the bind operation.
        console.log("Resolved userDN:", userDN);
        //Check if the user DN was successfully extracted. If not, throw an error indicating that the user DN was not found. This is a critical check to prevent attempts to bind with an undefined or invalid DN, which would lead to authentication failures and potential security issues.
        if (!userDN) {
            throw new Error("User DN not found");
        }
        //Debugging log to indicate that the function is about to attempt binding as the provided user and password.
        console.log("Binding as user...");
        //Attempt to bind to the LDAP server using the extracted user DN and the provided password using the client instance created earlier.
        await client.bind(userDN, password);
        //debugging log to confirm successful binding as the user, indicating that the provided credentials are valid and authentication was successful.
            console.log("User bind successful");
        //return an object containing user information such as username, display name, email, groups, and distinguished name (DN) if the authentication is successful. This information can be used in the application to manage user sessions and permissions based on their LDAP attributes. TIP: Ensure that sensitive information is handled securely and that only necessary attributes are included in the response to minimize exposure of user data.
        return {
            username,
            displayName: user.cn || username,
            email: user.mail || "",
            groups: Array.isArray(user.memberOf)
            ? user.memberOf
            : user.memberOf
            ? [user.memberOf]
            : [],
            dn: userDN,
            givenName: user.givenName || "",
            sn: user.sn || "",
            employeeID: user.employeeID || "",
            department: user.department || "",
            manager: user.manager || "",
        };
        //catch block to handle any errors that occur during the LDAP authentication process. Detailed error logging is included to assist with debugging and to provide clear feedback on authentication failures. The function throws the error after logging it, allowing the calling code to handle it appropriately (e.g., by sending an error response to the client). TIP: Ensure that error messages do not expose sensitive information in production environments and that proper error handling is implemented in the calling code to manage authentication failures gracefully.
    } catch (err){
        console.error("AUTH LDAP ERROR:", err);
        throw err;
        //finally block to ensure that the LDAP client is properly unbound and resources are released after the authentication process, regardless of whether it was successful or if an error occurred. This is important for maintaining the stability and performance of the application, as well as for security reasons to prevent lingering connections to the LDAP server. TIP: Ensure that the unbind operation is performed correctly and that any errors during unbinding are handled gracefully to avoid potential issues with resource leaks or hanging connections.
    } finally {
        await client.unbind().catch(()=> {});
    }
}