(() => {
  const state = {
    data: null,
    query: "",
    selectedIngredients: [],
    facets: {
      categories: new Set(),
      methods: new Set(),
      tastes: new Set(),
      scenes: new Set(),
      protein: new Set(),
      difficulty: new Set(),
    },
    activeSuggest: -1,
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
    recipeCount: document.getElementById("recipeCount"),
    ingCount: document.getElementById("ingCount"),
    modal: document.getElementById("modal"),
    sheet: document.getElementById("sheet"),
    closeModal: document.getElementById("closeModal"),
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
    // subsequence
    let i = 0;
    for (const ch of h) {
      if (ch === n[i]) i += 1;
      if (i >= n.length) return 40;
    }
    // char overlap
    let hit = 0;
    for (const ch of n) if (h.includes(ch)) hit += 1;
    return (hit / n.length) * 25;
  }

  function recipeSearchText(r) {
    return [r.name, ...(r.aliases || []), ...(r.ingredients || [])].join(" ");
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
      const ingBlob = (r.ingredients || []).join(" ") + " " + (r.ingredientsText || "");
      const ok = state.selectedIngredients.every((ing) => {
        const aliases = findIngAliases(ing);
        return aliases.some((a) => normalize(ingBlob).includes(normalize(a)));
      });
      if (!ok) return null;
    }

    for (const key of Object.keys(state.facets)) {
      const set = state.facets[key];
      if (!set.size) continue;
      const values =
        key === "difficulty" ? [r.difficulty] : r[key] || [];
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

  function renderSelectedIngs() {
    els.selectedIngs.innerHTML = "";
    state.selectedIngredients.forEach((name) => {
      const chip = document.createElement("span");
      chip.className = "chip ingredient";
      chip.innerHTML =
        name +
        '<button type="button" aria-label="移除">×</button>';
      chip.querySelector("button").addEventListener("click", () => {
        state.selectedIngredients = state.selectedIngredients.filter(
          (x) => x !== name
        );
        renderSelectedIngs();
        renderResults();
      });
      els.selectedIngs.appendChild(chip);
    });
  }

  function addIngredient(name) {
    if (!state.selectedIngredients.includes(name)) {
      state.selectedIngredients.push(name);
      renderSelectedIngs();
      renderResults();
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
    items.forEach((item, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = item.label;
      btn.dataset.idx = String(idx);
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
        return { value: i.name, label: i.name + (i.aliases && i.aliases[1] ? ` · ${i.aliases[1]}` : ""), score };
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
      scenes: "场景",
      protein: "食材类型",
      difficulty: "难度",
    };
    els.facets.innerHTML = "";
    Object.keys(labels).forEach((key) => {
      const values = state.data.facets[key] || [];
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
          renderResults();
        });
        pills.appendChild(btn);
      });
      row.appendChild(pills);
      els.facets.appendChild(row);
    });
  }

  function renderResults() {
    const matched = state.data.recipes
      .map(matchRecipe)
      .filter(Boolean)
      .sort((a, b) => rankRecipe(b) - rankRecipe(a));

    els.resultMeta.textContent = `找到 ${matched.length} 道菜`;
    els.results.innerHTML = "";

    if (!matched.length) {
      els.results.innerHTML =
        '<div class="empty">没有匹配的菜谱。试试更短的菜名，或少选几样食材。</div>';
      return;
    }

    matched.forEach((r, i) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "card";
      card.style.animationDelay = Math.min(i, 12) * 0.03 + "s";
      const tags = [
        ...(r.categories || []).slice(0, 1),
        ...(r.tastes || []).slice(0, 1),
        r.time,
      ];
      card.innerHTML = `
        <div class="card-top">
          <h3>${escapeHtml(r.name)}</h3>
          <span class="badge">${escapeHtml(r.difficulty)}</span>
        </div>
        <p class="card-ings">${escapeHtml((r.ingredients || []).join(" · ") || "查看详情")}</p>
        <div class="card-tags">${tags
          .map((t) => `<span class="mini">${escapeHtml(t)}</span>`)
          .join("")}</div>
      `;
      card.addEventListener("click", () => openRecipe(r));
      els.results.appendChild(card);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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
        <span class="mini">${escapeHtml(r.time)}</span>
        <span class="mini">${escapeHtml(r.difficulty)}</span>
        ${(r.categories || []).map((c) => `<span class="mini">${escapeHtml(c)}</span>`).join("")}
        ${(r.methods || []).map((c) => `<span class="mini">${escapeHtml(c)}</span>`).join("")}
        ${(r.tastes || []).map((c) => `<span class="mini">${escapeHtml(c)}</span>`).join("")}
      </div>
      <div class="section">
        <h3>食材</h3>
        <p>${escapeHtml(r.ingredientsText || (r.ingredients || []).join("，"))}</p>
      </div>
      ${
        r.sauceText
          ? `<div class="section"><h3>料汁 / 调味</h3><p>${escapeHtml(r.sauceText)}</p></div>`
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
    document.getElementById("closeModalInner").addEventListener("click", closeModal);
  }

  function closeModal() {
    els.modal.classList.remove("open");
  }

  function clearAll() {
    state.query = "";
    state.selectedIngredients = [];
    Object.values(state.facets).forEach((s) => s.clear());
    els.nameInput.value = "";
    els.ingInput.value = "";
    closeSuggest(els.nameSuggest);
    closeSuggest(els.ingSuggest);
    renderSelectedIngs();
    renderFacets();
    renderResults();
  }

  function wireEvents() {
    els.nameInput.addEventListener("input", () => {
      state.query = els.nameInput.value;
      openSuggest(els.nameSuggest, suggestNames(state.query), (name) => {
        state.query = name;
        els.nameInput.value = name;
        closeSuggest(els.nameSuggest);
        renderResults();
      });
      renderResults();
    });

    els.ingInput.addEventListener("input", () => {
      openSuggest(els.ingSuggest, suggestIngredients(els.ingInput.value), addIngredient);
    });

    els.ingInput.addEventListener("focus", () => {
      openSuggest(els.ingSuggest, suggestIngredients(els.ingInput.value), addIngredient);
    });

    els.nameInput.addEventListener("keydown", (e) => {
      handleSuggestKeys(e, els.nameSuggest, (label) => {
        state.query = label;
        els.nameInput.value = label;
        closeSuggest(els.nameSuggest);
        renderResults();
      });
    });

    els.ingInput.addEventListener("keydown", (e) => {
      handleSuggestKeys(e, els.ingSuggest, addIngredient);
      if (e.key === "Enter" && els.ingInput.value.trim() && state.activeSuggest < 0) {
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

    els.clearBtn.addEventListener("click", clearAll);
    els.closeModal.addEventListener("click", closeModal);
    els.modal.addEventListener("click", (e) => {
      if (e.target === els.modal) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
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
    buttons.forEach((b, i) => b.classList.toggle("active", i === state.activeSuggest));
  }

  async function init() {
    const res = await fetch("./data/recipes.json?v=1");
    state.data = await res.json();
    els.recipeCount.textContent = String(state.data.recipeCount || state.data.recipes.length);
    els.ingCount.textContent = String((state.data.ingredients || []).length);
    wireEvents();
    renderSelectedIngs();
    renderFacets();
    renderResults();
  }

  init().catch((err) => {
    els.results.innerHTML =
      '<div class="empty">菜谱加载失败，请刷新重试。<br>' +
      escapeHtml(String(err && err.message ? err.message : err)) +
      "</div>";
  });
})();
