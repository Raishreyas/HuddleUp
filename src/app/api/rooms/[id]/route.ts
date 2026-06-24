export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { syncUser } from "@/lib/user";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await syncUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roomId = params.id;

    const room = await db.room.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
        recordings: {
          where: { endedAt: null },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Check if the current user is host
    const isHost = room.hostId === user.clerkId;

    // Filter participants by status
    const admitted = room.participants.filter((p) => p.status === "admitted");
    const waiting = room.participants.filter((p) => p.status === "waiting");

    // Also get the status of the current user
    const currentUserParticipant = room.participants.find(
      (p) => p.userId === user.clerkId
    );

    const activeRecording = room.recordings[0] || null;

    return NextResponse.json({
      id: room.id,
      name: room.name,
      hostId: room.hostId,
      status: room.status,
      isHost,
      currentUserStatus: currentUserParticipant?.status || null,
      admitted,
      waiting,
      activeRecordingId: activeRecording?.id || null,
    });
  } catch (error) {
    console.error("Error fetching room details:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
