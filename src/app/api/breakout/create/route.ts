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
    const hostUser = await syncUser();
    if (!hostUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId, rooms } = await request.json();

    if (!roomId || !rooms || !Array.isArray(rooms)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify host
    const room = await db.room.findUnique({
      where: { id: roomId },
    });

    if (!room || room.hostId !== hostUser.clerkId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Create BreakoutSession
    const session = await db.breakoutSession.create({
      data: {
        roomId,
        name: `Breakout-${Date.now()}`,
        status: "active",
      },
    });

    const tokenMap: Record<string, { token: string; roomName: string; userName: string }> = {};

    const apiKey = process.env.LIVEKIT_API_KEY!;
    const apiSecret = process.env.LIVEKIT_API_SECRET!;

    // Process each breakout room
    for (let i = 0; i < rooms.length; i++) {
      const roomConfig = rooms[i];
      const livekitRoomName = `${roomId}-breakout-${i + 1}`;

      // Create BreakoutRoom record
      const breakoutRoom = await db.breakoutRoom.create({
        data: {
          sessionId: session.id,
          name: roomConfig.name,
          livekitRoomName,
        },
      });

      // Assign participants
      for (const clerkId of roomConfig.participants) {
        // Find main room participant ID
        const mainPart = await db.participant.findFirst({
          where: {
            roomId,
            userId: clerkId,
          },
          include: {
            user: true,
          },
        });

        if (mainPart) {
          // Create assignment
          await db.breakoutAssignment.create({
            data: {
              breakoutRoomId: breakoutRoom.id,
              participantId: mainPart.id,
            },
          });

          // Generate LiveKit token for sub-room
          const at = new AccessToken(apiKey, apiSecret, {
            identity: mainPart.user.clerkId,
            name: mainPart.user.name,
          });

          at.addGrant({
            roomJoin: true,
            room: livekitRoomName,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
          });

          const token = await at.toJwt();
          tokenMap[clerkId] = {
            token,
            roomName: roomConfig.name,
            userName: mainPart.user.name,
          };
        }
      }
    }

    // Also generate sub-room token for host (host goes to Room 1 by default, or stays in main, let's keep host in main room or allow host to join sub rooms. The host can choose, but they need tokens if they want to hop around. Let's return the session details so the host has control).
    return NextResponse.json({ sessionId: session.id, tokenMap });
  } catch (error) {
    console.error("Error creating breakout rooms:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}



