# Deploying on Hostinger

Hostinger often **rejects or corrupts** env vars that contain Google/Firebase private keys (newlines or long text). Use **base64** so you never paste the key.

## 1. Get base64 of your JSON files

**Firebase:** your `news-map-backend-firebase-adminsdk-fbsvc-*.json`  
**BigQuery:** your `news-map-backend-4bb197b7f796.json` (or the GDELT service account JSON)

### Option A – Node (in project folder)

```bash
node -e "console.log(require('fs').readFileSync('news-map-backend-firebase-adminsdk-fbsvc-bed1474760.json').toString('base64'))"
node -e "console.log(require('fs').readFileSync('news-map-backend-4bb197b7f796.json').toString('base64'))"
```

Copy each output (one long line each).

### Option B – PowerShell

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("D:\path\to\firebase-file.json"))
[Convert]::ToBase64String([IO.File]::ReadAllBytes("D:\path\to\bigquery-file.json"))
```

## 2. Set env vars on Hostinger

In your Hostinger project (or deployment) **Environment variables**, add:

| Name | Value |
|------|--------|
| `FIREBASE_CREDENTIALS_BASE64` | (paste the Firebase base64 string – one line) |
| `BIGQUERY_CREDENTIALS_BASE64` | (paste the BigQuery base64 string – one line) |
| `GEMINI_API_KEY` | your Gemini API key |
| `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` | your Mapbox token |
| `FIRECRAWL_API_KEY` | your Firecrawl key |

Do **not** set `FIREBASE_PRIVATE_KEY` or `GOOGLE_PRIVATE_KEY` on Hostinger; the app will use the base64 vars instead.

## 3. Deploy

Push to GitHub (or upload) and run the build. The build does not need these env vars; they are only read at **runtime** when a request hits the API.
