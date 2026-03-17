"use client";

import { useEffect, useRef, useCallback } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

// Classify a single line given the previous non-blank type
function classifyLine(raw: string, prev: string | null): string {
  const t = raw.trim();
  if (!t) return "blank";
  if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/i.test(t)) return "scene_heading";
  if (t.startsWith(".") && t.length > 1 && !t.startsWith("..")) return "scene_heading";
  if (t.startsWith(">") && !t.endsWith("<")) return "transition";
  if (t.startsWith(">") && t.endsWith("<")) return "centered";
  if (t.startsWith("(") && t.endsWith(")") &&
    (prev === "character" || prev === "parenthetical" || prev === "dialogue")) return "parenthetical";
  if ((prev === "character" || prev === "parenthetical" || prev === "dialogue") &&
    !(/^[A-Z][A-Z0-9\s\(\)@\^!\.\-#\/']+$/.test(t) && !/[a-z]/.test(t))) return "dialogue";
  if (/^[A-Z][A-Z0-9\s\(\)@\^!\.\-#\/']+$/.test(t) && !/[a-z]/.test(t) &&
    (prev === null || prev === "blank" || prev === "scene_heading" || prev === "transition" ||
     prev === "action" || prev === "page_break")) return "character";
  if (/^[A-Z\s]+TO:$/.test(t) || /^FADE (OUT|IN|TO BLACK)\.?$/i.test(t)) return "transition";
  return "action";
}

// Walk all direct child divs and reclassify them
function reclassifyAll(container: HTMLElement) {
  const divs = Array.from(container.children) as HTMLElement[];
  let prev: string | null = null;
  for (const el of divs) {
    // innerText of a <br>-only div is "\n" in some browsers, "" in others
    const text = el.tagName === "DIV"
      ? (el.innerText === "\n" ? "" : el.innerText)
      : el.textContent ?? "";
    const type = classifyLine(text, prev);
    if (el.dataset.ft !== type) el.dataset.ft = type;
    if (type !== "blank") prev = type;
    else prev = "blank";
  }
}

// Convert plain text to div-per-line HTML (used only on mount)
function textToHtml(text: string): string {
  if (!text) return `<div data-ft="action"><br></div>`;
  return text
    .split("\n")
    .map((line) => {
      const esc = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `<div data-ft="action">${esc || "<br>"}</div>`;
    })
    .join("");
}

export default function FountainEditor({ value, onChange, placeholder = "", disabled = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const initialised = useRef(false);

  // Mount: populate editor once from value
  useEffect(() => {
    const el = ref.current;
    if (!el || initialised.current) return;
    initialised.current = true;
    el.innerHTML = textToHtml(value);
    reclassifyAll(el);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInput = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    reclassifyAll(el);
    // innerText gives us back the original newline-separated text
    const raw = el.innerText.replace(/\n$/, "");
    onChange(raw);
  }, [onChange]);

  // Intercept paste — strip HTML, insert plain text
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    // execCommand is deprecated but remains the only reliable way to insert
    // text into contenteditable while preserving undo and cursor position
    document.execCommand("insertText", false, text);
    setTimeout(handleInput, 0);
  }, [handleInput]);

  return (
    <>
      <style>{`
        .ft-editor { outline: none; }
        .ft-editor > div { min-height: 1.4em; }

        /* Scene heading */
        .ft-editor [data-ft="scene_heading"] {
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-top: 1.4em;
          padding-top: 0.4em;
          border-top: 1px solid rgba(128,128,128,0.2);
        }

        /* Character cue */
        .ft-editor [data-ft="character"] {
          padding-left: 38%;
          font-weight: 600;
          text-transform: uppercase;
          margin-top: 0.9em;
        }

        /* Parenthetical */
        .ft-editor [data-ft="parenthetical"] {
          padding-left: 28%;
          padding-right: 20%;
          font-style: italic;
          opacity: 0.7;
        }

        /* Dialogue */
        .ft-editor [data-ft="dialogue"] {
          padding-left: 20%;
          padding-right: 12%;
        }

        /* Transition */
        .ft-editor [data-ft="transition"] {
          text-align: right;
          font-style: italic;
          opacity: 0.65;
          margin-top: 0.5em;
        }

        /* Centered */
        .ft-editor [data-ft="centered"] {
          text-align: center;
        }

        /* Blank / action — default */
        .ft-editor [data-ft="blank"],
        .ft-editor [data-ft="action"] {
          /* inherit */
        }

        /* Placeholder */
        .ft-editor:empty::before,
        .ft-editor > div:only-child[data-ft="action"]:has(br)::before {
          content: attr(data-placeholder);
          opacity: 0.35;
          pointer-events: none;
          position: absolute;
        }
      `}</style>
      <div
        ref={ref}
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={handleInput}
        onPaste={handlePaste}
        className="ft-editor relative flex-1 w-full p-5 font-mono text-sm leading-relaxed text-text-primary overflow-auto focus:outline-none"
      />
    </>
  );
}
