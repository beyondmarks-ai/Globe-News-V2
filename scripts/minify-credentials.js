/**
 * Run: node scripts/minify-credentials.js
 * Prints one-line JSON for Firebase and BigQuery. Copy each line into your
 * deployment env as FIREBASE_CREDENTIALS_JSON and BIGQUERY_CREDENTIALS_JSON.
 * No newlines in the value = safe to paste in Vercel/Netlify etc.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const firebasePath = path.join(root, "news-map-backend-firebase-adminsdk-fbsvc-bed1474760.json");
const bigqueryPath = path.join(root, "news-map-backend-4bb197b7f796.json");

function minify(filePath, name) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[skip] ${name} not found: ${filePath}`);
    return;
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  const oneLine = JSON.stringify(JSON.parse(raw));
  console.log(`\n--- ${name} (paste as one line in env) ---\n${oneLine}\n`);
}

minify(firebasePath, "FIREBASE_CREDENTIALS_JSON");
minify(bigqueryPath, "BIGQUERY_CREDENTIALS_JSON");
