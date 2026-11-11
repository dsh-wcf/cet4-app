import {
  answersEqual,
  escapeHtml,
  iconSpeaker,
  pickN,
  showToast,
  shuffle,
  vibrate,
} from "./util.js";

const ROUND = 10;

function wrongMeanings(item, all) {
  return pickN(all, 3, (w) => w.w !== item.w && w.m !== item.m).map((w) => w.m);
}

function wrongWords(item, all) {
  return pickN(all, 3, (w) => w.w !== item.w).map((w) => w);
}

function hubHtml() {
  return `
    <section class="page">
      <div class="page-head">
        <div>
          <p class="page-kicker">测验</p>
          <h1 class="page-title">检验一下记得多少</h1>
          <p class="page-sub">先做选择题，或直接进入拼写。</p>
        </div>
      </div>
      <div class="stack">
        <button type="button" class="mode-tile wide" data-mode="meaning">
          <span class="ico"><svg viewBox="0 0 24 24"><path d="M8 12.2 10.2 14.5 16 8.8"/><rect x="4.5" y="4.5" width="15" height="15" rx="2"/></svg></span>
          <div><b>看词选义</b><span>给出英文单词，选出中文释义</span></div>
        </button>
        <button type="button" class="mode-tile wide" data-mode="word">
          <span class="ico"><svg viewBox="0 0 24 24"><path d="M5 8h14M5 12h10M5 16h12"/></svg></span>
          <div><b>看义选词</b><span>给出中文释义，认出对应的单词</span></div>
        </button>
        <button type="button" class="mode-tile wide" data-go="spell">
          <span class="ico"><svg viewBox="0 0 24 24"><path d="M5 16.5 9 7h1.2l4 9.5"/><path d="M6.2 13.8h6.6"/></svg></span>
          <div><b>拼写练习</b><span>看中文，写出英文单词</span></div>
        </button>
      </div>
    </section>
  `;
}

function resultHtml(title, correct, total, mistakes) {
  return `
    <section class="page">
      <div class="page-head">
        <div>
          <p class="page-kicker">${escapeHtml(title)}</p>
          <h1 class="page-title">本轮成绩</h1>
        </div>
      </div>
      <div class="panel result">
        <p class="score">${correct}<span style="font-size:22px;color:var(--muted)"> / ${total}</span></p>
        <p>${correct === total ? "全对，这轮很稳。" : `答对 ${correct} 题，错过的词建议再看一眼。`}</p>
      </div>
      ${
        mistakes.length
          ? `<div class="panel"><p class="page-kicker">本轮错过</p>${mistakes
              .map(
                (m) =>
                  `<div class="row"><div><b>${escapeHtml(m.word.w)}</b><span class="desc">${escapeHtml(
                    m.word.m
                  )}</span></div></div>`
              )
              .join("")}</div>`
          : ""
      }
      <button type="button" class="btn btn-solid mt" data-again>再来一轮</button>
      <button type="button" class="btn btn-ghost mt" data-hub>返回测验</button>
    </section>
  `;
}

export function renderQuiz(root, ctx, sub) {
  const { store, tts, navigate } = ctx;
  const cleanup = () => tts.stop();

  if (!sub) {
    root.innerHTML = hubHtml();
    root.querySelectorAll("[data-mode]").forEach((btn) => {
      btn.addEventListener("click", () => navigate("quiz", btn.getAttribute("data-mode")));
    });
    root.querySelector("[data-go]")?.addEventListener("click", () => navigate("spell"));
    return cleanup;
  }

  const mode = sub === "word" ? "word" : "meaning";
  const pool = store.practicePool(80);
  const all = store.words;
  const items = shuffle(pool).slice(0, ROUND);
  let index = 0;
  let answered = false;
  let correct = 0;
  const mistakes = [];

  function paint() {
    const item = items[index];
    if (!item) {
      tts.stop();
      root.innerHTML = resultHtml("测验", correct, items.length, mistakes);
      root.querySelector("[data-again]")?.addEventListener("click", () => navigate("quiz", mode));
      root.querySelector("[data-hub]")?.addEventListener("click", () => navigate("quiz"));
      return;
    }
    answered = false;
    let prompt, options, answer;
    if (mode === "meaning") {
      prompt = `<p class="phonetic">${item.p ? `/${escapeHtml(item.p)}/` : ""}</p>
        <h2 class="word">${escapeHtml(item.w)}</h2>
        <button type="button" class="icon-btn" data-speak aria-label="朗读单词">${iconSpeaker()}</button>`;
      options = shuffle([item.m, ...wrongMeanings(item, all)]);
      answer = item.m;
    } else {
      prompt = `<p class="prompt" style="font-size:20px;font-weight:650;margin:8px 0 16px">${escapeHtml(item.m)}</p>`;
      const opts = [item, ...wrongWords(item, all)];
      options = shuffle(opts);
      answer = item.w;
    }

    root.innerHTML = `
      <section class="page">
        <button type="button" class="back-link" data-back>‹ 返回测验</button>
        <div class="study-progress"><span>${mode === "meaning" ? "看词选义" : "看义选词"}</span><span>${index + 1} / ${items.length}</span></div>
        <div class="panel center" style="padding-top:24px;padding-bottom:20px">${prompt}</div>
        <div class="choices">
          ${options
            .map((o) => {
              if (typeof o === "string") {
                return `<button type="button" class="choice" data-opt="${escapeHtml(o)}">${escapeHtml(o)}</button>`;
              }
              return `<button type="button" class="choice" data-opt="${escapeHtml(o.w)}"><span class="en">${escapeHtml(o.w)}</span></button>`;
            })
            .join("")}
        </div>
        <div data-feedback hidden></div>
        <button type="button" class="btn btn-solid mt" data-next hidden>下一题</button>
      </section>
    `;
    root.querySelector("[data-back]")?.addEventListener("click", () => navigate("quiz"));
    root.querySelector("[data-speak]")?.addEventListener("click", () => {
      const btn = root.querySelector("[data-speak]");
      tts.speak(item.w, {
        onstart() { btn?.classList.add("speaking"); },
        onend() { btn?.classList.remove("speaking"); },
      });
    });
    root.querySelectorAll("[data-opt]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (answered) return;
        answered = true;
        const pick = btn.getAttribute("data-opt");
        const ok = pick === answer;
        if (ok) correct += 1;
        else mistakes.push({ word: item, pick });
        vibrate(ok ? 10 : 25);
        root.querySelectorAll("[data-opt]").forEach((b) => {
          const v = b.getAttribute("data-opt");
          if (v === answer) b.classList.add("correct");
          else if (v === pick) b.classList.add("wrong");
          else b.classList.add("dim");
        });
        const box = root.querySelector("[data-feedback]");
        box.hidden = false;
        box.className = `feedback ${ok ? "ok" : "bad"}`;
        box.innerHTML = ok
          ? "回答正确"
          : `正确答案：${escapeHtml(item.w)}  ${escapeHtml(item.m)}`;
        root.querySelector("[data-next]").hidden = false;
        store.bump("quiz");
      });
    });
    root.querySelector("[data-next]")?.addEventListener("click", () => {
      if (!answered) return;
      tts.stop();
      index += 1;
      paint();
    });
  }

  if (!items.length) {
    root.innerHTML = `<section class="page"><div class="panel empty"><h3>暂时出不了题</h3></div></section>`;
    return cleanup;
  }
  paint();
  return cleanup;
}

export function renderSpell(root, ctx) {
  const { store, tts, navigate } = ctx;
  const cleanup = () => tts.stop();
  const items = shuffle(store.practicePool(80)).slice(0, ROUND);
  let index = 0;
  let answered = false;
  let correct = 0;
  const mistakes = [];

  function paint() {
    const item = items[index];
    if (!item) {
      tts.stop();
      root.innerHTML = resultHtml("拼写", correct, items.length, mistakes);
      root.querySelector("[data-again]")?.addEventListener("click", () => navigate("spell"));
      root.querySelector("[data-hub]")?.addEventListener("click", () => navigate("quiz"));
      return;
    }
    answered = false;
    root.innerHTML = `
      <section class="page">
        <button type="button" class="back-link" data-back>‹ 返回测验</button>
        <div class="study-progress"><span>拼写</span><span>${index + 1} / ${items.length}</span></div>
        <div class="panel center" style="padding:24px 16px">
          <p class="prompt" style="font-size:20px;font-weight:650">${escapeHtml(item.m)}</p>
          <button type="button" class="icon-btn" data-speak aria-label="朗读单词">${iconSpeaker()}</button>
          <p class="hint">先听再写也可以</p>
        </div>
        <form data-form>
          <input class="field" data-input autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="写出英文单词" />
          <button type="submit" class="btn btn-solid mt">提交</button>
        </form>
        <div data-feedback hidden></div>
        <button type="button" class="btn btn-solid mt" data-next hidden>下一题</button>
      </section>
    `;
    const input = root.querySelector("[data-input]");
    root.querySelector("[data-back]")?.addEventListener("click", () => navigate("quiz"));
    root.querySelector("[data-speak]")?.addEventListener("click", () => {
      const btn = root.querySelector("[data-speak]");
      tts.speak(item.w, {
        onstart() { btn?.classList.add("speaking"); },
        onend() { btn?.classList.remove("speaking"); },
      });
    });
    root.querySelector("[data-form]")?.addEventListener("submit", (ev) => {
      ev.preventDefault();
      if (answered) return;
      const value = (input?.value || "").trim();
      if (!value) {
        showToast("先写出单词再提交");
        input?.focus();
        return;
      }
      answered = true;
      const ok = answersEqual(value, item.w);
      if (ok) correct += 1;
      else mistakes.push({ word: item, pick: value });
      vibrate(ok ? 10 : 25);
      if (input) input.disabled = true;
      const box = root.querySelector("[data-feedback]");
      box.hidden = false;
      box.className = `feedback ${ok ? "ok" : "bad"}`;
      box.innerHTML = ok
        ? `拼对了：${escapeHtml(item.w)}${item.p ? `  /${escapeHtml(item.p)}/` : ""}`
        : `你写的是「${escapeHtml(value)}」<br>正确拼写：${escapeHtml(item.w)}${item.p ? `  /${escapeHtml(item.p)}/` : ""}`;
      root.querySelector("[data-next]").hidden = false;
      store.bump("spell");
    });
    root.querySelector("[data-next]")?.addEventListener("click", () => {
      if (!answered) return;
      tts.stop();
      index += 1;
      paint();
    });
    setTimeout(() => input?.focus(), 200);
  }

  if (!items.length) {
    root.innerHTML = `<section class="page"><div class="panel empty"><h3>暂时出不了题</h3></div></section>`;
    return cleanup;
  }
  paint();
  return cleanup;
}
