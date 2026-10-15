(() => {
  const TIME_MAX_DEFAULT = 60;

  const state = {
    data: null,
    query: "",
    selectedIngredients: [],
    facets: {
      categories: new Set(),
      methods: new Set(),
      tastes: new Set(),
    },
    timeMax: TIME_MAX_DEFAULT,
    view: "grid",
    activeSuggest: -1,
    scrollY: 0,
    scrollLocked: false,
  };

  const els = {
    nameInput: document.getElementById("nameSearch"),
    ingInput: document.getElementById("ingSearch"),
    nameSuggest: document.getElementById("nameSuggest"),
    ingSuggest: document.getElementById("ingSuggest"),
    selectedIngs: document.getElementById("selectedIngs"),
    facets: document.getElementById("facets"),
    results: document.getElementById("results"),
    resultMeta: document.getElementById("resultMeta"),
    clearBtn: document.getElementById("clearFilters"),
    openFilter: document.getElementById("openFilter"),
    closeFilter: document.getElementById("closeFilter"),
    applyFilter: document.getElementById("applyFilter"),
    filterModal: document.getElementById("filterModal"),
    filterCount: document.getElementById("filterCount"),
    activeSummary: document.getElementById("activeSummary"),
    timeMax: document.getElementById("timeMax"),
    timeMaxLabel: document.getElementById("timeMaxLabel"),
    viewGrid: document.getElementById("viewGrid"),
    viewList: document.getElementById("viewList"),
    modal: document.getElementById("modal"),
    sheet: document.getElementById("sheet"),
  };

  function normalize(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[（(].*?[）)]/g, "");
  }

  function fuzzyScore(hay, needle) {
    const h = normalize(hay);
    const n = normalize(needle);
    if (!n) return 1;
    if (!h) return 0;
    if (h === n) return 100;
    if (h.includes(n)) return 80 - Math.min(20, h.indexOf(n));
    let i = 0;
    for (const ch of h) {
      if (ch === n[i]) i += 1;
      if (i >= n.length) return 40;
    }
    let hit = 0;
    for (const ch of n) if (h.includes(ch)) hit += 1;
    return (hit / n.length) * 25;
  }

  function recipeSearchText(r) {
    return [r.name, ...(r.aliases || []), ...(r.ingredients || [])].join(" ");
  }

  function recipeMinutes(r) {
    if (typeof r.timeMinutes === "number") return r.timeMinutes;
    const map = { "约10分钟": 10, "约15分钟": 15, "约30分钟": 30, "约1小时": 60 };
    return map[r.time] || 30;
  }

  function formatTimeShort(mins) {
    if (mins >= 60) return "约1小时";
    return mins + "分钟";
  }

  function matchRecipe(r) {
    const q = state.query.trim();
    if (q) {
      const nameScore = Math.max(
        fuzzyScore(r.name, q),
        ...(r.aliases || []).map((a) => fuzzyScore(a, q))
      );
      const textScore = fuzzyScore(recipeSearchText(r), q) * 0.5;
      if (Math.max(nameScore, textScore) < 28) return null;
    }

    if (state.selectedIngredients.length) {
      const ingBlob =
        (r.ingredients || []).join(" ") + " " + (r.ingredientsText || "");
      const ok = state.selectedIngredients.every((ing) => {
        const aliases = findIngAliases(ing);
        return aliases.some((a) => normalize(ingBlob).includes(normalize(a)));
      });
      if (!ok) return null;
    }

    if (recipeMinutes(r) > state.timeMax) return null;

    for (const key of Object.keys(state.facets)) {
      const set = state.facets[key];
      if (!set.size) continue;
      const values = r[key] || [];
      if (![...set].some((v) => values.includes(v))) return null;
    }
    return r;
  }

  function findIngAliases(name) {
    const hit = (state.data.ingredients || []).find((i) => i.name === name);
    return hit ? hit.aliases || [name] : [name];
  }

  function rankRecipe(r) {
    let score = 0;
    const q = state.query.trim();
    if (q) {
      score += Math.max(
        fuzzyScore(r.name, q),
        ...(r.aliases || []).map((a) => fuzzyScore(a, q))
      );
    }
    if (state.selectedIngredients.length) {
      const overlap = state.selectedIngredients.filter((ing) =>
        (r.ingredients || []).includes(ing)
      ).length;
      score += overlap * 12;
      score += Math.max(0, 8 - Math.abs((r.ingredients || []).length - overlap));
    }
    return score;
  }

  function activeFilterCount() {
    let n = state.selectedIngredients.length;
    Object.values(state.facets).forEach((s) => {
      n += s.size;
    });
    if (state.timeMax < TIME_MAX_DEFAULT) n += 1;
    return n;
  }

  function updateFilterBadge() {
    const n = activeFilterCount();
    if (n > 0) {
      els.filterCount.hidden = false;
      els.filterCount.textContent = String(n);
    } else {
      els.filterCount.hidden = true;
    }
  }

  function renderActiveSummary() {
    const chips = [];
    state.selectedIngredients.forEach((name) => {
      chips.push({ kind: "ing", label: name, clear: () => removeIngredient(name) });
    });
    Object.entries(state.facets).forEach(([key, set]) => {
      set.forEach((v) => {
        chips.push({
          kind: "facet",
          label: v,
          clear: () => {
            state.facets[key].delete(v);
            renderFacets();
            refresh();
          },
        });
      });
    });
    if (state.timeMax < TIME_MAX_DEFAULT) {
      chips.push({
        kind: "time",
        label: "≤" + formatTimeShort(state.timeMax),
        clear: () => {
          state.timeMax = TIME_MAX_DEFAULT;
          els.timeMax.value = String(TIME_MAX_DEFAULT);
          updateTimeLabel();
          refresh();
        },
      });
    }

    els.activeSummary.innerHTML = "";
    if (!chips.length) {
      els.activeSummary.hidden = true;
      return;
    }
    els.activeSummary.hidden = false;
    chips.forEach((c) => {
      const el = document.createElement("span");
      el.className = "chip summary";
      el.innerHTML =
        escapeHtml(c.label) +
        '<button type="button" aria-label="移除">×</button>';
      el.querySelector("button").addEventListener("click", (e) => {
        e.stopPropagation();
        c.clear();
      });
      els.activeSummary.appendChild(el);
    });
  }

  function removeIngredient(name) {
    state.selectedIngredients = state.selectedIngredients.filter((x) => x !== name);
    renderSelectedIngs();
    refresh();
  }

  function renderSelectedIngs() {
    els.selectedIngs.innerHTML = "";
    state.selectedIngredients.forEach((name) => {
      const chip = document.createElement("span");
      chip.className = "chip ingredient";
      chip.innerHTML =
        escapeHtml(name) +
        '<button type="button" aria-label="移除">×</button>';
      chip.querySelector("button").addEventListener("click", () => {
        removeIngredient(name);
      });
      els.selectedIngs.appendChild(chip);
    });
  }

  function addIngredient(name) {
    if (!state.selectedIngredients.includes(name)) {
      state.selectedIngredients.push(name);
      renderSelectedIngs();
      refresh();
    }
    els.ingInput.value = "";
    closeSuggest(els.ingSuggest);
  }

  function closeSuggest(el) {
    el.classList.remove("open");
    el.innerHTML = "";
    state.activeSuggest = -1;
  }

  function openSuggest(el, items, onPick) {
    el.innerHTML = "";
    if (!items.length) {
      closeSuggest(el);
      return;
    }
    items.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = item.label;
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        onPick(item.value);
      });
      el.appendChild(btn);
    });
    el.classList.add("open");
    state.activeSuggest = -1;
  }

  function suggestNames(q) {
    if (!q.trim()) return [];
    return state.data.recipes
      .map((r) => {
        const score = Math.max(
          fuzzyScore(r.name, q),
          ...(r.aliases || []).map((a) => fuzzyScore(a, q))
        );
        return { value: r.name, label: r.name, score };
      })
      .filter((x) => x.score >= 28)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }

  function suggestIngredients(q) {
    if (!q.trim()) {
      return state.data.ingredients.slice(0, 10).map((i) => ({
        value: i.name,
        label: i.name,
        score: 1,
      }));
    }
    return state.data.ingredients
      .map((i) => {
        const score = Math.max(
          fuzzyScore(i.name, q),
          ...(i.aliases || []).map((a) => fuzzyScore(a, q))
        );
        const alias = i.aliases && i.aliases[1] ? ` · ${i.aliases[1]}` : "";
        return { value: i.name, label: i.name + alias, score };
      })
      .filter((x) => x.score >= 28)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  function renderFacets() {
    const labels = {
      categories: "分类",
      methods: "做法",
      tastes: "口味",
    };
    els.facets.innerHTML = "";
    Object.keys(labels).forEach((key) => {
      const values = (state.data.facets && state.data.facets[key]) || [];
      if (!values.length) return;
      const row = document.createElement("div");
      row.className = "facet-row";
      row.innerHTML = `<h3>${labels[key]}</h3>`;
      const pills = document.createElement("div");
      pills.className = "facet-pills";
      values.forEach((v) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pill" + (state.facets[key].has(v) ? " active" : "");
        btn.textContent = v;
        btn.addEventListener("click", () => {
          if (state.facets[key].has(v)) state.facets[key].delete(v);
          else state.facets[key].add(v);
          renderFacets();
          refresh();
        });
        pills.appendChild(btn);
      });
      row.appendChild(pills);
      els.facets.appendChild(row);
    });
  }

  function setView(view) {
    state.view = view;
    els.results.classList.toggle("view-grid", view === "grid");
    els.results.classList.toggle("view-list", view === "list");
    els.viewGrid.classList.toggle("active", view === "grid");
    els.viewList.classList.toggle("active", view === "list");
    els.viewGrid.setAttribute("aria-pressed", view === "grid" ? "true" : "false");
    els.viewList.setAttribute("aria-pressed", view === "list" ? "true" : "false");
    try {
      localStorage.setItem("mise-view", view);
    } catch (_) {}
  }

  function renderResults() {
    const matched = state.data.recipes
      .map(matchRecipe)
      .filter(Boolean)
      .sort((a, b) => rankRecipe(b) - rankRecipe(a));

    els.resultMeta.textContent = `共 ${matched.length} 道菜`;
    els.results.innerHTML = "";

    if (!matched.length) {
      els.results.innerHTML =
        '<div class="empty">没有匹配的菜谱。试试放宽用时或少选食材。</div>';
      return;
    }

    matched.forEach((r, i) => {
      const mins = recipeMinutes(r);
      const card = document.createElement("button");
      card.type = "button";
      card.className = "card";
      card.style.animationDelay = Math.min(i, 12) * 0.03 + "s";
      const tags = [
        ...(r.categories || []).slice(0, 1),
        ...(r.tastes || []).slice(0, 1),
        ...(r.methods || []).slice(0, 1),
      ];
      card.innerHTML = `
        <div class="card-top">
          <h3>${escapeHtml(r.name)}</h3>
          <span class="badge">${escapeHtml(formatTimeShort(mins))}</span>
        </div>
        <p class="card-ings">${escapeHtml(
          (r.ingredients || []).join(" · ") || "查看详情"
        )}</p>
        <div class="card-tags">${tags
          .map((t) => `<span class="mini">${escapeHtml(t)}</span>`)
          .join("")}</div>
      `;
      card.addEventListener("click", () => openRecipe(r));
      els.results.appendChild(card);
    });
  }

  function refresh() {
    updateFilterBadge();
    renderActiveSummary();
    renderResults();
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function anyModalOpen() {
    return (
      els.modal.classList.contains("open") ||
      els.filterModal.classList.contains("open")
    );
  }

  function lockBodyScroll() {
    if (state.scrollLocked) return;
    state.scrollY = window.scrollY || window.pageYOffset || 0;
    state.scrollLocked = true;
    document.body.classList.add("modal-open");
    document.body.style.top = "-" + state.scrollY + "px";
  }

  function unlockBodyScroll() {
    if (!state.scrollLocked) return;
    if (anyModalOpen()) return;
    state.scrollLocked = false;
    document.body.classList.remove("modal-open");
    document.body.style.top = "";
    window.scrollTo(0, state.scrollY);
  }

  function syncBodyScrollLock() {
    if (anyModalOpen()) lockBodyScroll();
    else unlockBodyScroll();
  }

  /** 遮罩上的滑动不传到背后页面；弹窗内部仍可滚 */
  function trapModalScroll(modalEl) {
    let lastY = 0;
    modalEl.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches[0]) lastY = e.touches[0].clientY;
      },
      { passive: true }
    );

    modalEl.addEventListener(
      "touchmove",
      (e) => {
        if (!modalEl.classList.contains("open")) return;
        const sheet = e.target.closest(".sheet");
        if (!sheet) {
          e.preventDefault();
          return;
        }
        const y = e.touches[0] ? e.touches[0].clientY : lastY;
        const dy = y - lastY;
        lastY = y;
        const atTop = sheet.scrollTop <= 0;
        const atBottom =
          sheet.scrollTop + sheet.clientHeight >= sheet.scrollHeight - 1;
        if ((atTop && dy > 0) || (atBottom && dy < 0)) {
          e.preventDefault();
        }
      },
      { passive: false }
    );

    modalEl.addEventListener(
      "wheel",
      (e) => {
        if (!modalEl.classList.contains("open")) return;
        const sheet = e.target.closest(".sheet");
        if (!sheet) {
          e.preventDefault();
          return;
        }
        const atTop = sheet.scrollTop <= 0;
        const atBottom =
          sheet.scrollTop + sheet.clientHeight >= sheet.scrollHeight - 1;
        if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
          e.preventDefault();
        }
      },
      { passive: false }
    );
  }

  function openRecipe(r) {
    const aliases =
      (r.aliases || []).filter((a) => a !== r.name).join(" / ") || "";
    els.sheet.innerHTML = `
      <div class="sheet-head">
        <div>
          <h2>${escapeHtml(r.name)}</h2>
          ${aliases ? `<p class="alias">也叫：${escapeHtml(aliases)}</p>` : ""}
        </div>
        <button class="close-btn" id="closeModalInner" type="button" aria-label="关闭">×</button>
      </div>
      <div class="sheet-meta">
        <span class="mini">${escapeHtml(formatTimeShort(recipeMinutes(r)))}</span>
        ${(r.categories || [])
          .map((c) => `<span class="mini">${escapeHtml(c)}</span>`)
          .join("")}
        ${(r.methods || [])
          .map((c) => `<span class="mini">${escapeHtml(c)}</span>`)
          .join("")}
        ${(r.tastes || [])
          .map((c) => `<span class="mini">${escapeHtml(c)}</span>`)
          .join("")}
      </div>
      <div class="section">
        <h3>食材</h3>
        <p>${escapeHtml(r.ingredientsText || (r.ingredients || []).join("，"))}</p>
      </div>
      ${
        r.sauceText
          ? `<div class="section"><h3>料汁 / 调味</h3><p>${escapeHtml(
              r.sauceText
            )}</p></div>`
          : ""
      }
      <div class="section">
        <h3>做法</h3>
        <ol>${(r.steps || [])
          .map((s) => `<li>${escapeHtml(s)}</li>`)
          .join("")}</ol>
      </div>
    `;
    els.modal.classList.add("open");
    syncBodyScrollLock();
    document
      .getElementById("closeModalInner")
      .addEventListener("click", closeRecipeModal);
  }

  function closeRecipeModal() {
    els.modal.classList.remove("open");
    syncBodyScrollLock();
  }

  function openFilterModal() {
    els.filterModal.classList.add("open");
    syncBodyScrollLock();
  }

  function closeFilterModal() {
    els.filterModal.classList.remove("open");
    closeSuggest(els.ingSuggest);
    syncBodyScrollLock();
  }

  function updateTimeLabel() {
    const v = Number(els.timeMax.value) || TIME_MAX_DEFAULT;
    els.timeMaxLabel.textContent =
      v >= 60 ? "不限（1小时内）" : "≤ " + v + " 分钟";
  }

  function clearAll() {
    state.selectedIngredients = [];
    Object.values(state.facets).forEach((s) => s.clear());
    state.timeMax = TIME_MAX_DEFAULT;
    els.timeMax.value = String(TIME_MAX_DEFAULT);
    els.ingInput.value = "";
    updateTimeLabel();
    closeSuggest(els.ingSuggest);
    renderSelectedIngs();
    renderFacets();
    refresh();
  }

  function wireEvents() {
    els.nameInput.addEventListener("input", () => {
      state.query = els.nameInput.value;
      openSuggest(els.nameSuggest, suggestNames(state.query), (name) => {
        state.query = name;
        els.nameInput.value = name;
        closeSuggest(els.nameSuggest);
        refresh();
      });
      refresh();
    });

    els.ingInput.addEventListener("input", () => {
      openSuggest(
        els.ingSuggest,
        suggestIngredients(els.ingInput.value),
        addIngredient
      );
    });

    els.ingInput.addEventListener("focus", () => {
      openSuggest(
        els.ingSuggest,
        suggestIngredients(els.ingInput.value),
        addIngredient
      );
    });

    els.nameInput.addEventListener("keydown", (e) => {
      handleSuggestKeys(e, els.nameSuggest, (label) => {
        state.query = label;
        els.nameInput.value = label;
        closeSuggest(els.nameSuggest);
        refresh();
      });
    });

    els.ingInput.addEventListener("keydown", (e) => {
      handleSuggestKeys(e, els.ingSuggest, addIngredient);
      if (
        e.key === "Enter" &&
        els.ingInput.value.trim() &&
        state.activeSuggest < 0
      ) {
        const first = suggestIngredients(els.ingInput.value)[0];
        if (first) addIngredient(first.value);
      }
    });

    document.addEventListener("click", (e) => {
      if (!els.nameSuggest.contains(e.target) && e.target !== els.nameInput) {
        closeSuggest(els.nameSuggest);
      }
      if (!els.ingSuggest.contains(e.target) && e.target !== els.ingInput) {
        closeSuggest(els.ingSuggest);
      }
    });

    els.timeMax.addEventListener("input", () => {
      state.timeMax = Number(els.timeMax.value) || TIME_MAX_DEFAULT;
      updateTimeLabel();
      refresh();
    });

    els.openFilter.addEventListener("click", openFilterModal);
    els.closeFilter.addEventListener("click", closeFilterModal);
    els.applyFilter.addEventListener("click", closeFilterModal);
    els.clearBtn.addEventListener("click", clearAll);
    els.filterModal.addEventListener("click", (e) => {
      if (e.target === els.filterModal) closeFilterModal();
    });

    els.viewGrid.addEventListener("click", () => setView("grid"));
    els.viewList.addEventListener("click", () => setView("list"));

    els.modal.addEventListener("click", (e) => {
      if (e.target === els.modal) closeRecipeModal();
    });
    trapModalScroll(els.modal);
    trapModalScroll(els.filterModal);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (els.filterModal.classList.contains("open")) closeFilterModal();
        else if (els.modal.classList.contains("open")) closeRecipeModal();
      }
    });
  }

  function handleSuggestKeys(e, box, onPick) {
    if (!box.classList.contains("open")) return;
    const buttons = [...box.querySelectorAll("button")];
    if (!buttons.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      state.activeSuggest = (state.activeSuggest + 1) % buttons.length;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      state.activeSuggest =
        (state.activeSuggest - 1 + buttons.length) % buttons.length;
    } else if (e.key === "Enter" && state.activeSuggest >= 0) {
      e.preventDefault();
      onPick(buttons[state.activeSuggest].textContent.split(" · ")[0]);
      return;
    } else {
      return;
    }
    buttons.forEach((b, i) =>
      b.classList.toggle("active", i === state.activeSuggest)
    );
  }

  async function init() {
    const res = await fetch("./data/recipes.json?v=3");
    state.data = await res.json();
    try {
      const saved = localStorage.getItem("mise-view");
      if (saved === "list" || saved === "grid") state.view = saved;
    } catch (_) {}
    setView(state.view);
    updateTimeLabel();
    wireEvents();
    renderSelectedIngs();
    renderFacets();
    refresh();
  }

  init().catch((err) => {
    els.results.innerHTML =
      '<div class="empty">菜谱加载失败，请刷新重试。<br>' +
      escapeHtml(String(err && err.message ? err.message : err)) +
      "</div>";
  });
})();
