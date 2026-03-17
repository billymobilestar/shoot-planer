"use client";

import { useEffect, useRef, useState } from "react";
import { Undo2 } from "lucide-react";

interface Props {
  message: string;
  duration?: number;
  onUndo: () => void;
  onCommit: () => void;
}

export default function UndoToast({ message, duration = 30000, onUndo, onCommit }: Props) {
  const [progress, setProgress] = useState(100);
  const committedRef = useRef(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        if (!committedRef.current) {
          committedRef.current = true;
          onCommit();
        }
      }
    }, 50);
    return () => clearInterval(interval);
  }, [duration, onCommit]);

  function handleUndo() {
    committedRef.current = true;
    onUndo();
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 sm:px-0 pointer-events-none">
      <div className="bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden pointer-events-auto">
        <div className="flex items-center justify-between px-4 py-3 gap-3">
          <p className="text-sm text-text-primary">{message}</p>
          <button
            onClick={handleUndo}
            className="flex items-center gap-1.5 text-accent hover:text-accent-hover text-sm font-medium whitespace-nowrap shrink-0"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Undo
          </button>
        </div>
        <div className="h-0.5 bg-border">
          <div className="h-full bg-accent" style={{ width: `${progress}%`, transition: "width 50ms linear" }} />
        </div>
      </div>
    </div>
  );
}
