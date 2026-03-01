import { NextResponse } from "next/server";
import { getFirestore } from "@/lib/firebase-admin";

const db = getFirestore();

export async function GET() {
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
