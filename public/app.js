/* ============================================
   STUDYSYNC — app.js
   Talks to the real backend via window.studySyncApi.
   ============================================ */

(function () {
  "use strict";

  const api = window.studySyncApi;
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  /* ---------- auth gate ---------- */
  if (!api.isLoggedIn()) {
    window.location.href = "/auth.html";
    return;
  }

  const todayKey = () => new Date().toISOString().slice(0, 10);

  /* ============================================
     THEMES
     ============================================ */

  const THEMES = [
    { id: "storybook", name: "Storybook Journal", desc: "Warm paper, soft rose and sage. A little study journal for everyday progress.", swatches: ["#C87978", "#D9A65B", "#87977B"], image: "" },
    { id: "classic-light", name: "Classic Light", desc: "Soft daylight, dusty teal and peach. Clean and calm for daytime sessions.", swatches: ["#2F8577", "#D97748", "#4FA88C"], image: "images/theme-classic-light.jpg" },
    { id: "classic-dark", name: "Classic Dark", desc: "Slate blue and mauve on deep navy. The original StudySync, after hours.", swatches: ["#A873D1", "#6C8EE8", "#4FBBA8"], image: "images/theme-classic-dark.jpg" },
    { id: "cyberpunk", name: "Cyberpunk", desc: "Neon violet and cyan on near-black. For late-night deep-focus sessions.", swatches: ["#C24CFF", "#3EE0FF", "#4CFFB0"], image: "images/theme-cyberpunk.jpg" },
    { id: "dark-academia", name: "Dark Academia", desc: "Aged gold and burgundy on warm mahogany. Library-coded productivity.", swatches: ["#CB9A42", "#7A3B40", "#7C8F60"], image: "images/theme-dark-academia.jpg" },
    { id: "softcore", name: "Softcore", desc: "Sunset amber and warm candlelight. Cozy, soft, unhurried.", swatches: ["#E7A15D", "#E28472", "#EFC77E"], image: "images/theme-softcore.jpg" },
  ];

  function applyTheme(themeId) {
    document.body.dataset.theme = themeId;
    localStorage.setItem("studysync_theme", themeId);
    if (window.refreshAllSyncRings) window.refreshAllSyncRings();
    renderThemesGrid();
  }

  function renderThemeHero() {
    const hero = $("#themeHero");
    if (!hero) return;
    const current = document.body.dataset.theme;
    const theme = THEMES.find((t) => t.id === current) || THEMES[0];
    hero.style.backgroundImage = `url('${theme.image}')`;
    hero.innerHTML = `
      <p class="theme-hero__eyebrow">Currently active</p>
      <h2 class="theme-hero__name">${theme.name}</h2>
      <p class="theme-hero__desc">${theme.desc}</p>
    `;
  }

  function renderThemesGrid() {
    renderThemeHero();
    const grid = $("#themesGrid");
    if (!grid) return;
    const current = document.body.dataset.theme;
    grid.innerHTML = "";
    THEMES.forEach((t) => {
      const card = document.createElement("button");
      card.className = "theme-card" + (t.id === current ? " is-active" : "");
      card.style.backgroundImage = `url('${t.image}')`;
      card.innerHTML = `
        <div class="theme-card__swatches">
          ${t.swatches.map((c) => `<span class="theme-card__swatch" style="background:${c}"></span>`).join("")}
        </div>
        <div class="theme-card__name">${t.name} ${t.id === current ? '<span class="theme-card__badge">Active</span>' : ""}</div>
        <p class="theme-card__desc">${t.desc}</p>
      `;
      card.addEventListener("click", () => applyTheme(t.id));
      grid.appendChild(card);
    });
  }

  /* ============================================
     LOCAL STATE (hydrated from the backend on load)
     ============================================ */

  const state = {
    tasks: [],
    moods: [],
    achievements: [],
    unlockedIds: new Set(),
    xp: 0, level: 1, xpIntoLevel: 0, xpForNextLevel: 150, streak: 0,
    waterToday: 0,
    pomo: { mins: 25, secondsLeft: 25 * 60, running: false, sessionsToday: 0, intervalId: null },
    breathing: { running: false, phase: null, cycles: 0, timeoutId: null },
    memory: { cards: [], flipped: [], matched: new Set(), moves: 0, locked: false },
  };

  const QUOTES = [
    "You don't need to feel ready. You need to open the file.",
    "Future-you is currently being written by what you do in the next 25 minutes.",
    "Perfect notes on a topic you haven't started beat zero notes on a topic you've 'researched.'",
    "The streak isn't the point. It's just proof you showed up more than you didn't.",
    "One ugly first draft of the answer beats an infinite loop of re-reading the question.",
    "Confusion is just the part of learning that hasn't been organized yet.",
    "You're allowed to close the tab and start the timer instead.",
    "Small and done beats big and someday.",
    "Nobody's timeline is a straight line up. Today's dip is still on the graph.",
    "If it takes less than 2 minutes, do it now instead of adding it to the list.",
    "Your brain at 2am insisting this is urgent is not the same as it actually being urgent.",
  ];
  let lastQuoteIdx = -1;

  const ACHIEVEMENT_ICONS = {
    "first-step": '<svg viewBox="0 0 20 20" fill="none"><path d="M4 10L8 14L16 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    "sync-3": '<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.8"/></svg>',
    "week-warrior": '<svg viewBox="0 0 20 20" fill="none"><path d="M10 2L12.5 7.5L18 8.3L14 12L15 17.5L10 15L5 17.5L6 12L2 8.3L7.5 7.5L10 2Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    "deep-focus": '<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.2" stroke="currentColor" stroke-width="1.8"/><path d="M10 6V10L12.5 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    "hydrated-mind": '<svg viewBox="0 0 20 20" fill="none"><path d="M10 2.5C10 2.5 4.5 9.3 4.5 12.8C4.5 15.8 6.9 18 10 18C13.1 18 15.5 15.8 15.5 12.8C15.5 9.3 10 2.5 10 2.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    "self-aware": '<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.2" stroke="currentColor" stroke-width="1.8"/><path d="M7 8.5H7.01M13 8.5H13.01M6.8 12.2C7.6 13.3 8.7 14 10 14C11.3 14 12.4 13.3 13.2 12.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  };

  /* ============================================
     DOM refs
     ============================================ */

  const el = {
    appRoot: $("#appRoot"),
    loadingState: $("#loadingState"),
    offlineState: $("#offlineState"),
    statusBanner: $("#statusBanner"),
    body: document.body,
    logoutBtn: $("#logoutBtn"),
    dateToday: $("#dateToday"),
    greeting: $("#greeting"),
    xpCount: $("#xpCount"),
    streakCount: $("#streakCount"),
    taskForm: $("#taskForm"),
    taskInput: $("#taskInput"),
    taskPriority: $("#taskPriority"),
    taskList: $("#taskList"),
    emptyState: $("#emptyState"),
    taskNavCount: $("#taskNavCount"),
    doneToday: $("#doneToday"),
    doneTodayRecharge: $("#doneTodayRecharge"),
    toast: $("#toast"),
    toastText: $("#toastText"),
    toastClose: $("#toastClose"),
    pomoTime: $("#pomoTime"),
    pomoPhase: $("#pomoPhase"),
    pomoRing: $("#pomoRing"),
    pomoStart: $("#pomoStart"),
    pomoReset: $("#pomoReset"),
    pomoSessions: $("#pomoSessions"),
    moodPicker: $("#moodPicker"),
    moodNote: $("#moodNote"),
    moodSave: $("#moodSave"),
    moodStrip: $("#moodStrip"),
    levelNum: $("#levelNum"),
    levelBadge: $("#levelBadge"),
    levelXpInto: $("#levelXpInto"),
    levelXpNeeded: $("#levelXpNeeded"),
    levelFill: $("#levelFill"),
    levelBar: $("#levelBar"),
    badgesGrid: $("#badgesGrid"),
    progressStreakCount: $("#progressStreakCount"),
    mobileWidgets: $("#mobileWidgets"),
    breatheOrbZone: $("#breatheOrbZone"),
    breatheLabel: $("#breatheLabel"),
    breatheStart: $("#breatheStart"),
    breatheCount: $("#breatheCount"),
    memoryGrid: $("#memoryGrid"),
    memoryStatus: $("#memoryStatus"),
    memoryRefill: $("#memoryRefill"),
  };

  /* ============================================
     BOOTSTRAP
     ============================================ */

  async function bootstrap() {
    applyTheme(localStorage.getItem("studysync_theme") || "classic-dark");

    try {
      const [stateRes, tasksRes, moodsRes, achRes] = await Promise.all([
        api.getState(), api.getTasks(), api.getMoods(), api.getAchievements(),
      ]);

      Object.assign(state, {
        xp: stateRes.xp, level: stateRes.level, xpIntoLevel: stateRes.xpIntoLevel,
        xpForNextLevel: stateRes.xpForNextLevel, streak: stateRes.streak, waterToday: stateRes.waterToday,
      });
      state.pomo.sessionsToday = stateRes.pomodoroSessionsToday;
      state.tasks = tasksRes;
      state.moods = moodsRes;
      state.achievements = achRes;
      state.unlockedIds = new Set(achRes.filter((a) => a.unlocked).map((a) => a.id));

      el.loadingState.style.display = "none";
      el.appRoot.style.display = "grid";
      cloneMobileWidgets();
      renderAll();
      initMemory();
      startBackgroundTimers();
    } catch (err) {
      el.loadingState.style.display = "none";
      if (err.isAuthError) {
        window.location.href = "/auth.html";
        return;
      }
      el.offlineState.style.display = "flex";
    }
  }

  function cloneMobileWidgets() {
    const quote = $("#quoteCardDesktop").cloneNode(true);
    quote.removeAttribute("id");
    el.mobileWidgets.appendChild(quote);
  }

  function renderAll() {
    renderHeader();
    renderRings();
    renderLevel();
    renderTasks();
    renderPomo();
    renderMoodStrip();
    renderWater();
    renderQuote();
    renderBadges();
    renderThemesGrid();
  }

  /* ============================================
     NAVIGATION (desktop rail + mobile bottom bar)
     ============================================ */

  $$("[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      $$("[data-view]").forEach((b) => b.classList.toggle("is-active", b.dataset.view === view));
      $$(".view").forEach((v) => v.classList.remove("is-active"));
      $("#view-" + view).classList.add("is-active");
      window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    });
  });

  el.logoutBtn.addEventListener("click", () => {
    api.logout();
    window.location.href = "/landing.html";
  });

  /* ============================================
     CONNECTIVITY BANNER
     ============================================ */

  function showOfflineBanner(show) {
    el.statusBanner.classList.toggle("is-visible", show);
  }

  async function withConnectivity(promise) {
    try {
      const result = await promise;
      showOfflineBanner(false);
      return result;
    } catch (err) {
      if (err.isAuthError) { window.location.href = "/auth.html"; return; }
      if (err.isNetworkError) showOfflineBanner(true);
      else showToast(err.message);
      throw err;
    }
  }

  /* ============================================
     HEADER / GREETING
     ============================================ */

  function renderHeader() {
    const now = new Date();
    el.dateToday.textContent = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    const hour = now.getHours();
    let greet = "Let's get something done";
    if (hour < 5) greet = "Still up? Let's make it count";
    else if (hour < 12) greet = "Morning — what's first today?";
    else if (hour < 17) greet = "Midday check-in — what's next?";
    else if (hour < 21) greet = "Evening push — pick one thing";
    else greet = "Late one. One small task, then rest";
    el.greeting.textContent = greet;
    el.xpCount.textContent = state.xp;
  }

  /* ============================================
     SYNC RINGS (rail + progress view)
     ============================================ */

  function renderRings() {
    el.streakCount.textContent = state.streak;
    el.progressStreakCount.textContent = state.streak;
    renderSyncRings($("#railRings"), state.streak, { strokeWidth: 5, baseRadius: 20, ringGap: 10 });
    renderSyncRings($("#progressRings"), state.streak, { strokeWidth: 7, baseRadius: 22, ringGap: 12 });
  }

  /* ============================================
     LEVEL BAR
     ============================================ */

  function renderLevel(justLeveledUp) {
    el.levelNum.textContent = state.level;
    el.levelBadge.textContent = state.level;
    el.levelXpInto.textContent = state.xpIntoLevel;
    el.levelXpNeeded.textContent = state.xpForNextLevel;
    el.levelFill.style.width = Math.round((state.xpIntoLevel / state.xpForNextLevel) * 100) + "%";
    if (justLeveledUp) {
      el.levelBar.classList.add("is-leveling");
      setTimeout(() => el.levelBar.classList.remove("is-leveling"), 900);
      fireCelebration();
      showToast(`🎉 Level up — you're now Level ${state.level}.`);
    }
  }

  /* ============================================
     CELEBRATION BURST
     ============================================ */

  function fireCelebration() {
    const cs = getComputedStyle(document.body);
    const colors = ["--primary", "--accent-info", "--accent-ok", "--accent-warn"].map(
      (v) => cs.getPropertyValue(v).trim() || "#7C6FFF"
    );
    const burst = document.createElement("div");
    burst.className = "celebrate-burst";
    const cx = window.innerWidth / 2, cy = window.innerHeight / 3;
    for (let i = 0; i < 24; i++) {
      const dot = document.createElement("div");
      dot.className = "celebrate-dot";
      const angle = (Math.PI * 2 * i) / 24 + Math.random() * 0.3;
      const dist = 80 + Math.random() * 100;
      const dx = Math.cos(angle) * dist, dy = Math.sin(angle) * dist;
      dot.style.left = cx + "px";
      dot.style.top = cy + "px";
      dot.style.background = colors[i % colors.length];
      dot.style.setProperty("--fly-to", `translate(${dx}px, ${dy}px)`);
      dot.style.animationDelay = Math.random() * 0.15 + "s";
      burst.appendChild(dot);
    }
    document.body.appendChild(burst);
    setTimeout(() => burst.remove(), 1500);
  }

  function applyGamifyResult(res) {
    const prevStreak = state.streak;
    state.xp = res.xp;
    state.level = res.level;
    state.xpIntoLevel = res.xp % state.xpForNextLevel;
    state.streak = res.streak;
    renderHeader();
    renderRings();
    renderLevel(res.leveledUp);
    if (res.streak > prevStreak) {
      showToast(`🔥 Streak now ${res.streak} day${res.streak === 1 ? "" : "s"} — keep it alive tomorrow.`);
    }
    refreshAchievements();
  }

  async function refreshAchievements() {
    try {
      const fresh = await api.getAchievements();
      const newlyUnlocked = fresh.filter((a) => a.unlocked && !state.unlockedIds.has(a.id));
      state.achievements = fresh;
      state.unlockedIds = new Set(fresh.filter((a) => a.unlocked).map((a) => a.id));
      renderBadges();
      newlyUnlocked.forEach((a) => showToast(`🏅 Achievement unlocked: ${a.name}`));
    } catch (e) {
      /* silent — achievements are non-critical, will refresh next successful call */
    }
  }

  function renderBadges() {
    el.badgesGrid.innerHTML = "";
    state.achievements.forEach((a) => {
      const div = document.createElement("div");
      div.className = "badge" + (a.unlocked ? " is-unlocked" : "");
      div.innerHTML = `
        <div class="badge__icon">${ACHIEVEMENT_ICONS[a.id] || ""}</div>
        <div class="badge__name">${a.name}</div>
        <div class="badge__desc">${a.desc}</div>
      `;
      el.badgesGrid.appendChild(div);
    });
  }

  /* ============================================
     TASKS
     ============================================ */

  function renderTasks() {
    el.taskList.innerHTML = "";
    const sorted = [...state.tasks].sort((a, b) => a.done - b.done);
    sorted.forEach((t) => {
      const item = document.createElement("div");
      item.className = "task-item" + (t.done ? " is-done" : "");
      item.innerHTML = `
        <button class="task-item__check" aria-label="Toggle complete">
          <svg viewBox="0 0 14 14" fill="none"><path d="M2 7L5.5 10.5L12 3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="task-item__body"><p class="task-item__text"></p></div>
        <span class="task-item__priority task-item__priority--${t.priority}">${t.priority}</span>
        <button class="task-item__del" aria-label="Delete task">
          <svg viewBox="0 0 14 14" fill="none"><path d="M2 2L12 12M12 2L2 12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        </button>
      `;
      item.querySelector(".task-item__text").textContent = t.text;
      item.querySelector(".task-item__check").addEventListener("click", () => toggleTask(t));
      item.querySelector(".task-item__del").addEventListener("click", () => deleteTask(t.id));
      el.taskList.appendChild(item);
    });

    el.emptyState.classList.toggle("is-visible", state.tasks.length === 0);
    el.taskNavCount.textContent = state.tasks.filter((t) => !t.done).length;
    const doneCount = state.tasks.filter((t) => t.done).length;
    el.doneToday.textContent = doneCount;
    if (el.doneTodayRecharge) el.doneTodayRecharge.textContent = doneCount;
  }

  el.taskForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const val = el.taskInput.value.trim();
    if (!val) return;
    el.taskInput.value = "";
    try {
      const task = await withConnectivity(api.addTask(val, el.taskPriority.value));
      state.tasks.unshift(task);
      renderTasks();
    } catch {
      el.taskInput.value = val;
    }
  });

  async function toggleTask(task) {
    const nextDone = !task.done;
    task.done = nextDone;
    renderTasks();
    try {
      const res = await withConnectivity(api.toggleTask(task.id, nextDone));
      task.done = res.task.done;
      task.completedAt = res.task.completedAt;
      applyGamifyResult(res);
    } catch {
      task.done = !nextDone;
      renderTasks();
    }
  }

  async function deleteTask(id) {
    const idx = state.tasks.findIndex((t) => t.id === id);
    const removed = state.tasks[idx];
    state.tasks.splice(idx, 1);
    renderTasks();
    try {
      await withConnectivity(api.deleteTask(id));
    } catch {
      state.tasks.splice(idx, 0, removed);
      renderTasks();
    }
  }

  /* ============================================
     POMODORO
     ============================================ */

  const RING_CIRC = 2 * Math.PI * 108;
  el.pomoRing.style.strokeDasharray = RING_CIRC;

  function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function renderPomo() {
    el.pomoTime.textContent = formatTime(state.pomo.secondsLeft);
    const total = state.pomo.mins * 60;
    const frac = 1 - state.pomo.secondsLeft / total;
    el.pomoRing.style.strokeDashoffset = RING_CIRC * (1 - frac);
    el.pomoSessions.textContent = state.pomo.sessionsToday;
    const isBreak = state.pomo.mins === 5 || state.pomo.mins === 15;
    el.pomoPhase.textContent = isBreak ? "Break — step away" : "Focus session";
    el.pomoRing.style.stroke = isBreak ? "var(--accent-warn)" : "var(--accent-ok)";
  }

  $$(".pomo__mode").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (state.pomo.running) return;
      $$(".pomo__mode").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      state.pomo.mins = parseInt(btn.dataset.mins, 10);
      state.pomo.secondsLeft = state.pomo.mins * 60;
      renderPomo();
    });
  });

  function startPomo() {
    state.pomo.running = true;
    el.pomoStart.textContent = "Pause";
    el.pomoStart.classList.add("is-running");
    state.pomo.intervalId = setInterval(async () => {
      state.pomo.secondsLeft -= 1;
      if (state.pomo.secondsLeft <= 0) {
        clearInterval(state.pomo.intervalId);
        state.pomo.running = false;
        el.pomoStart.textContent = "Start focus";
        el.pomoStart.classList.remove("is-running");
        const wasBreak = state.pomo.mins === 5 || state.pomo.mins === 15;
        const completedMins = state.pomo.mins;

        if (!wasBreak) {
          try {
            const res = await withConnectivity(api.completePomodoro(completedMins, "focus"));
            state.pomo.sessionsToday = res.sessionsToday;
            const xpGained = res.xp - state.xp;
            applyGamifyResult(res);
            showToast(`⏱️ Session complete — +${xpGained} XP. Stand up for a second before the next one.`);
          } catch {
            showToast("⏱️ Session complete, but it couldn't be saved — check your connection.");
          }
        } else {
          try { await withConnectivity(api.completePomodoro(completedMins, "break")); } catch { /* breaks are low-stakes to lose */ }
          showToast("Break's over. Ready when you are.");
        }
        state.pomo.secondsLeft = state.pomo.mins * 60;
        renderPomo();
      } else {
        renderPomo();
      }
    }, 1000);
  }

  function pausePomo() {
    state.pomo.running = false;
    clearInterval(state.pomo.intervalId);
    el.pomoStart.textContent = "Resume";
    el.pomoStart.classList.remove("is-running");
  }

  el.pomoStart.addEventListener("click", () => {
    if (state.pomo.running) pausePomo();
    else startPomo();
  });

  el.pomoReset.addEventListener("click", () => {
    pausePomo();
    el.pomoStart.textContent = "Start focus";
    state.pomo.secondsLeft = state.pomo.mins * 60;
    renderPomo();
  });

  /* ============================================
     MOOD
     ============================================ */

  let selectedMood = null, selectedColor = null;

  $$(".mood-opt").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".mood-opt").forEach((b) => b.classList.remove("is-selected"));
      btn.classList.add("is-selected");
      selectedMood = btn.dataset.mood;
      selectedColor = btn.dataset.color;
    });
  });

  el.moodSave.addEventListener("click", async () => {
    if (!selectedMood) { showToast("Pick a mood first — even a rough guess is useful data."); return; }
    try {
      const entry = await withConnectivity(api.logMood(selectedMood, selectedColor, el.moodNote.value.trim()));
      const existingIdx = state.moods.findIndex((m) => m.date === entry.date);
      if (existingIdx >= 0) state.moods[existingIdx] = entry; else state.moods.unshift(entry);
      renderMoodStrip();
      refreshAchievements();
      showToast("Logged today's mood. That's one more data point for a pattern you'll actually see.");
    } catch { /* connectivity banner already shown */ }
  });

  function renderMoodStrip() {
    el.moodStrip.innerHTML = "";
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const entry = state.moods.find((m) => m.date === key);
      const cell = document.createElement("div");
      cell.className = "mood-day";
      if (entry) cell.dataset.color = entry.color;
      cell.textContent = d.getDate();
      cell.title = entry ? `${d.toDateString()}: ${entry.mood}` : d.toDateString();
      el.moodStrip.appendChild(cell);
    }
  }

  /* ============================================
     WATER (renders to rail + right rail + mobile clone)
     ============================================ */

  function renderWater() {
    $$("[data-water-count]").forEach((n) => (n.textContent = state.waterToday));
    $$("[data-water-glasses]").forEach((container) => {
      container.innerHTML = "";
      for (let i = 0; i < 8; i++) {
        const d = document.createElement("div");
        d.className = "water-drop" + (i < state.waterToday ? " is-filled" : "");
        d.addEventListener("click", () => setWater(i < state.waterToday ? i : i + 1));
        container.appendChild(d);
      }
    });
  }

  async function setWater(count) {
    const prev = state.waterToday;
    state.waterToday = count;
    renderWater();
    try {
      await withConnectivity(api.setWater(count));
      if (count === 8) { showToast("💧 8/8 — nicely hydrated. Your focus thanks you."); refreshAchievements(); }
    } catch {
      state.waterToday = prev;
      renderWater();
    }
  }

  /* ============================================
     STRETCH REMINDER (client-side only, ephemeral)
     ============================================ */

  let stretchSecondsLeft = 45 * 60;
  function tickStretch() {
    stretchSecondsLeft -= 1;
    if (stretchSecondsLeft <= 0) {
      showToast("🧘 Stretch check: roll your shoulders, unclench your jaw — or try the breathing exercise in Recharge.");
      stretchSecondsLeft = 45 * 60;
    }
    const m = Math.floor(stretchSecondsLeft / 60).toString().padStart(2, "0");
    const s = Math.floor(stretchSecondsLeft % 60).toString().padStart(2, "0");
    $$("[data-stretch-status]").forEach((elm) => (elm.textContent = `Next nudge in ${m}:${s}`));
  }

  function startBackgroundTimers() {
    setInterval(tickStretch, 1000);
    let waterNudgeSeconds = 60 * 60;
    setInterval(() => {
      waterNudgeSeconds -= 1;
      if (waterNudgeSeconds <= 0) {
        showToast("💧 It's been a while — grab some water before the next task.");
        waterNudgeSeconds = 60 * 60;
      }
    }, 1000);
  }

  /* ============================================
     BREATHING GAME — box breathing, 4-4-4-4
     ============================================ */

  const BREATH_PHASES = [
    { key: "inhale", label: "Breathe in…", cls: "is-inhale", ms: 4000 },
    { key: "hold", label: "Hold", cls: "is-hold", ms: 4000 },
    { key: "exhale", label: "Breathe out…", cls: "is-exhale", ms: 4000 },
    { key: "holdout", label: "Hold", cls: "is-holdout", ms: 4000 },
  ];

  function runBreathPhase(idx) {
    if (!state.breathing.running) return;
    const phase = BREATH_PHASES[idx % BREATH_PHASES.length];
    el.breatheOrbZone.className = "breathe-orb-zone " + phase.cls;
    el.breatheLabel.textContent = phase.label;
    if (idx > 0 && idx % BREATH_PHASES.length === 0) {
      state.breathing.cycles += 1;
      el.breatheCount.textContent = `${state.breathing.cycles} cycle${state.breathing.cycles === 1 ? "" : "s"} complete`;
    }
    state.breathing.timeoutId = setTimeout(() => runBreathPhase(idx + 1), phase.ms);
  }

  el.breatheStart.addEventListener("click", () => {
    if (state.breathing.running) {
      state.breathing.running = false;
      clearTimeout(state.breathing.timeoutId);
      el.breatheOrbZone.className = "breathe-orb-zone";
      el.breatheLabel.textContent = "Ready when you are";
      el.breatheStart.textContent = "Start breathing";
    } else {
      state.breathing.running = true;
      state.breathing.cycles = 0;
      el.breatheCount.textContent = "";
      el.breatheStart.textContent = "Stop";
      runBreathPhase(0);
    }
  });

  /* ============================================
     MEMORY MATCH GAME — uses the 6 mood icons as pairs
     ============================================ */

  const MEMORY_MOODS = ["happy", "sad", "okay", "satire", "lovely", "melancholic"];

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function initMemory() {
    state.memory = {
      cards: shuffle([...MEMORY_MOODS, ...MEMORY_MOODS]),
      flipped: [], matched: new Set(), moves: 0, locked: false,
    };
    renderMemory();
  }

  function renderMemory() {
    const m = state.memory;
    el.memoryGrid.innerHTML = "";
    m.cards.forEach((mood, idx) => {
      const isUp = m.flipped.includes(idx) || m.matched.has(idx);
      const card = document.createElement("button");
      card.className = "memory-card" + (isUp ? " is-flipped" : "") + (m.matched.has(idx) ? " is-matched" : "");
      card.setAttribute("aria-label", isUp ? mood : "Flip card");
      card.innerHTML = `
        <div class="memory-card__inner">
          <div class="memory-card__back"></div>
          <div class="memory-card__front"><img src="images/moods/${mood}.jpg" alt="${mood}"></div>
        </div>
      `;
      card.addEventListener("click", () => flipMemoryCard(idx));
      el.memoryGrid.appendChild(card);
    });
    updateMemoryStatus();
  }

  function flipMemoryCard(idx) {
    const m = state.memory;
    if (m.locked || m.matched.has(idx) || m.flipped.includes(idx) || m.flipped.length >= 2) return;

    m.flipped.push(idx);
    renderMemory();

    if (m.flipped.length === 2) {
      m.moves += 1;
      const [i1, i2] = m.flipped;
      if (m.cards[i1] === m.cards[i2]) {
        m.matched.add(i1);
        m.matched.add(i2);
        m.flipped = [];
        renderMemory();
        if (m.matched.size === m.cards.length) {
          showToast(`🧠 All 6 pairs found in ${m.moves} moves — nice memory.`);
        }
      } else {
        m.locked = true;
        setTimeout(() => {
          m.flipped = [];
          m.locked = false;
          renderMemory();
        }, 800);
      }
    }
  }

  function updateMemoryStatus() {
    const m = state.memory;
    const pairsFound = m.matched.size / 2;
    const total = m.cards.length / 2;
    el.memoryStatus.textContent = pairsFound === total
      ? `All ${total} pairs found · ${m.moves} moves`
      : `${pairsFound} of ${total} pairs found · ${m.moves} moves`;
  }

  el.memoryRefill.addEventListener("click", initMemory);

  /* ============================================
     QUOTES
     ============================================ */

  function renderQuote() {
    let idx;
    do { idx = Math.floor(Math.random() * QUOTES.length); } while (idx === lastQuoteIdx && QUOTES.length > 1);
    lastQuoteIdx = idx;
    $$("[data-quote-text]").forEach((n) => (n.textContent = QUOTES[idx]));
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-quote-refresh]")) renderQuote();
  });

  /* ============================================
     TOAST
     ============================================ */

  let toastTimer = null;
  function showToast(msg) {
    el.toastText.textContent = msg;
    el.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("is-visible"), 5200);
  }
  el.toastClose.addEventListener("click", () => el.toast.classList.remove("is-visible"));

  /* ============================================
     GO
     ============================================ */

  bootstrap();
})();
