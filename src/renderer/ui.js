// ── DevClicker UI Layer ───────────────────────────────────────────────────────
const UI = (() => {

  let _levels, _workers, _componentsCoins, _componentsGems, _upgrades, _achievements;
  let _activeTab = 'shop';
  let _tickerQueue = [];
  let _tickerInterval;
  let _bannerTimeout;

  function init(levels, workers, componentsCoins, componentsGems, upgrades, achievements) {
    _levels = levels;
    _workers = workers;
    _componentsCoins = componentsCoins;
    _componentsGems = componentsGems;
    _upgrades = upgrades;
    _achievements = achievements;

    // Ticker scroll
    _tickerInterval = setInterval(() => {
      if (_tickerQueue.length > 0) {
        document.getElementById('ticker-text').textContent = _tickerQueue.shift();
      }
    }, 2500);
  }

  function render() {
    const state = Game.getState();
    renderCurrencies(state);
    renderClickerStats(state);
    renderLevelInfo(state);
    renderPrestige(state);
    if (_activeTab === 'shop') renderShop(state);
    if (_activeTab === 'workers') renderWorkers(state);
    if (_activeTab === 'upgrades') renderUpgrades(state);
    if (_activeTab === 'levels') renderLevels(state);
    if (_activeTab === 'achievements') renderAchievements(state);
    renderStats(state);
    renderMilestones(state);
  }

  function renderCurrencies(state) {
    document.getElementById('coins-display').textContent = Game.fmt(state.coins);
    document.getElementById('gems-display').textContent = Game.fmt(state.gems);
    document.getElementById('lines-display').textContent = Game.fmt(state.totalLines);
  }

  function renderClickerStats(state) {
    document.getElementById('stat-per-click').textContent = Game.fmt(Game.calcClickPower());
    document.getElementById('stat-per-sec').textContent = Game.fmt(Game.calcLPS());
  }

  function renderLevelInfo(state) {
    const lvl = Game.currentLevel();
    if (!lvl) return;
    const name = lvl.meta?.name || lvl.name || '???';
    const icon = lvl.meta?.icon || lvl.icon || '💻';
    const desc = lvl.description?.tagline || lvl.tagline || '';
    document.getElementById('current-level-name').textContent = name;
    document.getElementById('current-level-desc').textContent = desc;
    document.getElementById('current-level-icon').textContent = icon;
    document.getElementById('clicker-icon').textContent = icon;
    const prog = Game.levelProgress();
    document.getElementById('level-progress-bar').style.width = `${Math.floor(prog * 100)}%`;
    const required = lvl.gameplay?.linesRequired || 0;
    document.getElementById('level-progress-label').textContent =
      `${Game.fmt(state.sessionLines)} / ${Game.fmt(required)} líneas`;
  }

  function renderPrestige(state) {
    const btn = document.getElementById('prestige-btn');
    if (Game.canPrestige()) {
      btn.classList.remove('hidden');
      document.getElementById('prestige-reward').textContent =
        `+${state.completedLevels.length * 5} 💎`;
    } else {
      btn.classList.add('hidden');
    }
  }

  function renderShop(state) {
    renderList('shop-coins-list', _componentsCoins, (c) => componentCard(c, state));
    renderList('shop-gems-list', _componentsGems, (c) => componentCard(c, state));
  }

  function componentCard(c, state) {
    const count = state.components[c.id] || 0;
    const cost = Game.componentCost(c.id);
    const canAfford = c.currency === 'coins' ? state.coins >= cost : state.gems >= cost;
    const costIcon = c.currency === 'coins' ? '🪙' : '💎';
    const costClass = c.currency === 'coins' ? 'cost-coin' : 'cost-gem';
    const btnClass = c.currency === 'coins' ? '' : 'gem-btn';
    const el = document.createElement('div');
    el.className = `item-card${canAfford ? ' affordable' : ''}`;
    el.innerHTML = `
      <span class="item-icon">${c.icon}</span>
      <div class="item-info">
        <div class="item-name">${c.name} ${count > 0 ? `<span class="item-count-badge">×${count}</span>` : ''}</div>
        <div class="item-desc">${c.desc}</div>
        <div class="item-effect">+${c.clickBonus} click · +${c.lpsBonus} LPS</div>
      </div>
      <div class="item-right">
        <div class="item-cost ${costClass}">${costIcon} ${Game.fmt(cost)}</div>
        <button class="buy-btn ${btnClass}" ${canAfford ? '' : 'disabled'} onclick="event.stopPropagation(); Game.buyComponent('${c.id}')">Comprar</button>
      </div>`;
    return el;
  }

  function renderWorkers(state) {
    renderList('workers-list', _workers, (w) => {
      const count = state.workers[w.id] || 0;
      const cost = Game.workerCost(w.id);
      const canAfford = w.currency === 'coins' ? state.coins >= cost : state.gems >= cost;
      const costIcon = w.currency === 'coins' ? '🪙' : '💎';
      const costClass = w.currency === 'coins' ? 'cost-coin' : 'cost-gem';
      const btnClass = w.currency === 'coins' ? '' : 'gem-btn';
      const el = document.createElement('div');
      el.className = `item-card${canAfford ? ' affordable' : ''}`;
      el.innerHTML = `
        <span class="item-icon">${w.icon}</span>
        <div class="item-info">
          <div class="item-name">${w.name} ${count > 0 ? `<span class="item-count-badge">×${count}</span>` : ''}</div>
          <div class="item-desc">${w.desc}</div>
          <div class="item-effect">+${w.baseLPS} LPS/unidad</div>
        </div>
        <div class="item-right">
          <div class="item-cost ${costClass}">${costIcon} ${Game.fmt(cost)}</div>
          <button class="buy-btn ${btnClass}" ${canAfford ? '' : 'disabled'} onclick="event.stopPropagation(); Game.buyWorker('${w.id}')">Contratar</button>
        </div>`;
      return el;
    });
  }

  function renderUpgrades(state) {
    renderList('upgrades-list', _upgrades, (u) => {
      const owned = !!state.upgrades[u.id];
      const canReq = u.req();
      const canAfford = u.currency === 'coins' ? state.coins >= u.cost : state.gems >= u.cost;
      const costIcon = u.currency === 'coins' ? '🪙' : '💎';
      const costClass = u.currency === 'coins' ? 'cost-coin' : 'cost-gem';
      const el = document.createElement('div');
      el.className = `item-card${!canReq ? ' locked' : canAfford && !owned ? ' affordable' : ''}${owned ? ' maxed' : ''}`;
      el.innerHTML = `
        <span class="item-icon">${u.icon}</span>
        <div class="item-info">
          <div class="item-name">${u.name}</div>
          <div class="item-desc">${u.desc}</div>
        </div>
        <div class="item-right">
          ${owned ? `<button class="buy-btn purchased" disabled>✓ Activa</button>` :
          `<div class="item-cost ${costClass}">${costIcon} ${Game.fmt(u.cost)}</div>
           <button class="buy-btn" ${canAfford && canReq ? '' : 'disabled'} onclick="event.stopPropagation(); Game.buyUpgrade('${u.id}')">Comprar</button>`}
        </div>`;
      return el;
    });
  }

  function renderLevels(state) {
    const sorted = [..._levels].sort((a, b) => (a.meta?.order || a.order || 0) - (b.meta?.order || b.order || 0));
    renderList('levels-list', sorted, (lvl) => {
      const id = lvl.meta?.id || lvl.id;
      const name = lvl.meta?.name || lvl.name;
      const icon = lvl.meta?.icon || '📚';
      const required = lvl.gameplay?.linesRequired || 0;
      const unlockLines = lvl.meta?.unlockLines || 0;
      const tagline = lvl.description?.tagline || '';
      const lore = lvl.description?.lore || '';
      const isActive = state.currentLevelId === id;
      const isDone = state.completedLevels.includes(id);
      const isLocked = state.totalLines < unlockLines && !isDone && !isActive;
      const el = document.createElement('div');
      el.className = `item-card level-card${isActive ? ' active-level' : ''}${isLocked ? ' locked-level' : ''}`;
      el.innerHTML = `
        <span class="item-icon">${isLocked ? '🔒' : icon}</span>
        <div class="item-info">
          <div class="item-name">${name}</div>
          <div class="item-desc">${isLocked ? `Requiere ${Game.fmt(unlockLines)} líneas totales` : tagline}</div>
          ${!isLocked ? `<div class="item-effect" style="color:var(--text3)">${lore}</div>` : ''}
        </div>
        <div class="item-right">
          <span class="level-badge ${isActive ? 'badge-active' : isDone ? 'badge-done' : 'badge-locked'}">
            ${isActive ? 'ACTIVO' : isDone ? 'COMPLETADO' : 'BLOQUEADO'}
          </span>
          <div style="font-size:10px;color:var(--text3);font-family:var(--font-mono)">Meta: ${Game.fmt(required)}</div>
        </div>`;
      return el;
    });
  }

  function renderAchievements(state) {
    renderList('achievements-list', _achievements, (ach) => {
      const unlocked = !!state.achievements[ach.id];
      const el = document.createElement('div');
      el.className = `item-card achievement-card${unlocked ? ' unlocked' : ' locked-ach'}`;
      el.innerHTML = `
        <span class="item-icon">${ach.icon}</span>
        <div class="item-info">
          <div class="item-name">${ach.name}</div>
          <div class="item-desc">${unlocked ? ach.desc : '???'}</div>
        </div>
        <div class="item-right">
          ${unlocked ? '<span style="color:var(--gold);font-size:18px">✓</span>' : '<span style="color:var(--text3);font-size:14px">🔒</span>'}
        </div>`;
      return el;
    });
  }

  function renderStats(state) {
    const lps = Game.calcLPS();
    const rows = [
      ['Líneas/click', Game.fmt(Game.calcClickPower())],
      ['Líneas/sec', Game.fmt(lps)],
      ['Coins totales', Game.fmt(state.coins)],
      ['Gems totales', Game.fmt(state.gems)],
      ['Total clics', Game.fmt(state.totalClicks)],
      ['Workers', Game.fmt(Game.totalWorkers())],
      ['Nivel actual', Game.currentLevel()?.meta?.name || 'HTML'],
      ['Niveles completos', state.completedLevels.length],
      ['Prestiges', state.prestigeCount],
      ['Tiempo jugado', fmtTime(state.playTime)],
    ];
    const container = document.getElementById('stats-list');
    container.innerHTML = rows.map(([label, val]) =>
      `<div class="stat-row"><span class="stat-row-label">${label}</span><span class="stat-row-val">${val}</span></div>`
    ).join('');
  }

  function renderMilestones(state) {
    const lps = Game.calcLPS();
    const milestones = [
      { label: '1K líneas', val: 1000, curr: state.totalLines },
      { label: '10K coins', val: 10000, curr: state.coins },
      { label: '10 LPS', val: 10, curr: lps },
      { label: '1M líneas', val: 1000000, curr: state.totalLines },
      { label: '10 gems', val: 10, curr: state.gems },
      { label: '1K LPS', val: 1000, curr: lps },
    ];
    const container = document.getElementById('milestones-list');
    container.innerHTML = milestones.map(m => {
      const done = m.curr >= m.val;
      return `<div class="milestone-row">
        <div class="milestone-dot" style="background:${done ? 'var(--green)' : 'var(--border2)'}"></div>
        <span class="milestone-text" style="color:${done ? 'var(--green)' : 'var(--text3)'}">${m.label} ${done ? '✓' : `(${Game.fmt(m.curr)}/${Game.fmt(m.val)})`}</span>
      </div>`;
    }).join('');
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function renderList(containerId, items, cardFn) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    for (const item of items) {
      const el = cardFn(item);
      if (el) container.appendChild(el);
    }
  }

  function fmtTime(secs) {
    if (secs < 60) return `${secs}s`;
    if (secs < 3600) return `${Math.floor(secs/60)}m ${secs%60}s`;
    return `${Math.floor(secs/3600)}h ${Math.floor((secs%3600)/60)}m`;
  }

  // ── Floaters ───────────────────────────────────────────────────────────────
  function spawnFloater(text, isGold = false) {
    const btn = document.getElementById('clicker-btn');
    const rect = btn.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = `floater${isGold ? ' gold' : ''}`;
    el.textContent = text;
    el.style.left = `${rect.left + rect.width / 2 + (Math.random() - .5) * 60}px`;
    el.style.top = `${rect.top + rect.height / 2 - 20}px`;
    document.getElementById('floaters').appendChild(el);
    el.addEventListener('animationend', () => el.remove());

    // Ripple
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    ripple.style.left = '50%';
    ripple.style.top = '50%';
    document.getElementById('clicker-ripples').appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  }

  // ── Ticker ─────────────────────────────────────────────────────────────────
  function setTicker(msg) {
    _tickerQueue.push(msg);
    if (_tickerQueue.length > 10) _tickerQueue.shift();
  }

  // ── Level Banner ───────────────────────────────────────────────────────────
  function showLevelBanner(icon, name) {
    const banner = document.getElementById('level-banner');
    document.getElementById('level-banner-icon').textContent = icon;
    document.getElementById('level-banner-name').textContent = name;
    banner.classList.remove('hidden');
    banner.classList.add('show');
    if (_bannerTimeout) clearTimeout(_bannerTimeout);
    _bannerTimeout = setTimeout(() => {
      banner.classList.remove('show');
      setTimeout(() => banner.classList.add('hidden'), 600);
    }, 4000);
  }

  // ── Achievement Toast ──────────────────────────────────────────────────────
  function showAchievementToast(ach) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position:fixed;bottom:20px;right:20px;z-index:4000;
      background:linear-gradient(135deg,#1a1a2e,#16213e);
      border:1px solid rgba(255,213,79,.4);border-radius:10px;
      padding:12px 16px;display:flex;align-items:center;gap:10px;
      box-shadow:0 4px 20px rgba(255,213,79,.2);
      animation:slideIn .3s ease-out;font-family:'Oxanium',sans-serif;
    `;
    toast.innerHTML = `
      <span style="font-size:24px">${ach.icon}</span>
      <div>
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#ffd54f;font-family:'Share Tech Mono',monospace">🏆 Logro Desbloqueado</div>
        <div style="font-size:14px;font-weight:700;color:#e8e8f0">${ach.name}</div>
        <div style="font-size:11px;color:#9898b8">${ach.desc}</div>
      </div>`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity .4s';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  // ── Modal ──────────────────────────────────────────────────────────────────
  function showModal(title, body, actions) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').textContent = body;
    const actionsEl = document.getElementById('modal-actions');
    actionsEl.innerHTML = '';
    for (const a of actions) {
      const btn = document.createElement('button');
      btn.className = `modal-btn ${a.cls || ''}`;
      btn.textContent = a.label;
      btn.onclick = a.fn;
      actionsEl.appendChild(btn);
    }
    document.getElementById('modal-overlay').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
  }

  // ── Tabs ───────────────────────────────────────────────────────────────────
  function switchTab(name) {
    _activeTab = name;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${name}"]`)?.classList.add('active');
    document.getElementById(`tab-${name}`)?.classList.add('active');
    render();
  }

  return {
    init, render, spawnFloater, setTicker, showLevelBanner,
    showAchievementToast, showModal, closeModal, switchTab,
  };
})();
