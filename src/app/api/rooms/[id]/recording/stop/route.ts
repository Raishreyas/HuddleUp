export const dynamic = "force-dynamic";


import { NextResponse } from "next/server";
import { EgressClient } from "livekit-server-sdk";
import { syncUser } from "@/lib/user";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await syncUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roomId = params.id;
    const body = await request.json();
    const { recordingId } = body;

    if (!recordingId) {
      return NextResponse.json({ error: "Missing recordingId" }, { status: 400 });
    }

    // Verify room exists and current user is host
    const room = await db.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.hostId !== user.clerkId) {
      return NextResponse.json(
        { error: "Forbidden: Only the host can stop recordings" },
        { status: 403 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY!;
    const apiSecret = process.env.LIVEKIT_API_SECRET!;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL!;

    // Stop LiveKit Egress
    const egressClient = new EgressClient(wsUrl, apiKey, apiSecret);
    await egressClient.stopEgress(recordingId);

    // Update database entry
    const recording = await db.recording.update({
      where: { id: recordingId },
      data: {
        endedAt: new Date(),
      },
    });

    return NextResponse.json(recording);
  } catch (error: any) {
    console.error("Error stopping recording:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
