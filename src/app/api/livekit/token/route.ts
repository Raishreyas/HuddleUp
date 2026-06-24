export const dynamic = "force-dynamic";

export const dynamic = "force-dynamic";

export const dynamic = "force-dynamic";

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { syncUser } from "@/lib/user";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const user = await syncUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId } = await request.json();

    if (!roomId) {
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
    }

    // Verify room exists
    const room = await db.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Verify participant is admitted (or is host)
    const participant = await db.participant.findFirst({
      where: {
        roomId,
        userId: user.clerkId,
      },
    });

    if (!participant || participant.status !== "admitted") {
      return NextResponse.json(
        { error: "Forbidden: You are not admitted to this room" },
        { status: 403 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      return NextResponse.json(
        { error: "LiveKit server credentials are not configured" },
        { status: 500 }
      );
    }

    // Generate LiveKit token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: user.clerkId,
      name: user.name,
    });

    at.addGrant({
      roomJoin: true,
      room: roomId,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true, // for chat & signals
    });

    const token = await at.toJwt();

    return NextResponse.json({ token, wsUrl });
  } catch (error) {
    console.error("Error generating LiveKit token:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}



