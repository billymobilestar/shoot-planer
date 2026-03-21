"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { MessageSquare, X, Send, ChevronDown } from "lucide-react";
import { ChatMessage } from "@/lib/types";
import { supabase } from "@/lib/supabase";

interface Props {
  projectId: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function ChatBox({ projectId }: Props) {
  const { user } = useUser();
  const currentUserId = user?.id ?? "";
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastSeenRef = useRef<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMessages = useCallback(async (before?: string) => {
    if (!before) setLoading(true);
    const url = `/api/projects/${projectId}/messages?limit=50${before ? `&before=${before}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) { setLoading(false); return; }
    const data: ChatMessage[] = await res.json();

    if (before) {
      // Loading older messages
      setMessages((prev) => [...prev, ...data]);
      if (data.length < 50) setHasMore(false);
    } else {
      // Initial load or refresh
      setMessages(data);
      setHasMore(data.length >= 50);
      if (data.length > 0) {
        lastSeenRef.current = data[0].created_at;
      }
    }
    setLoading(false);
  }, [projectId]);

  // Poll for new messages every 5 seconds when open
  const pollNewMessages = useCallback(async () => {
    if (!lastSeenRef.current) return;
    const res = await fetch(`/api/projects/${projectId}/messages?limit=50`);
    if (!res.ok) return;
    const data: ChatMessage[] = await res.json();

    if (data.length > 0 && data[0].created_at !== lastSeenRef.current) {
      setMessages(data);
      lastSeenRef.current = data[0].created_at;
      // Scroll to bottom for new messages
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [projectId]);

  // Poll for unread count when closed
  const pollUnread = useCallback(async () => {
    if (open) return;
    const res = await fetch(`/api/projects/${projectId}/messages?limit=50`);
    if (!res.ok) return;
    const data: ChatMessage[] = await res.json();
    if (data.length > 0 && lastSeenRef.current) {
      const newCount = data.filter((m) => m.created_at > lastSeenRef.current! && m.user_id !== currentUserId).length;
      setUnreadCount(newCount);
    } else if (data.length > 0 && !lastSeenRef.current) {
      // Never opened — show count of recent messages from others
      setUnreadCount(data.filter((m) => m.user_id !== currentUserId).length);
    }
  }, [projectId, open, currentUserId]);

  // Initial load when opened
  useEffect(() => {
    if (open) {
      fetchMessages();
      setUnreadCount(0);
    }
  }, [open, fetchMessages]);

  // Realtime subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "project_messages",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [newMsg, ...prev];
          });
          if (open) {
            lastSeenRef.current = newMsg.created_at;
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
          } else if (newMsg.user_id !== currentUserId) {
            setUnreadCount((c) => c + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, open, currentUserId]);

  // Fallback polling (in case realtime connection drops)
  useEffect(() => {
    if (open) {
      pollRef.current = setInterval(pollNewMessages, 30000);
    } else {
      pollRef.current = setInterval(pollUnread, 60000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, pollNewMessages, pollUnread]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (open && messages.length > 0 && !loading) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView(), 100);
    }
  }, [open, loading]);

  async function sendMessage() {
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");

    const res = await fetch(`/api/projects/${projectId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (res.ok) {
      const msg: ChatMessage = await res.json();
      setMessages((prev) => [msg, ...prev]);
      lastSeenRef.current = msg.created_at;
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
    setSending(false);
  }

  function loadMore() {
    if (!hasMore || loading || messages.length === 0) return;
    const oldest = messages[messages.length - 1];
    fetchMessages(oldest.created_at);
  }

  // Messages are stored newest-first; render reversed
  const orderedMessages = [...messages].reverse();

  // Group messages by date
  const messagesByDate: { date: string; messages: ChatMessage[] }[] = [];
  for (const msg of orderedMessages) {
    const dateKey = new Date(msg.created_at).toDateString();
    const last = messagesByDate[messagesByDate.length - 1];
    if (last && last.date === dateKey) {
      last.messages.push(msg);
    } else {
      messagesByDate.push({ date: dateKey, messages: [msg] });
    }
  }

  return (
    <>
      {/* Floating toggle button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-accent hover:bg-accent-hover text-white shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        >
          <MessageSquare className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] flex items-center justify-center bg-danger text-white text-[10px] font-bold rounded-full px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-6rem)] flex flex-col bg-bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-card-hover shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold text-text-primary">Team Chat</h3>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-text-muted hover:text-text-primary transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
          >
            {/* Load more */}
            {hasMore && messages.length > 0 && (
              <div className="flex justify-center pb-2">
                <button
                  onClick={loadMore}
                  className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
                >
                  <ChevronDown className="w-3 h-3 rotate-180" />
                  Load older messages
                </button>
              </div>
            )}

            {loading && messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                <MessageSquare className="w-10 h-10 text-text-muted mb-3" />
                <p className="text-text-secondary text-sm font-medium">No messages yet</p>
                <p className="text-text-muted text-xs mt-1">Start the conversation with your team</p>
              </div>
            ) : (
              messagesByDate.map((group) => (
                <div key={group.date}>
                  {/* Date separator */}
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
                      {formatDateSeparator(group.messages[0].created_at)}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {group.messages.map((msg, i) => {
                    const isMe = msg.user_id === currentUserId;
                    const prevMsg = i > 0 ? group.messages[i - 1] : null;
                    const sameAuthor = prevMsg?.user_id === msg.user_id;
                    const timeDiff = prevMsg
                      ? new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()
                      : Infinity;
                    const grouped = sameAuthor && timeDiff < 120000; // 2 min grouping

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"} ${grouped ? "mt-0.5" : "mt-3"}`}
                      >
                        <div className={`max-w-[80%] ${isMe ? "items-end" : "items-start"}`}>
                          {/* Author name + avatar */}
                          {!grouped && !isMe && (
                            <div className="flex items-center gap-1.5 mb-1 ml-1">
                              {msg.user_avatar_url ? (
                                <img src={msg.user_avatar_url} alt="" className="w-4 h-4 rounded-full" />
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-accent/20 flex items-center justify-center">
                                  <span className="text-[8px] text-accent font-bold">
                                    {(msg.user_name || "?")[0].toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <span className="text-[11px] text-text-muted font-medium">{msg.user_name}</span>
                            </div>
                          )}

                          {/* Message bubble */}
                          <div
                            className={`px-3 py-2 text-sm leading-relaxed ${
                              isMe
                                ? "bg-accent text-white rounded-2xl rounded-br-md"
                                : "bg-bg-card-hover border border-border text-text-primary rounded-2xl rounded-bl-md"
                            }`}
                          >
                            {msg.content}
                          </div>

                          {/* Timestamp */}
                          {!grouped && (
                            <p className={`text-[10px] text-text-muted mt-0.5 ${isMe ? "text-right mr-1" : "ml-1"}`}>
                              {timeAgo(msg.created_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-border px-3 py-2.5 bg-bg-card shrink-0">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 bg-bg-input border border-border rounded-xl px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
                disabled={sending}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:hover:bg-accent text-white transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
