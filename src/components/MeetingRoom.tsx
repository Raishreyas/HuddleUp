"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
  useParticipants,
  useLocalParticipant,
} from "@livekit/components-react";
import { Track, RoomEvent, Room } from "livekit-client";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Monitor,
  MessageSquare,
  Users,
  LogOut,
  Settings,
  Send,
  Loader2,
  Users2,
  ShieldCheck,
  ShieldX,
  Volume2,
  HelpCircle,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface MeetingRoomProps {
  roomId: string;
  userId: string;
  userName: string;
  isHost: boolean;
}

export default function MeetingRoom({
  roomId,
  userId,
  userName,
  isHost,
}: MeetingRoomProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Connection token management
  const fetchToken = async (targetRoomId: string) => {
    try {
      const response = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: targetRoomId }),
      });

      if (!response.ok) {
        throw new Error("Failed to get room token");
      }

      const data = await response.json();
      setToken(data.token);
      setWsUrl(data.wsUrl);
    } catch (error) {
      console.error("Token fetch error:", error);
      toast({
        title: "Connection Error",
        description: "Could not establish connection credentials.",
        variant: "destructive",
      });
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToken(roomId);
  }, [roomId]);

  if (loading || !token || !wsUrl) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 text-slate-50">
        <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-400">Securing connection to LiveKit Cloud...</p>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={wsUrl}
      connect={true}
      video={true}
      audio={true}
      onDisconnected={() => {
        toast({
          title: "Disconnected",
          description: "You have left the meeting.",
        });
        router.push("/dashboard");
      }}
      className="flex flex-col h-screen w-screen bg-slate-950 text-slate-50 relative overflow-hidden"
    >
      <MeetingLayout
        roomId={roomId}
        isHost={isHost}
        userId={userId}
        userName={userName}
        fetchNewToken={fetchToken}
      />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

// ----------------------------------------------------
// Meeting Layout Component
// ----------------------------------------------------

interface MeetingLayoutProps {
  roomId: string;
  isHost: boolean;
  userId: string;
  userName: string;
  fetchNewToken: (targetRoomId: string) => Promise<void>;
}

interface ChatMessage {
  id: string;
  senderName: string;
  content: string;
  sentAt: Date;
}

interface LobbyRequest {
  userId: string;
  userName: string;
  avatarUrl?: string;
}

interface BreakoutRoomConfig {
  name: string;
  participants: string[];
}

function MeetingLayout({
  roomId,
  isHost,
  userId,
  userName,
  fetchNewToken,
}: MeetingLayoutProps) {
  const router = useRouter();
  const { toast } = useToast();
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  // Tracks
  const cameraTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const screenShareTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }]);

  // UI States
  const [chatOpen, setChatOpen] = useState(false);
  const [lobbyOpen, setLobbyOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Chat message list
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Lobby polling lists
  const [lobbyRequests, setLobbyRequests] = useState<LobbyRequest[]>([]);

  // Breakout state
  const [breakoutModalOpen, setBreakoutModalOpen] = useState(false);
  const [numRooms, setNumRooms] = useState(2);
  const [breakoutRooms, setBreakoutRooms] = useState<BreakoutRoomConfig[]>([
    { name: "Breakout Room 1", participants: [] },
    { name: "Breakout Room 2", participants: [] },
  ]);
  const [activeBreakoutSessionId, setActiveBreakoutSessionId] = useState<string | null>(null);
  const [isBreakoutActive, setIsBreakoutActive] = useState(false);
  const [breakoutRoomName, setBreakoutRoomName] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [recordingLoading, setRecordingLoading] = useState(false);

  // Media toggles (tracks)
  const isAudioEnabled = localParticipant?.isMicrophoneEnabled || false;
  const isVideoEnabled = localParticipant?.isCameraEnabled || false;
  const isScreenSharing = localParticipant?.isScreenShareEnabled || false;

  // Sync / Room context
  // We can access the Room object from localParticipant
  const room = localParticipant?.room;

  // Fetch past messages on join
  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}/chat`);
        if (response.ok) {
          const data = await response.json();
          const formatted = data.map((msg: any) => ({
            id: msg.id,
            senderName: msg.senderId === userId ? userName : "Participant", // fallback sender name
            content: msg.content,
            sentAt: new Date(msg.sentAt),
          }));
          setMessages(formatted);
        }
      } catch (err) {
        console.error("Error loading chat history:", err);
      }
    };
    fetchChatHistory();
  }, [roomId]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatOpen]);

  // Host Lobby Polling
  useEffect(() => {
    if (!isHost) return;

    const pollLobby = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}`);
        if (response.ok) {
          const data = await response.json();
          const waitingUsers = data.waiting.map((part: any) => ({
            userId: part.userId,
            userName: part.user.name,
          }));
          setLobbyRequests(waitingUsers);
        }
      } catch (err) {
        console.error("Error polling lobby:", err);
      }
    };

    pollLobby();
    const interval = setInterval(pollLobby, 4000);
    return () => clearInterval(interval);
  }, [isHost, roomId]);

  // General Participant status check (handles breakout end / state transitions)
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}`);
        if (response.ok) {
          const data = await response.json();
          // If room ended, force redirect
          if (data.status === "ended") {
            toast({
              title: "Meeting ended",
              description: "The host has ended this meeting.",
              variant: "destructive",
            });
            router.push("/dashboard");
          }

          // Update recording state
          if (data.activeRecordingId) {
            setIsRecording(true);
            setRecordingId(data.activeRecordingId);
          } else {
            setIsRecording(false);
            setRecordingId(null);
          }
        }
      } catch (err) {
        console.error("Error checking meeting status:", err);
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [roomId]);

  // Receive Data Channel events
  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array, participant?: any) => {
      try {
        const decoder = new TextDecoder();
        const str = decoder.decode(payload);
        const data = JSON.parse(str);

        if (data.type === "chat") {
          // Append chat message
          const newMsg: ChatMessage = {
            id: Math.random().toString(),
            senderName: data.senderName,
            content: data.content,
            sentAt: new Date(),
          };
          setMessages((prev) => [...prev, newMsg]);

          if (!chatOpen) {
            setUnreadCount((prev) => prev + 1);
          }
        } else if (data.type === "breakout_started") {
          // Participant is being redirected to sub-room!
          toast({
            title: "Breakout Room Started",
            description: `Redirecting you to ${data.roomName}...`,
            variant: "success",
          });
          setIsBreakoutActive(true);
          setBreakoutRoomName(data.roomName);
          
          // Force disconnect and reconnect with the new sub-room token
          if (room) {
            room.disconnect();
            // Re-fetch using new room token provided in data
            fetchNewToken(data.livekitRoomName || data.roomName);
          }
        } else if (data.type === "breakout_ended") {
          // Participant is returning to main room!
          toast({
            title: "Breakout Rooms Ended",
            description: "Returning to the main meeting room...",
          });
          setIsBreakoutActive(false);
          setBreakoutRoomName("");
          
          if (room) {
            room.disconnect();
            fetchNewToken(roomId);
          }
        } else if (data.type === "broadcast") {
          toast({
            title: "Broadcast from Host",
            description: data.content,
            variant: "default",
          });
        }
      } catch (err) {
        console.error("Data received parse error:", err);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, chatOpen, roomId]);

  // Handle admit/deny actions
  const handleLobbyAction = async (targetUserId: string, action: "admit" | "deny") => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/admit/${targetUserId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        toast({
          title: action === "admit" ? "User Admitted" : "User Denied",
          description: `The request was successfully completed.`,
          variant: "success",
        });
        setLobbyRequests((prev) => prev.filter((r) => r.userId !== targetUserId));
      }
    } catch (err) {
      console.error("Lobby action error:", err);
      toast({
        title: "Error",
        description: "Failed to perform lobby action.",
        variant: "destructive",
      });
    }
  };

  // Mute/camera/screenshare handlers
  const handleToggleAudio = async () => {
    if (!localParticipant) return;
    await localParticipant.setMicrophoneEnabled(!isAudioEnabled);
  };

  const handleToggleVideo = async () => {
    if (!localParticipant) return;
    await localParticipant.setCameraEnabled(!isVideoEnabled);
  };

  const handleToggleScreenShare = async () => {
    if (!localParticipant) return;

    if (!isScreenSharing) {
      // Check if someone else is already sharing
      const otherShares = screenShareTracks.filter((t) => t.participant.identity !== localParticipant.identity);
      if (otherShares.length > 0) {
        toast({
          title: "Screen Share Blocked",
          description: "Only one participant can share their screen at a time.",
          variant: "destructive",
        });
        return;
      }
      await localParticipant.setScreenShareEnabled(true);
      toast({
        title: "Screen Sharing",
        description: "You started sharing your screen.",
      });
    } else {
      await localParticipant.setScreenShareEnabled(false);
    }
  };

  // Chat send handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !room) return;

    const text = chatInput.trim();
    setChatInput("");

    // Append locally immediately
    const myMsg: ChatMessage = {
      id: Math.random().toString(),
      senderName: userName,
      content: text,
      sentAt: new Date(),
    };
    setMessages((prev) => [...prev, myMsg]);

    try {
      // 1. Publish to LiveKit Data Channel
      const encoder = new TextEncoder();
      const payload = encoder.encode(JSON.stringify({ type: "chat", senderName: userName, content: text }));
      await room.localParticipant.publishData(payload, { reliable: true });

      // 2. Persist to database in background
      await fetch(`/api/rooms/${roomId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Breakout configurations setup
  useEffect(() => {
    // Generate empty rooms list based on numRooms
    const list: BreakoutRoomConfig[] = [];
    for (let i = 1; i <= numRooms; i++) {
      list.push({
        name: `Breakout Room ${i}`,
        participants: [],
      });
    }
    setBreakoutRooms(list);
  }, [numRooms]);

  const handleAssignParticipant = (clerkId: string, roomIndex: number) => {
    setBreakoutRooms((prev) => {
      return prev.map((room, idx) => {
        // Remove from other rooms
        let list = room.participants.filter((p) => p !== clerkId);
        // Add to targeted room
        if (idx === roomIndex) {
          list.push(clerkId);
        }
        return { ...room, participants: list };
      });
    });
  };

  const handleStartBreakout = async () => {
    setBreakoutModalOpen(false);
    toast({
      title: "Starting Breakout Rooms",
      description: "Allocating sub-rooms and routing participants...",
    });

    try {
      const response = await fetch("/api/breakout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          rooms: breakoutRooms,
        }),
      });

      if (!response.ok) throw new Error("Failed to start breakouts");
      const data = await response.json();
      setActiveBreakoutSessionId(data.sessionId);
      setIsBreakoutActive(true);

      // Send tokens to each participant privately via LiveKit data channel
      const encoder = new TextEncoder();
      for (const [userId, target] of Object.entries(data.tokenMap)) {
        const payload = encoder.encode(
          JSON.stringify({
            type: "breakout_started",
            token: (target as any).token,
            roomName: (target as any).roomName,
            livekitRoomName: (target as any).roomName,
          })
        );

        // Send to specific participant identity
        await room?.localParticipant.publishData(payload, {
          reliable: true,
          destinationIdentities: [userId],
        });
      }

      toast({
        title: "Breakout Session Active",
        description: "All participants have been dispatched to their rooms.",
        variant: "success",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to initialize breakout session.",
        variant: "destructive",
      });
    }
  };

  const handleEndBreakout = async () => {
    if (!activeBreakoutSessionId) return;

    try {
      const response = await fetch("/api/breakout/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          sessionId: activeBreakoutSessionId,
        }),
      });

      if (!response.ok) throw new Error("Failed to end breakouts");
      const data = await response.json();

      // Dispatch end breakout signals to all participants
      const encoder = new TextEncoder();
      for (const [userId, targetToken] of Object.entries(data.tokenMap)) {
        const payload = encoder.encode(
          JSON.stringify({
            type: "breakout_ended",
            token: targetToken,
          })
        );

        await room?.localParticipant.publishData(payload, {
          reliable: true,
          destinationIdentities: [userId],
        });
      }

      setIsBreakoutActive(false);
      setActiveBreakoutSessionId(null);
      toast({
        title: "Breakouts ended",
        description: "Participants are returning to the main meeting room.",
        variant: "success",
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleBroadcastMessage = async () => {
    if (!broadcastMessage.trim() || !room) return;
    try {
      const encoder = new TextEncoder();
      const payload = encoder.encode(
        JSON.stringify({
          type: "broadcast",
          content: broadcastMessage.trim(),
        })
      );
      await room.localParticipant.publishData(payload, { reliable: true });
      setBroadcastMessage("");
      setBroadcastModalOpen(false);
      toast({
        title: "Broadcast Sent",
        description: "Message was broadcast to all participants.",
        variant: "success",
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleRecording = async () => {
    if (!isHost) return;
    setRecordingLoading(true);

    try {
      if (!isRecording) {
        // Start Recording
        const response = await fetch(`/api/rooms/${roomId}/recording/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to start recording");
        }

        const data = await response.json();
        setRecordingId(data.recordingId);
        setIsRecording(true);
        toast({
          title: "Recording Started",
          description: "This meeting is now being recorded to Cloudflare R2.",
          variant: "success",
        });
      } else {
        // Stop Recording
        if (!recordingId) return;

        const response = await fetch(`/api/rooms/${roomId}/recording/stop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recordingId }),
        });

        if (!response.ok) {
          throw new Error("Failed to stop recording");
        }

        setIsRecording(false);
        setRecordingId(null);
        toast({
          title: "Recording Stopped",
          description: "Recording compiled and saved successfully.",
          variant: "success",
        });
      }
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Recording Error",
        description: error.message || "Failed to toggle recording state.",
        variant: "destructive",
      });
    } finally {
      setRecordingLoading(false);
    }
  };

  const handleLeaveMeeting = async () => {
    if (confirm("Are you sure you want to leave this meeting?")) {
      if (isHost) {
        if (confirm("Do you want to end this meeting for everyone?")) {
          // Set room status to ended in DB
          try {
            await fetch(`/api/rooms/${roomId}/admit/host`, { // We can use host status endpoint or ended route.
              // Let's create an end meeting endpoint or handle it in client. For now, let's update room in DB
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "end_room" }), // We'll add this action to rooms API or run it directly.
            });
          } catch (e) {}
        }
      }
      room?.disconnect();
      router.push("/dashboard");
    }
  };

  // Grid Configuration
  // Camera tracks filter: remote only
  const remoteTracks = cameraTracks.filter((t) => t.participant.identity !== localParticipant?.identity);
  const selfTrack = cameraTracks.find((t) => t.participant.identity === localParticipant?.identity);
  
  // Decide columns for remote grid
  const remoteCount = remoteTracks.length;
  let gridColsClass = "grid-cols-1";
  if (remoteCount === 1) gridColsClass = "grid-cols-1 sm:grid-cols-2";
  else if (remoteCount === 2) gridColsClass = "grid-cols-1 sm:grid-cols-2";
  else if (remoteCount >= 3 && remoteCount <= 5) gridColsClass = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  else if (remoteCount >= 6) gridColsClass = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  const isSomeoneSharing = screenShareTracks.length > 0;
  const activeShareTrack = screenShareTracks[0];

  return (
    <div className="flex-1 flex flex-row relative h-full w-full overflow-hidden">
      {/* LEFT CONTENT AREA: Contains Grid + control bar */}
      <div className="flex-1 flex flex-col h-full bg-slate-950 p-4 relative justify-between gap-4">
        {/* Top Header info (Room Name / Breakout Status) */}
        <div className="flex items-center justify-between bg-slate-900/60 border border-slate-900 px-4 py-2.5 rounded-xl backdrop-blur-sm z-20">
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              Room ID: {roomId.substring(0, 8)}...
            </span>
            {isRecording && (
              <Badge variant="live" className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 animate-pulse text-[10px]">
                <span className="h-1.5 w-1.5 bg-red-500 rounded-full inline-block mr-1.5" />
                REC
              </Badge>
            )}
            {isBreakoutActive && (
              <Badge variant="success" className="animate-pulse bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
                {breakoutRoomName ? `Breakout: ${breakoutRoomName}` : "Breakout Active"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-slate-800 text-slate-400 text-xs">
              {participants.length} Active {participants.length === 1 ? "User" : "Users"}
            </Badge>
          </div>
        </div>

        {/* CENTER STAGE: VIDEO CALL VIEWS */}
        <div className="flex-1 flex items-center justify-center relative w-full overflow-hidden min-h-[300px]">
          {isSomeoneSharing ? (
            /* SCREEN SHARE LAYOUT: Screen share center, participants horizontal below */
            <div className="flex flex-col w-full h-full gap-4">
              <div className="flex-1 bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden relative group">
                <VideoTrack trackRef={activeShareTrack} className="object-contain w-full h-full" />
                <div className="absolute bottom-4 left-4 bg-slate-950/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-white z-10 flex items-center gap-1">
                  <Monitor className="h-3.5 w-3.5 text-blue-500 animate-pulse" />
                  {activeShareTrack.participant.name || "Participant"} is sharing screen
                </div>
              </div>
              
              {/* Row of participants below screen share */}
              <div className="h-32 sm:h-40 flex flex-row gap-3 overflow-x-auto py-1">
                {cameraTracks.map((track) => (
                  <div
                    key={track.participant.identity}
                    className="h-full aspect-video flex-shrink-0 bg-slate-900 border border-slate-850 rounded-xl overflow-hidden relative group"
                  >
                    <VideoTrack trackRef={track} className="object-cover w-full h-full" />
                    <div className="absolute bottom-2 left-2 bg-slate-950/70 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-white truncate max-w-[120px]">
                      {track.participant.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* STANDARD GRID LAYOUT */
            <div className="w-full h-full relative">
              {remoteTracks.length === 0 ? (
                /* ALONE STATE */
                <div className="w-full h-full flex flex-col items-center justify-center border border-slate-900 rounded-2xl bg-slate-900/10 text-slate-400">
                  <Users2 className="h-12 w-12 text-slate-600 mb-3" />
                  <p className="font-semibold text-slate-300">You are the only one here</p>
                  <p className="text-xs text-slate-500 mt-1">Share the room ID with others to start the huddle.</p>
                  
                  {/* Local preview centered if alone */}
                  {selfTrack && (
                    <div className="w-full max-w-sm aspect-video bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mt-6 relative shadow-2xl">
                      <VideoTrack trackRef={selfTrack} className="object-cover w-full h-full" />
                      <div className="absolute bottom-3 left-3 bg-slate-950/70 backdrop-blur-sm px-2.5 py-1 rounded text-xs text-white">
                        {userName} (Self)
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* PARTICIPANTS GRID */
                <div className={`grid ${gridColsClass} gap-4 w-full h-full items-center justify-center p-1 overflow-y-auto`}>
                  {remoteTracks.map((track) => (
                    <div
                      key={track.participant.identity}
                      className="aspect-video bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden relative group shadow-lg hover:border-slate-700 transition-all duration-300 w-full"
                    >
                      <VideoTrack trackRef={track} className="object-cover w-full h-full" />
                      
                      {/* Name overlay */}
                      <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-slate-800 text-xs text-slate-100 flex items-center gap-1">
                        <span>{track.participant.name || "Guest"}</span>
                        {!track.participant.isMicrophoneEnabled && (
                          <MicOff className="h-3 w-3 text-red-500 ml-1" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* PICTURE IN PICTURE SELF-VIEW: Renders in bottom-right corner if others are in the call */}
              {remoteTracks.length > 0 && selfTrack && (
                <div className="absolute bottom-4 right-4 w-40 sm:w-52 aspect-video bg-slate-900 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl z-30 transition-transform hover:scale-105 duration-300">
                  <VideoTrack trackRef={selfTrack} className="object-cover w-full h-full" />
                  <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-white">
                    {userName} (Self)
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM CONTROLS BAR: FLOATING DESIGN */}
        <div className="flex items-center justify-center py-2 z-20">
          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 px-6 py-3 rounded-2xl backdrop-blur-md shadow-2xl">
            {/* Audio Toggle */}
            <Button
              onClick={handleToggleAudio}
              variant="ghost"
              className={`h-11 w-11 rounded-xl p-0 transition-colors ${
                isAudioEnabled
                  ? "bg-slate-850 hover:bg-slate-800 text-slate-100"
                  : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
              }`}
            >
              {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>

            {/* Video Toggle */}
            <Button
              onClick={handleToggleVideo}
              variant="ghost"
              className={`h-11 w-11 rounded-xl p-0 transition-colors ${
                isVideoEnabled
                  ? "bg-slate-850 hover:bg-slate-800 text-slate-100"
                  : "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
              }`}
            >
              {isVideoEnabled ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>

            {/* Screen Share */}
            <Button
              onClick={handleToggleScreenShare}
              variant="ghost"
              className={`h-11 w-11 rounded-xl p-0 transition-colors ${
                isScreenSharing
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-slate-850 hover:bg-slate-800 text-slate-100"
              }`}
            >
              <Monitor className="h-5 w-5" />
            </Button>

            {/* Chat Toggle */}
            <Button
              onClick={() => {
                setChatOpen(!chatOpen);
                setUnreadCount(0); // clear count
              }}
              variant="ghost"
              className={`h-11 w-11 rounded-xl p-0 transition-colors relative ${
                chatOpen
                  ? "bg-slate-800 text-slate-100"
                  : "bg-slate-850 hover:bg-slate-800 text-slate-100"
              }`}
            >
              <MessageSquare className="h-5 w-5" />
              {!chatOpen && unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white rounded-full text-[10px] h-5 w-5 flex items-center justify-center font-bold animate-bounce">
                  {unreadCount}
                </span>
              )}
            </Button>

            {/* Breakout Rooms Button (Host only) */}
            {isHost && (
              <Button
                onClick={() => setBreakoutModalOpen(true)}
                variant="ghost"
                className="h-11 w-11 rounded-xl p-0 bg-slate-850 hover:bg-slate-800 text-slate-100 transition-colors"
                title="Breakout Rooms"
              >
                <Users className="h-5 w-5" />
              </Button>
            )}

            {/* Lobby List Toggle (Host only) */}
            {isHost && (
              <Button
                onClick={() => setLobbyOpen(!lobbyOpen)}
                variant="ghost"
                className={`h-11 w-11 rounded-xl p-0 transition-colors relative ${
                  lobbyOpen
                    ? "bg-slate-850 text-slate-100"
                    : "bg-slate-850 hover:bg-slate-800 text-slate-100"
                }`}
                title="Lobby Queue"
              >
                <Users2 className="h-5 w-5" />
                {lobbyRequests.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-yellow-600 text-white rounded-full text-[10px] h-5 w-5 flex items-center justify-center font-bold">
                    {lobbyRequests.length}
                  </span>
                )}
              </Button>
            )}

            {/* Record Toggle (Host only) */}
            {isHost && (
              <Button
                onClick={handleToggleRecording}
                disabled={recordingLoading}
                variant="ghost"
                className={`h-11 w-11 rounded-xl p-0 transition-colors ${
                  isRecording
                    ? "bg-red-600 hover:bg-red-500 text-white"
                    : "bg-slate-850 hover:bg-slate-800 text-slate-100"
                }`}
                title={isRecording ? "Stop Recording" : "Start Recording"}
              >
                {recordingLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className={`h-3 w-3 rounded-full ${isRecording ? "bg-white" : "bg-red-500"}`} />
                )}
              </Button>
            )}

            {/* Leave Meeting */}
            <Button
              onClick={handleLeaveMeeting}
              variant="ghost"
              className="h-11 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-colors flex items-center gap-1.5"
            >
              <LogOut className="h-4 w-4" />
              Leave
            </Button>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR: PANEL FOR CHAT */}
      {chatOpen && (
        <div className="w-80 h-full bg-slate-900 border-l border-slate-800 flex flex-col justify-between z-40 animate-slide-in">
          <div className="p-4 border-b border-slate-850 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              Meeting Chat
            </h3>
            <Button
              onClick={() => setChatOpen(false)}
              variant="ghost"
              className="text-slate-500 hover:text-slate-300 p-1 h-fit"
            >
              Close
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 pt-12">
                <MessageSquare className="h-8 w-8 text-slate-700 mb-2" />
                <p className="text-xs">No messages yet. Send a message to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => {
                  const isMe = msg.senderName === userName;
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"} space-y-1`}>
                      <span className="text-[10px] text-slate-500 font-medium">{msg.senderName}</span>
                      <div
                        className={`px-3 py-2 rounded-xl text-sm max-w-[240px] break-words ${
                          isMe ? "bg-blue-600 text-white" : "bg-slate-850 text-slate-100"
                        }`}
                      >
                        {msg.content}
                      </div>
                      <span className="text-[9px] text-slate-600">
                        {msg.sentAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>
            )}
          </ScrollArea>

          {/* Chat Form */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-850 flex gap-2">
            <input
              type="text"
              placeholder="Send message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
            />
            <Button type="submit" size="icon" className="bg-blue-600 hover:bg-blue-500 h-9 w-9">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}

      {/* RIGHT SIDEBAR: PANEL FOR LOBBY QUEUE */}
      {lobbyOpen && isHost && (
        <div className="w-80 h-full bg-slate-900 border-l border-slate-800 flex flex-col z-40">
          <div className="p-4 border-b border-slate-850 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
              <Users2 className="h-4 w-4 text-yellow-500" />
              Lobby Queue
            </h3>
            <Button
              onClick={() => setLobbyOpen(false)}
              variant="ghost"
              className="text-slate-500 hover:text-slate-300 p-1 h-fit"
            >
              Close
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {lobbyRequests.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 pt-12">
                <ShieldCheck className="h-8 w-8 text-slate-700 mb-2" />
                <p className="text-xs">No pending requests.</p>
              </div>
            ) : (
              lobbyRequests.map((req) => (
                <div
                  key={req.userId}
                  className="p-3 bg-slate-850 rounded-xl border border-slate-800 flex flex-col gap-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center text-xs font-bold">
                      {req.userName.charAt(0)}
                    </div>
                    <span className="text-xs font-semibold text-slate-200 truncate">{req.userName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleLobbyAction(req.userId, "admit")}
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold h-7 rounded-lg"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                      Admit
                    </Button>
                    <Button
                      onClick={() => handleLobbyAction(req.userId, "deny")}
                      size="sm"
                      className="flex-1 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 text-xs font-semibold h-7 rounded-lg"
                    >
                      <ShieldX className="h-3.5 w-3.5 mr-1" />
                      Deny
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* HOST MODALS */}
      {/* 1. BREAKOUT ROOMS SETTINGS MODAL */}
      <Dialog open={breakoutModalOpen} onOpenChange={setBreakoutModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Users className="h-5 w-5 text-blue-500" /> Breakout Rooms
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Divide your participants into custom sub-rooms.
            </DialogDescription>
          </DialogHeader>

          {isBreakoutActive ? (
            /* Breakout is already active: show controls to end / broadcast */
            <div className="space-y-4 py-4">
              <Badge variant="success" className="w-full justify-center py-2 animate-pulse text-sm">
                Breakout Session Active
              </Badge>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => setBroadcastModalOpen(true)}
                  className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-xs"
                >
                  <Megaphone className="h-4 w-4 mr-1" /> Broadcast Msg
                </Button>
                <Button
                  onClick={handleEndBreakout}
                  className="bg-red-600 hover:bg-red-500 text-xs"
                >
                  <LogOut className="h-4 w-4 mr-1" /> End Breakout
                </Button>
              </div>
            </div>
          ) : (
            /* Breakout Setup Form */
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold">NUMBER OF ROOMS</label>
                <select
                  value={numRooms}
                  onChange={(e) => setNumRooms(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm focus:outline-none"
                >
                  <option value="2">2 Rooms</option>
                  <option value="3">3 Rooms</option>
                  <option value="4">4 Rooms</option>
                  <option value="5">5 Rooms</option>
                </select>
              </div>

              {/* Assignment list */}
              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-semibold">ASSIGN PARTICIPANTS</label>
                <div className="border border-slate-850 rounded-xl p-3 bg-slate-950 max-h-48 overflow-y-auto space-y-2">
                  {participants
                    .filter((p) => p.identity !== localParticipant?.identity)
                    .map((p) => {
                      // Find which room they are currently assigned to
                      const currentRoomIdx = breakoutRooms.findIndex((room) =>
                        room.participants.includes(p.identity)
                      );
                      return (
                        <div key={p.identity} className="flex items-center justify-between gap-4 py-1 border-b border-slate-900/60 last:border-0">
                          <span className="text-xs truncate font-medium text-slate-300">{p.name || p.identity}</span>
                          <select
                            value={currentRoomIdx === -1 ? "" : currentRoomIdx.toString()}
                            onChange={(e) => {
                              if (e.target.value !== "") {
                                handleAssignParticipant(p.identity, parseInt(e.target.value));
                              }
                            }}
                            className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs focus:outline-none text-slate-100"
                          >
                            <option value="">Unassigned</option>
                            {breakoutRooms.map((room, roomIdx) => (
                              <option key={roomIdx} value={roomIdx.toString()}>
                                {room.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  {participants.filter((p) => p.identity !== localParticipant?.identity).length === 0 && (
                    <p className="text-xs text-center text-slate-600 py-4">No remote participants in the meeting to assign.</p>
                  )}
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button
                  onClick={handleStartBreakout}
                  disabled={participants.length <= 1}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-lg"
                >
                  Start Breakout Session
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 2. BROADCAST MESSAGE MODAL */}
      <Dialog open={broadcastModalOpen} onOpenChange={setBroadcastModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Megaphone className="h-5 w-5 text-blue-500" /> Broadcast to All Rooms
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Send a flash broadcast announcement to all breakout rooms.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <textarea
              placeholder="Type broadcast message..."
              rows={3}
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleBroadcastMessage}
              className="w-full bg-blue-600 hover:bg-blue-500"
            >
              Send Broadcast
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
