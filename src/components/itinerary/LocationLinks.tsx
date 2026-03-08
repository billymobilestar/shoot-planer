"use client";

import { useState, useEffect } from "react";
import { Plus, X, Link2, ExternalLink, Play } from "lucide-react";
import { LocationLink } from "@/lib/types";

const platformColors: Record<string, string> = {
  tiktok: "bg-[#010101] text-white",
  instagram: "bg-linear-to-br from-purple-600 to-pink-500 text-white",
  youtube: "bg-red-600 text-white",
  vimeo: "bg-[#1ab7ea] text-white",
  pinterest: "bg-[#e60023] text-white",
  other: "bg-bg-card-hover text-text-secondary",
};

const platformLabels: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  vimeo: "Vimeo",
  pinterest: "Pinterest",
  other: "Link",
};

interface Props {
  projectId: string;
  locationId: string;
  canEdit: boolean;
}

export default function LocationLinks({ projectId, locationId, canEdit }: Props) {
  const [links, setLinks] = useState<LocationLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchLinks() {
    const res = await fetch(`/api/projects/${projectId}/locations/${locationId}/links`);
    if (res.ok) setLinks(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchLinks();
  }, [projectId, locationId]);

  async function addLink() {
    if (!url.trim()) return;
    setSaving(true);

    const res = await fetch(`/api/projects/${projectId}/locations/${locationId}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim(), title: title.trim() || null, position: links.length }),
    });

    if (res.ok) {
      setUrl("");
      setTitle("");
      setShowAdd(false);
      fetchLinks();
    }
    setSaving(false);
  }

  async function deleteLink(linkId: string) {
    await fetch(`/api/projects/${projectId}/locations/${locationId}/links/${linkId}`, {
      method: "DELETE",
    });
    setLinks((prev) => prev.filter((l) => l.id !== linkId));
  }

  if (loading) return null;
  if (links.length === 0 && !canEdit) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="w-4 h-4 text-text-muted" />
        <span className="text-sm font-medium text-text-secondary">Links & References</span>
        <span className="text-xs text-text-muted">({links.length})</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block bg-bg-primary border border-border rounded-xl overflow-hidden hover:border-border-light transition-colors"
          >
            {/* Thumbnail preview */}
            {link.thumbnail_url ? (
              <div className="relative w-full aspect-3/4">
                <img
                  src={link.thumbnail_url}
                  alt={link.title || ""}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                  </div>
                </div>
                <div className="absolute top-2 left-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${platformColors[link.platform || "other"]}`}>
                    {platformLabels[link.platform || "other"]}
                  </span>
                </div>
                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteLink(link.id);
                    }}
                    className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ) : (
              <div className="relative w-full aspect-3/4 flex items-center justify-center bg-bg-card-hover">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${platformColors[link.platform || "other"]}`}>
                  <span className="text-lg font-bold">
                    {(link.platform || "link").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="absolute top-2 left-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${platformColors[link.platform || "other"]}`}>
                    {platformLabels[link.platform || "other"]}
                  </span>
                </div>
                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteLink(link.id);
                    }}
                    className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Info */}
            <div className="px-2 py-1.5">
              <p className="text-text-primary text-[11px] font-medium line-clamp-2 leading-tight">
                {link.title || link.url}
              </p>
              <div className="flex items-center gap-1 mt-1 text-text-muted">
                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                <span className="text-[9px] truncate">{new URL(link.url).hostname}</span>
              </div>
            </div>
          </a>
        ))}

        {/* Add link tile */}
        {canEdit && !showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="aspect-3/4 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-1.5 text-text-muted hover:text-accent hover:border-accent transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs">Add Link</span>
          </button>
        )}
      </div>

      {/* Add link form */}
      {canEdit && showAdd && (
        <div className="mt-3 p-3 bg-bg-primary border border-border rounded-lg space-y-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste URL (TikTok, Instagram, YouTube, etc.)"
            className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") addLink(); }}
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional - auto-detected from URL)"
            className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent"
            onKeyDown={(e) => { if (e.key === "Enter") addLink(); }}
          />
          <div className="flex gap-2">
            <button
              onClick={addLink}
              disabled={!url.trim() || saving}
              className="bg-accent hover:bg-accent-hover text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? "Fetching preview..." : "Add Link"}
            </button>
            <button
              onClick={() => { setShowAdd(false); setUrl(""); setTitle(""); }}
              className="text-text-secondary hover:text-text-primary text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
