import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HuddleUp - Premium Video Conferencing",
  description: "A secure, fast, and feature-rich full-stack video conferencing application built with Next.js, LiveKit, Neon, and Clerk.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#3b82f6", // blue-500
          colorBackground: "#1e293b", // slate-800
          colorInputBackground: "#0f172a", // slate-900
          colorText: "#f8fafc", // slate-50
          colorTextSecondary: "#94a3b8", // slate-400
        },
      }}
    >
      <html lang="en" className="dark">
        <body className={`${inter.className} bg-slate-950 text-slate-50 antialiased min-h-screen`}>
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
