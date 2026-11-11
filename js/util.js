export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return todayStr(dt);
}

export function daysBetween(a, b) {
  const pa = a.split("-").map(Number);
  const pb = b.split("-").map(Number);
  const da = new Date(pa[0], pa[1] - 1, pa[2]);
  const db = new Date(pb[0], pb[1] - 1, pb[2]);
  return Math.round((db - da) / 86400000);
}

export function weekdayNames() {
  return ["日", "一", "二", "三", "四", "五", "六"];
}

export function formatZhDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${m}月${d}日 周${weekdayNames()[dt.getDay()]}`;
}

export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickN(arr, n, pred) {
  const pool = pred ? arr.filter(pred) : arr.slice();
  return shuffle(pool).slice(0, n);
}

export function mulberry32(seed) {
  let s = seed >>> 0;
  return function rand() {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeAnswer(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, " ");
}

export function answersEqual(input, expected) {
  const a = normalizeAnswer(input);
  const b = normalizeAnswer(expected);
  if (a === b) return true;
  const strip = (x) => x.replace(/[.,;:!?()[\]\-]/g, "").replace(/\s+/g, " ").trim();
  return strip(a) === strip(b);
}

export function blankSentence(sentence, word) {
  if (!sentence || !word) return null;
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b(${esc})([A-Za-z]*)\\b`, "i");
  if (!re.test(sentence)) return null;
  const used = sentence.match(re)[0];
  const text = sentence.replace(re, "______");
  return { text, answer: used };
}

export function highlightWord(sentence, word) {
  if (!sentence) return "";
  const esc = escapeHtml(sentence);
  if (!word) return esc;
  const re = new RegExp(`(\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[A-Za-z]*\\b)`, "i");
  return esc.replace(re, "<b>$1</b>");
}

export function showToast(msg, ms = 1800) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    el.hidden = true;
  }, ms);
}

export function vibrate(ms = 12) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch {
    /* ignore */
  }
}

export function iconSpeaker() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 8.2 6.8 11H4.6a1 1 0 0 0-1 1v1.8a1 1 0 0 0 1 1h2.2L10 17.6V8.2Z"/><path d="M14.2 9.2a4.2 4.2 0 0 1 0 5.6M16.8 7a7 7 0 0 1 0 10"/></svg>`;
}

export function iconPlay() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.8v12.4L19 12 8 5.8Z"/></svg>`;
}

export function iconReplay() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11.5A5 5 0 1 1 8.4 16"/><path d="M7 7.5v4h4"/></svg>`;
}
