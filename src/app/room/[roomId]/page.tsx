import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { syncUser } from "@/lib/user";
import { db } from "@/lib/db";
import MeetingRoom from "@/components/MeetingRoom";

interface PageProps {
  params: {
    roomId: string;
  };
}

export const revalidate = 0; // Disable cache

export default async function RoomPage({ params }: PageProps) {
  const { userId } = auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await syncUser();
  if (!user) {
    redirect("/sign-in");
  }

  const { roomId } = params;

  // Retrieve room
  const room = await db.room.findUnique({
    where: { id: roomId },
  });

  if (!room) {
    redirect("/dashboard");
  }

  if (room.status === "ended") {
    // Redirect to dashboard
    redirect("/dashboard?error=ended");
  }

  // Check participant status
  const participant = await db.participant.findFirst({
    where: {
      roomId,
      userId: user.clerkId,
    },
  });

  const isHost = room.hostId === user.clerkId;

  // If not host and not admitted, redirect to lobby
  if (!isHost && (!participant || participant.status !== "admitted")) {
    redirect(`/room/${roomId}/lobby`);
  }

  // If host and no participant record yet, create one
  if (isHost && !participant) {
    await db.participant.create({
      data: {
        roomId,
        userId: user.clerkId,
        role: "host",
        status: "admitted",
      },
    });
  }

  return (
    <MeetingRoom
      roomId={roomId}
      userId={user.clerkId}
      userName={user.name}
      isHost={isHost}
    />
  );
}
