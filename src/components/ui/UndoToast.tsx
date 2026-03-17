"use client";

import { useEffect, useRef, useState } from "react";
import { Undo2, X } from "lucide-react";

interface Props {
  message: string;
  duration?: number;
  onUndo: () => void;
  onDismiss: () => void;
}

export default function UndoToast({ message, duration = 5000, onUndo, onDismiss }: Props) {
  const [progress, setProgress] = useState(100);
  const doneRef = useRef(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        if (!doneRef.current) {
          doneRef.current = true;
          onDismiss();
        }
      }
    }, 50);
    return () => clearInterval(interval);
  }, [duration, onDismiss]);

  function handleUndo() {
    if (doneRef.current) return;
    doneRef.current = true;
    onUndo();
  }

  function handleDismiss() {
    if (doneRef.current) return;
    doneRef.current = true;
    onDismiss();
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 sm:px-0 pointer-events-none">
      <div className="bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden pointer-events-auto">
        <div className="flex items-center justify-between px-4 py-3 gap-3">
          <p className="text-sm text-text-primary">{message}</p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleUndo}
              className="flex items-center gap-1.5 text-accent hover:text-accent-hover text-sm font-medium whitespace-nowrap"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Undo
            </button>
            <button
              onClick={handleDismiss}
              className="text-text-muted hover:text-text-primary transition-colors p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="h-0.5 bg-border">
          <div className="h-full bg-accent" style={{ width: `${progress}%`, transition: "width 50ms linear" }} />
        </div>
      </div>
    </div>
  );
}
