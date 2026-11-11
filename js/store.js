import { addDays, daysBetween, mulberry32, shuffle, todayStr } from "./util.js";

const KEY = "sijishenlien-v1";
const VERSION = 1;

function defaultState() {
  return {
    v: VERSION,
    settings: {
      dailyNew: 20,
      lang: "en-US",
      rate: 1,
    },
    // word -> { ease, interval, reps, lapses, due, last, status }
    cards: {},
    // shuffled word keys, created once so new words aren't always A...
    order: [],
    intro: {}, // date -> [words introduced]
    days: {}, // date -> { new, review, quiz, spell, listen, study }
    streak: { count: 0, last: "" },
    created: todayStr(),
  };
}

function safeParse(raw) {
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    return data;
  } catch {
    return null;
  }
}

export const Store = {
  state: defaultState(),
  words: [],
  byWord: new Map(),
  persistOk: true,
  persistError: "",

  attach(words) {
    this.words = words;
    this.byWord = new Map(words.map((w) => [w.w, w]));
    this.load();
    if (!this.state.order.length) {
      const seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
      this.state.order = shuffle(
        words.map((w) => w.w),
        mulberry32(seed)
      );
      this.save();
    }
  },

  load() {
    let raw = null;
    try {
      raw = localStorage.getItem(KEY);
      this.persistOk = true;
      this.persistError = "";
    } catch (err) {
      this.persistOk = false;
      this.persistError = "浏览器没有开放本地存储，刷新后进度会丢失。";
      this.state = defaultState();
      return;
    }
    if (!raw) {
      this.state = defaultState();
      return;
    }
    const data = safeParse(raw);
    if (!data) {
      this.state = defaultState();
      return;
    }
    const base = defaultState();
    this.state = {
      ...base,
      ...data,
      settings: { ...base.settings, ...(data.settings || {}) },
      cards: data.cards && typeof data.cards === "object" ? data.cards : {},
      order: Array.isArray(data.order) ? data.order : [],
      intro: data.intro && typeof data.intro === "object" ? data.intro : {},
      days: data.days && typeof data.days === "object" ? data.days : {},
      streak: { ...base.streak, ...(data.streak || {}) },
    };
    const n = Number(this.state.settings.dailyNew);
    this.state.settings.dailyNew = Math.min(80, Math.max(5, n || 20));
    if (this.state.settings.lang !== "en-GB") this.state.settings.lang = "en-US";
    const rate = Number(this.state.settings.rate);
    this.state.settings.rate = [0.75, 1, 1.2].includes(rate) ? rate : 1;
  },

  save() {
    if (!this.persistOk) return false;
    try {
      localStorage.setItem(KEY, JSON.stringify(this.state));
      return true;
    } catch (err) {
      this.persistOk = false;
      this.persistError = "本地存储已满或被禁止，进度可能无法保存。";
      return false;
    }
  },

  today() {
    return todayStr();
  },

  day(date = this.today()) {
    if (!this.state.days[date]) {
      this.state.days[date] = { new: 0, review: 0, quiz: 0, spell: 0, listen: 0, study: 0 };
    }
    return this.state.days[date];
  },

  bump(kind, n = 1, date = this.today()) {
    const d = this.day(date);
    d[kind] = (d[kind] || 0) + n;
    this.touchStreak(date);
    this.save();
  },

  touchStreak(date = this.today()) {
    const s = this.state.streak;
    if (s.last === date) return;
    if (!s.last) {
      s.count = 1;
      s.last = date;
      return;
    }
    const gap = daysBetween(s.last, date);
    if (gap === 1) s.count = (s.count || 0) + 1;
    else if (gap > 1) s.count = 1;
    s.last = date;
  },

  introducedToday(date = this.today()) {
    return this.state.intro[date] || [];
  },

  remainingNew(date = this.today()) {
    const cap = this.state.settings.dailyNew;
    return Math.max(0, cap - this.introducedToday(date).length);
  },

  getCard(word) {
    return this.state.cards[word] || null;
  },

  isMastered(card) {
    return card && card.status === "mastered";
  },

  dueReviews(date = this.today()) {
    const due = [];
    for (const [w, c] of Object.entries(this.state.cards)) {
      if (!this.byWord.has(w)) continue;
      if (c.status === "new") continue;
      if (!c.due || c.due <= date) due.push(w);
    }
    return due;
  },

  nextNewWords(n, date = this.today()) {
    const seen = new Set(Object.keys(this.state.cards));
    const already = new Set(this.introducedToday(date));
    const out = [];
    for (const w of this.state.order) {
      if (out.length >= n) break;
      if (!this.byWord.has(w)) continue;
      if (seen.has(w) || already.has(w)) continue;
      out.push(w);
    }
    return out;
  },

  counts(date = this.today()) {
    let mastered = 0;
    let learning = 0;
    for (const c of Object.values(this.state.cards)) {
      if (c.status === "mastered") mastered += 1;
      else if (c.status === "learning") learning += 1;
    }
    const reviewDue = this.dueReviews(date).length;
    const remainNew = this.remainingNew(date);
    const d = this.day(date);
    const total = this.words.length;
    const seen = Object.keys(this.state.cards).length;
    const week = [];
    for (let i = 6; i >= 0; i--) {
      const day = addDays(date, -i);
      const rec = this.state.days[day];
      const active = !!(rec && (rec.study || rec.quiz || rec.spell || rec.listen));
      week.push({ date: day, on: active, today: day === date });
    }
    return {
      total,
      seen,
      mastered,
      learning,
      newLeft: remainNew,
      reviewDue,
      todayNewDone: this.introducedToday(date).length,
      todayStudy: d.study || 0,
      todayListen: d.listen || 0,
      todayQuiz: (d.quiz || 0) + (d.spell || 0),
      dailyNew: this.state.settings.dailyNew,
      streak: this.state.streak.last === date || daysBetween(this.state.streak.last || date, date) === 0
        ? this.state.streak.count
        : this.state.streak.last && daysBetween(this.state.streak.last, date) === 1
          ? this.state.streak.count
          : 0,
      streakCount: this.state.streak.count || 0,
      streakLast: this.state.streak.last || "",
      week,
    };
  },

  buildStudyQueue(date = this.today()) {
    const reviews = shuffle(this.dueReviews(date));
    const news = this.nextNewWords(this.remainingNew(date), date);
    return { reviews, news, queue: reviews.concat(news) };
  },

  ensureCard(word, date = this.today()) {
    if (!this.state.cards[word]) {
      this.state.cards[word] = {
        ease: 2.5,
        interval: 0,
        reps: 0,
        lapses: 0,
        due: date,
        last: "",
        status: "new",
      };
    }
    return this.state.cards[word];
  },

  introduce(word, date = this.today()) {
    this.ensureCard(word, date);
    const list = this.state.intro[date] ? this.state.intro[date].slice() : [];
    if (!list.includes(word) && this.state.cards[word].status === "new") {
      list.push(word);
      this.state.intro[date] = list;
    }
  },

  /**
   * quality: 0 忘记, 3 模糊, 5 记得
   * Returns whether the card should be re-queued in this session.
   */
  rate(word, quality, date = this.today()) {
    const card = this.ensureCard(word, date);
    const wasNew = card.status === "new" || !card.last;
    if (wasNew) this.introduce(word, date);

    const q = quality;
    if (q < 3) {
      card.reps = 0;
      card.interval = 0;
      card.lapses = (card.lapses || 0) + 1;
      card.ease = Math.max(1.3, (card.ease || 2.5) - 0.2);
      card.due = date;
      card.status = "learning";
    } else {
      card.reps = (card.reps || 0) + 1;
      const ease = card.ease || 2.5;
      const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
      card.ease = Math.max(1.3, ease + delta);
      if (card.reps === 1) card.interval = 1;
      else if (card.reps === 2) card.interval = q === 3 ? 3 : 6;
      else card.interval = Math.max(1, Math.round((card.interval || 1) * card.ease * (q === 3 ? 0.85 : 1)));
      card.due = addDays(date, card.interval);
      card.status = card.interval >= 21 && card.reps >= 3 ? "mastered" : "learning";
    }
    card.last = date;
    if (wasNew) this.bump("new", 1, date);
    else this.bump("review", 1, date);
    this.bump("study", 1, date);
    this.save();
    return q < 3;
  },

  setDailyNew(n) {
    this.state.settings.dailyNew = Math.min(80, Math.max(5, Number(n) || 20));
    this.save();
  },

  setLang(lang) {
    this.state.settings.lang = lang === "en-GB" ? "en-GB" : "en-US";
    this.save();
  },

  setRate(rate) {
    const n = Number(rate);
    this.state.settings.rate = [0.75, 1, 1.2].includes(n) ? n : 1;
    this.save();
  },

  resetProgress() {
    const settings = { ...this.state.settings };
    const order = this.state.order.slice();
    this.state = defaultState();
    this.state.settings = settings;
    this.state.order = order;
    this.save();
  },

  practicePool(limit = 80) {
    const today = this.today();
    const due = this.dueReviews(today);
    const seen = Object.keys(this.state.cards).filter((w) => this.byWord.has(w));
    const intro = this.introducedToday(today);
    const preferred = [...new Set(due.concat(intro, seen))];
    if (preferred.length >= 8) {
      return shuffle(preferred.map((w) => this.byWord.get(w)).filter(Boolean)).slice(0, limit);
    }
    return shuffle(this.words).slice(0, Math.max(limit, 40));
  },
};
