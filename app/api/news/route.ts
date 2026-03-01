export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

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
      { error: "Database not available" },
      { status: 503 }
    );
  }
  try {
    const snapshot = await db
      .collection("news_events")
      .orderBy("timestamp", "desc")
      .limit(2000)
      .get();

    const data = snapshot.docs.map((doc) => {
      const docData = doc.data();
      const timestamp = docData.timestamp as
        | { toMillis?: () => number }
        | undefined;
      const timestampMs =
        timestamp && typeof timestamp.toMillis === "function"
          ? timestamp.toMillis()
          : Date.now();
      return {
        id: doc.id,
        ...docData,
        timestamp: timestampMs,
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Firestore Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch news events" },
      { status: 500 }
    );
  }
}
