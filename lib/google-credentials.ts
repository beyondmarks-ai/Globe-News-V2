import path from "path";
import fs from "fs";

const BIGQUERY_JSON_NAME = "news-map-backend-4bb197b7f796.json";

/** Turn literal \n in env string into real newlines (Hostinger / .env style). */
function unescapeNewlines(s: string | undefined): string {
  return (s ?? "").replace(/\\n/g, "\n");
}

export interface BigQueryCredentials {
  keyFilename?: string;
  credentials?: {
    client_email: string;
    private_key: string;
  };
}

export type BigQueryOptions = { projectId: string } & BigQueryCredentials;

/**
 * Returns BigQuery options or null if none configured. Use in API routes so build never requires env.
 * On Hostinger: prefer BIGQUERY_CREDENTIALS_BASE64 (paste base64 of your Google service account JSON).
 */
export function getBigQueryOptionsOrNull(): BigQueryOptions | null {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID ?? "news-map-backend";

    // 1) Base64 (best for Hostinger – no pasting of private key)
    const base64 = process.env.BIGQUERY_CREDENTIALS_BASE64?.replace(/\s/g, "").trim();
    if (base64) {
      const raw = Buffer.from(base64, "base64").toString("utf-8");
      const cred = JSON.parse(raw) as { client_email: string; private_key: string };
      return {
        projectId,
        credentials: { client_email: cred.client_email, private_key: cred.private_key },
      };
    }

    // 2) Path to JSON file
    const envPath =
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.BIGQUERY_CREDENTIALS_PATH;
    if (envPath && fs.existsSync(envPath)) {
      return { projectId, keyFilename: envPath };
    }

    // 3) Single-line minified JSON env
    const jsonEnv = process.env.BIGQUERY_CREDENTIALS_JSON?.trim();
    if (jsonEnv) {
      const cred = JSON.parse(jsonEnv) as { client_email: string; private_key: string };
      return {
        projectId,
        credentials: { client_email: cred.client_email, private_key: cred.private_key },
      };
    }

    // 4) Separate env vars (often rejected by Hostinger)
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    if (clientEmail && privateKey) {
      return {
        projectId,
        credentials: {
          client_email: clientEmail,
          private_key: unescapeNewlines(privateKey),
        },
      };
    }

    // 5) Default JSON file in project root
    const defaultPath = path.join(process.cwd(), BIGQUERY_JSON_NAME);
    if (fs.existsSync(defaultPath)) {
      return { projectId, keyFilename: defaultPath };
    }
  } catch {
    // invalid base64/json or missing file
  }
  return null;
}

export function getBigQueryOptions(): BigQueryOptions {
  const opts = getBigQueryOptionsOrNull();
  if (opts) return opts;
  throw new Error(
    "BigQuery credentials not found. Set BIGQUERY_CREDENTIALS_BASE64 (recommended on Hostinger), BIGQUERY_CREDENTIALS_PATH, BIGQUERY_CREDENTIALS_JSON, or GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY, or place " +
      BIGQUERY_JSON_NAME +
      " in the project root."
  );
}
