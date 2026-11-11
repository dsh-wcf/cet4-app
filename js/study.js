import { escapeHtml, highlightWord, iconSpeaker } from "./util.js";

function cardHtml(item, flipped) {
  const phon = item.p ? `/${escapeHtml(item.p)}/` : "暂无音标";
  return `
    <div class="study-progress">
      <span>学习</span>
      <span data-pos></span>
    </div>
    <div class="flip-wrap">
      <div class="flip-card${flipped ? " flipped" : ""}" id="flip-card" role="button" tabindex="0" aria-label="点击翻转词卡">
        <div class="face front">
          <p class="phonetic">${phon}</p>
          <h2 class="word">${escapeHtml(item.w)}</h2>
          <button type="button" class="icon-btn" data-speak="word" aria-label="朗读单词">${iconSpeaker()}</button>
          <p class="hint">轻点卡片，查看释义</p>
        </div>
        <div class="face back">
          <p class="phonetic">${phon}</p>
          <h2 class="word">${escapeHtml(item.w)}</h2>
          <p class="meaning">${escapeHtml(item.m)}</p>
          ${
            item.e
              ? `<p class="example">${highlightWord(item.e, item.w)}${
                  item.c ? `<span class="zh">${escapeHtml(item.c)}</span>` : ""
                }</p>`
              : ""
          }
          <div class="controls" style="margin-top:12px">
            <button type="button" class="btn btn-sm btn-ghost" data-speak="word" style="width:auto;padding:0 12px;gap:6px">${iconSpeaker()} 读单词</button>
            ${
              item.e
                ? `<button type="button" class="btn btn-sm btn-ghost" data-speak="sent" style="width:auto;padding:0 12px;gap:6px">${iconSpeaker()} 读句子</button>`
                : ""
            }
          </div>
        </div>
      </div>
    </div>
    <div class="btn-row">
      <button type="button" class="btn btn-forget" data-q="0"${flipped ? "" : " disabled"}>忘记</button>
      <button type="button" class="btn btn-fuzzy" data-q="3"${flipped ? "" : " disabled"}>模糊</button>
      <button type="button" class="btn btn-remember" data-q="5"${flipped ? "" : " disabled"}>记得</button>
    </div>
    ${flipped ? "" : '<p class="hint center mt">先翻开卡片，再选择记得程度</p>'}
  `;
}

function summaryHtml(stats) {
  return `
    <section class="page">
      <div class="page-head">
        <div>
          <p class="page-kicker">学习</p>
          <h1 class="page-title">本轮结束</h1>
        </div>
      </div>
      <div class="panel result">
        <p class="score">${stats.total}</p>
        <p>张词卡已经过完</p>
        <p>记得 ${stats.know} · 模糊 ${stats.fuzzy} · 忘记 ${stats.forget}</p>
      </div>
      <button type="button" class="btn btn-solid mt" data-again>再学一轮</button>
      <button type="button" class="btn btn-ghost mt" data-home>回到首页</button>
    </section>
  `;
}

function emptyHtml(hasMoreNew) {
  return `
    <section class="page">
      <div class="page-head">
        <div>
          <p class="page-kicker">学习</p>
          <h1 class="page-title">词卡</h1>
        </div>
      </div>
      <div class="panel empty">
        <h3>今天的词卡已经练完</h3>
        <p>新词额度用完了，也没有到期的复习。明日再来，或者先去听力和测验里热热身。</p>
        ${hasMoreNew ? `<button type="button" class="btn btn-solid mt" data-extra>再加 5 个新词</button>` : ""}
        <button type="button" class="btn btn-ghost mt" data-listen>去练听力</button>
      </div>
    </section>
  `;
}

export function renderStudy(root, ctx) {
  const { store, tts, navigate } = ctx;
  let pack = store.buildStudyQueue();
  let queue = pack.queue.slice();
  const seenThis = new Map(); // word -> extra reviews allowed
  const stats = { total: 0, know: 0, fuzzy: 0, forget: 0 };
  let index = 0;
  let flipped = false;

  const cleanup = () => tts.stop();

  function currentItem() {
    const w = queue[index];
    return w ? store.byWord.get(w) : null;
  }

  function speak(kind) {
    const item = currentItem();
    if (!item) return;
    const text = kind === "sent" ? item.e : item.w;
    if (!text) return;
    const btns = root.querySelectorAll("[data-speak]");
    tts.speak(text, {
      onstart() {
        btns.forEach((b) => {
          if (b.getAttribute("data-speak") === kind) b.classList.add("speaking");
        });
      },
      onend() {
        btns.forEach((b) => b.classList.remove("speaking"));
      },
    });
  }

  function bindCard() {
    const card = root.querySelector("#flip-card");
    if (!card) return;
    const flip = () => {
      flipped = true;
      card.classList.add("flipped");
      root.querySelectorAll("[data-q]").forEach((b) => { b.disabled = false; });
      const tip = root.querySelector(".btn-row + .hint");
      if (tip) tip.remove();
    };
    card.addEventListener("click", (ev) => {
      if (ev.target.closest("[data-speak]")) return;
      flip();
    });
    card.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        flip();
      }
    });
    root.querySelectorAll("[data-speak]").forEach((btn) => {
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        speak(btn.getAttribute("data-speak"));
      });
    });
    root.querySelectorAll("[data-q]").forEach((btn) => {
      btn.addEventListener("click", () => rate(Number(btn.getAttribute("data-q"))));
    });
  }

  function showEmpty() {
    const leftover = store.nextNewWords(5);
    root.innerHTML = emptyHtml(leftover.length > 0);
    root.querySelector("[data-listen]")?.addEventListener("click", () => navigate("listen"));
    root.querySelector("[data-extra]")?.addEventListener("click", () => {
      queue = leftover.slice(0, 5);
      index = 0;
      flipped = false;
      stats.total = stats.know = stats.fuzzy = stats.forget = 0;
      if (!queue.length) {
        showEmpty();
        return;
      }
      paint();
    });
  }

  function showSummary() {
    root.innerHTML = summaryHtml(stats);
    root.querySelector("[data-again]")?.addEventListener("click", () => {
      pack = store.buildStudyQueue();
      queue = pack.queue.slice();
      index = 0;
      flipped = false;
      stats.total = stats.know = stats.fuzzy = stats.forget = 0;
      if (!queue.length) showEmpty();
      else paint();
    });
    root.querySelector("[data-home]")?.addEventListener("click", () => navigate("home"));
  }

  function rate(q) {
    const word = queue[index];
    if (!word) return;
    tts.stop();
    const requeue = store.rate(word, q);
    stats.total += 1;
    if (q === 5) stats.know += 1;
    else if (q === 3) stats.fuzzy += 1;
    else stats.forget += 1;
    if (requeue) {
      const times = seenThis.get(word) || 0;
      if (times < 2) {
        seenThis.set(word, times + 1);
        // put back a couple of cards later, or at the end
        const insert = Math.min(queue.length, index + 3);
        queue.splice(insert, 0, word);
      }
    }
    index += 1;
    flipped = false;
    if (index >= queue.length) showSummary();
    else paint();
  }

  function paint() {
    const item = currentItem();
    if (!item) {
      showEmpty();
      return;
    }
    root.innerHTML = `<section class="page">${cardHtml(item, flipped)}</section>`;
    const pos = root.querySelector("[data-pos]");
    if (pos) pos.textContent = `${index + 1} / ${queue.length}`;
    bindCard();
  }

  if (!queue.length) showEmpty();
  else paint();

  return cleanup;
}
