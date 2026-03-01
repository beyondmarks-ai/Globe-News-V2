import * as admin from "firebase-admin";
import path from "path";
import fs from "fs";

const FIREBASE_JSON_NAME = "news-map-backend-firebase-adminsdk-fbsvc-bed1474760.json";

function getFirebaseCredential(): admin.ServiceAccount {
  // 1) Explicit path from env (for deployment)
  const envPath = process.env.FIREBASE_CREDENTIALS_PATH;
  if (envPath) {
    const raw = fs.readFileSync(envPath, "utf-8");
    return JSON.parse(raw) as admin.ServiceAccount;
  }

  // 2) Base64-encoded JSON in env (no newline/escaping issues in deployment)
  const base64 = process.env.FIREBASE_CREDENTIALS_BASE64;
  if (base64) {
    const raw = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(raw) as admin.ServiceAccount;
  }

  // 3) Default: JSON file next to project root
  const defaultPath = path.join(process.cwd(), FIREBASE_JSON_NAME);
  if (fs.existsSync(defaultPath)) {
    const raw = fs.readFileSync(defaultPath, "utf-8");
    return JSON.parse(raw) as admin.ServiceAccount;
  }

  throw new Error(
    "Firebase credentials not found. Set FIREBASE_CREDENTIALS_PATH, FIREBASE_CREDENTIALS_BASE64, or place " +
      FIREBASE_JSON_NAME +
      " in the project root."
  );
}

export function getFirebaseAdmin(): admin.app.App {
  if (!admin.apps.length) {
    const credential = getFirebaseCredential();
    admin.initializeApp({ credential: admin.credential.cert(credential) });
  }
  return admin.app();
}

export function getFirestore(): admin.firestore.Firestore {
  return getFirebaseAdmin().firestore();
}
