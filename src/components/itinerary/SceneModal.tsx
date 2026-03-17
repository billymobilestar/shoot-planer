"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Upload, FileText, Edit3, Trash2, FilmIcon, Loader2, Plus, Clock, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { parseFountain, applyInlineFormatting } from "@/lib/fountain";
import type { FountainElement } from "@/lib/fountain";
import type { Scene } from "@/lib/types";
import FountainEditor from "./FountainEditor";

interface Props {
  projectId: string;
  locationId: string;
  locationName: string;
  scenes: Scene[];
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}

type EditMode = "write" | "upload";

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
        return (
          <p key={idx} className="font-bold uppercase tracking-wide mt-6 mb-1 text-text-primary border-b border-border pb-1">
            {el.text}
          </p>
        );
      case "action":
        return (
          <p key={idx} className="my-1 text-text-primary leading-relaxed"
            dangerouslySetInnerHTML={inline(el.text!)} />
        );
      case "character":
        return (
          <p key={idx} className="mt-4 mb-0 font-semibold uppercase tracking-wider text-center text-text-primary">
            {el.text}
          </p>
        );
      case "parenthetical":
        return (
          <p key={idx} className="italic text-center text-text-secondary text-sm my-0">
            {el.text}
          </p>
        );
      case "dialogue":
        return (
          <p key={idx} className="text-center max-w-xs mx-auto my-0.5 text-text-primary leading-relaxed"
            dangerouslySetInnerHTML={inline(el.text!)} />
        );
      case "transition":
        return (
          <p key={idx} className="text-right uppercase italic text-text-secondary mt-4 mb-1 text-sm">
            {el.text}
          </p>
        );
      case "centered":
        return (
          <p key={idx} className="text-center my-2 text-text-primary"
            dangerouslySetInnerHTML={inline(el.text!)} />
        );
      case "page_break":
        return <hr key={idx} className="border-border my-4" />;
      case "blank":
        return <div key={idx} className="h-2" />;
      default:
        return null;
    }
  }

  if (!text.trim()) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        Preview will appear here as you type…
      </div>
    );
  }

  return (
    <div className="font-mono text-sm leading-relaxed px-2">
      {elements.map((el, i) => renderElement(el, i))}
    </div>
  );
}

function DurationInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const h = Math.floor(value / 60);
  const m = value % 60;
  return (
    <div className="flex items-center gap-1">
      <Clock className="w-3.5 h-3.5 text-text-muted shrink-0" />
      <input
        type="number" min="0" value={h || ""} placeholder="0"
        onChange={(e) => onChange((parseInt(e.target.value) || 0) * 60 + m)}
        className="w-10 bg-bg-input border border-border rounded px-1.5 py-1 text-text-primary text-xs focus:outline-none focus:border-accent text-center"
      />
      <span className="text-text-muted text-[10px]">h</span>
      <input
        type="number" min="0" max="59" value={m || ""} placeholder="0"
        onChange={(e) => onChange(h * 60 + Math.min(59, parseInt(e.target.value) || 0))}
        className="w-10 bg-bg-input border border-border rounded px-1.5 py-1 text-text-primary text-xs focus:outline-none focus:border-accent text-center"
      />
      <span className="text-text-muted text-[10px]">m</span>
    </div>
  );
}

interface SceneEditorProps {
  scene: Scene;
  projectId: string;
  locationId: string;
  canEdit: boolean;
  onSaved: () => void;
  onDelete: () => void;
  defaultExpanded?: boolean;
}

function SceneItem({ scene, projectId, locationId, canEdit, onSaved, onDelete, defaultExpanded }: SceneEditorProps) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const [editing, setEditing] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>(scene.scene_file_url ? "upload" : "write");
  const [title, setTitle] = useState(scene.title || "");
  const [text, setText] = useState(scene.scene_text || "");
  const [fileUrl, setFileUrl] = useState(scene.scene_file_url || "");
  const [fileName, setFileName] = useState(scene.scene_file_name || "");
  const [duration, setDuration] = useState(scene.duration_minutes);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [loadingDocx, setLoadingDocx] = useState(false);

  const isDocx = fileName.toLowerCase().endsWith(".docx") || fileName.toLowerCase().endsWith(".doc");
  const isPdf = fileName.toLowerCase().endsWith(".pdf");
  const hasContent = !!scene.scene_text || !!scene.scene_file_url;

  const convertDocx = useCallback(async (url: string) => {
    if (!url) return;
    setLoadingDocx(true);
    try {
      const mammoth = (await import("mammoth")).default;
      const res = await fetch(url);
      const arrayBuffer = await res.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setDocxHtml(result.value);
    } catch {
      setDocxHtml("<p style='color:red'>Could not render document.</p>");
    }
    setLoadingDocx(false);
  }, []);

  useEffect(() => {
    if (expanded && isDocx && scene.scene_file_url && !docxHtml) {
      convertDocx(scene.scene_file_url);
    }
  }, [expanded, isDocx, scene.scene_file_url, docxHtml, convertDocx]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const { url } = await res.json();
      setFileUrl(url);
      setFileName(file.name);
      setDocxHtml(null);
    }
    setUploading(false);
    e.target.value = "";
  }

  async function save() {
    setSaving(true);
    const body: Record<string, unknown> = {
      title: title.trim() || null,
      duration_minutes: duration,
    };
    if (editMode === "upload") {
      body.scene_text = null;
      body.scene_file_url = fileUrl || null;
      body.scene_file_name = fileName || null;
    } else {
      body.scene_text = text || null;
      body.scene_file_url = null;
      body.scene_file_name = null;
    }

    await fetch(`/api/projects/${projectId}/locations/${locationId}/scenes/${scene.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    setEditing(false);
    onSaved();
  }

  async function saveDuration(newDuration: number) {
    setDuration(newDuration);
    await fetch(`/api/projects/${projectId}/locations/${locationId}/scenes/${scene.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duration_minutes: newDuration }),
    });
    onSaved();
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-bg-card">
      {/* Scene header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none hover:bg-bg-card-hover transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <FilmIcon className="w-4 h-4 text-accent shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {scene.title || "Untitled Scene"}
          </p>
        </div>
        {scene.duration_minutes > 0 && (
          <span className="text-xs font-medium text-accent bg-accent/10 rounded-full px-2 py-0.5 shrink-0">
            {fmtMins(scene.duration_minutes)}
          </span>
        )}
        {!scene.duration_minutes && (
          <span className="text-xs text-warning/70 bg-warning/10 rounded-full px-2 py-0.5 shrink-0">
            No duration
          </span>
        )}
        {expanded ? <ChevronUp className="w-4 h-4 text-text-muted shrink-0" /> : <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />}
      </div>

      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Duration (always visible, inline edit) */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted uppercase tracking-wider font-medium">Duration</span>
            {canEdit ? (
              <DurationInput value={duration} onChange={(v) => saveDuration(v)} />
            ) : (
              <span className="text-sm font-medium text-text-primary">
                {duration > 0 ? fmtMins(duration) : "Not set"}
              </span>
            )}
          </div>

          {/* View content */}
          {!editing && (
            <>
              {scene.scene_text && (
                <div className="max-h-80 overflow-auto rounded-lg bg-bg-primary border border-border p-4">
                  <FountainPreview text={scene.scene_text} />
                </div>
              )}

              {scene.scene_file_url && isPdf && (
                <iframe
                  src={scene.scene_file_url}
                  className="w-full min-h-[40vh] rounded-lg border border-border"
                  title={scene.scene_file_name || "Scene file"}
                />
              )}

              {scene.scene_file_url && isDocx && (
                <div className="max-h-80 overflow-auto rounded-lg bg-bg-primary border border-border p-4">
                  {loadingDocx ? (
                    <div className="flex items-center justify-center py-10 gap-2 text-text-muted">
                      <Loader2 className="w-5 h-5 animate-spin" />Loading document…
                    </div>
                  ) : docxHtml ? (
                    <div className="prose prose-sm max-w-none text-text-primary" dangerouslySetInnerHTML={{ __html: docxHtml }} />
                  ) : (
                    <div className="flex items-center justify-center py-10 gap-2 text-text-muted">
                      <Loader2 className="w-5 h-5 animate-spin" />Loading…
                    </div>
                  )}
                </div>
              )}

              {!hasContent && (
                <p className="text-sm text-text-muted italic">No scene content yet.</p>
              )}
            </>
          )}

          {/* Edit mode */}
          {editing && canEdit && (
            <div className="space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Scene title (e.g. INT. COFFEE SHOP)"
                className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
              />

              {/* Mode tabs */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditMode("write")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${editMode === "write" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"}`}
                >
                  <Edit3 className="w-3 h-3" />Write
                </button>
                <button
                  onClick={() => setEditMode("upload")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${editMode === "upload" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"}`}
                >
                  <Upload className="w-3 h-3" />Upload
                </button>
              </div>

              {editMode === "write" && (
                <div className="border border-border rounded-lg overflow-hidden h-64">
                  <FountainEditor
                    value={text}
                    onChange={setText}
                    placeholder={`INT. COFFEE SHOP - DAY\n\nA quiet morning. Steam rises.\n\nSARAH\n(nervously)\nI need to tell you something.`}
                  />
                </div>
              )}

              {editMode === "upload" && (
                <div className="space-y-3">
                  {fileUrl ? (
                    <div className="flex items-center gap-3 p-3 bg-bg-primary border border-border rounded-xl">
                      <FileText className="w-6 h-6 text-accent shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary font-medium text-sm truncate">{fileName}</p>
                      </div>
                      <button onClick={() => { setFileUrl(""); setFileName(""); }} className="text-text-muted hover:text-danger">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-border hover:border-accent rounded-xl cursor-pointer transition-colors group">
                      <Upload className="w-6 h-6 text-text-muted group-hover:text-accent transition-colors" />
                      <p className="text-text-secondary text-sm group-hover:text-accent transition-colors">
                        {uploading ? "Uploading…" : "Click to upload PDF, DOC, or DOCX"}
                      </p>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={save}
                  disabled={saving || (editMode === "write" && !text.trim()) || (editMode === "upload" && !fileUrl)}
                  className="flex items-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                >
                  {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                  Save
                </button>
                <button onClick={() => setEditing(false)} className="text-sm text-text-secondary hover:text-text-primary transition-colors px-3 py-2">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {!editing && canEdit && (
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                {hasContent ? "Edit Scene" : "Add Content"}
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-2 text-sm ml-auto">
                  <span className="text-text-secondary">Delete?</span>
                  <button onClick={onDelete} className="text-danger hover:text-danger-hover font-medium">Yes</button>
                  <button onClick={() => setConfirmDelete(false)} className="text-text-secondary">No</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="text-text-muted hover:text-danger transition-colors ml-auto">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SceneModal({
  projectId,
  locationId,
  locationName,
  scenes: initialScenes,
  canEdit,
  onClose,
  onSaved,
}: Props) {
  const [scenes, setScenes] = useState<Scene[]>(initialScenes);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const totalDuration = scenes.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  async function fetchScenes() {
    const res = await fetch(`/api/projects/${projectId}/locations/${locationId}/scenes`);
    if (res.ok) {
      const data = await res.json();
      setScenes(data);
    }
  }

  async function handleSaved() {
    await fetchScenes();
    onSaved();
  }

  async function addScene() {
    setLoading(true);
    await fetch(`/api/projects/${projectId}/locations/${locationId}/scenes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() || null }),
    });
    setNewTitle("");
    setAdding(false);
    setLoading(false);
    await handleSaved();
  }

  async function deleteScene(sceneId: string) {
    await fetch(`/api/projects/${projectId}/locations/${locationId}/scenes/${sceneId}`, {
      method: "DELETE",
    });
    await handleSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-stretch sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-bg-card border border-border rounded-none sm:rounded-2xl flex flex-col w-full sm:max-w-2xl sm:max-h-[90vh] h-full sm:h-auto overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <FilmIcon className="w-5 h-5 text-accent shrink-0" />
            <div className="min-w-0">
              <h2 className="font-semibold text-text-primary truncate">Scenes</h2>
              <p className="text-xs text-text-muted truncate">{locationName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {totalDuration > 0 && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-accent">
                <Clock className="w-4 h-4" />
                {fmtMins(totalDuration)} total
              </span>
            )}
            <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scene list */}
        <div className="flex-1 overflow-auto p-5 space-y-3">
          {scenes.length === 0 && !adding && (
            <div className="flex flex-col items-center justify-center gap-4 text-center py-12">
              <FilmIcon className="w-12 h-12 text-text-muted" />
              <div>
                <p className="text-text-secondary font-medium">No scenes yet</p>
                <p className="text-text-muted text-sm mt-1">Add scenes to this location with individual durations</p>
              </div>
              {canEdit && (
                <button
                  onClick={() => setAdding(true)}
                  className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />Add First Scene
                </button>
              )}
            </div>
          )}

          {scenes.map((scene, idx) => (
            <SceneItem
              key={scene.id}
              scene={scene}
              projectId={projectId}
              locationId={locationId}
              canEdit={canEdit}
              onSaved={handleSaved}
              onDelete={() => deleteScene(scene.id)}
              defaultExpanded={scenes.length === 1}
            />
          ))}

          {/* Add scene form */}
          {adding && (
            <div className="border border-accent/30 rounded-xl p-4 space-y-3 bg-accent/5">
              <p className="text-xs font-semibold text-text-primary uppercase tracking-wider">New Scene</p>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Scene title (e.g. INT. COFFEE SHOP - DAY)"
                className="w-full bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-accent"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") addScene();
                  if (e.key === "Escape") setAdding(false);
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={addScene}
                  disabled={loading}
                  className="flex items-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                >
                  {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                  Add Scene
                </button>
                <button onClick={() => { setAdding(false); setNewTitle(""); }} className="text-sm text-text-secondary hover:text-text-primary transition-colors px-3 py-2">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Add scene button (when scenes exist) */}
          {scenes.length > 0 && !adding && canEdit && (
            <button
              onClick={() => setAdding(true)}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-xl text-text-secondary hover:text-accent hover:border-accent transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />Add Scene
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
