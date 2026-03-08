"use client";

import { useState, useEffect } from "react";
import { Plus, X, Upload, ImageIcon } from "lucide-react";
import { LocationPhoto } from "@/lib/types";

interface Props {
  projectId: string;
  locationId: string;
  canEdit: boolean;
}

export default function LocationGallery({ projectId, locationId, canEdit }: Props) {
  const [photos, setPhotos] = useState<LocationPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

  async function fetchPhotos() {
    const res = await fetch(`/api/projects/${projectId}/locations/${locationId}/photos`);
    if (res.ok) setPhotos(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchPhotos();
  }, [projectId, locationId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (uploadRes.ok) {
        const { url } = await uploadRes.json();
        await fetch(`/api/projects/${projectId}/locations/${locationId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: url, position: photos.length }),
        });
      }
    }

    setUploading(false);
    fetchPhotos();
    e.target.value = "";
  }

  async function deletePhoto(photoId: string) {
    await fetch(`/api/projects/${projectId}/locations/${locationId}/photos?id=${photoId}`, {
      method: "DELETE",
    });
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }

  if (loading) return null;
  if (photos.length === 0 && !canEdit) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <ImageIcon className="w-4 h-4 text-text-muted" />
        <span className="text-sm font-medium text-text-secondary">Photos</span>
        <span className="text-xs text-text-muted">({photos.length})</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group rounded-lg overflow-hidden aspect-square">
            <img
              src={photo.image_url}
              alt={photo.caption || "Location photo"}
              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setViewingPhoto(photo.image_url)}
            />
            {canEdit && (
              <button
                onClick={() => deletePhoto(photo.id)}
                className="absolute top-1.5 right-1.5 bg-black/60 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            {photo.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                <p className="text-white text-[10px] truncate">{photo.caption}</p>
              </div>
            )}
          </div>
        ))}

        {canEdit && (
          <label className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 text-text-muted hover:text-accent hover:border-accent transition-colors cursor-pointer">
            {uploading ? (
              <span className="text-xs">Uploading...</span>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span className="text-[10px]">Add Photos</span>
              </>
            )}
            <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        )}
      </div>

      {/* Lightbox */}
      {viewingPhoto && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setViewingPhoto(null)}
        >
          <button className="absolute top-4 right-4 text-white/80 hover:text-white">
            <X className="w-8 h-8" />
          </button>
          <img
            src={viewingPhoto}
            alt="Full size"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
