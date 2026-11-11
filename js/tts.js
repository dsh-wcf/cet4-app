const RATE_PRESETS = [0.75, 1, 1.2];

function waitVoices(timeout = 1500) {
  const synth = window.speechSynthesis;
  if (!synth) return Promise.resolve([]);
  const existing = synth.getVoices();
  if (existing && existing.length) return Promise.resolve(existing);
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve(synth.getVoices() || []);
    };
    const t = setTimeout(finish, timeout);
    synth.addEventListener(
      "voiceschanged",
      () => {
        clearTimeout(t);
        finish();
      },
      { once: true }
    );
    // Some Android builds populate voices on a second tick.
    setTimeout(() => {
      if (synth.getVoices().length) {
        clearTimeout(t);
        finish();
      }
    }, 250);
  });
}

export const TTS = {
  ready: false,
  available: typeof window !== "undefined" && "speechSynthesis" in window,
  voices: [],
  lang: "en-US",
  rate: 1,
  _utter: null,

  async init(lang = "en-US") {
    this.lang = lang || "en-US";
    if (!this.available) {
      this.ready = true;
      return this;
    }
    this.voices = await waitVoices();
    this.ready = true;
    return this;
  },

  setLang(lang) {
    this.lang = lang === "en-GB" ? "en-GB" : "en-US";
  },

  setRate(rate) {
    const n = Number(rate);
    this.rate = RATE_PRESETS.includes(n) ? n : 1;
  },

  englishVoices() {
    return (this.voices || []).filter((v) => /^en(-|_)/i.test(v.lang || ""));
  },

  hasEnglish() {
    if (!this.available) return false;
    // Voices can arrive late; if the API exists we still try to speak.
    return this.englishVoices().length > 0 || (this.voices || []).length === 0;
  },

  pickVoice() {
    const list = this.englishVoices();
    if (!list.length) return null;
    const want = (this.lang || "en-US").toLowerCase();
    return (
      list.find((v) => (v.lang || "").toLowerCase().replace("_", "-") === want) ||
      list.find((v) => (v.lang || "").toLowerCase().startsWith(want.slice(0, 2))) ||
      list[0]
    );
  },

  stop() {
    if (!this.available) return;
    try {
      this._utter = null;
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  },

  speak(text, { rate, lang, onstart, onend } = {}) {
    if (!text || !this.available) {
      onend && onend(false);
      return Promise.resolve(false);
    }
    this.stop();
    const utter = new SpeechSynthesisUtterance(String(text));
    utter.lang = lang || this.lang || "en-US";
    utter.rate = typeof rate === "number" ? rate : this.rate;
    utter.pitch = 1;
    const voice = this.pickVoice();
    if (voice) utter.voice = voice;
    this._utter = utter;
    return new Promise((resolve) => {
      let settled = false;
      const done = (ok) => {
        if (settled) return;
        settled = true;
        if (this._utter === utter) this._utter = null;
        onend && onend(ok);
        resolve(ok);
      };
      utter.onstart = () => onstart && onstart();
      utter.onend = () => done(true);
      utter.onerror = () => done(false);
      try {
        window.speechSynthesis.speak(utter);
      } catch {
        done(false);
      }
    });
  },
};

export { RATE_PRESETS };
