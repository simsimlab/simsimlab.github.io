let lastSave = 0;

function bind() {
  document.querySelector(".tabs").addEventListener("click", (ev) => {
    const tab = ev.target.closest("[data-tab]");
    if (!tab) return;
    state.tab = tab.dataset.tab;
    markDirty();
    paint(true);
  });

  el.hire.addEventListener("click", () => {
    if (hire()) {
      markDirty();
      paint(true);
    }
  });

  el.tabBody.addEventListener("click", (ev) => {
    const techBtn = ev.target.closest("[data-buy-tech]");
    if (techBtn) {
      const [tree, id] = techBtn.dataset.buyTech.split(":");
      if (buyTech(tree, id)) {
        markDirty();
        paint(true);
      }
      return;
    }
    const officeBtn = ev.target.closest("[data-buy-office]");
    if (officeBtn) {
      if (buyOffice(officeBtn.dataset.buyOffice)) {
        markDirty();
        paint(true);
      }
      return;
    }
    const trainBtn = ev.target.closest("[data-train]");
    if (trainBtn) {
      const [empId, key] = trainBtn.dataset.train.split(":");
      if (train(empId, key)) {
        markDirty();
        paint(true);
      }
    }
  });

  document.getElementById("btn-save").addEventListener("click", () => {
    save();
    toast("저장했습니다.");
  });

  document.getElementById("btn-reset").addEventListener("click", () => {
    if (confirm("진행을 지우고 처음부터 할까요?")) {
      reset();
      markDirty();
      paint(true);
    }
  });
}

function loop() {
  const now = Date.now();
  const dt = Math.min(0.2, (now - state.last) / 1000);
  state.last = now;
  if (dt > 0) {
    const beforeLog = state.log;
    tick(dt);
    if (state.log !== beforeLog) markDirty();
  }
  if (now - lastSave > 2500) {
    lastSave = now;
    save();
  }
  paint();
  requestAnimationFrame(loop);
}

load();
bind();
paint(true);
requestAnimationFrame(loop);
