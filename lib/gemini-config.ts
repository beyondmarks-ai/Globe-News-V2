import path from "path";
import fs from "fs";

const GEMINI_JSON_NAME = "gemini-api-key.json";

/**
 * Gemini API key: from env, or from JSON file { "api_key": "..." } to avoid .env newline issues.
 */
export function getGeminiApiKey(): string {
  const fromEnv = process.env.GEMINI_API_KEY;
  if (fromEnv?.trim()) return fromEnv.trim();

  // Optional: base64 of the raw API key (e.g. for deployment)
  const base64 = process.env.GEMINI_API_KEY_BASE64;
  if (base64) {
    return Buffer.from(base64, "base64").toString("utf-8").trim();
  }

  // Optional: path to JSON file
  const envPath = process.env.GEMINI_API_KEY_PATH;
  const jsonPath = envPath
    ? path.resolve(envPath)
    : path.join(process.cwd(), GEMINI_JSON_NAME);

  if (fs.existsSync(jsonPath)) {
    const raw = fs.readFileSync(jsonPath, "utf-8");
    const data = JSON.parse(raw) as { api_key?: string };
    if (data.api_key?.trim()) return data.api_key.trim();
  }

  throw new Error(
    "Gemini API key not found. Set GEMINI_API_KEY, GEMINI_API_KEY_BASE64, GEMINI_API_KEY_PATH, or place " +
      GEMINI_JSON_NAME +
      ' with { "api_key": "your-key" } in the project root.'
  );
}
