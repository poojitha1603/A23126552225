const axios = require('axios');
const { getAuthToken } = require('./auth');

const LOG_API_URL = "http://4.224.186.213/evaluation-service/logs";

const VALID_STACKS = ["backend", "frontend"];
const VALID_LEVELS = ["debug", "info", "warn", "error", "fatal"];
const VALID_BACKEND_PACKAGES = [
  "cache", "controller", "cron_job", "db", "domain",
  "handler", "repository", "route", "service"
];

async function Log(stack, level, pkg, message) {
  if (!VALID_STACKS.includes(stack)) {
    console.error(`Invalid stack value: ${stack}`);
    return;
  }
  if (!VALID_LEVELS.includes(level)) {
    console.error(`Invalid level value: ${level}`);
    return;
  }
  if (stack === "backend" && !VALID_BACKEND_PACKAGES.includes(pkg)) {
    console.error(`Invalid package value for backend: ${pkg}`);
    return;
  }

  try {
    const token = await getAuthToken();
    const response = await axios.post(
      LOG_API_URL,
      { stack, level, package: pkg, message },
      {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log("Log sent:", response.data.message);
  } catch (error) {
    console.error("Failed to send log:", error.message);
  }
}

module.exports = { Log };