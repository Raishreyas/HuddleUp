"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Video, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function NewMeetingButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleNewMeeting = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to create meeting room");
      }

      const data = await response.json();
      toast({
        title: "Meeting created!",
        description: "Redirecting you to your meeting room...",
        variant: "success",
      });
      router.push(`/room/${data.roomId}`);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Could not create a meeting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleNewMeeting}
      disabled={loading}
      className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-6 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 transition-all duration-300 flex items-center gap-2 text-base w-full sm:w-auto"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Video className="h-5 w-5" />
      )}
      New Meeting (Instant)
    </Button>
  );
}
