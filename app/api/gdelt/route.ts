import { NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";
import * as admin from "firebase-admin";
import { getFirestore } from "@/lib/firebase-admin";
import { getBigQueryOptions } from "@/lib/google-credentials";

const db = getFirestore();

export async function GET() {
  try {
    // 2. Initialize BigQuery (from JSON file or base64 env)
    const bqOptions = getBigQueryOptions();
    const bigquery = new BigQuery(bqOptions);

    // 3. Fetch the latest 15 minutes of news
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

    // 4. Save to Firebase Firestore using a Batch write (super fast!)
    const batch = db.batch();
    let savedCount = 0;

    rows.forEach((row: Record<string, unknown>) => {
      // Use the GLOBALEVENTID as the document ID to prevent duplicates
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
          timestamp: admin.firestore.FieldValue.serverTimestamp(), // Records exactly when we saved it
        },
        { merge: true }
      );

      savedCount++;
    });

    // Execute the batch save
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
