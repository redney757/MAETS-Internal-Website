//API logic for PBX and LDAP authentication, as well as session management for user authentication state.

//Import necessary modules and dependencies
import express from "express" //Express framework for building the backend server
import cors from 'cors' //CORS middleware to handle cross-origin requests from the frontend
import https from 'https' //HTTPS module to create an agent for making secure requests to the PBX API
import axios from 'axios' //Axios library for making HTTP requests to the PBX API and other external services
import dotenv from "dotenv" //Dotenv library to load environment variables from a .env file for configuration settings such as LDAP credentials and session secrets
import { authenticateLDAP } from "./API/login.js" //Import the authenticateLDAP function from the login.js file to handle LDAP authentication logic
import session from "express-session" //Express-session middleware to manage user sessions and authentication state across requests

// Set express equal to app for easier reference
const app = express()
// Load environment variables from .env file
dotenv.config()
// Export the app instance for use in other parts of the application, such as the server.js file where the server is started. This allows for better modularity and separation of concerns in the application architecture.
export default app;
//Middleware setup for App to use express.json() and express.urlencoded() to parse incoming request bodies, cors() to handle cross-origin requests from the frontend, and session() to manage user sessions with specific configuration settings such as cookie properties and session secret. This setup is essential for enabling the backend to properly handle authentication, maintain user sessions, and allow communication with the frontend application while ensuring security and proper handling of user data.
app.use(express.json());
app.use(express.urlencoded({extended: true}));
//define allowed origins for CORS to restrict access to the backend API to only trusted frontend origins
const allowedOrigins = ["http://localhost:5173"]
//define cors options to allow requests from the specified origins above and throw an error when a request is made from an origin that is not in the allowed list.
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
//Session configuration for managing user authentication state. The session is configured with a name, secret, and cookie properties to ensure secure handling of user sessions. The session middleware allows the backend to maintain user authentication state across requests, enabling features such as login persistence  and access control based on user authentication status. The cookie properties are set to enhance security by making the cookie HTTP-only, restricting it to same-site requests, and setting an appropriate expiration time for the session.
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