import {
  answersEqual,
  blankSentence,
  escapeHtml,
  iconPlay,
  iconReplay,
  pickN,
  showToast,
  shuffle,
  vibrate,
} from "./util.js";

const ROUND = 10;
const SPEEDS = [0.75, 1, 1.2];

const MODES = {
  word: {
    title: "听单词",
    hint: "播放单词，选出正确的中文释义",
    kind: "choice-meaning",
    source: "word",
  },
  "word-spell": {
    title: "听选拼写",
    hint: "播放单词，选出正确的英文写法",
    kind: "choice-spell",
    source: "word",
  },
  sent: {
    title: "听句子",
    hint: "播放例句，选出句子所考查单词的中文释义",
    kind: "choice-meaning",
    source: "sent",
  },
  blank: {
    title: "句子填空",
    hint: "播放例句，填入被挖去的关键词",
    kind: "blank",
    source: "sent",
  },
  dictation: {
    title: "听写",
    hint: "播放单词或短语，写下你听到的内容",
    kind: "dictation",
    source: "dictation",
  },
};

function speedLabel(n) {
  return n === 1 ? "1.0×" : `${n}×`;
}

function speakText(item, mode, rate) {
  if (mode.source === "sent") return item.e || item.w;
  if (mode.source === "dictation") return item.ph || item.w;
  return item.w;
}

function wrongMeanings(item, pool) {
  return pickN(pool, 3, (w) => w.w !== item.w && w.m !== item.m).map((w) => w.m);
}

function wrongSpellings(item, pool) {
  const sameLen = pool.filter(
    (w) => w.w !== item.w && Math.abs(w.w.length - item.w.length) <= 2
  );
  const src = sameLen.length >= 3 ? sameLen : pool.filter((w) => w.w !== item.w);
  return pickN(src, 3).map((w) => w.w);
}

function buildRound(mode, store) {
  const pool = store.practicePool(120);
  const all = store.words;
  const items = [];
  const used = new Set();
  const candidates = shuffle(pool.length >= ROUND ? pool : all);
  for (const word of candidates) {
    if (items.length >= ROUND) break;
    if (used.has(word.w)) continue;
    if (mode.kind === "blank") {
      const blank = blankSentence(word.e, word.w);
      if (!blank) continue;
      items.push({ word, blank, prompt: speakText(word, mode) });
      used.add(word.w);
      continue;
    }
    items.push({ word, prompt: speakText(word, mode) });
    used.add(word.w);
  }
  // fill with any remaining words if needed
  if (items.length < ROUND) {
    for (const word of shuffle(all)) {
      if (items.length >= ROUND) break;
      if (used.has(word.w)) continue;
      if (mode.kind === "blank") {
        const blank = blankSentence(word.e, word.w);
        if (!blank) continue;
        items.push({ word, blank, prompt: speakText(word, mode) });
      } else items.push({ word, prompt: speakText(word, mode) });
      used.add(word.w);
    }
  }
  return items.map((it) => {
    if (mode.kind === "choice-meaning") {
      it.options = shuffle([it.word.m, ...wrongMeanings(it.word, all)]).slice(0, 4);
      it.answer = it.word.m;
    } else if (mode.kind === "choice-spell") {
      it.options = shuffle([it.word.w, ...wrongSpellings(it.word, all)]).slice(0, 4);
      it.answer = it.word.w;
    } else if (mode.kind === "blank") {
      it.answer = it.blank.answer;
    } else {
      it.answer = it.word.ph ? it.word.ph : it.word.w;
      it.expectWord = it.word.w;
    }
    return it;
  });
}

function hubHtml() {
  return `
    <section class="page">
      <div class="page-head">
        <div>
          <p class="page-kicker">听力</p>
          <h1 class="page-title">先听，再作答</h1>
          <p class="page-sub">语速可调，答完才能进入下一题。发音来自系统语音，不会下载真题录音。</p>
        </div>
      </div>
      <div class="stack">
        <button type="button" class="mode-tile wide" data-mode="word">
          <span class="ico"><svg viewBox="0 0 24 24"><path d="M10 8.2 6.8 11H4.6a1 1 0 0 0-1 1v1.8a1 1 0 0 0 1 1h2.2L10 17.6V8.2Z"/><path d="M14.2 9.2a4.2 4.2 0 0 1 0 5.6"/></svg></span>
          <div><b>听单词</b><span>听发音，从四个中文释义里选一个</span></div>
        </button>
        <button type="button" class="mode-tile wide" data-mode="word-spell">
          <span class="ico"><svg viewBox="0 0 24 24"><path d="M5 16.5 9 7h1.2l4 9.5"/><path d="M6.2 13.8h6.6"/></svg></span>
          <div><b>听选拼写</b><span>听单词，辨认正确的英文写法</span></div>
        </button>
        <button type="button" class="mode-tile wide" data-mode="sent">
          <span class="ico"><svg viewBox="0 0 24 24"><path d="M5 8h14M5 12h10M5 16h12"/></svg></span>
          <div><b>听句子</b><span>听例句，选择关键词的中文意思</span></div>
        </button>
        <button type="button" class="mode-tile wide" data-mode="blank">
          <span class="ico"><svg viewBox="0 0 24 24"><path d="M5 12h6M15 12h4"/><path d="M5 8h14v8H5z"/></svg></span>
          <div><b>句子填空</b><span>听完整句子，填出挖去的单词</span></div>
        </button>
        <button type="button" class="mode-tile wide" data-mode="dictation">
          <span class="ico"><svg viewBox="0 0 24 24"><path d="M5 19h14"/><path d="M8 16.5 16.2 8.3a1.5 1.5 0 0 1 2.1 2.1L10.1 18.6H8v-2.1Z"/></svg></span>
          <div><b>听写</b><span>听单词或短语，按听到的内容写下来</span></div>
        </button>
      </div>
    </section>
  `;
}

function questionChrome(mode, i, total, rate) {
  return `
    <button type="button" class="back-link" data-back>‹ 返回听力</button>
    <div class="study-progress">
      <span>${escapeHtml(mode.title)}</span>
      <span>${i + 1} / ${total}</span>
    </div>
    <div class="panel play-stage">
      <button type="button" class="play-btn" data-play aria-label="播放">${iconPlay()}</button>
      <p class="play-label" data-play-label>点击播放</p>
      <div class="controls">
        <button type="button" class="icon-btn" data-replay aria-label="再听一遍">${iconReplay()}</button>
        <div class="speed" role="group" aria-label="语速">
          ${SPEEDS.map(
            (s) =>
              `<button type="button" data-rate="${s}" class="${s === rate ? "active" : ""}">${speedLabel(s)}</button>`
          ).join("")}
        </div>
      </div>
    </div>
  `;
}

export function renderListen(root, ctx, sub) {
  const { store, tts, navigate } = ctx;
  const cleanup = () => tts.stop();

  if (!sub || !MODES[sub]) {
    root.innerHTML = hubHtml();
    root.querySelectorAll("[data-mode]").forEach((btn) => {
      btn.addEventListener("click", () => navigate("listen", btn.getAttribute("data-mode")));
    });
    return cleanup;
  }

  const mode = MODES[sub];
  const items = buildRound(mode, store);
  let index = 0;
  let answered = false;
  let correct = 0;
  let rate = store.state.settings.rate || 1;
  let unlocked = false;
  const mistakes = [];

  function play(autoLabel = true) {
    const it = items[index];
    if (!it) return;
    unlocked = true;
    const text = it.prompt;
    const btn = root.querySelector("[data-play]");
    const label = root.querySelector("[data-play-label]");
    tts.setRate(rate);
    tts.speak(text, {
      rate,
      onstart() {
        btn?.classList.add("speaking");
        if (label && autoLabel) label.textContent = "正在朗读…";
      },
      onend() {
        btn?.classList.remove("speaking");
        if (label) label.textContent = "再听一遍，或在下方作答";
      },
    });
  }

  function showFeedback(ok, detail) {
    const box = root.querySelector("[data-feedback]");
    if (!box) return;
    box.hidden = false;
    box.className = `feedback ${ok ? "ok" : "bad"}`;
    box.innerHTML = detail;
    const next = root.querySelector("[data-next]");
    if (next) next.hidden = false;
  }

  function bindChoices(it) {
    root.querySelectorAll("[data-opt]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (answered) return;
        answered = true;
        const pick = btn.getAttribute("data-opt");
        const ok = pick === it.answer;
        if (ok) correct += 1;
        else mistakes.push({ item: it, pick });
        vibrate(ok ? 10 : 25);
        root.querySelectorAll("[data-opt]").forEach((b) => {
          const v = b.getAttribute("data-opt");
          if (v === it.answer) b.classList.add("correct");
          else if (v === pick) b.classList.add("wrong");
          else b.classList.add("dim");
        });
        showFeedback(
          ok,
          ok
            ? "回答正确"
            : `正确答案是：${escapeHtml(it.answer)}<br>${escapeHtml(it.word.w)}  ${escapeHtml(it.word.m)}`
        );
        store.bump("listen");
      });
    });
  }

  function bindTyped(it, kind) {
    const form = root.querySelector("[data-form]");
    const input = root.querySelector("[data-input]");
    form?.addEventListener("submit", (ev) => {
      ev.preventDefault();
      if (answered) return;
      const value = (input?.value || "").trim();
      if (!value) {
        showToast("先写下你听到的内容");
        input?.focus();
        return;
      }
      answered = true;
      let ok = false;
      let expected = it.answer;
      if (kind === "dictation") {
        ok = answersEqual(value, it.word.w) || (it.word.ph && answersEqual(value, it.word.ph));
        expected = it.word.ph && it.word.ph !== it.word.w ? `${it.word.w}（也可以写 ${it.word.ph}）` : it.word.w;
      } else {
        ok = answersEqual(value, it.answer) || answersEqual(value, it.word.w);
      }
      if (ok) correct += 1;
      else mistakes.push({ item: it, pick: value });
      vibrate(ok ? 10 : 25);
      if (input) input.disabled = true;
      showFeedback(
        ok,
        ok
          ? `写对了：${escapeHtml(it.word.w)}`
          : `你写的是「${escapeHtml(value)}」<br>参考答案：${escapeHtml(expected)}<br>${escapeHtml(it.word.m)}`
      );
      store.bump("listen");
    });
    setTimeout(() => input?.focus(), 200);
  }

  function bodyFor(it) {
    if (mode.kind === "choice-meaning" || mode.kind === "choice-spell") {
      const cls = mode.kind === "choice-spell" ? "en" : "";
      return `
        <p class="prompt">${escapeHtml(mode.hint)}</p>
        <div class="choices">
          ${it.options
            .map(
              (o) =>
                `<button type="button" class="choice" data-opt="${escapeHtml(o)}">${
                  cls ? `<span class="en">${escapeHtml(o)}</span>` : escapeHtml(o)
                }</button>`
            )
            .join("")}
        </div>
        <div data-feedback hidden></div>
        <button type="button" class="btn btn-solid mt" data-next hidden>下一题</button>
      `;
    }
    if (mode.kind === "blank") {
      const shown = escapeHtml(it.blank.text).replace("______", `<span class="blank">　</span>`);
      return `
        <p class="prompt">${escapeHtml(mode.hint)}</p>
        <p class="blank-sent">${shown}</p>
        <form data-form>
          <input class="field" data-input autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="在此填写听到的单词" />
          <button type="submit" class="btn btn-solid mt">提交</button>
        </form>
        <div data-feedback hidden></div>
        <button type="button" class="btn btn-solid mt" data-next hidden>下一题</button>
      `;
    }
    const tip = it.word.ph
      ? "可能是一个单词，也可能是短语"
      : "写下你听到的英文";
    return `
      <p class="prompt">${escapeHtml(mode.hint)}。${tip}。</p>
      <form data-form>
        <input class="field" data-input autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="输入你听到的内容" />
        <button type="submit" class="btn btn-solid mt">提交</button>
      </form>
      <div data-feedback hidden></div>
      <button type="button" class="btn btn-solid mt" data-next hidden>下一题</button>
    `;
  }

  function showResult() {
    tts.stop();
    const total = items.length || 1;
    root.innerHTML = `
      <section class="page">
        <div class="page-head">
          <div>
            <p class="page-kicker">听力</p>
            <h1 class="page-title">本轮结束</h1>
          </div>
        </div>
        <div class="panel result">
          <p class="score">${correct}<span style="font-size:22px;color:var(--muted)"> / ${items.length}</span></p>
          <p>${correct === items.length ? "全部听对了，语感很稳。" : `答对 ${correct} 题，再听一轮会更熟。`}</p>
        </div>
        ${
          mistakes.length
            ? `<div class="panel"><p class="page-kicker">需要再听的词</p>${mistakes
                .map(
                  (m) =>
                    `<div class="row"><div><b>${escapeHtml(m.item.word.w)}</b><span class="desc">${escapeHtml(
                      m.item.word.m
                    )}</span></div></div>`
                )
                .join("")}</div>`
            : ""
        }
        <button type="button" class="btn btn-solid mt" data-again>再来一轮</button>
        <button type="button" class="btn btn-ghost mt" data-hub>返回听力</button>
      </section>
    `;
    root.querySelector("[data-again]")?.addEventListener("click", () => {
      navigate("listen", sub);
    });
    root.querySelector("[data-hub]")?.addEventListener("click", () => navigate("listen"));
  }

  function paint() {
    const it = items[index];
    if (!it) {
      showResult();
      return;
    }
    answered = false;
    root.innerHTML = `
      <section class="page">
        ${questionChrome(mode, index, items.length, rate)}
        ${ctx.ttsNotice ? `<div class="banner">${escapeHtml(ctx.ttsNotice)}</div>` : ""}
        ${bodyFor(it)}
      </section>
    `;
    root.querySelector("[data-back]")?.addEventListener("click", () => navigate("listen"));
    root.querySelector("[data-play]")?.addEventListener("click", () => play());
    root.querySelector("[data-replay]")?.addEventListener("click", () => play());
    root.querySelectorAll("[data-rate]").forEach((btn) => {
      btn.addEventListener("click", () => {
        rate = Number(btn.getAttribute("data-rate"));
        store.setRate(rate);
        tts.setRate(rate);
        root.querySelectorAll("[data-rate]").forEach((b) => b.classList.toggle("active", Number(b.getAttribute("data-rate")) === rate));
      });
    });
    root.querySelector("[data-next]")?.addEventListener("click", () => {
      if (!answered) return;
      tts.stop();
      index += 1;
      paint();
    });
    if (mode.kind.startsWith("choice")) bindChoices(it);
    else bindTyped(it, mode.kind);
    if (unlocked) setTimeout(() => play(true), 180);
  }

  if (!items.length) {
    root.innerHTML = `<section class="page"><div class="panel empty"><h3>暂时出不了题</h3><p>词库还在加载，或这一项缺少可用例句。</p></div></section>`;
    return cleanup;
  }
  paint();
  return cleanup;
}
