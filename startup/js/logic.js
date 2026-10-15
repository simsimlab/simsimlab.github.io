function eachBonus(fn) {
  for (const tech of RESEARCH_TECHS) if (state.researchOwned[tech.id]) fn(tech.bonus);
  for (const tech of CULTURE_TECHS) if (state.cultureOwned[tech.id]) fn(tech.bonus);
  for (const item of OFFICE_ITEMS) if (state.officeOwned[item.id]) fn(item.bonus);
}

function productBonus(key) {
  let m = 1;
  eachBonus((bonus) => {
    if (bonus && bonus[key]) m *= bonus[key];
  });
  return m;
}

function sumBonus(key) {
  let n = 0;
  eachBonus((bonus) => {
    if (bonus && bonus[key]) n += bonus[key];
  });
  return n;
}

function hasTech(tree, id) {
  return Boolean(state[tree === "research" ? "researchOwned" : "cultureOwned"][id]);
}

function techReady(tech, tree) {
  if (hasTech(tree, tech.id)) return false;
  return tech.needs.every((id) => hasTech(tree, id));
}

function techUnlocked(tech, tree) {
  return hasTech(tree, tech.id) || tech.needs.every((id) => hasTech(tree, id));
}

function maxSeats() {
  return 3 + sumBonus("seats");
}

function rushActive() {
  return Date.now() < state.rushUntil;
}

function bumpCombo() {
  const now = Date.now();
  if (now > state.comboUntil) state.combo = 0;
  state.combo = Math.min(12, state.combo + 1);
  state.comboUntil = now + 9000;
  return state.combo;
}

function comboMul() {
  if (Date.now() > state.comboUntil || state.combo < 2) return 1;
  return 1 + (state.combo - 1) * 0.14;
}

function armSurge() {
  const wait = (8 + Math.random() * 7) * productBonus("surge");
  state.surgeIn = wait;
  state.surgeMax = wait;
}

function production() {
  let eff = 0;
  let res = 0;
  let com = 0;
  for (const emp of state.employees) {
    eff += emp.efficiency;
    res += emp.research;
    com += emp.communication;
  }
  return {
    money: eff * 0.55 * productBonus("money") + sumBonus("moneyFlat"),
    research: res * 0.12 * productBonus("research") + sumBonus("researchFlat"),
    culture: com * 0.1 * productBonus("culture") + sumBonus("cultureFlat")
  };
}

function rates() {
  const base = production();
  const mul = rushActive() ? state.rushMul : 1;
  return {
    money: base.money * mul,
    research: base.research * mul,
    culture: base.culture * mul
  };
}

function xpNeed(level) {
  return Math.round(XP_BASE * Math.pow(1.35, level - 1));
}

function nextGoal(key) {
  return MILESTONES[state.milestones[key]] ?? null;
}

function noteGain(key, amount) {
  if (!state.gainFlash) state.gainFlash = { money: 0, research: 0, culture: 0 };
  state.gainFlash[key] = (state.gainFlash[key] || 0) + amount;
}

function burst(key, amount, text) {
  if (!(amount > 0)) return;
  state[key] += amount;
  state.earned[key] += amount;
  state.popRes = key;
  noteGain(key, amount);
  state.pops.push({
    kind: key,
    gain: true,
    text: text || `+${formatNum(amount)}`
  });
}

function payday(label) {
  const made = rates();
  const hot = comboMul() > 1.15;
  const grants = {
    money: Math.max(48, made.money * 16),
    research: Math.max(9, made.research * 16),
    culture: Math.max(7, made.culture * 16)
  };
  for (const key of ["money", "research", "culture"]) {
    burst(key, grants[key], `+${formatNum(grants[key])}`);
    const pop = state.pops[state.pops.length - 1];
    if (pop) pop.hot = hot;
  }
  state.log = `${label} · 매출 +${formatNum(grants.money)} · 연구 +${formatNum(grants.research)} · 문화 +${formatNum(grants.culture)}`;
  return grants;
}

function gain(key, amount) {
  if (!(amount > 0)) return;
  state[key] += amount;
  state.earned[key] += amount;
}

function startRush(mul, seconds) {
  const until = Date.now() + seconds * 1000;
  if (until >= state.rushUntil) {
    state.rushUntil = until;
    state.rushMul = mul;
  }
}

function checkMilestones() {
  for (const key of ["money", "research", "culture"]) {
    let guard = 0;
    while (guard < 6) {
      const goal = MILESTONES[state.milestones[key]];
      if (goal == null || state.earned[key] < goal) break;
      state.milestones[key] += 1;
      const bonus = goal * 0.35;
      state[key] += bonus;
      state.earned[key] += bonus;
      noteGain(key, bonus);
      const combo = bumpCombo();
      startRush(combo >= 4 ? 3 : 2.5, 8);
      const label = RES_LABEL[key];
      state.log = `${label} ${formatNum(goal)} 돌파! +${formatNum(bonus)}`;
      state.popRes = key;
      state.pops.push({ kind: key, gain: true, text: `+${formatNum(bonus)}`, hot: combo >= 4 });
      toast(`${label} ${formatNum(goal)} 돌파!`);
      guard += 1;
    }
  }
}

function fireSurge() {
  const surge = pick(SURGES);
  const base = production();
  const combo = bumpCombo();
  const jackpot = Math.random() < Math.min(0.34, 0.08 + Math.max(0, combo - 2) * 0.04);
  const duringRush = rushActive();
  let mult = surge.mult * comboMul() * (duringRush ? 1.65 : 1);
  if (jackpot) mult *= 4.2;
  const amount = Math.max(surge.min * (jackpot ? 4 : 1), base[surge.key] * mult);
  const title = jackpot ? `잭팟 · ${surge.name}` : duringRush || combo >= 4 ? `${combo}콤보 · ${surge.name}` : surge.name;
  burst(surge.key, amount, `${title} +${formatNum(amount)}`);
  state.pops[state.pops.length - 1].hot = jackpot || combo >= 4;
  state.pops[state.pops.length - 1].jackpot = jackpot;
  state.log = `${title}! ${RES_LABEL[surge.key]} +${formatNum(amount)}`;
  if (jackpot) {
    startRush(3.2, 9);
    state.jackpotUntil = Date.now() + 1100;
    toast(`잭팟 ${surge.name}`);
  } else if (combo >= 3) {
    startRush(Math.min(2.8, 1.35 + combo * 0.16), 5);
  }
  for (const emp of state.employees) {
    addXp(emp, xpNeed(emp.level) * (jackpot ? 0.42 : 0.2));
  }
  armSurge();
}

function xpReady(emp) {
  return emp.xp >= xpNeed(emp.level);
}

function addXp(emp, amount) {
  const need = xpNeed(emp.level);
  if (emp.xp >= need) {
    emp.xp = need;
    return;
  }
  const next = Math.min(need, emp.xp + amount);
  const filled = next >= need && emp.xp < need;
  emp.xp = next;
  if (filled) {
    state.log = `${emp.name}의 경험치가 찼습니다. 교육에서 능력치를 사세요.`;
    state.pops.push({ kind: "culture", text: `${emp.name} 교육 가능` });
  }
}

function statLabel(key) {
  if (key === "efficiency") return "능률";
  if (key === "research") return "연구";
  return "커뮤니케이션";
}

function tick(dt) {
  const r = rates();
  gain("money", r.money * dt);
  gain("research", r.research * dt);
  gain("culture", r.culture * dt);
  checkMilestones();
  state.surgeIn -= dt;
  if (state.surgeIn <= 0) fireSurge();
  for (const emp of state.employees) {
    addXp(emp, dt * (1.15 + emp.level * 0.08) * productBonus("xp"));
  }
  checkMilestones();
}

function hireCost() {
  const n = state.employees.length;
  const base = Math.round(100 * Math.pow(1.78, n - 1));
  return n >= 3 ? base * 18 : base;
}

function hire() {
  if (state.employees.length >= maxSeats()) {
    toast("정원이 가득합니다. 문화 테크나 회의실을 확인하세요.");
    return false;
  }
  const cost = hireCost();
  if (state.money < cost) {
    toast("매출이 부족합니다.");
    return false;
  }
  state.money -= cost;
  const bonus = sumBonus("hire");
  const emp = makeEmployee({
    efficiency: randInt(3 + bonus, 7 + bonus),
    research: randInt(2 + bonus, 6 + bonus),
    communication: randInt(2 + bonus, 6 + bonus)
  });
  state.employees.push(emp);
  bumpCombo();
  startRush(1.45, 4);
  payday(`${emp.name} 입사`);
  toast(`${emp.name} 입사!`);
  return true;
}

function buyTech(tree, id) {
  const list = tree === "research" ? RESEARCH_TECHS : CULTURE_TECHS;
  const ownedKey = tree === "research" ? "researchOwned" : "cultureOwned";
  const resKey = tree === "research" ? "research" : "culture";
  const tech = list.find((t) => t.id === id);
  if (!tech || !techReady(tech, tree)) return false;
  if (state[resKey] < tech.cost) {
    toast(tree === "research" ? "연구 점수가 부족합니다." : "문화 점수가 부족합니다.");
    return false;
  }
  state[resKey] -= tech.cost;
  state[ownedKey][id] = true;
  const made = production();
  const combo = bumpCombo();
  payday(tech.name);
  startRush(combo >= 4 ? 2.8 : 2.2, 8);
  state.flashTech = id;
  toast(tech.name);
  if (state.researchOwned.moat && state.cultureOwned.legend && !state.settled) {
    state.settled = true;
    startRush(3.4, 12);
    state.jackpotUntil = Date.now() + 1400;
    burst("money", made.money * 20, "회사 안착");
    toast("회사 안착! 시리즈 B");
    state.log = "데이터 해자와 레전드 팀이 모였습니다. 회사가 안착했습니다.";
  }
  setTimeout(() => { state.flashTech = null; }, 700);
  return true;
}

function buyOffice(id) {
  const item = OFFICE_ITEMS.find((t) => t.id === id);
  if (!item || state.officeOwned[id]) return false;
  if (state.money < item.cost) {
    toast("매출이 부족합니다.");
    return false;
  }
  state.money -= item.cost;
  state.officeOwned[id] = true;
  bumpCombo();
  payday(item.name);
  startRush(1.7, 6);
  toast(item.name);
  return true;
}

function trainCost(emp, key) {
  return Math.round((40 + emp[key] * 28) * productBonus("train"));
}

function train(empId, key) {
  const emp = state.employees.find((e) => e.id === empId);
  if (!emp || emp[key] >= STAT_MAX) return false;
  if (!xpReady(emp)) {
    toast("경험치가 차야 능력치를 살 수 있습니다.");
    return false;
  }
  const cost = trainCost(emp, key);
  if (state.money < cost) {
    toast("매출이 부족합니다.");
    return false;
  }
  state.money -= cost;
  emp.xp -= xpNeed(emp.level);
  emp.level += 1;
  const crit = Math.random() < 0.16 && emp[key] < STAT_MAX - 1;
  emp[key] = clampStat(emp[key] + (crit ? 2 : 1));
  bumpCombo();
  payday(crit ? `${emp.name} 각성` : `${emp.name} ${statLabel(key)} +${crit ? 2 : 1}`);
  state.flashEmp = emp.id;
  state.flashCrit = crit ? emp.id : null;
  toast(crit ? `${emp.name} 각성!` : `${emp.name} ${statLabel(key)} +1`);
  return true;
}

function formatNum(n) {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e8) return (n / 1e8).toFixed(2) + "억";
  if (abs >= 1e4) return (n / 1e4).toFixed(2) + "만";
  if (abs >= 1000) return (n / 1000).toFixed(2) + "천";
  if (Math.abs(n - Math.round(n)) < 0.05) return String(Math.round(n));
  if (abs >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

function quietSyncMilestones() {
  for (const key of ["money", "research", "culture"]) {
    let i = 0;
    while (MILESTONES[i] != null && state.earned[key] >= MILESTONES[i]) i += 1;
    state.milestones[key] = i;
  }
}

function save() {
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    money: state.money,
    research: state.research,
    culture: state.culture,
    earned: state.earned,
    milestones: state.milestones,
    surgeIn: state.surgeIn,
    surgeMax: state.surgeMax,
    settled: state.settled,
    employees: state.employees,
    researchOwned: state.researchOwned,
    cultureOwned: state.cultureOwned,
    officeOwned: state.officeOwned,
    tab: state.tab,
    last: Date.now(),
    log: state.log
  }));
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    const hadMilestones = Boolean(data.milestones);
    state = {
      ...freshState(),
      ...data,
      last: Date.now(),
      flashTech: null,
      flashEmp: null,
      popRes: null,
      pops: [],
      rushUntil: 0,
      rushMul: 1
    };
    if (!Array.isArray(state.employees) || !state.employees.length) {
      state.employees = freshState().employees;
    }
    if (!state.earned) {
      state.earned = { money: state.money, research: state.research, culture: state.culture };
    }
    if (!hadMilestones) quietSyncMilestones();
    if (typeof state.surgeIn !== "number") state.surgeIn = 4;
    if (typeof state.surgeMax !== "number") state.surgeMax = Math.max(4, state.surgeIn);
    if (typeof state.combo !== "number") state.combo = 0;
    state.comboUntil = 0;
    state.jackpotUntil = 0;
    if (state.settled == null) state.settled = Boolean(state.researchOwned.moat && state.cultureOwned.legend);
  } catch (_) {
    state = freshState();
  }
}

function reset() {
  localStorage.removeItem(SAVE_KEY);
  state = freshState();
  toast("새 회사로 시작합니다.");
}
