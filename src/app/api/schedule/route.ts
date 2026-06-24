export const dynamic = "force-dynamic";

export const dynamic = "force-dynamic";

export const dynamic = "force-dynamic";

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { syncUser } from "@/lib/user";
import { db } from "@/lib/db";

// GET: list upcoming schedules for host
export async function GET() {
  try {
    const user = await syncUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schedules = await db.schedule.findMany({
      where: {
        hostId: user.clerkId,
        startAt: {
          gte: new Date(), // Only show upcoming or current
        },
      },
      include: {
        room: true,
      },
      orderBy: {
        startAt: "asc",
      },
    });

    return NextResponse.json(schedules);
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: create a scheduled meeting
export async function POST(request: Request) {
  try {
    const user = await syncUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, startAt, endAt, inviteeEmails } = body;

    if (!title || !startAt || !endAt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const start = new Date(startAt);
    const end = new Date(endAt);

    // Create a Room for this schedule
    const room = await db.room.create({
      data: {
        name: title,
        hostId: user.clerkId,
        scheduledAt: start,
        status: "waiting",
      },
    });

    // Host is automatically a participant
    await db.participant.create({
      data: {
        roomId: room.id,
        userId: user.clerkId,
        role: "host",
        status: "admitted",
      },
    });

    // Parse invite emails
    const emails = Array.isArray(inviteeEmails)
      ? inviteeEmails
      : typeof inviteeEmails === "string"
      ? inviteeEmails.split(",").map((e) => e.trim()).filter(Boolean)
      : [];

    // Create Schedule record
    const schedule = await db.schedule.create({
      data: {
        roomId: room.id,
        hostId: user.clerkId,
        title,
        startAt: start,
        endAt: end,
        inviteeEmails: emails,
      },
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error("Error creating schedule:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}



