export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { EgressClient, EncodedFileType } from "livekit-server-sdk";
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

    // Verify room exists and current user is host
    const room = await db.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.hostId !== user.clerkId) {
      return NextResponse.json(
        { error: "Forbidden: Only the host can record" },
        { status: 403 }
      );
    }

    // Check if there is already an active recording
    const activeRecording = await db.recording.findFirst({
      where: {
        roomId,
        endedAt: null,
      },
    });

    if (activeRecording) {
      return NextResponse.json(
        { error: "Recording is already active" },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY!;
    const apiSecret = process.env.LIVEKIT_API_SECRET!;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL!;

    const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    const r2AccessKey = process.env.CLOUDFLARE_R2_ACCESS_KEY;
    const r2SecretKey = process.env.CLOUDFLARE_R2_SECRET_KEY;
    const r2Bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;

    if (!r2AccountId || !r2AccessKey || !r2SecretKey || !r2Bucket) {
      return NextResponse.json(
        { error: "Cloudflare R2 is not fully configured" },
        { status: 500 }
      );
    }

    // Start LiveKit Egress
    const egressClient = new EgressClient(wsUrl, apiKey, apiSecret);
    const filename = `recordings/${roomId}-${Date.now()}.mp4`;
    const r2Url = `https://${r2Bucket}.${r2AccountId}.r2.cloudflarestorage.com/${filename}`;

    const info = await egressClient.startRoomCompositeEgress(roomId, {
      file: {
        fileType: EncodedFileType.MP4,
        filepath: filename,
        disableManifest: true,
        output: {
          case: "s3",
          value: {
            accessKey: r2AccessKey,
            secret: r2SecretKey,
            region: "us-east-1",
            endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
            bucket: r2Bucket,
            forcePathStyle: true,
          },
        },
      },
    });

    const egressId = info.egressId;

    // Create recording database entry
    const recording = await db.recording.create({
      data: {
        id: egressId,
        roomId,
        r2Url,
        startedAt: new Date(),
      },
    });

    return NextResponse.json({ recordingId: recording.id, r2Url });
  } catch (error: any) {
    console.error("Error starting recording:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
