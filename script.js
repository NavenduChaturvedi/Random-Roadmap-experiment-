document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "mindrift-roadmap-progress-v1";

  const state = loadState();

  const roadmap = document.querySelector(".roadmap");
  const phases = Array.from(document.querySelectorAll(".phase"));
  const hero = document.querySelector(".hero");
  const container = document.querySelector(".container");

  if (!roadmap || phases.length === 0) return;

  // ---------- Utilities ----------
  function slugify(text) {
    return String(text)
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getPhaseTitle(phase) {
    const title = phase.querySelector(".phase-title-block h3");
    return title ? title.textContent.trim() : "phase";
  }

  function getTaskItems() {
    return Array.from(document.querySelectorAll(".phase .card ul li"));
  }

  function ensureTaskIds() {
    phases.forEach((phase, phaseIndex) => {
      const phaseKey = slugify(getPhaseTitle(phase));
      const tasks = Array.from(phase.querySelectorAll(".card ul li"));
      tasks.forEach((li, taskIndex) => {
        if (!li.dataset.taskId) {
          li.dataset.taskId = `${phaseIndex + 1}-${phaseKey}-${taskIndex + 1}`;
        }
      });
    });
  }

  function isTaskDone(li) {
    return li.classList.contains("item-done");
  }

  function setTaskDone(li, done) {
    li.classList.toggle("item-done", done);
    li.classList.toggle("item-todo", !done);

    const tick = li.querySelector(".tick");
    if (tick) tick.textContent = done ? "✓" : "○";

    const taskId = li.dataset.taskId;
    if (!taskId) return;

    if (done) {
      state[taskId] = true;
    } else {
      delete state[taskId];
    }

    saveState();
    updateProgress();
  }

  function restoreState() {
    getTaskItems().forEach((li) => {
      const taskId = li.dataset.taskId;
      const saved = taskId && state[taskId];
      setTaskDone(li, !!saved);
    });
  }

  function getPhaseProgress(phase) {
    const items = Array.from(phase.querySelectorAll(".card ul li"));
    const done = items.filter(isTaskDone).length;
    const total = items.length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  function getOverallProgress() {
    const items = getTaskItems();
    const done = items.filter(isTaskDone).length;
    const total = items.length;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  function statusLabel(pct) {
    if (pct >= 100) return "done";
    if (pct >= 50) return "active";
    return "locked";
  }

  function updateProgress() {
    const overall = getOverallProgress();

    const opPct = document.querySelector(".op-pct");
    const opFill = document.querySelector(".op-fill");
    if (opPct) opPct.textContent = `${overall.pct}%`;
    if (opFill) opFill.style.width = `${overall.pct}%`;

    phases.forEach((phase) => {
      const progress = getPhaseProgress(phase);
      const badge = phase.querySelector(".status-badge");
      const num = phase.querySelector(".phase-num");

      phase.classList.toggle("phase-done", progress.pct === 100);
      phase.classList.toggle("phase-active", progress.pct > 0 && progress.pct < 100);

      if (badge) {
        badge.classList.remove("badge-done", "badge-active", "badge-locked");
        const label = statusLabel(progress.pct);

        if (label === "done") {
          badge.classList.add("badge-done");
          badge.textContent = "✓ Done";
        } else if (label === "active") {
          badge.classList.add("badge-active");
          badge.textContent = "▶ In progress";
        } else {
          badge.classList.add("badge-locked");
          badge.textContent = "○ Locked";
        }
      }

      if (num) {
        if (progress.pct === 100) {
          num.textContent = "✓";
        } else {
          num.textContent = num.dataset.originalNumber || num.textContent;
        }
      }

      let progressMeta = phase.querySelector(".phase-progress-inline");
      if (!progressMeta) {
        const right = phase.querySelector(".phase-right");
        if (right) {
          progressMeta = document.createElement("div");
          progressMeta.className = "meta-pill phase-progress-inline";
          right.appendChild(progressMeta);
        }
      }
      if (progressMeta) {
        progressMeta.innerHTML = `<div class="ml">Progress</div><div class="mv">${progress.done}/${progress.total} • ${progress.pct}%</div>`;
      }
    });

    updateToolbarProgress();
  }

  function updateToolbarProgress() {
    const overall = getOverallProgress();
    const toolbarPct = document.querySelector("[data-toolbar-pct]");
    if (toolbarPct) toolbarPct.textContent = `${overall.done}/${overall.total} done • ${overall.pct}%`;
  }

  function toggleAll(open) {
    phases.forEach((phase) => {
      const details = phase.querySelector("details");
      if (details) details.open = open;
    });
  }

  function resetProgress() {
    Object.keys(state).forEach((key) => delete state[key]);
    saveState();

    getTaskItems().forEach((li) => {
      li.classList.remove("item-done");
      li.classList.add("item-todo");
      const tick = li.querySelector(".tick");
      if (tick) tick.textContent = "○";
    });

    updateProgress();
  }

  function applySearchFilter(query) {
    const q = query.trim().toLowerCase();
    const cards = Array.from(document.querySelectorAll(".card"));
    const phasesLocal = Array.from(document.querySelectorAll(".phase"));

    if (!q) {
      cards.forEach((card) => (card.style.display = ""));
      phasesLocal.forEach((phase) => (phase.style.display = ""));
      return;
    }

    phasesLocal.forEach((phase) => {
      let phaseMatch = false;
      const text = phase.textContent.toLowerCase();

      if (text.includes(q)) phaseMatch = true;

      const cardMatches = Array.from(phase.querySelectorAll(".card")).map((card) => {
        const match = card.textContent.toLowerCase().includes(q);
        card.style.display = match ? "" : "none";
        if (match) phaseMatch = true;
        return match;
      });

      phase.style.display = phaseMatch ? "" : "none";

      // Open matching phases automatically
      const details = phase.querySelector("details");
      if (details && phaseMatch) details.open = true;
    });
  }

  function injectToolbar() {
    const toolbar = document.createElement("div");
    toolbar.className = "roadmap-toolbar";
    toolbar.style.cssText = `
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      margin: 18px 0 28px;
      padding: 16px 18px;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: var(--surface);
      box-shadow: var(--shadow);
    `;

    toolbar.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:4px; min-width:220px;">
        <strong style="font-family: 'Syne', sans-serif; font-size: 1rem;">Roadmap Controls</strong>
        <span data-toolbar-pct style="font-size: .88rem; color: var(--muted);">0/0 done • 0%</span>
      </div>

      <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; flex:1;">
        <input
          type="search"
          placeholder="Search topics, tasks, phases..."
          aria-label="Search roadmap"
          class="roadmap-search"
          style="
            flex: 1;
            min-width: 220px;
            padding: 12px 14px;
            border-radius: 12px;
            border: 1px solid var(--line);
            background: var(--surface-2);
            color: var(--text);
            outline: none;
          "
        />
        <button type="button" data-expand-all style="${buttonStyle()}">Expand all</button>
        <button type="button" data-collapse-all style="${buttonStyle()}">Collapse all</button>
        <button type="button" data-reset-progress style="${buttonStyle(true)}">Reset progress</button>
      </div>
    `;

    const firstSection = document.querySelector(".section-header");
    if (firstSection && firstSection.parentNode) {
      firstSection.parentNode.insertBefore(toolbar, firstSection.nextSibling);
    } else if (hero && hero.parentNode) {
      hero.parentNode.insertBefore(toolbar, hero.nextSibling);
    } else if (container) {
      container.insertBefore(toolbar, roadmap);
    }

    const searchInput = toolbar.querySelector(".roadmap-search");
    const expandBtn = toolbar.querySelector("[data-expand-all]");
    const collapseBtn = toolbar.querySelector("[data-collapse-all]");
    const resetBtn = toolbar.querySelector("[data-reset-progress]");

    searchInput?.addEventListener("input", (e) => applySearchFilter(e.target.value));
    expandBtn?.addEventListener("click", () => toggleAll(true));
    collapseBtn?.addEventListener("click", () => toggleAll(false));
    resetBtn?.addEventListener("click", () => {
      const confirmReset = confirm("Reset all saved progress?");
      if (confirmReset) resetProgress();
    });
  }

  function buttonStyle(danger = false) {
    return `
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid ${danger ? "rgba(251,146,60,0.35)" : "var(--line)"};
      background: ${danger ? "rgba(251,146,60,0.08)" : "var(--surface-2)"};
      color: var(--text);
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    `;
  }

  function wireTaskClicks() {
    getTaskItems().forEach((li) => {
      li.style.cursor = "pointer";
      li.title = "Click to toggle completion";
      li.addEventListener("click", (e) => {
        const target = e.target;
        if (target && (target.tagName === "A" || target.tagName === "BUTTON" || target.tagName === "INPUT")) return;
        setTaskDone(li, !isTaskDone(li));
      });
    });
  }

  function initPhaseNumbers() {
    phases.forEach((phase, index) => {
      const num = phase.querySelector(".phase-num");
      if (num) num.dataset.originalNumber = String(index + 1);
    });
  }

  function addTinyHint() {
    const note = document.createElement("div");
    note.style.cssText = `
      margin-top: 18px;
      color: var(--muted);
      font-size: .86rem;
      text-align: center;
    `;
    note.textContent = "Tip: click any checklist item to mark it done. Your progress saves automatically.";
    roadmap.parentNode?.insertBefore(note, roadmap.nextSibling);
  }

  // ---------- Init ----------
  initPhaseNumbers();
  ensureTaskIds();
  injectToolbar();
  wireTaskClicks();
  restoreState();
  updateProgress();
  addTinyHint();

  // Open the first phase by default, keep others as they were
  const firstDetails = document.querySelector(".phase details");
  if (firstDetails) firstDetails.open = true;
});