"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Send, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { ReferenceReaction, ReferenceComment } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils";

const EMOJI_OPTIONS = [
  { emoji: "🔥", label: "Fire" },
  { emoji: "❤️", label: "Love" },
  { emoji: "👍", label: "Like" },
  { emoji: "⭐", label: "Star" },
  { emoji: "👀", label: "Eyes" },
];

interface Props {
  projectId: string;
  referenceId: string;
}

export default function ReferenceInteractions({ projectId, referenceId }: Props) {
  const [reactions, setReactions] = useState<ReferenceReaction[]>([]);
  const [comments, setComments] = useState<ReferenceComment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);

  const basePath = `/api/projects/${projectId}/references/${referenceId}`;

  useEffect(() => {
    Promise.all([
      fetch(`${basePath}/reactions`).then((r) => r.ok ? r.json() : []),
      fetch(`${basePath}/comments`).then((r) => r.ok ? r.json() : []),
    ]).then(([rxns, cmts]) => {
      setReactions(rxns);
      setComments(cmts);
      setLoading(false);
    });
  }, [basePath]);

  async function toggleReaction(emoji: string) {
    const res = await fetch(`${basePath}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (res.ok) {
      const rxnRes = await fetch(`${basePath}/reactions`);
      if (rxnRes.ok) setReactions(await rxnRes.json());
    }
  }

  async function addComment() {
    if (!commentText.trim()) return;
    const res = await fetch(`${basePath}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: commentText.trim() }),
    });
    if (res.ok) {
      setCommentText("");
      const cmtRes = await fetch(`${basePath}/comments`);
      if (cmtRes.ok) setComments(await cmtRes.json());
    }
  }

  async function deleteComment(commentId: string) {
    await fetch(`${basePath}/comments/${commentId}`, { method: "DELETE" });
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  // Group reactions by emoji with names
  const reactionGroups = EMOJI_OPTIONS.map(({ emoji }) => {
    const users = reactions.filter((r) => r.emoji === emoji);
    const names = users.map((r) => r.user_name || "Someone").join(", ");
    return { emoji, count: users.length, names };
  });

  if (loading) return null;

  return (
    <div className="space-y-2">
      {/* Reactions row */}
      <div className="flex items-center gap-1 flex-wrap">
        {reactionGroups.map(({ emoji, count, names }) => (
          <button
            key={emoji}
            onClick={() => toggleReaction(emoji)}
            className={`relative flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all hover:scale-110 group/reaction ${
              count > 0
                ? "bg-accent-muted border border-accent/30"
                : "bg-bg-primary border border-border hover:border-border-light"
            }`}
          >
            <span className="text-sm">{emoji}</span>
            {count > 0 && <span className="text-text-secondary font-medium">{count}</span>}
            {/* Tooltip with names */}
            {count > 0 && (
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-bg-card border border-border rounded-lg text-[10px] text-text-primary whitespace-nowrap opacity-0 group-hover/reaction:opacity-100 transition-opacity pointer-events-none shadow-lg z-10">
                {names}
              </span>
            )}
          </button>
        ))}

        {/* Comment toggle */}
        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ml-1 ${
            comments.length > 0
              ? "bg-accent-muted border border-accent/30 text-accent"
              : "bg-bg-primary border border-border text-text-muted hover:text-text-primary hover:border-border-light"
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          {comments.length > 0 && <span className="font-medium">{comments.length}</span>}
          {showComments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Who reacted summary */}
      {reactions.length > 0 && (
        <p className="text-[10px] text-text-muted leading-tight">
          {(() => {
            const uniqueNames = [...new Set(reactions.map((r) => r.user_name || "Someone"))];
            if (uniqueNames.length === 1) return `${uniqueNames[0]} reacted`;
            if (uniqueNames.length === 2) return `${uniqueNames[0]} and ${uniqueNames[1]} reacted`;
            return `${uniqueNames[0]}, ${uniqueNames[1]} and ${uniqueNames.length - 2} other${uniqueNames.length - 2 > 1 ? "s" : ""} reacted`;
          })()}
        </p>
      )}

      {/* Comments section */}
      {showComments && (
        <div className="space-y-2 pt-1">
          {comments.length > 0 && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-1.5 group">
                  <div className="flex-1 bg-bg-primary rounded-lg px-2.5 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-text-primary">{comment.user_name || "Unknown"}</span>
                      <span className="text-[10px] text-text-muted">{formatTimestamp(comment.created_at)}</span>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">{comment.content}</p>
                  </div>
                  <button
                    onClick={() => deleteComment(comment.id)}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-danger transition-all mt-1.5 shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-1.5">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-bg-input border border-border rounded-lg px-2.5 py-1.5 text-text-primary text-xs placeholder:text-text-muted focus:outline-none focus:border-accent"
              onKeyDown={(e) => { if (e.key === "Enter") addComment(); }}
            />
            <button
              onClick={addComment}
              disabled={!commentText.trim()}
              className="bg-accent hover:bg-accent-hover text-white rounded-lg px-2 py-1.5 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
