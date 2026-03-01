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

/**
 * Resolve BigQuery auth: use keyFilename (path to JSON) when possible,
 * otherwise credentials object from base64 or env path.
 */
export function getBigQueryOptions(): { projectId: string } & BigQueryCredentials {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID ?? "news-map-backend";

  // 1) Separate env vars with \n stored as literal \n (stable on Hostinger, etc.)
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

  // 2) Explicit path from env
  const envPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.BIGQUERY_CREDENTIALS_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return { projectId, keyFilename: envPath };
  }

  // 3) Base64-encoded service account JSON (strip any line breaks)
  const base64 = process.env.BIGQUERY_CREDENTIALS_BASE64?.replace(/\s/g, "").trim();
  if (base64) {
    const raw = Buffer.from(base64, "base64").toString("utf-8");
    const cred = JSON.parse(raw) as {
      client_email: string;
      private_key: string;
    };
    return {
      projectId,
      credentials: {
        client_email: cred.client_email,
        private_key: cred.private_key,
      },
    };
  }

  // 4) Single-line minified JSON (no newlines in env value)
  const jsonEnv = process.env.BIGQUERY_CREDENTIALS_JSON?.trim();
  if (jsonEnv) {
    const cred = JSON.parse(jsonEnv) as {
      client_email: string;
      private_key: string;
    };
    return {
      projectId,
      credentials: {
        client_email: cred.client_email,
        private_key: cred.private_key,
      },
    };
  }

  // 5) Default JSON file in project root
  const defaultPath = path.join(process.cwd(), BIGQUERY_JSON_NAME);
  if (fs.existsSync(defaultPath)) {
    return { projectId, keyFilename: defaultPath };
  }

  throw new Error(
    "BigQuery credentials not found. Set GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY (with \\n for newlines), or BIGQUERY_CREDENTIALS_*, or place " +
      BIGQUERY_JSON_NAME +
      " in the project root."
  );
}
