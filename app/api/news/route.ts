export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirestoreOrNull } from "@/lib/firebase-admin";

export async function GET() {
  const db = getFirestoreOrNull();
  if (!db) {
    return NextResponse.json(
      { error: "Database not available. Set FIREBASE_CREDENTIALS_BASE64 or other Firebase env." },
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
