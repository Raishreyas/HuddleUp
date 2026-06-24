import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Calendar, Clock, Users, ArrowLeft, Video, ExternalLink } from "lucide-react";
import { syncUser } from "@/lib/user";
import { db } from "@/lib/db";
import CopyButton from "@/components/CopyButton";

interface PageProps {
  params: {
    id: string;
  };
}

export const revalidate = 0;

export default async function ScheduleDetailsPage({ params }: PageProps) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const user = await syncUser();
  if (!user) redirect("/sign-in");

  const schedule = await db.schedule.findUnique({
    where: { id: params.id },
    include: { room: true },
  });

  if (!schedule) {
    redirect("/dashboard");
  }

  // Generate public join URL
  // In production, this would use headers to get the host, but here we can just use relative/absolute paths
  const joinUrl = `/room/${schedule.roomId}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background visual elements */}
      <div className="absolute top-1/4 left-1/4 w-[35%] h-[35%] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-lg bg-slate-900/40 border border-slate-900 rounded-3xl p-8 backdrop-blur-md space-y-6 z-10">
        <div className="flex items-center justify-between border-b border-slate-900 pb-4">
          <Link href="/dashboard" className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-sm font-medium transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs">
            Meeting Confirmed
          </Badge>
        </div>

        <div className="space-y-4">
          <div className="p-3.5 bg-blue-600/10 rounded-2xl w-fit">
            <Calendar className="h-7 w-7 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{schedule.title}</h1>
        </div>

        {/* Date and Time Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/40 border border-slate-900 p-4 rounded-2xl">
          <div className="flex items-start gap-2.5">
            <Calendar className="h-5 w-5 text-slate-500 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-xs text-slate-500 font-semibold block uppercase">Date</span>
              <span className="text-sm font-medium text-slate-200">
                {new Date(schedule.startAt).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Clock className="h-5 w-5 text-slate-500 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-xs text-slate-500 font-semibold block uppercase">Time</span>
              <span className="text-sm font-medium text-slate-200">
                {new Date(schedule.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {" - "}
                {new Date(schedule.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        </div>

        {/* Copy Link Section */}
        <div className="space-y-2">
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Meeting URL</label>
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-900 p-2.5 rounded-xl">
            <span className="text-xs text-slate-400 truncate flex-1 font-mono select-all">
              {joinUrl}
            </span>
            <CopyButton text={joinUrl} />
          </div>
        </div>

        {/* Invitees */}
        {schedule.inviteeEmails.length > 0 && (
          <div className="space-y-2.5">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-4 w-4 text-slate-500" />
              Invitees ({schedule.inviteeEmails.length})
            </label>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
              {schedule.inviteeEmails.map((email, idx) => (
                <span key={idx} className="px-2.5 py-1 bg-slate-900 border border-slate-850 rounded-lg text-xs text-slate-300">
                  {email}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Join button */}
        {schedule.roomId && (
          <Link href={`/room/${schedule.roomId}`} className="block w-full pt-2">
            <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-1.5">
              <Video className="h-5 w-5" />
              Start / Join Meeting
              <ExternalLink className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

// Simple Badge fallback helper
function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}
