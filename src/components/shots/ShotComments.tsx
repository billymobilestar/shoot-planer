"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageCircle, Trash2, Send } from "lucide-react";
import { ShotComment } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils";

interface Props {
  projectId: string;
  shotId: string;
  currentUserId: string;
}

export default function ShotComments({ projectId, shotId, currentUserId }: Props) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<ShotComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/shots/${shotId}/comments`);
    if (res.ok) setComments(await res.json());
    setLoading(false);
  }, [projectId, shotId]);

  useEffect(() => {
    if (open) fetchComments();
  }, [open, fetchComments]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    const res = await fetch(`/api/projects/${projectId}/shots/${shotId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim() }),
    });
    if (res.ok) {
      const newComment = await res.json();
      setComments((prev) => [...prev, newComment]);
      setContent("");
    }
    setSubmitting(false);
  }

  async function deleteComment(id: string) {
    await fetch(`/api/projects/${projectId}/shots/${shotId}/comments/${id}`, { method: "DELETE" });
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="border-t border-border mt-3 pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        {comments.length > 0 || open
          ? `${comments.length} comment${comments.length !== 1 ? "s" : ""}`
          : "Add comment"}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {loading ? (
            <p className="text-xs text-text-muted">Loading...</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-text-muted">No comments yet.</p>
          ) : (
            <div className="space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2 group/comment">
                  <div className="flex-1 bg-bg-primary rounded-lg px-3 py-2 border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-text-primary">{c.user_name || "Unknown"}</span>
                      <span className="text-[10px] text-text-muted">{formatTimestamp(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">{c.content}</p>
                  </div>
                  {c.user_id === currentUserId && (
                    <button
                      onClick={() => deleteComment(c.id)}
                      className="opacity-0 group-hover/comment:opacity-100 transition-opacity mt-2 text-text-muted hover:text-danger"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={submit} className="flex gap-2">
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add a comment…"
              className="flex-1 bg-bg-input border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent placeholder:text-text-muted"
            />
            <button
              type="submit"
              disabled={!content.trim() || submitting}
              className="p-2 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white rounded-lg transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
