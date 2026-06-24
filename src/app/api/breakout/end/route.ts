export const dynamic = "force-dynamic";





import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { syncUser } from "@/lib/user";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const hostUser = await syncUser();
    if (!hostUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId, sessionId } = await request.json();

    if (!roomId || !sessionId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify host
    const room = await db.room.findUnique({
      where: { id: roomId },
    });

    if (!room || room.hostId !== hostUser.clerkId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Mark breakout session as ended
    await db.breakoutSession.update({
      where: { id: sessionId },
      data: { status: "ended" },
    });

    // Find all participants in this room to generate new main room tokens
    const participants = await db.participant.findMany({
      where: {
        roomId,
        status: "admitted",
      },
      include: {
        user: true,
      },
    });

    const tokenMap: Record<string, string> = {};
    const apiKey = process.env.LIVEKIT_API_KEY!;
    const apiSecret = process.env.LIVEKIT_API_SECRET!;

    // Generate new main room token for each participant
    for (const part of participants) {
      const at = new AccessToken(apiKey, apiSecret, {
        identity: part.user.clerkId,
        name: part.user.name,
      });

      at.addGrant({
        roomJoin: true,
        room: roomId,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      const token = await at.toJwt();
      tokenMap[part.userId] = token;
    }

    return NextResponse.json({ tokenMap });
  } catch (error) {
    console.error("Error ending breakout session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}



