export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";
import * as admin from "firebase-admin";
import { getBigQueryOptions } from "@/lib/google-credentials";

// Only initialize if the app hasn't been initialized AND the variables actually exist
if (!admin.apps.length && process.env.FIREBASE_PROJECT_ID) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  } catch (error) {
    console.error("Firebase initialization error", error);
  }
}

const db = admin.apps.length ? admin.firestore() : null;

export async function GET() {
  if (!db) {
    return NextResponse.json(
      { success: false, error: "Database not available" },
      { status: 503 }
    );
  }
  try {
    const bqOptions = getBigQueryOptions();
    const bigquery = new BigQuery(bqOptions);

    const query = `
      SELECT 
        GLOBALEVENTID,
        ActionGeo_Lat AS lat, 
        ActionGeo_Long AS lng, 
        ActionGeo_FullName AS location_name,
        GoldsteinScale AS sentiment_score,
        SOURCEURL AS news_link
      FROM 
        \`gdelt-bq.gdeltv2.events\` 
      WHERE 
        DATEADDED >= CAST(FORMAT_TIMESTAMP('%Y%m%d%H%M%S', TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 15 MINUTE)) AS INT64)
        AND ActionGeo_Lat IS NOT NULL 
        AND ActionGeo_Long IS NOT NULL
      LIMIT 1000;
    `;

    const [job] = await bigquery.createQueryJob({ query, location: "US" });
    const [rows] = await job.getQueryResults();

    const batch = db.batch();
    let savedCount = 0;

    rows.forEach((row: Record<string, unknown>) => {
      const docRef = db
        .collection("news_events")
        .doc(String(row.GLOBALEVENTID));

      batch.set(
        docRef,
        {
          lat: parseFloat(row.lat as string),
          lng: parseFloat(row.lng as string),
          location_name: row.location_name,
          sentiment_score: parseFloat(row.sentiment_score as string),
          news_link: row.news_link,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      savedCount++;
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Successfully pulled ${rows.length} records and saved ${savedCount} to Firebase.`,
    });
  } catch (error) {
    console.error("Backend Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process data" },
      { status: 500 }
    );
  }
}
