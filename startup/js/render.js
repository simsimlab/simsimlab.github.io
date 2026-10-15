const el = {
  resources: document.getElementById("resources"),
  employees: document.getElementById("employees"),
  headcount: document.getElementById("headcount"),
  hire: document.getElementById("btn-hire"),
  hireHint: document.getElementById("hire-hint"),
  tabBody: document.getElementById("tab-body"),
  log: document.getElementById("log"),
  tagline: document.getElementById("tagline"),
  toast: document.getElementById("toast")
};

let toastTimer = 0;
let dirty = true;
let lastTab = "";
let lastEmpSig = "";
let lastPanelSig = "";
const punching = { money: false, research: false, culture: false };
const shown = { money: null, research: null, culture: null };

function startPunch(key, el, gain) {
  const from = shown[key] == null ? Math.max(0, state[key] - gain) : shown[key];
  const started = performance.now();
  punching[key] = true;
  function frame(now) {
    const t = Math.min(1, (now - started) / 520);
    const eased = 1 - Math.pow(1 - t, 3);
    const to = state[key];
    el.textContent = formatNum(from + (to - from) * eased);
    if (t < 1) requestAnimationFrame(frame);
    else {
      punching[key] = false;
      shown[key] = state[key];
      el.textContent = formatNum(state[key]);
    }
  }
  requestAnimationFrame(frame);
}

function toast(msg) {
  el.toast.textContent = msg;
  el.toast.hidden = false;
  el.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.toast.classList.remove("show");
  }, 1600);
}

function markDirty() {
  dirty = true;
}

function paintResources() {
  const r = rates();
  if (!el.resources.querySelector('[data-k="money"]')) {
    el.resources.innerHTML = `
      <div class="res money">
        <span class="label">매출</span>
        <span class="value" data-k="money">0</span>
        <span class="delta" data-k="money-delta"></span>
        <div class="rate" data-k="money-rate">+0/초</div>
        <div class="goal-track"><i data-k="money-bar"></i></div>
        <div class="goal" data-k="money-goal"></div>
      </div>
      <div class="res research">
        <span class="label">연구</span>
        <span class="value" data-k="research">0</span>
        <span class="delta" data-k="research-delta"></span>
        <div class="rate" data-k="research-rate">+0/초</div>
        <div class="goal-track"><i data-k="research-bar"></i></div>
        <div class="goal" data-k="research-goal"></div>
      </div>
      <div class="res culture">
        <span class="label">문화</span>
        <span class="value" data-k="culture">0</span>
        <span class="delta" data-k="culture-delta"></span>
        <div class="rate" data-k="culture-rate">+0/초</div>
        <div class="goal-track"><i data-k="culture-bar"></i></div>
        <div class="goal" data-k="culture-goal"></div>
      </div>`;
  }
  for (const key of ["money", "research", "culture"]) {
    const value = el.resources.querySelector(`[data-k="${key}"]`);
    const gain = state.gainFlash?.[key] || 0;
    const rose = gain > 0 && (shown[key] == null || state[key] >= shown[key]);
    if (rose) {
      startPunch(key, value, gain);
      const delta = el.resources.querySelector(`[data-k="${key}-delta"]`);
      if (delta) {
        delta.textContent = `+${formatNum(gain)}`;
        delta.classList.remove("pop");
        void delta.offsetWidth;
        delta.classList.add("pop");
      }
      const card = value.closest(".res");
      card.classList.remove("tick");
      void card.offsetWidth;
      card.classList.add("tick");
    } else if (gain > 0) {
      value.textContent = formatNum(state[key]);
      shown[key] = state[key];
      const delta = el.resources.querySelector(`[data-k="${key}-delta"]`);
      if (delta) {
        delta.textContent = `+${formatNum(gain)}`;
        delta.classList.remove("pop");
        void delta.offsetWidth;
        delta.classList.add("pop");
      }
    } else if (!punching[key]) {
      value.textContent = formatNum(state[key]);
      shown[key] = state[key];
    }
    el.resources.querySelector(`[data-k="${key}-rate"]`).textContent = `+${formatNum(r[key])}/초`;
    const goal = nextGoal(key);
    const prev = MILESTONES[state.milestones[key] - 1] || 0;
    const span = goal == null ? 1 : Math.max(1, goal - prev);
    const fill = goal == null ? 100 : Math.max(0, Math.min(100, ((state.earned[key] - prev) / span) * 100));
    const bar = el.resources.querySelector(`[data-k="${key}-bar"]`);
    if (bar) bar.style.width = `${fill}%`;
    const goalEl = el.resources.querySelector(`[data-k="${key}-goal"]`);
    goalEl.textContent = goal == null
      ? "목표를 모두 넘겼습니다"
      : `누적 ${formatNum(state.earned[key])}/${formatNum(goal)}`;
  }
  el.resources.classList.toggle("rush", rushActive());
  state.popRes = null;
  if (state.gainFlash) {
    state.gainFlash.money = 0;
    state.gainFlash.research = 0;
    state.gainFlash.culture = 0;
  }
}

function empSig() {
  return state.employees.map((e) =>
    `${e.id}:${e.efficiency}:${e.research}:${e.communication}:${e.level}`
  ).join("|") + `|${maxSeats()}`;
}

function panelSig() {
  return [
    state.tab,
    state.flashTech || "",
    Object.keys(state.researchOwned).sort().join(","),
    Object.keys(state.cultureOwned).sort().join(","),
    Object.keys(state.officeOwned).sort().join(","),
    state.employees.map((e) => `${e.id}:${e.efficiency}:${e.research}:${e.communication}:${e.xp >= xpNeed(e.level) ? 1 : 0}`).join("|")
  ].join(";");
}

function syncPanelButtons() {
  el.tabBody.querySelectorAll("[data-buy-tech]").forEach((btn) => {
    const [tree, id] = btn.dataset.buyTech.split(":");
    const list = tree === "research" ? RESEARCH_TECHS : CULTURE_TECHS;
    const tech = list.find((t) => t.id === id);
    if (!tech || !techReady(tech, tree)) return;
    const resVal = tree === "research" ? state.research : state.culture;
    btn.disabled = resVal < tech.cost;
  });
  el.tabBody.querySelectorAll("[data-buy-office]").forEach((btn) => {
    const item = OFFICE_ITEMS.find((t) => t.id === btn.dataset.buyOffice);
    if (!item || state.officeOwned[item.id]) return;
    btn.disabled = state.money < item.cost;
  });
  el.tabBody.querySelectorAll("[data-train]").forEach((btn) => {
    const [empId, key] = btn.dataset.train.split(":");
    const emp = state.employees.find((e) => e.id === empId);
    if (!emp) return;
    btn.disabled = emp[key] >= STAT_MAX || !xpReady(emp) || state.money < trainCost(emp, key);
  });
}

function paintEmployees(force) {
  const sig = empSig();
  if (!force && sig === lastEmpSig) {
    for (const e of state.employees) {
      const card = el.employees.querySelector(`[data-id="${e.id}"]`);
      if (!card) continue;
      const need = xpNeed(e.level);
      const ready = e.xp >= need;
      const pct = Math.min(100, (e.xp / need) * 100);
      const bar = card.querySelector(".xp .bar > i");
      const meta = card.querySelector(".xp .meta span:last-child");
      card.classList.toggle("ready", ready);
      if (bar) bar.style.width = `${pct}%`;
      if (meta) meta.textContent = ready ? "교육 가능" : `${Math.floor(e.xp)}/${need}`;
    }
    const cost = hireCost();
    const full = state.employees.length >= maxSeats();
    el.hire.disabled = full || state.money < cost;
    el.hire.textContent = full ? "정원 가득" : `채용하기 (${formatNum(cost)})`;
    return;
  }
  lastEmpSig = sig;
  el.headcount.textContent = `${state.employees.length} / ${maxSeats()}명`;
  el.employees.innerHTML = state.employees.map((e) => {
    const need = xpNeed(e.level);
    const pct = Math.min(100, (e.xp / need) * 100);
    const ready = e.xp >= need;
    const hot = state.flashEmp === e.id ? (state.flashCrit === e.id ? " ding crit" : " ding") : "";
    return `
      <article class="employee${hot}${ready ? " ready" : ""}" data-id="${e.id}">
        <p class="name">${e.name}</p>
        <p class="role">${e.role} · Lv.${e.level}</p>
        <div class="stats">
          <div class="stat-row"><span>능률</span><div class="bar eff"><i style="width:${(e.efficiency / STAT_MAX) * 100}%"></i></div><span>${e.efficiency}</span></div>
          <div class="stat-row"><span>연구</span><div class="bar res"><i style="width:${(e.research / STAT_MAX) * 100}%"></i></div><span>${e.research}</span></div>
          <div class="stat-row"><span>커뮤니케이션</span><div class="bar com"><i style="width:${(e.communication / STAT_MAX) * 100}%"></i></div><span>${e.communication}</span></div>
        </div>
        <div class="xp">
          <div class="meta"><span>성장</span><span>${ready ? "교육 가능" : `${Math.floor(e.xp)}/${need}`}</span></div>
          <div class="bar"><i style="width:${pct}%"></i></div>
        </div>
      </article>`;
  }).join("");

  const cost = hireCost();
  const full = state.employees.length >= maxSeats();
  el.hire.disabled = full || state.money < cost;
  el.hire.textContent = full ? "정원 가득" : `채용하기 (${formatNum(cost)})`;
  el.hireHint.textContent = full
    ? "문화 테크로 정원을 늘리세요."
    : "능률→매출 · 연구→연구점수 · 커뮤니케이션→문화";
}

function paintTechTree(list, tree, owned, resVal, resName) {
  let lastGroup = "";
  return `<div class="tech-tree">${list.map((t) => {
    const ownedNow = Boolean(owned[t.id]);
    const ready = techReady(t, tree);
    const unlocked = techUnlocked(t, tree);
    const cls = ownedNow ? "owned" : ready ? "ready" : "locked";
    const flash = state.flashTech === t.id ? " flash" : "";
    const needNames = t.needs.map((id) => list.find((x) => x.id === id)?.name || id).join(", ");
    const can = ready && resVal >= t.cost;
    const head = t.group !== lastGroup ? `<p class="tech-group">${t.group}</p>` : "";
    lastGroup = t.group;
    let btn;
    if (ownedNow) btn = `<button class="buy owned" type="button" disabled>완료</button>`;
    else if (!unlocked) btn = `<button class="buy" type="button" disabled>잠김</button>`;
    else btn = `<button class="buy" type="button" data-buy-tech="${tree}:${t.id}" ${can ? "" : "disabled"}>${formatNum(t.cost)} ${resName}</button>`;
    return `${head}<article class="tech ${cls}${flash}">
      <div>
        <h3>${t.name}</h3>
        <p>${t.desc}</p>
        <p class="need">${t.effect}${needNames ? ` · 선행: ${needNames}` : ""}</p>
      </div>
      ${btn}
    </article>`;
  }).join("")}</div>`;
}

function paintOffice() {
  return `<div class="shop-list">${OFFICE_ITEMS.map((item) => {
    const owned = Boolean(state.officeOwned[item.id]);
    const can = !owned && state.money >= item.cost;
    return `<article class="shop-item${owned ? " owned" : ""}">
      <div>
        <h3>${item.name}</h3>
        <p>${item.desc}</p>
        <p class="need">${item.effect}</p>
      </div>
      ${owned
        ? `<button class="buy owned" type="button" disabled>보유</button>`
        : `<button class="buy" type="button" data-buy-office="${item.id}" ${can ? "" : "disabled"}>${formatNum(item.cost)} 매출</button>`}
    </article>`;
  }).join("")}</div>`;
}

function paintTrain() {
  return `<div class="train-list">${state.employees.map((e) => `
    <article class="train-card">
      <div>
        <h3>${e.name}</h3>
        <p>${e.role} · 능률 ${e.efficiency} · 연구 ${e.research} · 커뮤니케이션 ${e.communication}</p>
        <p class="need">${e.xp >= xpNeed(e.level) ? "경험치가 찼습니다. 능력치를 사세요." : "경험치가 차야 살 수 있습니다."}</p>
      </div>
      <div class="train-actions">
        ${Object.keys(TRAIN).map((key) => {
          const maxed = e[key] >= STAT_MAX;
          const ready = e.xp >= xpNeed(e.level);
          const cost = trainCost(e, key);
          const can = !maxed && ready && state.money >= cost;
          const price = maxed ? "MAX" : ready ? formatNum(cost) : "경험치";
          return `<button class="train-btn" type="button" data-train="${e.id}:${key}" ${can ? "" : "disabled"}>
            ${TRAIN[key].label}<br>${price}
          </button>`;
        }).join("")}
      </div>
    </article>`).join("")}</div>`;
}

function paintTabs(force) {
  const sig = panelSig();
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.classList.toggle("on", btn.dataset.tab === state.tab);
  });
  if (!force && sig === lastPanelSig && state.tab === lastTab) return;
  lastPanelSig = sig;
  lastTab = state.tab;
  if (state.tab === "research") {
    el.tabBody.innerHTML = paintTechTree(RESEARCH_TECHS, "research", state.researchOwned, state.research, "연구");
  } else if (state.tab === "culture") {
    el.tabBody.innerHTML = paintTechTree(CULTURE_TECHS, "culture", state.cultureOwned, state.culture, "문화");
  } else if (state.tab === "office") {
    el.tabBody.innerHTML = paintOffice();
  } else {
    el.tabBody.innerHTML = paintTrain();
  }
}

function drainPops() {
  if (!state.pops.length) return;
  for (const pop of state.pops) {
    const node = document.createElement("div");
    node.className = `floater ${pop.kind}${pop.jackpot ? " jackpot" : pop.hot ? " hot" : ""}${pop.gain ? " gain" : ""}`;
    node.textContent = pop.text;
    const card = el.resources.querySelector(`.res.${pop.kind} .value`);
    if (pop.gain && card) {
      const box = card.getBoundingClientRect();
      node.style.left = `${box.left + box.width / 2}px`;
      node.style.top = `${box.top + box.height * 0.2}px`;
    } else {
      node.style.left = `${36 + Math.random() * 28}%`;
    }
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 1500);
  }
  state.pops.length = 0;
}

function paint(force = false) {
  paintResources();
  paintEmployees(force || dirty);
  paintTabs(force || dirty);
  syncPanelButtons();
  drainPops();
  state.flashEmp = null;
  state.flashCrit = null;
  el.log.textContent = state.log;
  const rushLeft = Math.max(0, (state.rushUntil - Date.now()) / 1000);
  const rush = rushLeft > 0 ? `집중 ×${state.rushMul.toFixed(1)} · ${Math.ceil(rushLeft)}초 · ` : "";
  const comboOn = Date.now() < state.comboUntil && state.combo >= 2;
  const combo = comboOn ? `${state.combo}콤보 · ` : "";
  const settled = state.settled ? "안착 · " : "";
  el.tagline.textContent = `${settled}${rush}${combo}사원 ${state.employees.length}명 · 테크 ${Object.keys(state.researchOwned).length + Object.keys(state.cultureOwned).length} · 비품 ${Object.keys(state.officeOwned).length}`;
  const meter = document.getElementById("surge-meter");
  if (meter) {
    const max = state.surgeMax || 1;
    const fill = Math.max(0, Math.min(100, (1 - state.surgeIn / max) * 100));
    meter.firstElementChild.style.width = `${fill}%`;
    meter.classList.toggle("hot", fill > 84);
  }
  document.body.classList.toggle("is-rush", rushLeft > 0);
  document.body.classList.toggle("is-jackpot", Date.now() < state.jackpotUntil);
  dirty = false;
}
