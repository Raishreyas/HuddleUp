import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight, Video, Shield, MessageSquare, Users, Sparkles } from "lucide-react";

export default function LandingPage() {
  const { userId } = auth();

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-50 overflow-hidden relative">
      {/* Background Gradient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="px-6 lg:px-8 h-20 flex items-center border-b border-slate-900 backdrop-blur-md bg-slate-950/80 sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-2 bg-blue-600 rounded-xl group-hover:scale-105 transition-transform duration-300">
            <Video className="h-6 w-6 text-white" />
          </div>
          <span className="font-bold text-2xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            HuddleUp
          </span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          {userId ? (
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-6 font-medium text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 hover:shadow-blue-500/35 transition-all duration-300"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="text-sm font-medium hover:text-blue-400 transition-colors duration-200"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-800 px-5 text-sm font-medium hover:bg-slate-700 transition-colors duration-200 border border-slate-700"
              >
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col justify-center items-center">
        {/* Hero Section */}
        <section className="w-full py-16 md:py-24 lg:py-32 xl:py-48 px-6 text-center max-w-5xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/5 text-xs text-blue-400 font-medium mb-6 animate-pulse">
            <Sparkles className="h-3 w-3" />
            <span>Introducing Breakout Rooms & Lobby Controls</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent leading-none">
            Premium Video Conferences <br />
            For Modern Teams
          </h1>

          <p className="text-slate-400 text-lg md:text-xl max-w-3xl mb-10 leading-relaxed">
            Experience crisp video meetings, real-time in-call chat, interactive screen sharing, 
            and advanced breakout rooms—all secured and powered by LiveKit Cloud.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {userId ? (
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-8 font-semibold text-white shadow-xl shadow-blue-500/25 hover:bg-blue-500 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-300"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-8 font-semibold text-white shadow-xl shadow-blue-500/25 hover:bg-blue-500 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-300"
                >
                  Start a meeting
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 px-8 font-semibold hover:bg-slate-800/80 transition-all duration-300"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </section>

        {/* Features Grid */}
        <section className="w-full py-16 md:py-24 border-t border-slate-900 bg-slate-950/40 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/30 hover:border-slate-800 hover:-translate-y-1 transition-all duration-300">
              <div className="p-3 bg-blue-600/10 rounded-xl w-fit mb-4">
                <Video className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="text-lg font-bold mb-2">Group Video</h3>
              <p className="text-slate-400 text-sm">
                Up to 10 participants with dynamic adaptive grids, low-latency audio, and sharp video quality.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/30 hover:border-slate-800 hover:-translate-y-1 transition-all duration-300">
              <div className="p-3 bg-violet-600/10 rounded-xl w-fit mb-4">
                <Shield className="h-6 w-6 text-violet-500" />
              </div>
              <h3 className="text-lg font-bold mb-2">Waiting Room</h3>
              <p className="text-slate-400 text-sm">
                Host-controlled lobby for admitting or denying join requests in real-time, securing your meetings.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/30 hover:border-slate-800 hover:-translate-y-1 transition-all duration-300">
              <div className="p-3 bg-emerald-600/10 rounded-xl w-fit mb-4">
                <Users className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold mb-2">Breakout Rooms</h3>
              <p className="text-slate-400 text-sm">
                Easily divide attendees into distinct sub-rooms with custom assignments, and bring them back anytime.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/30 hover:border-slate-800 hover:-translate-y-1 transition-all duration-300">
              <div className="p-3 bg-cyan-600/10 rounded-xl w-fit mb-4">
                <MessageSquare className="h-6 w-6 text-cyan-500" />
              </div>
              <h3 className="text-lg font-bold mb-2">Live Text Chat</h3>
              <p className="text-slate-400 text-sm">
                Real-time persistent text chat with unread counts and data-channel distribution.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-900 text-center text-xs text-slate-500 bg-slate-950">
        <p>&copy; {new Date().getFullYear()} HuddleUp. All rights reserved. Powered by LiveKit Cloud.</p>
      </footer>
    </div>
  );
}
