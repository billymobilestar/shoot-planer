"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Camera, ListChecks, Users, ArrowLeft, Pencil, Check, X, Upload } from "lucide-react";
import { Project, ShootDayWithLocations } from "@/lib/types";
import ItineraryView from "@/components/itinerary/ItineraryView";
import ReferencesView from "@/components/references/ReferencesView";
import ShotListView from "@/components/shots/ShotListView";
import TeamView from "@/components/team/TeamView";

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
  const [project, setProject] = useState<ProjectData | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.slice(1);
      if (["itinerary", "references", "shots", "team"].includes(hash)) return hash as TabId;
    }
    return "itinerary";
  });
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function fetchProject() {
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.ok) {
      const data = await res.json();
      setProject(data);
      setNameValue(data.name);
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchProject();
  }, [projectId]);

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
      <button
        onClick={() => router.push("/dashboard")}
        className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors text-sm mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </button>

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

      {/* Tabs */}
      <div className="border-b border-border mb-6">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-accent text-accent"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "itinerary" && <ItineraryView projectId={projectId} canEdit={canEdit} />}
      {activeTab === "references" && <ReferencesView projectId={projectId} canEdit={canEdit} />}
      {activeTab === "shots" && <ShotListView projectId={projectId} canEdit={canEdit} />}
      {activeTab === "team" && <TeamView projectId={projectId} canEdit={canEdit} isOwner={project.role === "owner"} />}
    </div>
  );
}
