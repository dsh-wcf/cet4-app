import { renderHome } from "./home.js";
import { renderListen } from "./listen.js";
import { renderProfile } from "./profile.js";
import { renderQuiz, renderSpell } from "./quiz.js";
import { Store } from "./store.js";
import { renderStudy } from "./study.js";
import { TTS } from "./tts.js";

const TABS = ["home", "study", "listen", "quiz", "me"];

function parseHash() {
  const raw = (location.hash || "#/home").replace(/^#\/?/, "");
  const [page, sub] = raw.split("/");
  if (page === "spell") return { page: "spell", sub: "" };
  if (TABS.includes(page) || page === "spell") return { page: page || "home", sub: sub || "" };
  return { page: "home", sub: "" };
}

function ttsNotice() {
  if (!TTS.available) {
    return "这台设备没有可用的朗读接口。词卡和测验仍可使用，但听力需要系统提供英语语音。";
  }
  if (TTS.voices.length && !TTS.englishVoices().length) {
    return "没有检测到英语语音。请在系统设置里安装 English（美国或英国）语音包后，再回到这里练习听力。";
  }
  return "";
}

export const ctx = {
  store: Store,
  tts: TTS,
  ttsNotice: "",
  navigate(page, sub) {
    const path = sub ? `#/${page}/${sub}` : `#/${page}`;
    if (location.hash === path) {
      render();
      return;
    }
    location.hash = path;
  },
};

let cleanup = null;

function setActiveTab(page) {
  const tab = page === "spell" ? "quiz" : TABS.includes(page) ? page : "home";
  document.querySelectorAll(".tab").forEach((el) => {
    el.classList.toggle("active", el.getAttribute("data-nav") === tab);
  });
}

function render() {
  const view = document.getElementById("view");
  const { page, sub } = parseHash();
  setActiveTab(page);
  if (typeof cleanup === "function") {
    try {
      cleanup();
    } catch {
      /* ignore */
    }
    cleanup = null;
  }
  TTS.stop();
  ctx.ttsNotice = ttsNotice();
  view.scrollTop = 0;
  window.scrollTo(0, 0);

  if (page === "study") cleanup = renderStudy(view, ctx);
  else if (page === "listen") cleanup = renderListen(view, ctx, sub);
  else if (page === "quiz") cleanup = renderQuiz(view, ctx, sub);
  else if (page === "spell") cleanup = renderSpell(view, ctx);
  else if (page === "me") cleanup = renderProfile(view, ctx);
  else cleanup = renderHome(view, ctx);
}

async function boot() {
  const boot = document.getElementById("boot");
  const sub = document.getElementById("boot-sub");
  const view = document.getElementById("view");
  const tabbar = document.getElementById("tabbar");

  try {
    const res = await fetch("./data/words.json", { cache: "force-cache" });
    if (!res.ok) throw new Error("词库加载失败");
    const words = await res.json();
    if (!Array.isArray(words) || words.length < 100) throw new Error("词库内容不完整");
    Store.attach(words);
  } catch (err) {
    boot.classList.add("error");
    sub.textContent =
      "词库没有加载成功。请用本地网页服务打开本应用（不要直接双击 HTML 文件），并保持 data/words.json 和页面在同一文件夹中。";
    return;
  }

  await TTS.init(Store.state.settings.lang);
  TTS.setLang(Store.state.settings.lang);
  TTS.setRate(Store.state.settings.rate);

  boot.hidden = true;
  view.hidden = false;
  tabbar.hidden = false;

  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => ctx.navigate(btn.getAttribute("data-nav")));
  });
  window.addEventListener("hashchange", render);
  if (!location.hash) location.hash = "#/home";
  else render();

  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("./sw.js");
    } catch {
      /* offline cache is optional */
    }
  }
}

boot();
