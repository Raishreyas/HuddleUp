import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md space-y-8 flex flex-col items-center">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Welcome back to HuddleUp
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to start or join your video conferences
          </p>
        </div>
        <SignIn />
      </div>
    </div>
  );
}
