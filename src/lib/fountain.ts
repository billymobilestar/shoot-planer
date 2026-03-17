export type FountainElementType =
  | "scene_heading"
  | "action"
  | "character"
  | "parenthetical"
  | "dialogue"
  | "transition"
  | "centered"
  | "page_break"
  | "blank";

export interface FountainElement {
  type: FountainElementType;
  text?: string;
}

const SCENE_HEADING_RE = /^(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.)/i;
const TRANSITION_RE = /^[A-Z\s]+TO:$|^FADE (OUT|IN|TO BLACK)\.?$/;

/** Apply inline Fountain emphasis (*italic*, **bold**, _underline_) */
export function applyInlineFormatting(text: string): string {
  return text
    .replace(/\[\[.*?\]\]/g, "") // strip notes
    .replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/_(.*?)_/g, "<u>$1</u>");
}

export function parseFountain(script: string): FountainElement[] {
  // Normalise line endings
  const lines = script.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const elements: FountainElement[] = [];
  let prevNonBlank: FountainElementType | null = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const t = raw.trim();

    if (!t) {
      elements.push({ type: "blank" });
      continue;
    }

    // Page break
    if (t === "===") {
      elements.push({ type: "page_break" });
      prevNonBlank = "page_break";
      continue;
    }

    // Centered text >text< (must come before transition check)
    if (t.startsWith(">") && t.endsWith("<")) {
      const text = t.slice(1, -1).trim();
      elements.push({ type: "centered", text });
      prevNonBlank = "centered";
      continue;
    }

    // Transition: forced with ">" prefix
    if (t.startsWith(">")) {
      elements.push({ type: "transition", text: t.slice(1).trim() });
      prevNonBlank = "transition";
      continue;
    }

    // Forced scene heading
    if (t.startsWith(".") && !t.startsWith("..")) {
      elements.push({ type: "scene_heading", text: t.slice(1).trim().toUpperCase() });
      prevNonBlank = "scene_heading";
      continue;
    }

    // Scene heading (INT., EXT., etc.)
    if (SCENE_HEADING_RE.test(t)) {
      elements.push({ type: "scene_heading", text: t.toUpperCase() });
      prevNonBlank = "scene_heading";
      continue;
    }

    // Transition (auto-detect): all-caps line ending in "TO:" or known phrases, after a blank
    const isBlankBefore = elements.length > 0 && elements[elements.length - 1].type === "blank";
    if (isBlankBefore && TRANSITION_RE.test(t) && !/[a-z]/.test(t)) {
      elements.push({ type: "transition", text: t });
      prevNonBlank = "transition";
      continue;
    }

    // Parenthetical: only valid inside dialogue block
    if (
      t.startsWith("(") &&
      t.endsWith(")") &&
      (prevNonBlank === "character" || prevNonBlank === "parenthetical" || prevNonBlank === "dialogue")
    ) {
      elements.push({ type: "parenthetical", text: t });
      prevNonBlank = "parenthetical";
      continue;
    }

    // Dialogue: line after character or parenthetical
    if (prevNonBlank === "character" || prevNonBlank === "parenthetical" || prevNonBlank === "dialogue") {
      elements.push({ type: "dialogue", text: t });
      prevNonBlank = "dialogue";
      continue;
    }

    // Character: ALL CAPS after blank/heading, not a transition pattern
    const isAllCaps = /^[A-Z][A-Z\s\d\(\)@\^!\.\-#\/]+$/.test(t) && !/[a-z]/.test(t);
    const isForced = t.startsWith("@");
    const afterValidBlock =
      prevNonBlank === null ||
      prevNonBlank === "scene_heading" ||
      prevNonBlank === "page_break" ||
      prevNonBlank === "transition" ||
      prevNonBlank === "action";

    if ((isAllCaps || isForced) && afterValidBlock && isBlankBefore) {
      const charName = isForced ? t.slice(1).trim() : t;
      elements.push({ type: "character", text: charName });
      prevNonBlank = "character";
      continue;
    }

    // Action (default)
    elements.push({ type: "action", text: t });
    prevNonBlank = "action";
  }

  return elements;
}
