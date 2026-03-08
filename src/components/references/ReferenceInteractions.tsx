"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Send, Trash2, ChevronDown, ChevronUp, Heart, ThumbsUp, Flame, Star, Eye } from "lucide-react";
import { ReferenceReaction, ReferenceComment } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils";

const REACTION_OPTIONS = [
  { emoji: "fire", label: "Fire", icon: Flame },
  { emoji: "heart", label: "Love", icon: Heart },
  { emoji: "thumbsup", label: "Like", icon: ThumbsUp },
  { emoji: "star", label: "Star", icon: Star },
  { emoji: "eyes", label: "Seen", icon: Eye },
];

// Map old emoji values to new keys for backward compat
function normalizeEmoji(e: string) {
  const map: Record<string, string> = { "🔥": "fire", "❤️": "heart", "👍": "thumbsup", "⭐": "star", "👀": "eyes" };
  return map[e] || e;
}

interface Props {
  projectId: string;
  referenceId: string;
}

export default function ReferenceInteractions({ projectId, referenceId }: Props) {
  const [reactions, setReactions] = useState<ReferenceReaction[]>([]);
  const [comments, setComments] = useState<ReferenceComment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [showReactors, setShowReactors] = useState(false);
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

  // Group reactions by type with user names
  const reactionGroups = REACTION_OPTIONS.map(({ emoji, icon }) => {
    const users = reactions.filter((r) => normalizeEmoji(r.emoji) === emoji);
    return { emoji, icon, count: users.length, names: users.map((r) => r.user_name || "Someone") };
  });

  const activeReactions = reactionGroups.filter((g) => g.count > 0);

  if (loading) return null;

  return (
    <div className="space-y-2">
      {/* Reactions row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {reactionGroups.map(({ emoji, icon: Icon, count }) => (
          <button
            key={emoji}
            onClick={() => toggleReaction(emoji)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all active:scale-95 ${
              count > 0
                ? "bg-accent/10 border border-accent/30 text-accent"
                : "bg-bg-primary border border-border text-text-muted hover:text-text-secondary hover:border-border-light"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {count > 0 && <span className="font-semibold">{count}</span>}
          </button>
        ))}

        {/* Comment toggle */}
        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-colors ml-auto ${
            comments.length > 0
              ? "bg-accent/10 border border-accent/30 text-accent"
              : "bg-bg-primary border border-border text-text-muted hover:text-text-secondary hover:border-border-light"
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          {comments.length > 0 && <span className="font-semibold">{comments.length}</span>}
          {showComments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Who reacted — tappable on mobile */}
      {activeReactions.length > 0 && (
        <button
          onClick={() => setShowReactors(!showReactors)}
          className="text-[10px] text-text-muted leading-tight text-left w-full hover:text-text-secondary transition-colors"
        >
          {(() => {
            const allNames = [...new Set(reactions.map((r) => r.user_name || "Someone"))];
            if (allNames.length === 1) return `${allNames[0]} reacted`;
            if (allNames.length === 2) return `${allNames[0]} and ${allNames[1]} reacted`;
            return `${allNames[0]}, ${allNames[1]} and ${allNames.length - 2} other${allNames.length - 2 > 1 ? "s" : ""} reacted`;
          })()}
          <span className="ml-1 text-text-muted">{showReactors ? "▴" : "▾"}</span>
        </button>
      )}

      {/* Reactor list (expanded) */}
      {showReactors && activeReactions.length > 0 && (
        <div className="bg-bg-primary rounded-lg border border-border p-2 space-y-1.5">
          {activeReactions.map(({ emoji, icon: Icon, names }) => (
            <div key={emoji} className="flex items-center gap-2">
              <Icon className="w-3.5 h-3.5 text-accent shrink-0" />
              <span className="text-[11px] text-text-secondary truncate">
                {names.join(", ")}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Comments section */}
      {showComments && (
        <div className="space-y-2 pt-1">
          {comments.length > 0 && (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="group">
                  <div className="bg-bg-primary rounded-lg px-2.5 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-text-primary">{comment.user_name || "Unknown"}</span>
                      <span className="text-[10px] text-text-muted">{formatTimestamp(comment.created_at)}</span>
                      <button
                        onClick={() => deleteComment(comment.id)}
                        className="ml-auto opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-text-muted hover:text-danger transition-all shrink-0 p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 min-w-0 bg-bg-input border border-border rounded-lg px-2.5 py-2 text-text-primary text-sm sm:text-xs placeholder:text-text-muted focus:outline-none focus:border-accent"
              onKeyDown={(e) => { if (e.key === "Enter") addComment(); }}
            />
            <button
              onClick={addComment}
              disabled={!commentText.trim()}
              className="bg-accent hover:bg-accent-hover text-white rounded-lg p-2 transition-colors disabled:opacity-50 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
