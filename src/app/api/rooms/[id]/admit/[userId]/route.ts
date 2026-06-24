import { NextResponse } from "next/server";
import { syncUser } from "@/lib/user";
import { db } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const hostUser = await syncUser();
    if (!hostUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const roomId = params.id;
    const targetUserId = params.userId;

    // Verify room exists and current user is host
    const room = await db.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.hostId !== hostUser.clerkId) {
      return NextResponse.json(
        { error: "Forbidden: Only the host can manage the lobby" },
        { status: 403 }
      );
    }

    let body = { action: "admit" };
    try {
      body = await request.json();
    } catch (e) {
      // Default to admit
    }

    const statusValue = body.action === "deny" ? "denied" : "admitted";

    // Find and update the target participant's status
    const participant = await db.participant.findFirst({
      where: {
        roomId,
        userId: targetUserId,
      },
    });

    if (!participant) {
      return NextResponse.json(
        { error: "Participant not found in this room" },
        { status: 404 }
      );
    }

    const updatedParticipant = await db.participant.update({
      where: { id: participant.id },
      data: {
        status: statusValue,
      },
    });

    // If the room was waiting and a user is admitted, update room status to active
    if (statusValue === "admitted" && room.status === "waiting") {
      await db.room.update({
        where: { id: roomId },
        data: { status: "active" },
      });
    }

    return NextResponse.json(updatedParticipant);
  } catch (error) {
    console.error("Error admitting participant:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
