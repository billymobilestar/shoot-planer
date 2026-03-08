"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { ArrowRight, Camera } from "lucide-react";
import Link from "next/link";

interface InviteData {
  id: string;
  token: string;
  role: string;
  projects: {
    id: string;
    name: string;
    description: string | null;
    cover_image_url: string | null;
  };
}

export default function InviteClient({ token }: { token: string }) {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [projectId, setProjectId] = useState("");

  useEffect(() => {
    async function fetchInvite() {
      const res = await fetch(`/api/invite/${token}`);
      if (res.ok) {
        setInvite(await res.json());
      } else {
        setError("This invite link is invalid or has expired.");
      }
    }
    fetchInvite();
  }, [token]);

  async function handleJoin() {
    setJoining(true);
    const res = await fetch(`/api/invite/${token}`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setProjectId(data.project_id);
      setJoined(true);
      setTimeout(() => router.push(`/project/${data.project_id}`), 1500);
    } else {
      setError("Failed to join. Please try again.");
    }
    setJoining(false);
  }

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Cover image */}
        {invite?.projects?.cover_image_url && (
          <div className="rounded-t-xl overflow-hidden h-48 relative">
            <img
              src={invite.projects.cover_image_url}
              alt={invite.projects.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
          </div>
        )}

        <div className={`bg-bg-card border border-border p-8 text-center ${
          invite?.projects?.cover_image_url ? "rounded-b-xl border-t-0" : "rounded-xl"
        }`}>
          {!invite?.projects?.cover_image_url && (
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8 text-accent" />
            </div>
          )}

          {error ? (
            <>
              <h2 className="text-xl font-semibold text-text-primary mb-2">Invalid Invite</h2>
              <p className="text-text-secondary mb-6">{error}</p>
              <Link href="/dashboard" className="text-accent hover:text-accent-hover">
                Go to Dashboard
              </Link>
            </>
          ) : !invite ? (
            <div className="animate-pulse space-y-3">
              <div className="h-6 bg-bg-card-hover rounded w-48 mx-auto" />
              <div className="h-4 bg-bg-card-hover rounded w-32 mx-auto" />
            </div>
          ) : joined ? (
            <>
              <h2 className="text-xl font-semibold text-text-primary mb-2">Joined!</h2>
              <p className="text-text-secondary mb-4">Redirecting to project...</p>
              <Link href={`/project/${projectId}`} className="text-accent hover:text-accent-hover flex items-center justify-center gap-1">
                Go to project <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          ) : !isSignedIn ? (
            <>
              <p className="text-text-muted text-xs uppercase tracking-wider mb-2">You&apos;re invited to</p>
              <h2 className="text-2xl font-bold text-text-primary mb-1">
                {invite.projects?.name}
              </h2>
              {invite.projects?.description && (
                <p className="text-text-secondary text-sm mb-3">{invite.projects.description}</p>
              )}
              <p className="text-text-muted text-sm mb-6">
                Role: <span className="capitalize text-text-secondary font-medium">{invite.role}</span>
              </p>
              <p className="text-text-secondary text-sm mb-6">Sign in or create an account to join this project.</p>
              <div className="flex gap-3 justify-center">
                <Link href="/sign-in" className="bg-accent hover:bg-accent-hover text-white rounded-lg px-6 py-2.5 font-medium transition-colors">
                  Sign In
                </Link>
                <Link href="/sign-up" className="bg-bg-card-hover border border-border text-text-primary rounded-lg px-6 py-2.5 transition-colors">
                  Sign Up
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-text-muted text-xs uppercase tracking-wider mb-2">You&apos;re invited to</p>
              <h2 className="text-2xl font-bold text-text-primary mb-1">
                {invite.projects?.name}
              </h2>
              {invite.projects?.description && (
                <p className="text-text-secondary text-sm mb-3">{invite.projects.description}</p>
              )}
              <p className="text-text-muted text-sm mb-6">
                You&apos;ll join as: <span className="capitalize text-text-secondary font-medium">{invite.role}</span>
              </p>
              <button
                onClick={handleJoin}
                disabled={joining}
                className="bg-accent hover:bg-accent-hover text-white rounded-lg px-8 py-3 font-medium transition-colors disabled:opacity-50 w-full"
              >
                {joining ? "Joining..." : "Join Project"}
              </button>
            </>
          )}

          <p className="text-text-muted text-[10px] mt-6">ShootPlaner</p>
        </div>
      </div>
    </div>
  );
}
