function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeEmployee(seed = {}) {
  return {
    id: seed.id || `e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: seed.name || `${pick(LAST_NAMES)}${pick(FIRST_NAMES)}`,
    role: seed.role || pick(ROLES),
    efficiency: clampStat(seed.efficiency ?? randInt(3, 6)),
    research: clampStat(seed.research ?? randInt(2, 5)),
    communication: clampStat(seed.communication ?? randInt(2, 5)),
    xp: seed.xp || 0,
    level: seed.level || 1
  };
}

function clampStat(n) {
  return Math.max(1, Math.min(STAT_MAX, Math.round(n)));
}

function freshState() {
  return {
    money: 60,
    research: 0,
    culture: 0,
    employees: [
      makeEmployee({
        name: "김스타",
        role: "사원",
        efficiency: 5,
        research: 3,
        communication: 4,
        level: 1
      })
    ],
    researchOwned: {},
    cultureOwned: {},
    officeOwned: {},
    earned: { money: 60, research: 0, culture: 0 },
    milestones: { money: 0, research: 0, culture: 0 },
    surgeIn: 4,
    surgeMax: 4,
    combo: 0,
    comboUntil: 0,
    jackpotUntil: 0,
    settled: false,
    rushUntil: 0,
    rushMul: 1,
    pops: [],
    popRes: null,
    gainFlash: { money: 0, research: 0, culture: 0 },
    flashEmp: null,
    tab: "research",
    last: Date.now(),
    log: "회사를 열었습니다. 첫 사원이 책상에 앉았습니다.",
    flashTech: null,
    flashCrit: null
  };
}

let state = freshState();
