require('dotenv').config();
const axios = require('axios');

const AUTH_API_URL = "http://4.224.186.213/evaluation-service/auth";

let cachedToken = null;
let tokenExpiry = null;

async function getAuthToken() {
  // Reuse the token if it's still valid — no need to fetch a new one every time
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && tokenExpiry && now < tokenExpiry) {
    return cachedToken;
  }

  try {
    const response = await axios.post(AUTH_API_URL, {
      email: process.env.CLIENT_EMAIL,
      name: process.env.CLIENT_NAME,
      rollNo: process.env.CLIENT_ROLLNO,
      accessCode: process.env.CLIENT_ACCESSCODE,
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET
    });

    cachedToken = response.data.access_token;
    tokenExpiry = response.data.expires_in;

    console.log("New auth token fetched.");
    return cachedToken;
  } catch (error) {
    console.error("Failed to fetch auth token:", error.message);
    throw error;
  }
}

module.exports = { getAuthToken };