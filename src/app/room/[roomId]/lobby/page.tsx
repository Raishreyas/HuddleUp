"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ShieldAlert, Video, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LobbyPage() {
  const router = useRouter();
  const { roomId } = useParams() as { roomId: string };

  const [status, setStatus] = useState<"checking" | "waiting" | "denied" | "error">("checking");
  const [roomName, setRoomName] = useState("");

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkLobbyStatus = async () => {
      try {
        // First try to join / check status
        const joinRes = await fetch(`/api/rooms/${roomId}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!joinRes.ok) {
          if (joinRes.status === 404) {
            setStatus("error");
            return;
          }
          throw new Error("Failed to request entry to room");
        }

        const partData = await joinRes.json();
        
        // If host or already admitted, redirect to main room
        if (partData.role === "host" || partData.status === "admitted") {
          router.push(`/room/${roomId}`);
          return;
        }

        if (partData.status === "denied") {
          setStatus("denied");
          return;
        }

        setStatus("waiting");

        // Fetch room name
        const roomRes = await fetch(`/api/rooms/${roomId}`);
        if (roomRes.ok) {
          const roomData = await roomRes.json();
          setRoomName(roomData.name);
        }

        // Start polling every 3 seconds
        intervalId = setInterval(async () => {
          try {
            const checkRes = await fetch(`/api/rooms/${roomId}`);
            if (!checkRes.ok) return;

            const roomData = await checkRes.json();
            
            if (roomData.currentUserStatus === "admitted") {
              clearInterval(intervalId);
              router.push(`/room/${roomId}`);
            } else if (roomData.currentUserStatus === "denied") {
              clearInterval(intervalId);
              setStatus("denied");
            }
          } catch (err) {
            console.error("Lobby status check error:", err);
          }
        }, 3000);
      } catch (err) {
        console.error("Lobby initial join error:", err);
        setStatus("error");
      }
    };

    checkLobbyStatus();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [roomId, router]);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-50 p-6">
        <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-400">Verifying room status...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-50 p-6">
        <div className="p-4 bg-red-500/10 rounded-full mb-4">
          <ShieldAlert className="h-12 w-12 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Room Not Found</h1>
        <p className="text-slate-400 mb-6 text-center max-w-sm">
          The meeting room you are trying to access does not exist or may have been deleted.
        </p>
        <Link href="/dashboard" className="w-full max-w-xs">
          <Button className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-100 flex items-center justify-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-50 p-6">
        <div className="p-4 bg-red-500/10 rounded-full mb-4">
          <ShieldAlert className="h-12 w-12 text-red-500 animate-pulse" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-slate-400 mb-6 text-center max-w-sm">
          The meeting host has denied your request to join {roomName ? `"${roomName}"` : "the room"}.
        </p>
        <Link href="/dashboard" className="w-full max-w-xs">
          <Button className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-100 flex items-center justify-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Return to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-50 p-6 relative overflow-hidden">
      {/* Visual background lights */}
      <div className="absolute top-1/4 left-1/4 w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-md p-8 rounded-3xl border border-slate-900 bg-slate-900/40 backdrop-blur-md text-center space-y-6 z-10 flex flex-col items-center">
        <div className="p-4 bg-blue-600/10 rounded-2xl w-fit">
          <Video className="h-8 w-8 text-blue-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {roomName || "HuddleUp Meeting"}
          </h1>
          <p className="text-sm text-slate-400">Waiting for host to admit you...</p>
        </div>

        <div className="flex flex-col items-center justify-center py-6">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
          <p className="text-xs text-slate-500 max-w-[240px]">
            You will automatically enter the room as soon as the host approves your request.
          </p>
        </div>

        <Link href="/dashboard" className="w-full pt-4 border-t border-slate-900">
          <Button variant="ghost" className="w-full text-slate-400 hover:text-slate-300 flex items-center justify-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Cancel request
          </Button>
        </Link>
      </div>
    </div>
  );
}
