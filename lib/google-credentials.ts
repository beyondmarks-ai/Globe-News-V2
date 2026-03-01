import path from "path";
import fs from "fs";

const BIGQUERY_JSON_NAME = "news-map-backend-4bb197b7f796.json";

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

  // 1) Explicit path from env
  const envPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.BIGQUERY_CREDENTIALS_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return { projectId, keyFilename: envPath };
  }

  // 2) Base64-encoded service account JSON
  const base64 = process.env.BIGQUERY_CREDENTIALS_BASE64;
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

  // 3) Default JSON file in project root
  const defaultPath = path.join(process.cwd(), BIGQUERY_JSON_NAME);
  if (fs.existsSync(defaultPath)) {
    return { projectId, keyFilename: defaultPath };
  }

  throw new Error(
    "BigQuery credentials not found. Set GOOGLE_APPLICATION_CREDENTIALS, BIGQUERY_CREDENTIALS_PATH, BIGQUERY_CREDENTIALS_BASE64, or place " +
      BIGQUERY_JSON_NAME +
      " in the project root."
  );
}
