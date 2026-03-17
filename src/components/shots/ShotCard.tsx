"use client";

import { useState, useRef, useEffect } from "react";
import { Trash2, MapPin, ChevronDown, Check, Upload, Image as ImageIcon, X, Square, CheckSquare, Film, Clock, FileText, Loader2 } from "lucide-react";
import { Shot, Location, Scene, ShotStatus, ShootReference } from "@/lib/types";
import { parseFountain, applyInlineFormatting } from "@/lib/fountain";
import type { FountainElement } from "@/lib/fountain";
import ShotComments from "./ShotComments";

function FountainPreview({ text }: { text: string }) {
  const elements = parseFountain(text);
  function renderElement(el: FountainElement, idx: number) {
    const inline = (t: string) => ({ __html: applyInlineFormatting(t) });
    switch (el.type) {
      case "scene_heading":
        return <p key={idx} className="font-bold uppercase tracking-wide mt-6 mb-1 text-text-primary border-b border-border pb-1">{el.text}</p>;
      case "action":
        return <p key={idx} className="my-1 text-text-primary leading-relaxed" dangerouslySetInnerHTML={inline(el.text!)} />;
      case "character":
        return <p key={idx} className="mt-4 mb-0 font-semibold uppercase tracking-wider text-center text-text-primary">{el.text}</p>;
      case "parenthetical":
        return <p key={idx} className="italic text-center text-text-secondary text-sm my-0">{el.text}</p>;
      case "dialogue":
        return <p key={idx} className="text-center max-w-xs mx-auto my-0.5 text-text-primary leading-relaxed" dangerouslySetInnerHTML={inline(el.text!)} />;
      case "transition":
        return <p key={idx} className="text-right uppercase italic text-text-secondary mt-4 mb-1 text-sm">{el.text}</p>;
      case "centered":
        return <p key={idx} className="text-center my-2 text-text-primary" dangerouslySetInnerHTML={inline(el.text!)} />;
      case "page_break":
        return <hr key={idx} className="border-border my-4" />;
      case "blank":
        return <div key={idx} className="h-2" />;
      default:
        return null;
    }
  }
  return <div className="font-mono text-sm leading-relaxed px-2">{elements.map((el, i) => renderElement(el, i))}</div>;
}

function fmtMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function SceneViewerModal({ scene, onClose }: { scene: Scene; onClose: () => void }) {
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [loadingDocx, setLoadingDocx] = useState(false);

  const fileName = scene.scene_file_name || "";
  const isDocx = fileName.toLowerCase().endsWith(".docx") || fileName.toLowerCase().endsWith(".doc");
  const isPdf = fileName.toLowerCase().endsWith(".pdf");
  const hasContent = !!scene.scene_text || !!scene.scene_file_url;

  useEffect(() => {
    if (isDocx && scene.scene_file_url && !docxHtml) {
      setLoadingDocx(true);
      import("mammoth").then((mammoth) => {
        fetch(scene.scene_file_url!)
          .then((r) => r.arrayBuffer())
          .then((buf) => mammoth.default.convertToHtml({ arrayBuffer: buf }))
          .then((result) => setDocxHtml(result.value))
          .catch(() => setDocxHtml("<p style='color:red'>Could not render document.</p>"))
          .finally(() => setLoadingDocx(false));
      });
    }
  }, [isDocx, scene.scene_file_url, docxHtml]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg-card border border-border rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <Film className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-text-primary truncate text-base">
              {scene.title || "Untitled Scene"}
            </h3>
            {scene.duration_minutes > 0 && (
              <p className="flex items-center gap-1 text-xs text-text-muted mt-0.5">
                <Clock className="w-3 h-3" />
                {fmtMins(scene.duration_minutes)} estimated
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors p-1.5 hover:bg-bg-card-hover rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          {scene.scene_text && (
            <div className="rounded-xl bg-bg-primary border border-border p-5">
              <FountainPreview text={scene.scene_text} />
            </div>
          )}

          {scene.scene_file_url && isPdf && (
            <iframe
              src={scene.scene_file_url}
              className="w-full min-h-[50vh] rounded-xl border border-border"
              title={scene.scene_file_name || "Scene file"}
            />
          )}

          {scene.scene_file_url && isDocx && (
            <div className="rounded-xl bg-bg-primary border border-border p-5">
              {loadingDocx ? (
                <div className="flex items-center justify-center py-12 gap-2 text-text-muted">
                  <Loader2 className="w-5 h-5 animate-spin" />Loading document...
                </div>
              ) : docxHtml ? (
                <div className="prose prose-sm max-w-none text-text-primary" dangerouslySetInnerHTML={{ __html: docxHtml }} />
              ) : null}
            </div>
          )}

          {scene.scene_file_url && !isPdf && !isDocx && (
            <a href={scene.scene_file_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-accent hover:text-accent-hover p-4 rounded-xl border border-border bg-bg-primary hover:bg-accent/5 transition-colors">
              <FileText className="w-5 h-5" />
              <span>Download {fileName || "file"}</span>
            </a>
          )}

          {!hasContent && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Film className="w-10 h-10 text-text-muted mb-3" />
              <p className="text-text-muted text-sm">No scene content yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const statusStyles: Record<ShotStatus, string> = {
  planned: "bg-warning/10 text-warning",
  in_progress: "bg-accent-muted text-accent",
  completed: "bg-green-500/10 text-success",
  cancelled: "bg-bg-card-hover text-text-muted",
};

const statusDots: Record<ShotStatus, string> = {
  planned: "bg-warning",
  in_progress: "bg-accent",
  completed: "bg-success",
  cancelled: "bg-text-muted",
};

const statusLabels: Record<ShotStatus, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const shotTypes = [
  "Wide", "Medium", "Close-up", "Extreme Close-up", "Aerial/Drone",
  "Tracking", "Handheld", "Timelapse", "Slow Motion", "POV", "Other",
];

interface Props {
  shot: Shot;
  locations: Location[];
  references: ShootReference[];
  canEdit: boolean;
  projectId: string;
  currentUserId: string;
  onUpdate: () => void;
  onRequestDelete: () => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
}

export default function ShotCard({ shot, locations, references, canEdit, projectId, currentUserId, onUpdate, onRequestDelete, isSelected, onToggleSelect, expanded, onToggleExpand }: Props) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [editImageUrl, setEditImageUrl] = useState(shot.image_url || "");
  const [uploadingImage, setUploadingImage] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [showSceneViewer, setShowSceneViewer] = useState(false);
  const [form, setForm] = useState({
    title: shot.title,
    description: shot.description || "",
    shot_type: shot.shot_type || "",
    status: shot.status,
    location_id: shot.location_id || "",
    scene_id: shot.scene_id || "",
    notes: shot.notes || "",
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    }
    if (statusOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [statusOpen]);

  // Fetch scenes for the selected location
  useEffect(() => {
    const locId = form.location_id;
    if (!locId) { setScenes([]); return; }
    fetch(`/api/projects/${projectId}/locations/${locId}/scenes`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setScenes(d));
  }, [form.location_id, projectId]);

  const assignedLocation = locations.find((l) => l.id === shot.location_id);
  const assignedScene = scenes.find((s) => s.id === shot.scene_id);
  const existingImages = references.filter((r) => r.image_url);

  async function save() {
    await fetch(`/api/projects/${projectId}/shots/${shot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        description: form.description || null,
        shot_type: form.shot_type || null,
        status: form.status,
        location_id: form.location_id || null,
        scene_id: form.scene_id || null,
        notes: form.notes || null,
        image_url: editImageUrl || null,
      }),
    });
    onUpdate();
  }

  async function quickStatusChange(status: ShotStatus) {
    await fetch(`/api/projects/${projectId}/shots/${shot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setForm((f) => ({ ...f, status }));
    onUpdate();
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const { url } = await res.json();
      setEditImageUrl(url);
      setShowImagePicker(false);
    }
    setUploadingImage(false);
  }

  return (
    <div className={`bg-bg-card border rounded-xl overflow-hidden transition-all relative group/shot ${isSelected ? "border-accent ring-1 ring-accent" : "border-border hover:border-border-light"}`}>
      {/* Top action bar — always visible on hover / touch */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-2 pointer-events-none">
        {/* Bulk select checkbox */}
        {onToggleSelect ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
            className="pointer-events-auto text-text-muted hover:text-accent transition-colors bg-bg-card/80 backdrop-blur-sm rounded-lg p-1.5"
          >
            {isSelected ? (
              <CheckSquare className="w-4 h-4 text-accent" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>
        ) : <div />}

        {/* Delete button */}
        {canEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onRequestDelete(); }}
            className="pointer-events-auto opacity-0 group-hover/shot:opacity-100 focus:opacity-100 transition-opacity bg-bg-card/80 backdrop-blur-sm text-text-muted hover:text-danger rounded-lg p-1.5"
            title="Delete shot"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Clickable card area */}
      <div
        onClick={() => canEdit && onToggleExpand()}
        className={canEdit ? "cursor-pointer" : ""}
      >
        {/* Image */}
        {shot.image_url && (
          <img src={shot.image_url} alt={shot.title} className="w-full h-52 object-cover" />
        )}

        {/* Card body — collapsed info */}
        <div className="p-4 pb-2">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className={`font-semibold text-text-primary ${onToggleSelect ? "pl-6" : ""}`}>{shot.title}</h4>
            {canEdit && (
              <ChevronDown className={`w-4 h-4 text-text-muted shrink-0 mt-1 transition-transform ${expanded ? "rotate-180" : ""}`} />
            )}
          </div>

          {/* Tags row */}
          <div className="flex flex-wrap gap-2 mb-2" onClick={(e) => e.stopPropagation()}>
            {canEdit ? (
              <div className="relative" ref={statusRef}>
                <button
                  onClick={() => setStatusOpen(!statusOpen)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 cursor-pointer hover:ring-2 hover:ring-accent/30 transition-all ${statusStyles[form.status]}`}
                >
                  {statusLabels[form.status]}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {statusOpen && (
                  <div className="absolute top-full left-0 mt-1 z-20 bg-bg-card border border-border rounded-lg shadow-lg py-1 min-w-35">
                    {(Object.keys(statusLabels) as ShotStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => { quickStatusChange(s); setStatusOpen(false); }}
                        className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-bg-card-hover transition-colors ${form.status === s ? "text-accent font-medium" : "text-text-secondary"}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${statusDots[s]}`} />
                        {statusLabels[s]}
                        {form.status === s && <Check className="w-3 h-3 ml-auto" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyles[shot.status]}`}>
                {statusLabels[shot.status]}
              </span>
            )}
            {shot.shot_type && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-bg-card-hover text-text-secondary">
                {shot.shot_type}
              </span>
            )}
          </div>

          {/* Description preview */}
          {shot.description && !expanded && (
            <p className="text-text-secondary text-sm leading-relaxed line-clamp-2 mb-1">
              {shot.description}
            </p>
          )}

          {/* Location & scene badges */}
          {!expanded && (assignedLocation || assignedScene) && (
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {assignedLocation && (
                <span className="flex items-center gap-1.5 text-sm text-accent">
                  <MapPin className="w-3.5 h-3.5" />
                  {assignedLocation.name}
                </span>
              )}
              {assignedScene && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowSceneViewer(true); }}
                  className="flex items-center gap-1.5 text-xs text-text-secondary bg-bg-card-hover hover:bg-accent/10 hover:text-accent rounded-full px-2 py-0.5 transition-colors"
                >
                  <Film className="w-3 h-3" />
                  {assignedScene.title || "Untitled scene"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Scene viewer modal */}
      {showSceneViewer && assignedScene && (
        <SceneViewerModal scene={assignedScene} onClose={() => setShowSceneViewer(false)} />
      )}

      {/* Expanded detail / edit area */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3" onClick={(e) => e.stopPropagation()}>
          {/* Description (read-only for viewers, or full view for editors before the form) */}
          {shot.description && !canEdit && (
            <p className="text-text-secondary text-sm leading-relaxed">
              {shot.description}
            </p>
          )}

          {(assignedLocation || assignedScene) && (
            <div className="flex flex-wrap items-center gap-3">
              {assignedLocation && (
                <span className="flex items-center gap-1.5 text-sm text-accent">
                  <MapPin className="w-3.5 h-3.5" />
                  {assignedLocation.name}
                </span>
              )}
              {assignedScene && (
                <button
                  onClick={() => setShowSceneViewer(true)}
                  className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent transition-colors"
                >
                  <Film className="w-3.5 h-3.5" />
                  {assignedScene.title || "Untitled scene"}
                </button>
              )}
            </div>
          )}

          {shot.notes && !canEdit && (
            <div className="bg-bg-primary rounded-lg p-3 border border-border">
              <p className="text-text-secondary text-sm leading-relaxed">{shot.notes}</p>
            </div>
          )}

          {/* Editable form */}
          {canEdit && (
            <div className="pt-3 border-t border-border space-y-3">
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description"
                rows={2}
                className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent resize-none"
              />

              {/* Reference image editor */}
              <div>
                <label className="block text-xs text-text-muted mb-1">Reference Image</label>
                {editImageUrl ? (
                  <div className="relative">
                    <img src={editImageUrl} alt="" className="w-full rounded-lg object-contain max-h-32" />
                    <button
                      type="button"
                      onClick={() => { setEditImageUrl(""); setShowImagePicker(false); }}
                      className="absolute top-1.5 right-1.5 bg-black/60 rounded-full p-1 text-white hover:bg-black/80"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : showImagePicker ? (
                  <div className="space-y-2">
                    <label className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-lg text-text-secondary hover:text-accent hover:border-accent transition-colors cursor-pointer text-xs">
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingImage ? "Uploading..." : "Upload new"}
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                    {existingImages.length > 0 && (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 border-t border-border" />
                          <span className="text-[10px] text-text-muted">from moodboard</span>
                          <div className="flex-1 border-t border-border" />
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-32 overflow-y-auto p-0.5">
                          {existingImages.map((ref) => (
                            <button
                              key={ref.id}
                              type="button"
                              onClick={() => { setEditImageUrl(ref.image_url); setShowImagePicker(false); }}
                              className="relative w-full rounded-lg overflow-hidden border-2 border-border hover:border-accent active:border-accent transition-colors group/img"
                            >
                              <div className="w-full pt-[100%] relative">
                                <img src={ref.image_url} alt={ref.title || ""} className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-accent/0 group-hover/img:bg-accent/20 active:bg-accent/20 transition-colors flex items-center justify-center">
                                  <Check className="w-4 h-4 text-white opacity-0 group-hover/img:opacity-100 drop-shadow-lg transition-opacity" />
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    <button type="button" onClick={() => setShowImagePicker(false)} className="w-full text-center text-[11px] text-text-muted hover:text-text-primary py-0.5">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-border rounded-lg text-text-secondary hover:text-accent hover:border-accent transition-colors cursor-pointer text-xs">
                      <Upload className="w-3.5 h-3.5" />
                      Upload
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                    {existingImages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowImagePicker(true)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-border rounded-lg text-text-secondary hover:text-accent hover:border-accent transition-colors text-xs"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        Existing
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.shot_type}
                  onChange={(e) => setForm((f) => ({ ...f, shot_type: e.target.value }))}
                  className="bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
                >
                  <option value="">Shot Type</option>
                  {shotTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <select
                  value={form.status}
                  onChange={(e) => {
                    const s = e.target.value as ShotStatus;
                    setForm((f) => ({ ...f, status: s }));
                    quickStatusChange(s);
                  }}
                  className="bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
                >
                  {Object.entries(statusLabels).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <select
                value={form.location_id}
                onChange={(e) => setForm((f) => ({ ...f, location_id: e.target.value, scene_id: "" }))}
                className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
              >
                <option value="">Assign to location</option>
                {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
              </select>
              {form.location_id && scenes.length > 0 && (
                <select
                  value={form.scene_id}
                  onChange={(e) => setForm((f) => ({ ...f, scene_id: e.target.value }))}
                  className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
                >
                  <option value="">Attach to scene (optional)</option>
                  {scenes.map((sc) => <option key={sc.id} value={sc.id}>{sc.title || "Untitled scene"}{sc.duration_minutes ? ` (${sc.duration_minutes}m)` : ""}</option>)}
                </select>
              )}
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Notes"
                rows={2}
                className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent resize-none"
              />
              <button onClick={save} className="w-full bg-accent hover:bg-accent-hover text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
                Save
              </button>
            </div>
          )}

          {/* Comments */}
          <ShotComments projectId={projectId} shotId={shot.id} currentUserId={currentUserId} />
        </div>
      )}

      {/* Comments visible even when collapsed for non-editors */}
      {!expanded && !canEdit && (
        <div className="px-4 pb-4">
          <ShotComments projectId={projectId} shotId={shot.id} currentUserId={currentUserId} />
        </div>
      )}
    </div>
  );
}
