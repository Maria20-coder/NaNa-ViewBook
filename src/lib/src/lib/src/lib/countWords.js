// Local, in-memory word counter: whitespace-separated tokens
export default function countWords(text) {
  const trimmed = (text || "").trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}
