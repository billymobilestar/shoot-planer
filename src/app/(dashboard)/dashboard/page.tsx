"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, FolderOpen, Zap, Crown, Users, Copy } from "lucide-react";
import { Project } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import CreateProjectModal from "@/components/CreateProjectModal";

interface SubInfo {
  plan: "free" | "pro";
  status: string;
}

function ProjectCard({ project, onClick, onDuplicate }: { project: Project; onClick: () => void; onDuplicate: () => void }) {
  return (
    <div className="relative group bg-bg-card border border-border rounded-xl overflow-hidden hover:border-border-light hover:bg-bg-card-hover transition-colors text-left">
      <button onClick={onClick} className="w-full text-left">
        {project.cover_image_url ? (
          <div className="h-32 overflow-hidden">
            <img
              src={project.cover_image_url}
              alt={project.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <div className="h-20 bg-linear-to-br from-accent/10 via-bg-card to-bg-primary" />
        )}
        <div className="p-5">
          <h3 className="text-lg font-semibold text-text-primary group-hover:text-accent transition-colors mb-1">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-text-secondary text-sm line-clamp-2 mb-3">{project.description}</p>
          )}
          <p className="text-text-muted text-xs">Created {formatDate(project.created_at)}</p>
        </div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
        title="Duplicate project"
        className="absolute top-2 right-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-bg-card/90 hover:bg-bg-card border border-border rounded-lg p-1.5 text-text-muted hover:text-text-primary"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const [ownedProjects, setOwnedProjects] = useState<Project[]>([]);
  const [collabProjects, setCollabProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [sub, setSub] = useState<SubInfo>({ plan: "free", status: "active" });
  const [createError, setCreateError] = useState("");
  const router = useRouter();

  async function fetchProjects() {
    const res = await fetch("/api/projects");
    if (res.ok) {
      const data = await res.json();
      setOwnedProjects(data.owned || []);
      setCollabProjects(data.collaborations || []);
    }
    setLoading(false);
  }

  async function fetchSub() {
    const res = await fetch("/api/subscription");
    if (res.ok) setSub(await res.json());
  }

  useEffect(() => {
    fetchProjects();
    fetchSub();
  }, []);

  const isPro = sub.plan === "pro" && sub.status !== "past_due";
  const atLimit = !isPro && ownedProjects.length >= 1;

  async function handleDuplicate(projectId: string) {
    const res = await fetch(`/api/projects/${projectId}/duplicate`, { method: "POST" });
    if (res.ok) fetchProjects();
  }

  function handleNewProject() {
    if (atLimit) {
      setCreateError("You've reached the free plan limit of 1 project. Upgrade to Pro for unlimited projects.");
      return;
    }
    setCreateError("");
    setShowCreate(true);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text-primary">Your Projects</h1>
          {isPro && (
            <span className="inline-flex items-center gap-1 bg-accent/10 text-accent text-xs font-medium px-2 py-0.5 rounded-full border border-accent/20">
              <Crown className="w-3 h-3" /> Pro
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!isPro && (
            <Link
              href="/pricing"
              className="flex items-center gap-1.5 text-accent hover:text-accent-hover text-sm font-medium transition-colors"
            >
              <Zap className="w-4 h-4" />
              Upgrade
            </Link>
          )}
          <button
            onClick={handleNewProject}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white rounded-lg px-4 py-2.5 font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>
      </div>

      {/* Upgrade banner for free users at limit */}
      {createError && (
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-text-primary text-sm font-medium">{createError}</p>
          </div>
          <Link
            href="/pricing"
            className="shrink-0 flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            View Plans
          </Link>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-bg-card border border-border rounded-xl p-6 animate-pulse h-40" />
          ))}
        </div>
      ) : ownedProjects.length === 0 && collabProjects.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-text-primary mb-2">No projects yet</h2>
          <p className="text-text-secondary mb-6">Create your first shoot project to get started.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-accent hover:bg-accent-hover text-white rounded-lg px-6 py-2.5 font-medium transition-colors"
          >
            Create Project
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Owned Projects */}
          {ownedProjects.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {ownedProjects.map((project) => (
                <ProjectCard key={project.id} project={project} onClick={() => router.push(`/project/${project.id}`)} onDuplicate={() => handleDuplicate(project.id)} />
              ))}
            </div>
          )}

          {/* Collaborations */}
          {collabProjects.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-text-muted" />
                <h2 className="text-lg font-semibold text-text-primary">Collaborations</h2>
                <span className="text-xs text-text-muted">({collabProjects.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {collabProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} onClick={() => router.push(`/project/${project.id}`)} onDuplicate={() => handleDuplicate(project.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal onCreated={fetchProjects} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}
