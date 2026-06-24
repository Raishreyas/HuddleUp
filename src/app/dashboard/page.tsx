import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Calendar, Video, Clock, ChevronRight, VideoOff, History, Play } from "lucide-react";
import { syncUser } from "@/lib/user";
import { db } from "@/lib/db";
import NewMeetingButton from "@/components/NewMeetingButton";
import ScheduleModal from "@/components/ScheduleModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export const revalidate = 0; // Disable caching to ensure fresh DB records are always loaded

export default async function DashboardPage() {
  const { userId } = auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // Ensure user is synced with DB
  const user = await syncUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Fetch upcoming scheduled meetings
  const upcomingSchedules = await db.schedule.findMany({
    where: {
      hostId: user.clerkId,
      startAt: {
        gte: new Date(Date.now() - 1000 * 60 * 60 * 24), // Show meetings starting today/future
      },
    },
    include: {
      room: true,
    },
    orderBy: {
      startAt: "asc",
    },
  });

  // Fetch past rooms (ended) hosted by the user
  const pastRooms = await db.room.findMany({
    where: {
      hostId: user.clerkId,
      status: "ended",
    },
    include: {
      recordings: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="px-6 lg:px-8 h-20 flex items-center border-b border-slate-900 bg-slate-950/80 sticky top-0 z-50 backdrop-blur-md">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="p-2 bg-blue-600 rounded-xl">
            <Video className="h-6 w-6 text-white" />
          </div>
          <span className="font-bold text-2xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            HuddleUp
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm text-slate-400 hidden sm:inline-block">
            Hi, <span className="text-white font-medium">{user.name}</span>
          </span>
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "h-9 w-9 border border-slate-800",
              },
            }}
          />
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        {/* Welcome Section */}
        <section className="bg-gradient-to-r from-slate-900 to-slate-900/60 border border-slate-900 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[30%] h-full bg-blue-500/5 blur-[80px] pointer-events-none" />
          <div className="space-y-2 z-10">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Welcome to HuddleUp, {user.name.split(" ")[0]}!
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-xl">
              Host low-latency video conferences, invite guests, and manage breakout sub-meetings seamlessly.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 z-10">
            <NewMeetingButton />
            <ScheduleModal />
          </div>
        </section>

        {/* Meetings Section */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" /> Meeting Management
          </h2>

          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="bg-slate-900 border border-slate-800 p-1 rounded-lg">
              <TabsTrigger value="upcoming" className="data-[state=active]:bg-slate-800">
                Upcoming Meetings
                {upcomingSchedules.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-blue-500/10 text-blue-400 border-none text-[10px]">
                    {upcomingSchedules.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="past" className="data-[state=active]:bg-slate-800">
                Past Meetings
                {pastRooms.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-slate-800 text-slate-400 border-none text-[10px]">
                    {pastRooms.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Upcoming Meetings Tab */}
            <TabsContent value="upcoming" className="mt-4 focus-visible:outline-none">
              {upcomingSchedules.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10 text-slate-400">
                  <VideoOff className="h-10 w-10 text-slate-600 mb-3" />
                  <p className="font-semibold text-slate-300">No scheduled meetings</p>
                  <p className="text-sm text-slate-500 mt-1">Schedule one or start an instant meeting to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingSchedules.map((schedule) => {
                    const isToday = new Date(schedule.startAt).toDateString() === new Date().toDateString();
                    return (
                      <div
                        key={schedule.id}
                        className="p-5 rounded-2xl border border-slate-900 bg-slate-900/30 hover:border-slate-800 transition-all duration-300 flex flex-col justify-between gap-4"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                              <span className={`h-2 w-2 rounded-full ${isToday ? "bg-emerald-500" : "bg-blue-500"}`} />
                              {isToday ? "Today" : "Scheduled"}
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {new Date(schedule.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <h3 className="font-bold text-lg text-white line-clamp-1">{schedule.title}</h3>
                          <p className="text-xs text-slate-400">
                            Date: {new Date(schedule.startAt).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                          </p>
                          {schedule.inviteeEmails.length > 0 && (
                            <p className="text-xs text-slate-500 truncate">
                              Invitees: {schedule.inviteeEmails.join(", ")}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-900">
                          <Link
                            href={`/schedule/${schedule.id}`}
                            className="flex-1 text-center py-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors"
                          >
                            Details & Link
                          </Link>
                          {schedule.roomId && (
                            <Link
                              href={`/room/${schedule.roomId}`}
                              className="flex-1 text-center py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors flex items-center justify-center gap-1"
                            >
                              Start Meeting
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Past Meetings Tab */}
            <TabsContent value="past" className="mt-4 focus-visible:outline-none">
              {pastRooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed border-slate-800 rounded-2xl bg-slate-900/10 text-slate-400">
                  <History className="h-10 w-10 text-slate-600 mb-3" />
                  <p className="font-semibold text-slate-300">No meeting history found</p>
                  <p className="text-sm text-slate-500 mt-1">Your ended meetings with dynamic details will display here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pastRooms.map((room) => (
                    <div
                      key={room.id}
                      className="p-4 rounded-xl border border-slate-900 bg-slate-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <h3 className="font-semibold text-white">{room.name}</h3>
                        <p className="text-xs text-slate-500">
                          Meeting ID: {room.id} • Ended: {new Date(room.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {room.recordings && room.recordings.length > 0 ? (
                          room.recordings.map((recording) => (
                            <a
                              key={recording.id}
                              href={recording.r2Url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/20 transition-colors"
                            >
                              <Play className="h-3 w-3" />
                              View Recording
                            </a>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500 italic">No recording available</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </section>
      </main>
    </div>
  );
}
