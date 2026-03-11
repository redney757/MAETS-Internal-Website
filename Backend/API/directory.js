import express from "express";
import axios from "axios";
import https from "https";
import cors from "cors";

const app = express();

app.use(cors({
  origin: "http://127.0.0.1:5173"
}));

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

app.listen(3001, () => {
  console.log("Backend listening on http://localhost:3001");
});