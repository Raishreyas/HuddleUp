"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

export default function ScheduleModal() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    time: "",
    duration: "30",
    inviteeEmails: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const startAt = new Date(`${formData.date}T${formData.time}`);
      const durationMs = parseInt(formData.duration) * 60 * 1000;
      const endAt = new Date(startAt.getTime() + durationMs);

      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          inviteeEmails: formData.inviteeEmails,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to schedule meeting");
      }

      const data = await response.json();
      toast({
        title: "Meeting Scheduled!",
        description: "Your meeting has been successfully scheduled.",
        variant: "success",
      });
      setOpen(false);
      setFormData({
        title: "",
        date: "",
        time: "",
        duration: "30",
        inviteeEmails: "",
      });
      router.refresh();
      router.push(`/schedule/${data.id}`);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to schedule meeting. Please check details and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-100 font-semibold px-6 py-6 rounded-xl hover:border-slate-700 transition-all duration-300 flex items-center gap-2 text-base w-full sm:w-auto">
          <Calendar className="h-5 w-5 text-slate-400" />
          Schedule Meeting
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-500" /> Schedule a Meeting
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Set up a scheduled video conference and invite participants.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Meeting Title</label>
            <input
              type="text"
              name="title"
              required
              placeholder="e.g. Weekly Sync"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Date</label>
              <input
                type="date"
                name="date"
                required
                value={formData.date}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Time</label>
              <input
                type="time"
                name="time"
                required
                value={formData.time}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Duration (Minutes)</label>
            <select
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            >
              <option value="15">15 Minutes</option>
              <option value="30">30 Minutes</option>
              <option value="45">45 Minutes</option>
              <option value="60">1 Hour</option>
              <option value="90">1.5 Hours</option>
              <option value="120">2 Hours</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Invitee Emails (Comma separated)</label>
            <textarea
              name="inviteeEmails"
              rows={2}
              placeholder="e.g. alice@example.com, bob@example.com"
              value={formData.inviteeEmails}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none text-sm"
            />
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                "Schedule Meeting"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
