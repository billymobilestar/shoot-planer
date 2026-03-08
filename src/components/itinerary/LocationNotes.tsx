"use client";

import { useState, useEffect } from "react";
import { Trash2, Send } from "lucide-react";
import { LocationNote } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils";

interface Props {
  projectId: string;
  locationId: string;
}

export default function LocationNotes({ projectId, locationId }: Props) {
  const [notes, setNotes] = useState<LocationNote[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  async function fetchNotes() {
    const res = await fetch(`/api/projects/${projectId}/locations/${locationId}/notes`);
    if (res.ok) {
      setNotes(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchNotes();
  }, [projectId, locationId]);

  async function addNote() {
    if (!content.trim()) return;
    await fetch(`/api/projects/${projectId}/locations/${locationId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim() }),
    });
    setContent("");
    fetchNotes();
  }

  async function deleteNote(noteId: string) {
    await fetch(`/api/projects/${projectId}/locations/${locationId}/notes/${noteId}`, {
      method: "DELETE",
    });
    fetchNotes();
  }

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="text-text-muted text-xs">Loading...</div>
      ) : notes.length === 0 ? (
        <div className="text-text-muted text-xs">No comments yet.</div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {notes.map((note) => (
            <div key={note.id} className="flex items-start gap-2 group">
              <div className="flex-1 bg-bg-primary rounded-lg p-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-text-primary">{note.user_name || "Unknown"}</span>
                  <span className="text-xs text-text-muted">{formatTimestamp(note.created_at)}</span>
                </div>
                <p className="text-sm text-text-secondary">{note.content}</p>
              </div>
              <button
                onClick={() => deleteNote(note.id)}
                className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-all mt-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 bg-bg-input border border-border rounded-lg px-3 py-2 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent"
          onKeyDown={(e) => { if (e.key === "Enter") addNote(); }}
        />
        <button
          onClick={addNote}
          disabled={!content.trim()}
          className="bg-accent hover:bg-accent-hover text-white rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
