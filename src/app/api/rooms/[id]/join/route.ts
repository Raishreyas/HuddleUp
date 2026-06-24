export const dynamic = "force-dynamic";


import { NextResponse } from "next/server";
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

    // Check if room exists
    const room = await db.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Check if user is host
    const isHost = room.hostId === user.clerkId;

    // Check if participant record already exists
    let participant = await db.participant.findFirst({
      where: {
        roomId,
        userId: user.clerkId,
      },
    });

    if (participant) {
      // If it was denied, let them re-request by updating to waiting
      if (participant.status === "denied") {
        participant = await db.participant.update({
          where: { id: participant.id },
          data: { status: isHost ? "admitted" : "waiting" },
        });
      }
      return NextResponse.json(participant);
    }

    // Create participant record
    participant = await db.participant.create({
      data: {
        roomId,
        userId: user.clerkId,
        role: isHost ? "host" : "participant",
        status: isHost ? "admitted" : "waiting",
      },
    });

    return NextResponse.json(participant, { status: 201 });
  } catch (error) {
    console.error("Error joining room:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
