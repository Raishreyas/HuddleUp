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
    const { content } = await request.json();

    if (!content) {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    const message = await db.message.create({
      data: {
        roomId,
        senderId: user.clerkId,
        content,
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Error saving message:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// GET: Retrieve past messages for persistence in UI
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

    const messages = await db.message.findMany({
      where: { roomId },
      orderBy: { sentAt: "asc" },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
