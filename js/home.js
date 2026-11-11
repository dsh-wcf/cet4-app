import { formatZhDate, escapeHtml } from "./util.js";

export function renderHome(root, ctx) {
  const { store, navigate } = ctx;
  const c = store.counts();
  const today = store.today();
  let streak = 0;
  if (store.state.streak.last) {
    const [ys, ms, ds] = store.state.streak.last.split("-").map(Number);
    const [yt, mt, dt] = today.split("-").map(Number);
    const a = new Date(ys, ms - 1, ds);
    const b = new Date(yt, mt - 1, dt);
    const g = Math.round((b - a) / 86400000);
    if (g === 0 || g === 1) streak = store.state.streak.count || 0;
  }
  const remain = c.reviewDue + c.newLeft;
  const planned = c.reviewDue + c.dailyNew;
  const donePart = planned === 0 ? 1 : Math.min(1, (planned - remain) / planned);
  let headline = "今天把该复习的过一遍";
  if (remain === 0) headline = "今日词卡已经练完";
  else if (c.reviewDue === 0 && c.newLeft > 0) headline = `今天先认识 ${c.newLeft} 个新词`;
  else if (c.newLeft === 0 && c.reviewDue > 0) headline = `今天有 ${c.reviewDue} 个词待复习`;
  const cta = remain === 0 ? "再抽几张巩固" : "开始今日学习";

  root.innerHTML = `
    <section class="page">
      <div class="page-head">
        <div>
          <p class="page-kicker">四级随身练</p>
          <h1 class="page-title">首页</h1>
          <p class="page-sub">${escapeHtml(formatZhDate(today))}</p>
        </div>
        ${streak ? `<span class="streak-chip">已连续 ${streak} 天</span>` : `<span class="streak-chip">从今天开始打卡</span>`}
      </div>

      ${store.persistOk ? "" : `<div class="banner warn">${escapeHtml(store.persistError)}</div>`}
      ${ctx.ttsNotice ? `<div class="banner">${escapeHtml(ctx.ttsNotice)}</div>` : ""}

      <div class="panel today-card">
        <p class="kicker">今日任务</p>
        <h2>${headline}</h2>
        <div class="today-metrics">
          <div class="metric"><b>${c.newLeft}</b><span>待学新词</span></div>
          <div class="metric"><b>${c.reviewDue}</b><span>待复习</span></div>
          <div class="metric"><b>${c.mastered}</b><span>已掌握</span></div>
        </div>
        <div class="progress" aria-hidden="true"><i style="width:${Math.round(donePart * 100)}%"></i></div>
        <button type="button" class="btn btn-primary" data-go="study">${cta}</button>
      </div>

      <div class="panel">
        <div class="page-kicker">近七日</div>
        <div class="week">
          ${c.week
            .map(
              (d) =>
                `<i class="${d.on ? "on" : ""} ${d.today ? "today" : ""}">${d.date.slice(8)}</i>`
            )
            .join("")}
        </div>
      </div>

      <div class="mode-grid">
        <button type="button" class="mode-tile" data-go="listen">
          <span class="ico"><svg viewBox="0 0 24 24"><path d="M10 8.2 6.8 11H4.6a1 1 0 0 0-1 1v1.8a1 1 0 0 0 1 1h2.2L10 17.6V8.2Z"/><path d="M14.2 9.2a4.2 4.2 0 0 1 0 5.6M16.8 7a7 7 0 0 1 0 10"/></svg></span>
          <b>听力练习</b>
          <span>听单词、听句子、听写</span>
        </button>
        <button type="button" class="mode-tile" data-go="quiz">
          <span class="ico"><svg viewBox="0 0 24 24"><path d="M8 12.2 10.2 14.5 16 8.8"/><rect x="4.5" y="4.5" width="15" height="15" rx="2"/></svg></span>
          <b>选择题测验</b>
          <span>每轮 10 题，即时对照</span>
        </button>
        <button type="button" class="mode-tile wide" data-go="spell">
          <span class="ico"><svg viewBox="0 0 24 24"><path d="M5 16.5 9 7h1.2l4 9.5"/><path d="M6.2 13.8h6.6M16.5 7.2 19 16.8"/><path d="M15.2 13.8H20"/></svg></span>
          <div>
            <b>拼写练习</b>
            <span>看中文，写出英文单词</span>
          </div>
        </button>
      </div>
    </section>
  `;

  root.querySelectorAll("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => navigate(btn.getAttribute("data-go")));
  });
}
