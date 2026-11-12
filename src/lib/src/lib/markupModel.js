// Markup model: the live text plus a segment ledger used by the Teacher's Markup View.
// Segment kinds: "typed" (manual keystrokes), "pasted" (imported paragraphs), "deleted" (struck-through red).
// Everything lives in browser RAM only.

export const FONTS = {
  arial: { name: "Arial", css: "Arial, Helvetica, sans-serif" },
  times: { name: "Times New Roman", css: "'Times New Roman', Times, serif" },
  courier_new: { name: "Courier New", css: "'Courier New', Courier, monospace" },
  georgia: { name: "Georgia", css: "Georgia, serif" },
  helvetica: { name: "Helvetica", css: "Helvetica, Arial, sans-serif" },
};

// Eye-care page tones — background of the writing container only (exports stay white paper)
export const PAGE_TEMPLATES = {
  white: { name: "Default White", bg: "#ffffff", text: "#1e293b" },
  sepia: { name: "Warm Sepia (Eye-Care)", bg: "#f4f4f0", text: "#3f3f3c" },
  cream: { name: "Cream Comfort", bg: "#fffdd0", text: "#3d3a22" },
  pastel: { name: "Classic Pastel Yellow", bg: "#fff9c4", text: "#3f3a12" },
  blue: { name: "Cool Soft Blue", bg: "#eef2f7", text: "#2b3a4a" },
  ice: { name: "Light Clear Ice", bg: "#e3f2fd", text: "#1e3a5f" },
  slate: { name: "Soft Slate Grey", bg: "#f5f5f5", text: "#24292e" },
  mint: { name: "Mint Fresh Green", bg: "#e8f5e9", text: "#1f3d2b" },
  charcoal: { name: "Deep Charcoal Muted", bg: "#334155", text: "#e2e8f0" },
};

export const SIZES = [12, 14, 16, 18, 24, 32];

// Blank canvas: no pre-written text — the workspace opens as a clean slate
export const SEED_TEXT = "";

export function initialSegments(text) {
  return text ? [{ text, kind: "typed" }] : [];
}

function mergeSegments(segs) {
  const out = [];
  for (const s of segs) {
    if (!s.text) continue;
    const last = out[out.length - 1];
    if (last && last.kind === s.kind) last.text += s.text;
    else out.push({ text: s.text, kind: s.kind });
  }
  return out;
}

// Record one edit: `removed` is the deleted fragment at `position`, `inserted` the new text.
export function applyEdit(segments, position, removed, inserted, pasted) {
  if (!removed && !inserted) return segments;

  // Walk live (non-deleted) segments to find the split point
  let idx = 0;
  let p = position;
  while (idx < segments.length) {
    const seg = segments[idx];
    if (seg.kind === "deleted") { idx++; continue; }
    if (p <= seg.text.length) break;
    p -= seg.text.length;
    idx++;
  }

  const next = segments.slice();
  const parts = [];
  if (idx < segments.length && p > 0) {
    parts.push({ text: segments[idx].text.slice(0, p), kind: segments[idx].kind });
  }
  if (removed) parts.push({ text: removed, kind: "deleted" });
  if (inserted) parts.push({ text: inserted, kind: pasted ? "pasted" : "typed" });
  if (idx < segments.length) {
    parts.push({ text: segments[idx].text.slice(p), kind: segments[idx].kind });
    next.splice(idx, 1, ...parts);
  } else {
    next.splice(idx, 0, ...parts);
  }
  return mergeSegments(next);
}

// Common-prefix/suffix diff: returns the removed fragment and its position
export function diffText(oldText, newText) {
  let start = 0;
  const minLen = Math.min(oldText.length, newText.length);
  while (start < minLen && oldText[start] === newText[start]) start++;
  let endOld = oldText.length;
  let endNew = newText.length;
  while (endOld > start && endNew > start && oldText[endOld - 1] === newText[endNew - 1]) {
    endOld--;
    endNew--;
  }
  return { position: start, removed: oldText.slice(start, endOld) };
}
