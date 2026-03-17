"use client";

import { useState, useEffect, use, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, Camera, ListChecks, Users, ArrowLeft, Pencil, Check, X, Upload, Download, CalendarDays, ArrowRight } from "lucide-react";
import { Project, ShootDayWithLocations } from "@/lib/types";
import ItineraryView from "@/components/itinerary/ItineraryView";
import ReferencesView from "@/components/references/ReferencesView";
import ShotListView from "@/components/shots/ShotListView";
import TeamView from "@/components/team/TeamView";
import ChatBox from "@/components/chat/ChatBox";

interface ProjectData extends Project {
  role: "owner" | "admin" | "viewer";
  days: ShootDayWithLocations[];
}

const tabs = [
  { id: "itinerary", label: "Itinerary", icon: MapPin },
  { id: "references", label: "References", icon: Camera },
  { id: "shots", label: "Shot List", icon: ListChecks },
  { id: "team", label: "Team", icon: Users },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { user } = useUser();
  const currentUserId = user?.id ?? "";
  const searchParams = useSearchParams();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window !== "undefined") {
      // Check query param first (from notification deep links), then hash
      const tabParam = new URLSearchParams(window.location.search).get("tab");
      if (tabParam && ["itinerary", "references", "shots", "team"].includes(tabParam)) return tabParam as TabId;
      const hash = window.location.hash.slice(1);
      if (["itinerary", "references", "shots", "team"].includes(hash)) return hash as TabId;
    }
    return "itinerary";
  });
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [daysCount, setDaysCount] = useState(0);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function fetchProject() {
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.ok) {
      const data = await res.json();
      setProject(data);
      setNameValue(data.name);
      setDaysCount(data.days?.length ?? 0);
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  // Handle deep link scroll from notification clicks
  useEffect(() => {
    const refId = searchParams.get("ref");
    const locId = searchParams.get("loc");
    const targetId = refId || locId;
    if (!targetId || loading) return;

    // Small delay to let the tab content render
    const timeout = setTimeout(() => {
      const el = document.querySelector(`[data-id="${targetId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-accent", "ring-offset-2", "ring-offset-bg-primary");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-accent", "ring-offset-2", "ring-offset-bg-primary");
        }, 3000);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchParams, loading]);

  async function saveName() {
    if (!nameValue.trim() || !project) return;
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameValue.trim() }),
    });
    setProject((p) => (p ? { ...p, name: nameValue.trim() } : p));
    setEditingName(false);
  }

  async function saveStartDate(date: string) {
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start_date: date || null }),
    });
    setProject((p) => (p ? { ...p, start_date: date || null } : p));
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);

    const formData = new FormData();
    formData.append("file", file);
    const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });

    if (uploadRes.ok) {
      const { url } = await uploadRes.json();
      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cover_image_url: url }),
      });
      setProject((p) => (p ? { ...p, cover_image_url: url } : p));
    }
    setUploadingCover(false);
    e.target.value = "";
  }

  function switchTab(id: TabId) {
    setActiveTab(id);
    window.history.replaceState(null, "", `#${id}`);
  }

  const canEdit = project?.role === "owner" || project?.role === "admin";

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-48 bg-bg-card rounded-xl" />
          <div className="h-10 bg-bg-card rounded w-full max-w-lg" />
          <div className="h-96 bg-bg-card rounded-xl" />
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      {/* Back button */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </button>
        <a
          href={`/api/projects/${projectId}/export`}
          download
          className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors text-sm"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export</span>
        </a>
      </div>

      {/* Cover Photo + Header */}
      <div className="relative mb-6 rounded-xl overflow-hidden border border-border">
        {/* Cover image area */}
        <div className={`relative ${project.cover_image_url ? "h-52" : "h-32"} bg-linear-to-br from-accent/10 via-bg-card to-bg-primary`}>
          {project.cover_image_url && (
            <img
              src={project.cover_image_url}
              alt={project.name}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />

          {/* Cover upload button */}
          {canEdit && (
            <button
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/50 hover:bg-black/70 text-white text-xs rounded-lg px-3 py-1.5 transition-colors backdrop-blur-sm"
            >
              {uploadingCover ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-3 h-3" />
                  {project.cover_image_url ? "Change Cover" : "Add Cover Photo"}
                </>
              )}
            </button>
          )}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverUpload}
            className="hidden"
          />

          {/* Project info overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-4 pt-8">
            <div className="flex items-end gap-3">
              <div className="flex-1 min-w-0">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      className="text-2xl font-bold bg-black/40 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-1 text-white placeholder:text-white/50 focus:outline-none focus:border-accent"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveName();
                        if (e.key === "Escape") setEditingName(false);
                      }}
                    />
                    <button onClick={saveName} className="text-green-400 hover:text-green-300 bg-black/40 rounded-full p-1">
                      <Check className="w-5 h-5" />
                    </button>
                    <button onClick={() => setEditingName(false)} className="text-white/60 hover:text-white bg-black/40 rounded-full p-1">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-white drop-shadow-lg truncate">{project.name}</h1>
                    {canEdit && (
                      <button
                        onClick={() => setEditingName(true)}
                        className="text-white/60 hover:text-white transition-colors shrink-0"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
                {project.description && (
                  <p className="text-white/70 text-sm mt-1 line-clamp-1">{project.description}</p>
                )}
              </div>
              <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium backdrop-blur-sm ${
                project.role === "owner" || project.role === "admin"
                  ? "bg-accent/80 text-white"
                  : "bg-white/20 text-white/90"
              }`}>
                {project.role.charAt(0).toUpperCase() + project.role.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Shoot Date Banner */}
      {(() => {
        const startDate = project.start_date;
        const endDate = startDate && daysCount > 0
          ? (() => {
              const d = new Date(startDate + "T00:00:00");
              d.setDate(d.getDate() + daysCount - 1);
              return d;
            })()
          : null;
        const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
        const fmtStart = startDate ? fmtDate(new Date(startDate + "T00:00:00")) : "";

        if (!startDate && canEdit) {
          return (
            <div className="mb-4 rounded-xl border-2 border-dashed border-accent/40 bg-accent/5 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">When does your shoot start?</p>
                  <p className="text-xs text-text-muted mt-0.5">Set a start date to see dates on each day of your schedule</p>
                </div>
              </div>
              <input
                type="date"
                value=""
                onChange={(e) => saveStartDate(e.target.value)}
                className="bg-accent text-white text-sm font-medium rounded-lg px-4 py-2 cursor-pointer focus:outline-none hover:bg-accent-hover transition-colors"
              />
            </div>
          );
        }

        if (startDate) {
          return (
            <div className="mb-4 rounded-xl border border-border bg-bg-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-5 h-5 text-accent" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-text-primary font-semibold text-sm flex-wrap">
                    <span>{fmtStart}</span>
                    {endDate && daysCount > 1 && (
                      <>
                        <ArrowRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
                        <span>{fmtDate(endDate)}</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {daysCount} shoot {daysCount === 1 ? "day" : "days"}
                    {endDate && daysCount > 1 && ` · ${daysCount} ${daysCount === 1 ? "night" : "nights"}`}
                  </p>
                </div>
              </div>
              {canEdit && (
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => saveStartDate(e.target.value)}
                    className="bg-bg-input border border-border text-text-primary text-sm rounded-lg px-3 py-1.5 cursor-pointer focus:outline-none focus:border-accent"
                  />
                  {startDate && (
                    <button
                      onClick={() => saveStartDate("")}
                      className="text-text-muted hover:text-danger text-xs transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        }

        return null;
      })()}

      {/* Tabs */}
      <div className="border-b border-border mb-6 overflow-x-auto">
        <div className="flex gap-1 min-w-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-accent text-accent"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.id === "shots" ? "Shots" : tab.id === "itinerary" ? "Plan" : tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "itinerary" && <ItineraryView projectId={projectId} canEdit={canEdit} startDate={project.start_date ?? null} onDaysCountChange={setDaysCount} />}
      {activeTab === "references" && <ReferencesView projectId={projectId} canEdit={canEdit} />}
      {activeTab === "shots" && <ShotListView projectId={projectId} canEdit={canEdit} currentUserId={currentUserId} />}
      {activeTab === "team" && <TeamView projectId={projectId} canEdit={canEdit} isOwner={project.role === "owner"} />}

      <ChatBox projectId={projectId} />
    </div>
  );
}
