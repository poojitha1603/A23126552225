const axios = require('axios');
const { getAuthToken } = require('./auth');
const { Log } = require('./logger');

const DEPOT_API_URL = "http://4.224.186.213/evaluation-service/depots";
const VEHICLES_API_URL = "http://4.224.186.213/evaluation-service/vehicles";

async function fetchData() {
  const token = await getAuthToken();
  const headers = { Authorization: `Bearer ${token}` };

  await Log("backend", "info", "service", "Fetching depots and vehicles data");

  const depotsRes = await axios.get(DEPOT_API_URL, { headers });
  const vehiclesRes = await axios.get(VEHICLES_API_URL, { headers });

  return {
    depots: depotsRes.data.depots,
    tasks: vehiclesRes.data.vehicles
  };
}

function solveKnapsack(tasks, budget) {
  const n = tasks.length;
  const dp = new Array(budget + 1).fill(0);

  for (let i = 0; i < n; i++) {
    const { Duration, Impact } = tasks[i];
    for (let w = budget; w >= Duration; w--) {
      if (dp[w - Duration] + Impact > dp[w]) {
        dp[w] = dp[w - Duration] + Impact;
      }
    }
  }

  return dp[budget];
}

async function main() {
  const { depots, tasks } = await fetchData();

  await Log("backend", "info", "service", `Loaded ${depots.length} depots and ${tasks.length} tasks`);

  for (const depot of depots) {
    const bestImpact = solveKnapsack(tasks, depot.MechanicHours);
    console.log(`Depot ${depot.ID} (Budget: ${depot.MechanicHours} hrs) -> Max Impact: ${bestImpact}`);
    await Log("backend", "info", "service", `Depot ${depot.ID}: max impact ${bestImpact} within ${depot.MechanicHours} hrs`);
  }
}

main().catch(async (err) => {
  console.error("Error:", err.message);
  await Log("backend", "fatal", "service", `Unhandled error: ${err.message}`);
});