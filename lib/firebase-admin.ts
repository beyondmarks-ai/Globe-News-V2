import * as admin from "firebase-admin";
import path from "path";
import fs from "fs";

const FIREBASE_JSON_NAME = "news-map-backend-firebase-adminsdk-fbsvc-bed1474760.json";

/** Turn literal \n in env string into real newlines (Hostinger / .env style). */
function unescapeNewlines(s: string | undefined): string {
  return (s ?? "").replace(/\\n/g, "\n");
}

function getFirebaseCredential(): admin.ServiceAccount {
  // 1) Separate env vars with \n stored as literal \n (stable on Hostinger, Vercel, etc.)
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey: unescapeNewlines(privateKey),
    } as admin.ServiceAccount;
  }

  // 2) Explicit path from env (for deployment)
  const envPath = process.env.FIREBASE_CREDENTIALS_PATH;
  if (envPath) {
    const raw = fs.readFileSync(envPath, "utf-8");
    return JSON.parse(raw) as admin.ServiceAccount;
  }

  // 3) Base64-encoded JSON (strip any line breaks the platform may have added)
  const base64 = process.env.FIREBASE_CREDENTIALS_BASE64?.replace(/\s/g, "").trim();
  if (base64) {
    const raw = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(raw) as admin.ServiceAccount;
  }

  // 4) Single-line minified JSON (no newlines in env value; private_key uses \n in the string)
  const jsonEnv = process.env.FIREBASE_CREDENTIALS_JSON?.trim();
  if (jsonEnv) {
    return JSON.parse(jsonEnv) as admin.ServiceAccount;
  }

  // 5) Default: JSON file next to project root
  const defaultPath = path.join(process.cwd(), FIREBASE_JSON_NAME);
  if (fs.existsSync(defaultPath)) {
    const raw = fs.readFileSync(defaultPath, "utf-8");
    return JSON.parse(raw) as admin.ServiceAccount;
  }

  throw new Error(
    "Firebase credentials not found. Set FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (with \\n for newlines), or FIREBASE_CREDENTIALS_*, or place " +
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
