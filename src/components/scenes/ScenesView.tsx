"use client";

import { useState, useEffect, useCallback } from "react";
import { Film, Clock, MapPin, ListChecks, ChevronDown, ChevronUp, X, FileText, Loader2, Search, Plus, Upload, Edit3, Trash2, Printer, Download } from "lucide-react";
import { parseFountain, applyInlineFormatting } from "@/lib/fountain";
import type { FountainElement } from "@/lib/fountain";
import FountainEditor from "@/components/itinerary/FountainEditor";
import type { Scene, Location } from "@/lib/types";

type EditMode = "write" | "upload";

interface EnrichedScene extends Scene {
  location_name: string | null;
  shoot_day_id: string | null;
  day_number: number | null;
  day_title: string | null;
  shot_count: number;
}

function fmtMins(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

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

interface SceneModalProps {
  scene: EnrichedScene;
  projectId: string;
  locations: Location[];
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

function SceneDetailModal({ scene, projectId, locations, canEdit, onClose, onSaved, onDeleted }: SceneModalProps) {
  const [editing, setEditing] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>(scene.scene_file_url ? "upload" : "write");
  const [title, setTitle] = useState(scene.title || "");
  const [locationId, setLocationId] = useState(scene.location_id || "");
  const [durationH, setDurationH] = useState(Math.floor(scene.duration_minutes / 60));
  const [durationM, setDurationM] = useState(scene.duration_minutes % 60);
  const [sceneText, setSceneText] = useState(scene.scene_text || "");
  const [fileUrl, setFileUrl] = useState(scene.scene_file_url || "");
  const [fileName, setFileName] = useState(scene.scene_file_name || "");
  const [saving, setSaving] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [loadingDocx, setLoadingDocx] = useState(false);

  const displayFileName = editing ? fileName : (scene.scene_file_name || "");
  const isDocx = displayFileName.toLowerCase().endsWith(".docx") || displayFileName.toLowerCase().endsWith(".doc");
  const isPdf = displayFileName.toLowerCase().endsWith(".pdf");
  const hasContent = editing
    ? (editMode === "write" ? !!sceneText : !!fileUrl)
    : (!!scene.scene_text || !!scene.scene_file_url);

  useEffect(() => {
    if (!editing && isDocx && scene.scene_file_url && !docxHtml) {
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
  }, [editing, isDocx, scene.scene_file_url, docxHtml]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (editing) setEditing(false);
        else onClose();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, editing]);

  async function handleSave() {
    setSaving(true);
    const body: Record<string, unknown> = {
      title: title.trim() || null,
      location_id: locationId || null,
      duration_minutes: (durationH * 60) + durationM,
    };
    if (editMode === "write") {
      body.scene_text = sceneText || null;
      body.scene_file_url = null;
      body.scene_file_name = null;
    } else {
      body.scene_text = null;
      body.scene_file_url = fileUrl || null;
      body.scene_file_name = fileName || null;
    }
    await fetch(`/api/projects/${projectId}/scenes/${scene.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    setEditing(false);
    onSaved();
  }

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/projects/${projectId}/scenes/${scene.id}`, { method: "DELETE" });
    setDeleting(false);
    onDeleted();
  }

  async function handleFileUploadModal(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const { url } = await res.json();
      setFileUrl(url);
      setFileName(file.name);
      setDocxHtml(null);
    }
    setFileUploading(false);
    e.target.value = "";
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { if (!editing) onClose(); }}>
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <Film className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Scene title"
                className="w-full bg-bg-input border border-border rounded-lg px-2.5 py-1.5 text-text-primary text-sm font-semibold focus:outline-none focus:border-accent"
              />
            ) : (
              <>
                <h3 className="font-semibold text-text-primary truncate text-base">{scene.title || "Untitled Scene"}</h3>
                <div className="flex items-center gap-3 mt-0.5">
                  {scene.location_name ? (
                    <span className="flex items-center gap-1 text-xs text-text-muted">
                      <MapPin className="w-3 h-3" />{scene.location_name}
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted italic">No location</span>
                  )}
                  {scene.duration_minutes > 0 && (
                    <span className="flex items-center gap-1 text-xs text-text-muted">
                      <Clock className="w-3 h-3" />{fmtMins(scene.duration_minutes)}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors p-1.5 hover:bg-bg-card-hover rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto p-5 space-y-4">
          {/* Edit mode: metadata fields */}
          {editing && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1.5 font-medium">Location</label>
                  <select value={locationId} onChange={(e) => setLocationId(e.target.value)}
                    className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent">
                    <option value="">Unassigned</option>
                    {locations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}{loc.day_number != null ? ` (Day ${loc.day_number})` : ""}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1.5 font-medium">Duration</label>
                  <div className="flex items-center gap-1.5">
                    <input type="number" min="0" value={durationH || ""} placeholder="0"
                      onChange={(e) => setDurationH(parseInt(e.target.value) || 0)}
                      className="w-14 bg-bg-input border border-border rounded-lg px-2 py-2 text-text-primary text-sm focus:outline-none focus:border-accent text-center" />
                    <span className="text-xs text-text-muted">h</span>
                    <input type="number" min="0" max="59" value={durationM || ""} placeholder="0"
                      onChange={(e) => setDurationM(Math.min(59, parseInt(e.target.value) || 0))}
                      className="w-14 bg-bg-input border border-border rounded-lg px-2 py-2 text-text-primary text-sm focus:outline-none focus:border-accent text-center" />
                    <span className="text-xs text-text-muted">m</span>
                  </div>
                </div>
              </div>

              {/* Content mode tabs */}
              <div>
                <label className="block text-xs text-text-muted mb-1.5 font-medium">Scene Content</label>
                <div className="flex items-center gap-1 mb-3">
                  <button onClick={() => setEditMode("write")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${editMode === "write" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"}`}>
                    <Edit3 className="w-3 h-3" />Write
                  </button>
                  <button onClick={() => setEditMode("upload")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${editMode === "upload" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"}`}>
                    <Upload className="w-3 h-3" />Upload
                  </button>
                </div>

                {editMode === "write" && (
                  <div className="border border-border rounded-lg overflow-hidden h-52">
                    <FountainEditor
                      value={sceneText}
                      onChange={setSceneText}
                      placeholder={`INT. COFFEE SHOP - DAY\n\nA quiet morning. Steam rises.\n\nSARAH\n(nervously)\nI need to tell you something.`}
                    />
                  </div>
                )}

                {editMode === "upload" && (
                  <>
                    {fileUrl ? (
                      <div className="flex items-center gap-3 p-3 bg-bg-primary border border-border rounded-xl">
                        <FileText className="w-6 h-6 text-accent shrink-0" />
                        <p className="flex-1 text-text-primary font-medium text-sm truncate">{fileName}</p>
                        <button onClick={() => { setFileUrl(""); setFileName(""); }} className="text-text-muted hover:text-danger">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-border hover:border-accent rounded-xl cursor-pointer transition-colors group">
                        <Upload className="w-6 h-6 text-text-muted group-hover:text-accent transition-colors" />
                        <p className="text-text-secondary text-sm group-hover:text-accent transition-colors">
                          {fileUploading ? "Uploading..." : "Click to upload PDF, DOC, or DOCX"}
                        </p>
                        <input type="file"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={handleFileUploadModal} className="hidden" disabled={fileUploading} />
                      </label>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* View mode: scene content */}
          {!editing && (
            <>
              {scene.scene_text && (
                <div className="rounded-xl bg-bg-primary border border-border p-5">
                  <FountainPreview text={scene.scene_text} />
                </div>
              )}
              {scene.scene_file_url && isPdf && (
                <iframe src={scene.scene_file_url} className="w-full min-h-[50vh] rounded-xl border border-border" title={scene.scene_file_name || "Scene file"} />
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
                  <FileText className="w-5 h-5" /><span>Download {displayFileName || "file"}</span>
                </a>
              )}
              {!hasContent && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Film className="w-10 h-10 text-text-muted mb-3" />
                  <p className="text-text-muted text-sm">No scene content yet</p>
                  {canEdit && (
                    <button onClick={() => setEditing(true)}
                      className="mt-3 flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors">
                      <Edit3 className="w-3.5 h-3.5" />Add Content
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer actions */}
        {canEdit && (
          <div className="px-5 py-3.5 border-t border-border shrink-0 flex items-center gap-2">
            {editing ? (
              <>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Save
                </button>
                <button onClick={() => {
                  setEditing(false);
                  setTitle(scene.title || "");
                  setLocationId(scene.location_id || "");
                  setDurationH(Math.floor(scene.duration_minutes / 60));
                  setDurationM(scene.duration_minutes % 60);
                  setSceneText(scene.scene_text || "");
                  setFileUrl(scene.scene_file_url || "");
                  setFileName(scene.scene_file_name || "");
                  setEditMode(scene.scene_file_url ? "upload" : "write");
                }} className="text-sm text-text-secondary hover:text-text-primary transition-colors px-3 py-2">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover font-medium transition-colors">
                  <Edit3 className="w-3.5 h-3.5" />Edit Scene
                </button>
                <div className="ml-auto">
                  {confirmDelete ? (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-text-secondary">Delete this scene?</span>
                      <button onClick={handleDelete} disabled={deleting}
                        className="text-danger hover:text-danger-hover font-medium flex items-center gap-1">
                        {deleting && <Loader2 className="w-3 h-3 animate-spin" />}Yes, delete
                      </button>
                      <button onClick={() => setConfirmDelete(false)} className="text-text-secondary hover:text-text-primary">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(true)}
                      className="text-text-muted hover:text-danger transition-colors p-1.5 hover:bg-bg-card-hover rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface Props {
  projectId: string;
  canEdit: boolean;
}

export default function ScenesView({ projectId, canEdit }: Props) {
  const [scenes, setScenes] = useState<EnrichedScene[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<"location" | "day">("location");
  const [viewingScene, setViewingScene] = useState<EnrichedScene | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>("write");
  const [newScene, setNewScene] = useState({
    title: "", location_id: "", duration_h: 0, duration_m: 0,
    scene_text: "", scene_file_url: "", scene_file_name: "",
  });

  const fetchScenes = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/scenes`);
    if (res.ok) {
      const data = await res.json();
      setScenes(data);
    }
    setLoading(false);
  }, [projectId]);

  const handleShiftDay = useCallback(async (dayNumber: number, direction: "up" | "down") => {
    const dayGroups = scenes
      .filter((s) => s.day_number != null)
      .reduce<Record<number, string>>((acc, s) => {
        if (s.day_number != null && s.shoot_day_id && !acc[s.day_number]) {
          acc[s.day_number] = s.shoot_day_id;
        }
        return acc;
      }, {});

    const sortedDayNumbers = Object.keys(dayGroups).map(Number).sort((a, b) => a - b);
    const idx = sortedDayNumbers.indexOf(dayNumber);
    const neighborIdx = direction === "up" ? idx - 1 : idx + 1;
    if (neighborIdx < 0 || neighborIdx >= sortedDayNumbers.length) return;

    const neighborDayNumber = sortedDayNumbers[neighborIdx];
    const currentId = dayGroups[dayNumber];
    const neighborId = dayGroups[neighborDayNumber];

    await fetch(`/api/projects/${projectId}/days/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        updates: [
          { id: currentId, day_number: neighborDayNumber },
          { id: neighborId, day_number: dayNumber },
        ],
      }),
    });

    await fetchScenes();
  }, [scenes, projectId, fetchScenes]);

  const fetchLocations = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/locations`);
    if (res.ok) {
      const data = await res.json();
      setLocations(data);
    }
  }, [projectId]);

  useEffect(() => {
    fetchScenes();
    fetchLocations();
  }, [fetchScenes, fetchLocations]);

  const defaultNewScene = { title: "", location_id: "", duration_h: 0, duration_m: 0, scene_text: "", scene_file_url: "", scene_file_name: "" };

  function resetForm() {
    setNewScene(defaultNewScene);
    setEditMode("write");
    setAdding(false);
  }

  async function addScene() {
    setSaving(true);
    const duration = (newScene.duration_h * 60) + newScene.duration_m;
    const body: Record<string, unknown> = {
      title: newScene.title.trim() || null,
      location_id: newScene.location_id || null,
      duration_minutes: duration,
    };
    if (editMode === "write") {
      body.scene_text = newScene.scene_text || null;
    } else {
      body.scene_file_url = newScene.scene_file_url || null;
      body.scene_file_name = newScene.scene_file_name || null;
    }
    await fetch(`/api/projects/${projectId}/scenes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    resetForm();
    setSaving(false);
    await fetchScenes();
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const { url } = await res.json();
      setNewScene((f) => ({ ...f, scene_file_url: url, scene_file_name: file.name }));
    }
    setUploading(false);
    e.target.value = "";
  }

  // Print text-based scenes in a new window, download file-based scenes
  function printOrDownloadScenes(scenesToPrint: EnrichedScene[], label: string) {
    const textScenes = scenesToPrint.filter((s) => s.scene_text);
    const fileScenes = scenesToPrint.filter((s) => s.scene_file_url && !s.scene_text);

    // Download file-based scenes
    for (const s of fileScenes) {
      const a = document.createElement("a");
      a.href = s.scene_file_url!;
      a.download = s.scene_file_name || "scene-file";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    // Print text-based scenes
    if (textScenes.length > 0) {
      const htmlParts = textScenes.map((s) => {
        const elements = parseFountain(s.scene_text!);
        const rendered = elements.map((el) => {
          switch (el.type) {
            case "scene_heading":
              return `<p style="font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;margin-top:1.5em;margin-bottom:0.25em;border-bottom:1px solid #ccc;padding-bottom:0.25em">${el.text}</p>`;
            case "action":
              return `<p style="margin:0.25em 0;line-height:1.6">${applyInlineFormatting(el.text!)}</p>`;
            case "character":
              return `<p style="margin-top:1em;margin-bottom:0;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;text-align:center">${el.text}</p>`;
            case "parenthetical":
              return `<p style="font-style:italic;text-align:center;font-size:0.9em;margin:0">${el.text}</p>`;
            case "dialogue":
              return `<p style="text-align:center;max-width:20em;margin:0.125em auto;line-height:1.6">${applyInlineFormatting(el.text!)}</p>`;
            case "transition":
              return `<p style="text-align:right;text-transform:uppercase;font-style:italic;font-size:0.9em;margin-top:1em">${el.text}</p>`;
            case "centered":
              return `<p style="text-align:center;margin:0.5em 0">${applyInlineFormatting(el.text!)}</p>`;
            case "page_break":
              return `<hr style="border:none;border-top:1px solid #ccc;margin:1em 0" />`;
            case "blank":
              return `<div style="height:0.5em"></div>`;
            default:
              return "";
          }
        }).join("\n");

        return `<div style="margin-bottom:2em">
          <h2 style="font-size:1.1em;margin-bottom:0.5em;padding-bottom:0.3em;border-bottom:2px solid #333">${s.title || "Untitled Scene"}${s.location_name ? ` — ${s.location_name}` : ""}${s.duration_minutes > 0 ? ` (${fmtMins(s.duration_minutes)})` : ""}</h2>
          <div style="font-family:'Courier New',Courier,monospace;font-size:12px;line-height:1.5">${rendered}</div>
        </div>`;
      }).join('<div style="page-break-after:always"></div>');

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`<!DOCTYPE html><html><head><title>${label}</title>
          <style>@media print { body { margin: 1in; } } body { font-family: 'Courier New', Courier, monospace; max-width: 800px; margin: 0 auto; padding: 2em; color: #111; }</style>
        </head><body>
          <h1 style="font-size:1.3em;margin-bottom:1.5em;text-align:center">${label}</h1>
          ${htmlParts}
        </body></html>`);
        printWindow.document.close();
        printWindow.onload = () => { printWindow.print(); };
      }
    }

    // If only files and no text scenes, notify
    if (textScenes.length === 0 && fileScenes.length > 0) {
      // Files are downloading, no print window needed
    }
    if (textScenes.length === 0 && fileScenes.length === 0) {
      alert("No scenes with content to print or download.");
    }
  }

  const filtered = scenes.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.title || "").toLowerCase().includes(q) ||
      (s.location_name || "").toLowerCase().includes(q)
    );
  });

  const totalDuration = filtered.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  const totalShots = filtered.reduce((sum, s) => sum + s.shot_count, 0);
  const withContent = filtered.filter((s) => s.scene_text || s.scene_file_url).length;

  // Group scenes
  const groups: { key: string; label: string; sublabel?: string; scenes: EnrichedScene[] }[] = [];

  if (groupBy === "location") {
    const byLoc: Record<string, EnrichedScene[]> = {};
    for (const s of filtered) {
      const key = s.location_id || "unassigned";
      if (!byLoc[key]) byLoc[key] = [];
      byLoc[key].push(s);
    }
    // Show assigned locations first, unassigned last
    const locKeys = Object.keys(byLoc).filter((k) => k !== "unassigned");
    for (const locId of locKeys) {
      const locScenes = byLoc[locId];
      const first = locScenes[0];
      groups.push({
        key: locId,
        label: first.location_name || "Unknown",
        sublabel: first.day_number != null ? `Day ${first.day_number}${first.day_title ? ` — ${first.day_title}` : ""}` : undefined,
        scenes: locScenes,
      });
    }
    if (byLoc["unassigned"]) {
      groups.push({ key: "unassigned", label: "Unassigned", scenes: byLoc["unassigned"] });
    }
  } else {
    const byDay: Record<string, EnrichedScene[]> = {};
    const unassigned: EnrichedScene[] = [];
    for (const s of filtered) {
      if (s.day_number != null) {
        const key = `day-${s.day_number}`;
        if (!byDay[key]) byDay[key] = [];
        byDay[key].push(s);
      } else {
        unassigned.push(s);
      }
    }
    const sortedKeys = Object.keys(byDay).sort((a, b) => {
      const aN = parseInt(a.split("-")[1]);
      const bN = parseInt(b.split("-")[1]);
      return aN - bN;
    });
    for (const key of sortedKeys) {
      const dayScenes = byDay[key];
      const first = dayScenes[0];
      groups.push({
        key,
        label: `Day ${first.day_number}`,
        sublabel: first.day_title || undefined,
        scenes: dayScenes,
      });
    }
    if (unassigned.length > 0) {
      groups.push({ key: "unassigned", label: "Unassigned", scenes: unassigned });
    }
  }

  const addSceneForm = (
    <div className="bg-bg-card border border-accent/30 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
          <Film className="w-4 h-4 text-accent" />
        </div>
        <h3 className="text-sm font-semibold text-text-primary">New Scene</h3>
      </div>

      <input
        value={newScene.title}
        onChange={(e) => setNewScene((f) => ({ ...f, title: e.target.value }))}
        placeholder="Scene title (e.g. INT. COFFEE SHOP - DAY)"
        className="w-full bg-bg-input border border-border rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent"
        autoFocus
        onKeyDown={(e) => { if (e.key === "Escape") resetForm(); }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-text-muted mb-1.5 font-medium">Location (optional)</label>
          <select
            value={newScene.location_id}
            onChange={(e) => setNewScene((f) => ({ ...f, location_id: e.target.value }))}
            className="w-full bg-bg-input border border-border rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent"
          >
            <option value="">Unassigned</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}{loc.day_number != null ? ` (Day ${loc.day_number})` : ""}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1.5 font-medium">Duration (optional)</label>
          <div className="flex items-center gap-1.5">
            <input type="number" min="0" value={newScene.duration_h || ""} placeholder="0"
              onChange={(e) => setNewScene((f) => ({ ...f, duration_h: parseInt(e.target.value) || 0 }))}
              className="w-14 bg-bg-input border border-border rounded-lg px-2 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent text-center"
            />
            <span className="text-xs text-text-muted">h</span>
            <input type="number" min="0" max="59" value={newScene.duration_m || ""} placeholder="0"
              onChange={(e) => setNewScene((f) => ({ ...f, duration_m: Math.min(59, parseInt(e.target.value) || 0) }))}
              className="w-14 bg-bg-input border border-border rounded-lg px-2 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent text-center"
            />
            <span className="text-xs text-text-muted">m</span>
          </div>
        </div>
      </div>

      {/* Content mode tabs */}
      <div>
        <label className="block text-xs text-text-muted mb-1.5 font-medium">Scene Content (optional)</label>
        <div className="flex items-center gap-1 mb-3">
          <button onClick={() => setEditMode("write")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${editMode === "write" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"}`}
          >
            <Edit3 className="w-3 h-3" />Write
          </button>
          <button onClick={() => setEditMode("upload")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${editMode === "upload" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"}`}
          >
            <Upload className="w-3 h-3" />Upload
          </button>
        </div>

        {editMode === "write" && (
          <div className="border border-border rounded-lg overflow-hidden h-56">
            <FountainEditor
              value={newScene.scene_text}
              onChange={(v) => setNewScene((f) => ({ ...f, scene_text: v }))}
              placeholder={`INT. COFFEE SHOP - DAY\n\nA quiet morning. Steam rises.\n\nSARAH\n(nervously)\nI need to tell you something.`}
            />
          </div>
        )}

        {editMode === "upload" && (
          <>
            {newScene.scene_file_url ? (
              <div className="flex items-center gap-3 p-3 bg-bg-primary border border-border rounded-xl">
                <FileText className="w-6 h-6 text-accent shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary font-medium text-sm truncate">{newScene.scene_file_name}</p>
                </div>
                <button onClick={() => setNewScene((f) => ({ ...f, scene_file_url: "", scene_file_name: "" }))} className="text-text-muted hover:text-danger">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-border hover:border-accent rounded-xl cursor-pointer transition-colors group">
                <Upload className="w-6 h-6 text-text-muted group-hover:text-accent transition-colors" />
                <p className="text-text-secondary text-sm group-hover:text-accent transition-colors">
                  {uploading ? "Uploading..." : "Click to upload PDF, DOC, or DOCX"}
                </p>
                <input type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileUpload} className="hidden" disabled={uploading}
                />
              </label>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button onClick={addScene} disabled={saving}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Add Scene
        </button>
        <button onClick={resetForm} className="text-sm text-text-secondary hover:text-text-primary transition-colors px-3 py-2">
          Cancel
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading scenes...
      </div>
    );
  }

  if (scenes.length === 0) {
    return (
      <div className="space-y-4">
        {!adding && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
              <Film className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-1">No scenes yet</h3>
            <p className="text-text-muted text-sm max-w-sm mb-4">
              Add scenes to plan your shoot. You can assign them to locations now or later.
            </p>
            {canEdit && (
              <button
                onClick={() => setAdding(true)}
                className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />Add First Scene
              </button>
            )}
          </div>
        )}
        {adding && addSceneForm}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-bg-card border border-border rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <Film className="w-4 h-4 text-accent" />
            <span className="text-xs text-text-muted uppercase tracking-wider font-medium">Scenes</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{filtered.length}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-accent" />
            <span className="text-xs text-text-muted uppercase tracking-wider font-medium">Total Runtime</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{totalDuration > 0 ? fmtMins(totalDuration) : "—"}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <ListChecks className="w-4 h-4 text-accent" />
            <span className="text-xs text-text-muted uppercase tracking-wider font-medium">Shots</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">{totalShots}</p>
        </div>
        <div className="bg-bg-card border border-border rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-accent" />
            <span className="text-xs text-text-muted uppercase tracking-wider font-medium">With Content</span>
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {withContent}<span className="text-sm font-normal text-text-muted">/{filtered.length}</span>
          </p>
        </div>
      </div>

      {/* Search + group toggle + add button */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search scenes..."
            className="w-full bg-bg-card border border-border rounded-xl pl-9 pr-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent placeholder:text-text-muted"
          />
        </div>
        <div className="flex items-center bg-bg-card border border-border rounded-xl overflow-hidden shrink-0">
          <button
            onClick={() => setGroupBy("location")}
            className={`px-3 py-2.5 text-xs font-medium transition-colors ${groupBy === "location" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"}`}
          >
            <MapPin className="w-3.5 h-3.5 inline mr-1" />Location
          </button>
          <button
            onClick={() => setGroupBy("day")}
            className={`px-3 py-2.5 text-xs font-medium transition-colors ${groupBy === "day" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"}`}
          >
            <Clock className="w-3.5 h-3.5 inline mr-1" />Day
          </button>
        </div>
        {filtered.some((s) => s.scene_text || s.scene_file_url) && (
          <button
            onClick={() => printOrDownloadScenes(filtered, "All Scenes")}
            className="flex items-center gap-2 bg-bg-card border border-border hover:border-accent text-text-secondary hover:text-accent rounded-xl px-3 py-2.5 text-sm font-medium transition-colors shrink-0"
            title="Print / download all scenes"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print All</span>
          </button>
        )}
        {canEdit && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Scene</span>
          </button>
        )}
      </div>

      {/* Add scene form */}
      {adding && addSceneForm}

      {/* Scene groups */}
      <div className="space-y-4">
        {groups.map((group) => {
          const groupDuration = group.scenes.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
          const isDayGroup = groupBy === "day" && group.key !== "unassigned";
          const dayGroups = groups.filter((g) => g.key !== "unassigned");
          const dayGroupIdx = dayGroups.indexOf(group);
          const isFirst = dayGroupIdx === 0;
          const isLast = dayGroupIdx === dayGroups.length - 1;

          return (
            <div key={group.key} className="bg-bg-card border border-border rounded-xl overflow-hidden">
              {/* Group header */}
              <div className="flex items-center justify-between px-4 py-3 bg-bg-card-hover/50">
                <div className="flex items-center gap-2 min-w-0">
                  {groupBy === "location" ? (
                    <MapPin className="w-4 h-4 text-accent shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-accent shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{group.label}</p>
                    {group.sublabel && (
                      <p className="text-xs text-text-muted truncate">{group.sublabel}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-text-muted">{group.scenes.length} scene{group.scenes.length !== 1 ? "s" : ""}</span>
                  {groupDuration > 0 && (
                    <span className="text-xs font-medium text-accent bg-accent/10 rounded-full px-2 py-0.5">
                      {fmtMins(groupDuration)}
                    </span>
                  )}
                  {isDayGroup && canEdit && (
                    <>
                      <button
                        onClick={() => handleShiftDay(group.scenes[0].day_number!, "up")}
                        disabled={isFirst}
                        className="p-1.5 text-text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move day earlier"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleShiftDay(group.scenes[0].day_number!, "down")}
                        disabled={isLast}
                        className="p-1.5 text-text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move day later"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {group.scenes.some((s) => s.scene_text || s.scene_file_url) && (
                    <button
                      onClick={() => printOrDownloadScenes(group.scenes, group.label)}
                      className="p-1.5 text-text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-colors"
                      title={`Print / download ${group.label} scenes`}
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Scene rows */}
              <div className="divide-y divide-border">
                {group.scenes.map((scene) => {
                  const hasContent = !!scene.scene_text || !!scene.scene_file_url;
                  return (
                    <button
                      key={scene.id}
                      onClick={() => setViewingScene(scene)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-card-hover/50 transition-colors text-left group"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${hasContent ? "bg-accent/10 text-accent" : "bg-bg-card-hover text-text-muted"}`}>
                        <Film className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate group-hover:text-accent transition-colors">
                          {scene.title || "Untitled Scene"}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {groupBy === "day" && scene.location_name && (
                            <span className="flex items-center gap-1 text-xs text-text-muted">
                              <MapPin className="w-3 h-3" />{scene.location_name}
                            </span>
                          )}
                          {groupBy === "day" && !scene.location_name && (
                            <span className="text-xs text-text-muted italic">No location</span>
                          )}
                          {groupBy === "location" && scene.day_number != null && (
                            <span className="text-xs text-text-muted">Day {scene.day_number}</span>
                          )}
                          {!hasContent && (
                            <span className="text-xs text-warning/70">No content</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {scene.shot_count > 0 && (
                          <span className="flex items-center gap-1 text-xs text-text-muted">
                            <ListChecks className="w-3 h-3" />{scene.shot_count}
                          </span>
                        )}
                        {scene.duration_minutes > 0 ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-accent bg-accent/10 rounded-full px-2 py-0.5">
                            <Clock className="w-3 h-3" />{fmtMins(scene.duration_minutes)}
                          </span>
                        ) : (
                          <span className="text-xs text-warning/70 bg-warning/10 rounded-full px-2 py-0.5">
                            No duration
                          </span>
                        )}
                        {(scene.scene_text || scene.scene_file_url) && (
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (scene.scene_file_url && !scene.scene_text) {
                                const a = document.createElement("a");
                                a.href = scene.scene_file_url;
                                a.download = scene.scene_file_name || "scene-file";
                                a.target = "_blank";
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                              } else {
                                printOrDownloadScenes([scene], scene.title || "Scene");
                              }
                            }}
                            className="p-1 text-text-muted hover:text-accent opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                            title={scene.scene_file_url && !scene.scene_text ? "Download file" : "Print scene"}
                          >
                            {scene.scene_file_url && !scene.scene_text ? <Download className="w-3.5 h-3.5" /> : <Printer className="w-3.5 h-3.5" />}
                          </div>
                        )}
                        <ChevronDown className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 -rotate-90 transition-all" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && search && (
        <div className="text-center py-12">
          <p className="text-text-muted text-sm">No scenes match &ldquo;{search}&rdquo;</p>
        </div>
      )}

      {/* Scene detail modal */}
      {viewingScene && (
        <SceneDetailModal
          scene={viewingScene}
          projectId={projectId}
          locations={locations}
          canEdit={canEdit}
          onClose={() => setViewingScene(null)}
          onSaved={() => { setViewingScene(null); fetchScenes(); }}
          onDeleted={() => { setViewingScene(null); fetchScenes(); }}
        />
      )}
    </div>
  );
}
