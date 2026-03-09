"use client";

import { useState, useRef, useEffect } from "react";
import { X, Upload, Plus, Loader2, MapPin, Check, Link2, Image as ImageIcon } from "lucide-react";
import { Location } from "@/lib/types";
import { extractColors } from "@/lib/extractColors";

const SUGGESTED_TAGS = [
  "Lighting", "Color Palette", "Wardrobe", "Set Design",
  "Hair & Makeup", "Props", "Composition", "Mood", "Texture",
];

interface UploadedImage {
  url: string;
  colors: string[];
}

interface Props {
  projectId: string;
  locations: Location[];
  boards: string[];
  onCreated: () => void;
  onClose: () => void;
}

type AddMode = "images" | "link";

function detectPlatform(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("tiktok")) return "tiktok";
    if (host.includes("instagram")) return "instagram";
    if (host.includes("youtube") || host.includes("youtu.be")) return "youtube";
    if (host.includes("vimeo")) return "vimeo";
    if (host.includes("pinterest")) return "pinterest";
    if (host.includes("behance")) return "behance";
    if (host.includes("dribbble")) return "dribbble";
    return null;
  } catch {
    return null;
  }
}

export default function AddReferenceModal({ projectId, locations, boards, onCreated, onClose }: Props) {
  const [mode, setMode] = useState<AddMode>("images");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [board, setBoard] = useState("");
  const [newBoard, setNewBoard] = useState("");
  const [locationIds, setLocationIds] = useState<string[]>([]);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [saving, setSaving] = useState(false);

  // Link-specific state
  const [linkUrl, setLinkUrl] = useState("");
  const [linkThumbnail, setLinkThumbnail] = useState("");
  const [uploadingThumb, setUploadingThumb] = useState(false);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setLocationDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggleLocation(id: string) {
    setLocationIds((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  }

  function addTag(tag: string) {
    const t = tag.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);

    const fileArray = Array.from(files);
    const newImages: UploadedImage[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      setUploadProgress(`Uploading ${i + 1} of ${fileArray.length}...`);
      const formData = new FormData();
      formData.append("file", fileArray[i]);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const { url } = await res.json();
        const colors = await extractColors(url);
        newImages.push({ url, colors });
      }
    }

    setImages((prev) => [...prev, ...newImages]);
    setUploading(false);
    setUploadProgress("");
    e.target.value = "";
  }

  async function handleThumbUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingThumb(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (res.ok) {
      const { url } = await res.json();
      setLinkThumbnail(url);
    }
    setUploadingThumb(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalBoard = newBoard.trim() || board || null;

    if (mode === "images") {
      if (images.length === 0) return;
      setSaving(true);
      for (const img of images) {
        await fetch(`/api/projects/${projectId}/references`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: img.url,
            title: images.length === 1 ? (title.trim() || null) : null,
            notes: notes.trim() || null,
            category: "moodboard",
            board: finalBoard,
            location_ids: locationIds,
            tags,
            colors: img.colors,
          }),
        });
      }
    } else {
      if (!linkUrl.trim()) return;
      setSaving(true);
      const res = await fetch(`/api/projects/${projectId}/references`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: linkThumbnail || "",
          link_url: linkUrl.trim(),
          title: title.trim() || null,
          notes: notes.trim() || null,
          category: "moodboard",
          board: finalBoard,
          location_ids: locationIds,
          tags,
          colors: [],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Failed to add link:", err);
        alert(`Failed to add link: ${err.error || "Unknown error"}`);
        setSaving(false);
        return;
      }
    }

    onCreated();
    onClose();
  }

  const canSubmit = mode === "images" ? images.length > 0 : !!linkUrl.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-bg-card border border-border rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text-primary">Add to Moodboard</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-bg-primary border border-border rounded-lg p-1 mb-5">
          <button
            type="button"
            onClick={() => setMode("images")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === "images" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Images
          </button>
          <button
            type="button"
            onClick={() => setMode("link")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === "link" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Link2 className="w-4 h-4" />
            Link
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* === IMAGE MODE === */}
          {mode === "images" && (
            <>
              {images.length > 0 && (
                <div>
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((img, i) => (
                      <div key={i} className="relative rounded-lg overflow-hidden group">
                        <img src={img.url} alt="" className="w-full aspect-square object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        {img.colors.length > 0 && (
                          <div className="absolute bottom-0 left-0 right-0 flex h-1.5">
                            {img.colors.map((c) => (
                              <div key={c} className="flex-1" style={{ backgroundColor: c }} />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    <label className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 text-text-muted hover:text-accent hover:border-accent transition-colors cursor-pointer">
                      {uploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Plus className="w-5 h-5" />
                          <span className="text-[10px]">More</span>
                        </>
                      )}
                      <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" disabled={uploading} />
                    </label>
                  </div>
                  {uploading && <p className="text-xs text-text-muted mt-1.5">{uploadProgress}</p>}
                  <p className="text-xs text-text-muted mt-1.5">{images.length} image{images.length !== 1 ? "s" : ""} selected</p>
                </div>
              )}

              {images.length === 0 && (
                <label className="flex flex-col items-center justify-center gap-2 py-10 border-2 border-dashed border-border rounded-lg text-text-secondary hover:text-accent hover:border-accent transition-colors cursor-pointer">
                  {uploading ? (
                    <>
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span className="text-sm">{uploadProgress}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8" />
                      <span className="text-sm">Drop images or click to upload</span>
                      <span className="text-xs text-text-muted">Select multiple images at once</span>
                    </>
                  )}
                  <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" disabled={uploading} />
                </label>
              )}
            </>
          )}

          {/* === LINK MODE === */}
          {mode === "link" && (
            <>
              <div>
                <label className="block text-sm text-text-secondary mb-1">URL *</label>
                <input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://www.instagram.com/p/... or any URL"
                  className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                  autoFocus
                />
                {linkUrl && detectPlatform(linkUrl) && (
                  <p className="text-xs text-accent mt-1 capitalize">{detectPlatform(linkUrl)} link detected</p>
                )}
              </div>

              {/* Optional thumbnail */}
              <div>
                <label className="block text-sm text-text-secondary mb-1">Thumbnail (optional)</label>
                {linkThumbnail ? (
                  <div className="relative w-32">
                    <img src={linkThumbnail} alt="" className="w-full aspect-square object-cover rounded-lg" />
                    <button type="button" onClick={() => setLinkThumbnail("")} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="inline-flex items-center gap-2 py-2.5 px-4 border-2 border-dashed border-border rounded-lg text-text-secondary hover:text-accent hover:border-accent transition-colors cursor-pointer text-sm">
                    <Upload className="w-4 h-4" />
                    {uploadingThumb ? "Uploading..." : "Upload thumbnail"}
                    <input type="file" accept="image/*" onChange={handleThumbUpload} className="hidden" />
                  </label>
                )}
              </div>
            </>
          )}

          {/* Shared fields */}
          {(mode === "link" || images.length <= 1) && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (optional)"
              className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
          )}

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes / annotations (optional)"
            rows={2}
            className="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent resize-none"
          />

          {/* Board selection */}
          <div>
            <span className="text-xs text-text-muted mb-1.5 block">Board</span>
            <div className="flex gap-2">
              <select
                value={board}
                onChange={(e) => { setBoard(e.target.value); setNewBoard(""); }}
                className="flex-1 bg-bg-input border border-border rounded-lg px-4 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent"
              >
                <option value="">General</option>
                {boards.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <input
                value={newBoard}
                onChange={(e) => { setNewBoard(e.target.value); setBoard(""); }}
                placeholder="or new board..."
                className="flex-1 bg-bg-input border border-border rounded-lg px-3 py-2.5 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <span className="text-xs text-text-muted mb-1.5 block">Tags</span>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 bg-accent-muted text-accent text-xs px-2 py-1 rounded-full">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-accent-hover">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 mb-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }}
                placeholder="Add a tag..."
                className="flex-1 bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent"
              />
              <button type="button" onClick={() => addTag(tagInput)} className="text-accent hover:text-accent-hover">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="text-[11px] px-2 py-0.5 rounded-full border border-border text-text-muted hover:text-text-primary hover:border-border-light transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Locations */}
          <div ref={locationRef} className="relative">
            <span className="text-xs text-text-muted mb-1.5 block">Locations</span>
            <button
              type="button"
              onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
              className="w-full flex items-center gap-2 bg-bg-input border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent text-left"
            >
              <MapPin className="w-3.5 h-3.5 text-text-muted shrink-0" />
              {locationIds.length === 0 ? (
                <span className="text-text-muted">Assign to locations (optional)</span>
              ) : (
                <span className="text-text-primary truncate">
                  {locationIds.map((id) => locations.find((l) => l.id === id)?.name).filter(Boolean).join(", ")}
                </span>
              )}
            </button>
            {locationDropdownOpen && locations.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {locations.map((loc) => {
                  const selected = locationIds.includes(loc.id);
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => toggleLocation(loc.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-bg-primary transition-colors ${
                        selected ? "text-accent" : "text-text-primary"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        selected ? "bg-accent border-accent" : "border-border"
                      }`}>
                        {selected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <MapPin className="w-3 h-3 text-text-muted shrink-0" />
                      {loc.name}
                    </button>
                  );
                })}
              </div>
            )}
            {locationIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {locationIds.map((id) => {
                  const loc = locations.find((l) => l.id === id);
                  if (!loc) return null;
                  return (
                    <span key={id} className="inline-flex items-center gap-1 bg-accent-muted text-accent text-xs px-2 py-0.5 rounded-full">
                      <MapPin className="w-2.5 h-2.5" />
                      {loc.name}
                      <button type="button" onClick={() => toggleLocation(id)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-bg-card hover:bg-bg-card-hover border border-border text-text-primary rounded-lg px-4 py-2.5 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!canSubmit || saving || uploading} className="flex-1 bg-accent hover:bg-accent-hover text-white rounded-lg px-4 py-2.5 font-medium transition-colors disabled:opacity-50">
              {saving ? "Adding..." : mode === "images" && images.length > 1 ? `Add ${images.length} Images` : "Add to Moodboard"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
