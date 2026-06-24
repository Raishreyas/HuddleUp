import { NextResponse } from "next/server";
import { syncUser } from "@/lib/user";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const user = await syncUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body = { name: "" };
    try {
      body = await request.json();
    } catch (e) {
      // Body may be empty
    }

    const roomName = body.name || `Meeting-${Math.random().toString(36).substring(2, 7)}`;

    // Create Room
    const room = await db.room.create({
      data: {
        name: roomName,
        hostId: user.clerkId,
        status: "waiting",
      },
    });

        // Create Participant record for Host
    await db.participant.create({
      data: {
        roomId: room.id,
        userId: user.clerkId,
        role: "host",
        status: "admitted",
      },
    });

    return NextResponse.json({ roomId: room.id }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating room:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
