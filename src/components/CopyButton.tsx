"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CopyButtonProps {
  text: string;
}

export default function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // Create absolute URL if it is a relative path
      const absoluteUrl = text.startsWith("/") 
        ? `${window.location.origin}${text}` 
        : text;

      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <Button
      onClick={handleCopy}
      variant="ghost"
      size="icon"
      className="h-8 w-8 hover:bg-slate-800 hover:text-slate-100 text-slate-400 rounded-lg shrink-0 transition-colors"
      title="Copy Link"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}
