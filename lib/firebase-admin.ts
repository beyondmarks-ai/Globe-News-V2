import * as admin from "firebase-admin";
import path from "path";
import fs from "fs";

const FIREBASE_JSON_NAME = "news-map-backend-firebase-adminsdk-fbsvc-bed1474760.json";

/** Turn literal \n in env string into real newlines (Hostinger / .env style). */
function unescapeNewlines(s: string | undefined): string {
  return (s ?? "").replace(/\\n/g, "\n");
}

function getFirebaseCredential(): admin.ServiceAccount {
  const cred = getFirebaseCredentialOrNull();
  if (cred) return cred;
  throw new Error(
    "Firebase credentials not found. Set FIREBASE_CREDENTIALS_BASE64 (recommended on Hostinger), FIREBASE_CREDENTIALS_PATH, FIREBASE_CREDENTIALS_JSON, or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY, or place " +
      FIREBASE_JSON_NAME +
      " in the project root."
  );
}

/**
 * Returns Firebase credential or null if none configured. Use in API routes so build never requires env.
 * On Hostinger: prefer FIREBASE_CREDENTIALS_BASE64 (paste base64 of your Firebase JSON file).
 */
export function getFirebaseCredentialOrNull(): admin.ServiceAccount | null {
  try {
    // 1) Base64 (best for Hostinger – no pasting of private key)
    const base64 = process.env.FIREBASE_CREDENTIALS_BASE64?.replace(/\s/g, "").trim();
    if (base64) {
      const raw = Buffer.from(base64, "base64").toString("utf-8");
      return JSON.parse(raw) as admin.ServiceAccount;
    }

    // 2) Path to JSON file (upload file on Hostinger, set this env to path)
    const envPath = process.env.FIREBASE_CREDENTIALS_PATH;
    if (envPath && fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, "utf-8");
      return JSON.parse(raw) as admin.ServiceAccount;
    }

    // 3) Single-line minified JSON env
    const jsonEnv = process.env.FIREBASE_CREDENTIALS_JSON?.trim();
    if (jsonEnv) {
      return JSON.parse(jsonEnv) as admin.ServiceAccount;
    }

    // 4) Separate env vars (private key with \n – often rejected by Hostinger)
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

    // 5) Default JSON file in project root
    const defaultPath = path.join(process.cwd(), FIREBASE_JSON_NAME);
    if (fs.existsSync(defaultPath)) {
      const raw = fs.readFileSync(defaultPath, "utf-8");
      return JSON.parse(raw) as admin.ServiceAccount;
    }
  } catch {
    // invalid base64/json or missing file
  }
  return null;
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

/** Returns Firestore or null if credentials not configured. Call only inside request handlers (build-safe). */
export function getFirestoreOrNull(): admin.firestore.Firestore | null {
  const cred = getFirebaseCredentialOrNull();
  if (!cred) return null;
  if (!admin.apps.length) {
    try {
      admin.initializeApp({ credential: admin.credential.cert(cred) });
    } catch (e) {
      console.error("Firebase init error", e);
      return null;
    }
  }
  return admin.firestore();
}
