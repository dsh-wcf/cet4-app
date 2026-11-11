import { escapeHtml, showToast } from "./util.js";

export function renderProfile(root, ctx) {
  const { store, tts, navigate } = ctx;
  const c = store.counts();
  const settings = store.state.settings;
  const covered = c.total ? Math.round((c.seen / c.total) * 100) : 0;

  root.innerHTML = `
    <section class="page">
      <div class="page-head">
        <div>
          <p class="page-kicker">我的</p>
          <h1 class="page-title">进度与设置</h1>
        </div>
      </div>

      <div class="stat-grid mb">
        <div class="panel"><b>${c.seen}</b><span>已学过</span></div>
        <div class="panel"><b>${c.mastered}</b><span>已掌握</span></div>
        <div class="panel"><b>${c.learning}</b><span>学习中</span></div>
        <div class="panel"><b>${c.total}</b><span>词库总量</span></div>
      </div>
      <div class="panel">
        <div class="page-kicker">词库覆盖 ${covered}%</div>
        <div class="progress" style="background:var(--paper-deep);margin:10px 0 0"><i style="width:${covered}%"></i></div>
      </div>

      <div class="panel">
        <div class="row">
          <div>
            <div class="label">每日新词</div>
            <span class="desc">每天最多新学的数量</span>
          </div>
          <div class="stepper">
            <button type="button" data-step="-5" aria-label="减少">−</button>
            <b data-daily>${settings.dailyNew}</b>
            <button type="button" data-step="5" aria-label="增加">+</button>
          </div>
        </div>
        <div class="row">
          <div>
            <div class="label">朗读口音</div>
            <span class="desc">使用系统自带的英语语音</span>
          </div>
          <div class="seg">
            <button type="button" data-lang="en-US" class="${settings.lang === "en-US" ? "active" : ""}">美式</button>
            <button type="button" data-lang="en-GB" class="${settings.lang === "en-GB" ? "active" : ""}">英式</button>
          </div>
        </div>
        <div class="row">
          <div>
            <div class="label">默认语速</div>
            <span class="desc">听力和朗读用</span>
          </div>
          <div class="seg">
            <button type="button" data-rate="0.75" class="${settings.rate === 0.75 ? "active" : ""}">0.75×</button>
            <button type="button" data-rate="1" class="${settings.rate === 1 ? "active" : ""}">1.0×</button>
            <button type="button" data-rate="1.2" class="${settings.rate === 1.2 ? "active" : ""}">1.2×</button>
          </div>
        </div>
      </div>

      ${ctx.ttsNotice ? `<div class="banner">${escapeHtml(ctx.ttsNotice)}</div>` : ""}
      ${store.persistOk ? "" : `<div class="banner warn">${escapeHtml(store.persistError)}</div>`}

      <div class="panel">
        <div class="row">
          <div>
            <div class="label">关于本应用</div>
            <span class="desc">四级随身练是网页应用，不必登录，进度存在这台设备的浏览器里。词库来自开源项目 KyleBing/english-vocabulary（BSD 3-Clause）。朗读使用系统语音，不包含任何考试真题录音。</span>
          </div>
        </div>
      </div>

      <button type="button" class="btn btn-ghost mt" data-reset>清除本机学习进度</button>
    </section>
  `;

  root.querySelectorAll("[data-step]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = settings.dailyNew + Number(btn.getAttribute("data-step"));
      store.setDailyNew(next);
      root.querySelector("[data-daily]").textContent = store.state.settings.dailyNew;
    });
  });
  root.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.getAttribute("data-lang");
      store.setLang(lang);
      tts.setLang(lang);
      root.querySelectorAll("[data-lang]").forEach((b) => b.classList.toggle("active", b === btn));
      showToast(lang === "en-GB" ? "已改为英式发音" : "已改为美式发音");
    });
  });
  root.querySelectorAll("[data-rate]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const rate = Number(btn.getAttribute("data-rate"));
      store.setRate(rate);
      tts.setRate(rate);
      root.querySelectorAll("[data-rate]").forEach((b) =>
        b.classList.toggle("active", Number(b.getAttribute("data-rate")) === rate)
      );
    });
  });
  root.querySelector("[data-reset]")?.addEventListener("click", () => {
    if (!confirm("确定清除本机的学习进度、打卡和每日记录吗？词库本身不会被删除。")) return;
    store.resetProgress();
    showToast("进度已清除");
    navigate("me");
  });
}
