// ── DevClicker Game Engine ────────────────────────────────────────────────────
const Game = (() => {

  // ── State ───────────────────────────────────────────────────────────────────
  let state = {
    coins: 0,
    gems: 0,
    totalLines: 0,
    sessionLines: 0,
    totalClicks: 0,
    linesPerClick: 1,
    linesPerSec: 0,
    currentLevelId: 'html',
    completedLevels: [],
    prestigeCount: 0,
    playTime: 0,
    workers: {},       // id -> count
    components: {},    // id -> count
    upgrades: {},      // id -> true
    achievements: {},  // id -> true
    lastSave: Date.now()
  };

  let levels = [];         // loaded from .levelSGS files
  let tickInterval = null;
  let saveInterval = null;
  let timeInterval = null;

  // ── Data: Workers ──────────────────────────────────────────────────────────
  const WORKERS = [
    { id: 'intern', name: 'Intern', icon: '👶', desc: 'Escribe HTML muy lento', baseLPS: 0.1, baseCost: 15, costMult: 1.15, currency: 'coins', maxCount: Infinity },
    { id: 'junior', name: 'Junior Dev', icon: '👨‍💻', desc: 'Copia de StackOverflow', baseLPS: 0.5, baseCost: 100, costMult: 1.15, currency: 'coins', maxCount: Infinity },
    { id: 'mid', name: 'Mid Dev', icon: '🧑‍💻', desc: 'Lee la documentación', baseLPS: 2, baseCost: 500, costMult: 1.15, currency: 'coins', maxCount: Infinity },
    { id: 'senior', name: 'Senior Dev', icon: '🧙‍♂️', desc: 'Escribe código limpio', baseLPS: 10, baseCost: 2500, costMult: 1.15, currency: 'coins', maxCount: Infinity },
    { id: 'lead', name: 'Tech Lead', icon: '👑', desc: 'Delega todo', baseLPS: 50, baseCost: 12000, costMult: 1.15, currency: 'coins', maxCount: Infinity },
    { id: 'architect', name: 'Arquitecto', icon: '🏗️', desc: 'Diseña microservicios', baseLPS: 200, baseCost: 60000, costMult: 1.15, currency: 'coins', maxCount: Infinity },
    { id: 'ai', name: 'IA Asistente', icon: '🤖', desc: 'Genera código a velocidad de luz', baseLPS: 1000, baseCost: 500000, costMult: 1.15, currency: 'gems', maxCount: Infinity },
  ];

  // ── Data: Components ────────────────────────────────────────────────────────
  const COMPONENTS_COINS = [
    { id: 'keyboard', name: 'Teclado Mecánico', icon: '⌨️', desc: 'Teclas más rápidas', clickBonus: 1, lpsBonus: 0, cost: 50, costMult: 1.5, currency: 'coins' },
    { id: 'ram', name: 'RAM 8GB', icon: '🧠', desc: 'Más velocidad de proceso', clickBonus: 0, lpsBonus: 0.5, cost: 200, costMult: 1.5, currency: 'coins' },
    { id: 'ssd', name: 'SSD NVMe', icon: '💾', desc: 'Compilación ultra rápida', clickBonus: 2, lpsBonus: 1, cost: 500, costMult: 1.6, currency: 'coins' },
    { id: 'cpu', name: 'CPU', icon: '⚙️', desc: 'Más cores = más código', clickBonus: 3, lpsBonus: 3, cost: 2000, costMult: 1.6, currency: 'coins' },
    { id: 'gpu', name: 'GPU', icon: '🎮', desc: 'CUDA para IA', clickBonus: 5, lpsBonus: 5, cost: 8000, costMult: 1.7, currency: 'coins' },
    { id: 'monitor4k', name: 'Monitor 4K', icon: '🖥️', desc: 'Más pantalla más código visible', clickBonus: 2, lpsBonus: 2, cost: 3000, costMult: 1.5, currency: 'coins' },
    { id: 'dualmonitor', name: 'Doble Monitor', icon: '📺', desc: 'El doble de productividad', clickBonus: 4, lpsBonus: 4, cost: 10000, costMult: 1.6, currency: 'coins' },
    { id: 'server', name: 'Servidor Dedicado', icon: '🗄️', desc: 'CI/CD sin parar', clickBonus: 10, lpsBonus: 20, cost: 50000, costMult: 1.8, currency: 'coins' },
  ];

  const COMPONENTS_GEMS = [
    { id: 'quantum_cpu', name: 'CPU Cuántica', icon: '⚛️', desc: 'Computa en todos los estados', clickBonus: 50, lpsBonus: 100, cost: 5, costMult: 2.0, currency: 'gems' },
    { id: 'ai_chip', name: 'Chip de IA', icon: '🔮', desc: 'Aprende tu estilo de código', clickBonus: 0, lpsBonus: 500, cost: 20, costMult: 2.0, currency: 'gems' },
    { id: 'datacenter', name: 'Data Center', icon: '🏢', desc: 'Miles de servidores trabajando', clickBonus: 100, lpsBonus: 2000, cost: 100, costMult: 2.0, currency: 'gems' },
  ];

  // ── Data: Upgrades ──────────────────────────────────────────────────────────
  const UPGRADES = [
    { id: 'touch_type', name: 'Mecanografía', icon: '✍️', desc: '×2 líneas por clic', cost: 100, currency: 'coins', effect: () => { state.linesPerClick *= 2; }, req: () => true },
    { id: 'dark_mode', name: 'Dark Mode', icon: '🌙', desc: '×1.5 a todos los trabajadores', cost: 500, currency: 'coins', effect: () => { workerMultiplier *= 1.5; }, req: () => totalWorkers() >= 1 },
    { id: 'vim', name: 'Aprender Vim', icon: '📝', desc: '×3 líneas por clic', cost: 1000, currency: 'coins', effect: () => { state.linesPerClick *= 3; }, req: () => state.upgrades['touch_type'] },
    { id: 'git', name: 'Dominar Git', icon: '🌿', desc: '+50% LPS global', cost: 3000, currency: 'coins', effect: () => { workerMultiplier *= 1.5; }, req: () => totalWorkers() >= 3 },
    { id: 'docker', name: 'Docker Expert', icon: '🐳', desc: '×2 a todos los workers', cost: 10000, currency: 'coins', effect: () => { workerMultiplier *= 2; }, req: () => state.upgrades['git'] },
    { id: 'linux', name: 'Instalar Linux', icon: '🐧', desc: '×1.5 por clic + LPS', cost: 5000, currency: 'coins', effect: () => { state.linesPerClick *= 1.5; workerMultiplier *= 1.25; }, req: () => true },
    { id: 'caffeine', name: 'Cafeína Infinita', icon: '☕', desc: '×2 todo durante la noche', cost: 2000, currency: 'coins', effect: () => { globalMultiplier *= 2; }, req: () => true },
    { id: 'microservices', name: 'Microservicios', icon: '🔌', desc: '×3 LPS pero ×0.5 clicks', cost: 20000, currency: 'coins', effect: () => { workerMultiplier *= 3; state.linesPerClick *= 0.5; }, req: () => state.workers['architect'] >= 1 },
    { id: 'ai_copilot', name: 'GitHub Copilot', icon: '🤖', desc: '×5 líneas por clic', cost: 50, currency: 'gems', effect: () => { state.linesPerClick *= 5; }, req: () => true },
    { id: 'cloud', name: 'Cloud Infinita', icon: '☁️', desc: '×10 LPS global', cost: 200, currency: 'gems', effect: () => { workerMultiplier *= 10; }, req: () => state.upgrades['docker'] },
  ];

  // ── Data: Achievements ─────────────────────────────────────────────────────
  const ACHIEVEMENTS = [
    { id: 'first_click', name: 'Hello World', icon: '👋', desc: 'Tu primer clic', check: () => state.totalClicks >= 1 },
    { id: 'clicks_100', name: 'Teclado Gastado', icon: '⌨️', desc: '100 clics', check: () => state.totalClicks >= 100 },
    { id: 'clicks_1000', name: 'RSI Inminente', icon: '🤕', desc: '1,000 clics', check: () => state.totalClicks >= 1000 },
    { id: 'lines_1k', name: 'Primer Commit', icon: '📦', desc: '1,000 líneas escritas', check: () => state.totalLines >= 1000 },
    { id: 'lines_100k', name: 'Proyecto Serio', icon: '🏗️', desc: '100,000 líneas', check: () => state.totalLines >= 100000 },
    { id: 'lines_1m', name: 'Senior Oficial', icon: '🧙‍♂️', desc: '1,000,000 líneas', check: () => state.totalLines >= 1000000 },
    { id: 'first_worker', name: 'Primer Empleado', icon: '🤝', desc: 'Contrata tu primer trabajador', check: () => totalWorkers() >= 1 },
    { id: 'workers_10', name: 'Startup', icon: '🚀', desc: '10 trabajadores', check: () => totalWorkers() >= 10 },
    { id: 'workers_50', name: 'Scale-up', icon: '📈', desc: '50 trabajadores', check: () => totalWorkers() >= 50 },
    { id: 'first_gem', name: 'Premium', icon: '💎', desc: 'Consigue tu primera gema', check: () => state.gems >= 1 },
    { id: 'gems_100', name: 'Inversor', icon: '💰', desc: '100 gemas acumuladas', check: () => state.gems >= 100 },
    { id: 'first_level', name: 'Nuevo Lenguaje', icon: '📚', desc: 'Completa tu primer nivel', check: () => state.completedLevels.length >= 1 },
    { id: 'levels_3', name: 'Poliglota Dev', icon: '🌍', desc: 'Completa 3 niveles', check: () => state.completedLevels.length >= 3 },
    { id: 'prestige_1', name: 'New Game+', icon: '⚡', desc: 'Primer prestige', check: () => state.prestigeCount >= 1 },
  ];

  // ── Internal multipliers ───────────────────────────────────────────────────
  let workerMultiplier = 1;
  let globalMultiplier = 1;
  let gemConversionRate = 1000; // coins per gem threshold

  // ── Level data (built-in defaults + overridden by .levelSGS) ──────────────
  const DEFAULT_LEVELS = [
    { meta: { id: 'html', name: 'HTML', order: 1, icon: '🌐', color: '#e34f26', unlockLines: 0 }, gameplay: { linesRequired: 1000, clickMultiplier: 1, lpsMultiplier: 1, coinMultiplier: 1 }, description: { tagline: 'El comienzo de todo', lore: 'Todo empieza con una etiqueta <div>' } },
    { meta: { id: 'css', name: 'CSS', order: 2, icon: '🎨', color: '#264de4', unlockLines: 1000 }, gameplay: { linesRequired: 5000, clickMultiplier: 1.5, lpsMultiplier: 1.2, coinMultiplier: 1.5 }, description: { tagline: 'Estiliza el mundo', lore: 'center: absolute, position: unknown' } },
    { meta: { id: 'javascript', name: 'JavaScript', order: 3, icon: '🟡', color: '#f7df1e', unlockLines: 5000 }, gameplay: { linesRequired: 20000, clickMultiplier: 2, lpsMultiplier: 1.5, coinMultiplier: 2 }, description: { tagline: 'undefined is not a function', lore: 'El lenguaje que todos odian y todos usan' } },
    { meta: { id: 'python', name: 'Python', order: 4, icon: '🐍', color: '#3776ab', unlockLines: 20000 }, gameplay: { linesRequired: 80000, clickMultiplier: 3, lpsMultiplier: 2, coinMultiplier: 3 }, description: { tagline: 'Indenta o muere', lore: 'pip install everything' } },
    { meta: { id: 'java', name: 'Java', order: 5, icon: '☕', color: '#ed8b00', unlockLines: 80000 }, gameplay: { linesRequired: 250000, clickMultiplier: 4, lpsMultiplier: 3, coinMultiplier: 4 }, description: { tagline: 'Write once, debug everywhere', lore: 'NullPointerException has entered the chat' } },
    { meta: { id: 'cpp', name: 'C++', order: 6, icon: '⚡', color: '#00599c', unlockLines: 250000 }, gameplay: { linesRequired: 1000000, clickMultiplier: 6, lpsMultiplier: 4, coinMultiplier: 6 }, description: { tagline: 'Segmentation fault (core dumped)', lore: 'Libertad absoluta y dolor absoluto' } },
    { meta: { id: 'rust', name: 'Rust', order: 7, icon: '🦀', color: '#ce422b', unlockLines: 1000000 }, gameplay: { linesRequired: 5000000, clickMultiplier: 10, lpsMultiplier: 8, coinMultiplier: 10 }, description: { tagline: 'El compilador siempre tiene razón', lore: 'Ownership, borrowing, y discusiones en Twitter' } },
    { meta: { id: 'haskell', name: 'Haskell', order: 8, icon: '🔮', color: '#5d4f85', unlockLines: 5000000 }, gameplay: { linesRequired: 20000000, clickMultiplier: 20, lpsMultiplier: 15, coinMultiplier: 15 }, description: { tagline: 'Mónadas y lágrimas', lore: 'Si lo entiendes, ya no puedes explicarlo' } },
  ];

  // ── Init ───────────────────────────────────────────────────────────────────
  async function init() {
    // Load levels from files, fall back to defaults
    try {
      const fileLevels = await window.electronAPI.loadLevels();
      levels = fileLevels.length > 0 ? fileLevels : DEFAULT_LEVELS;
    } catch {
      levels = DEFAULT_LEVELS;
    }

    // Cargar versión desde el archivo GameVersion.txt
    try {
      const version = await window.electronAPI.getVersion();
      const versionEl = document.getElementById('game-version');
      if (versionEl) versionEl.textContent = `v${version}`;
    } catch (err) { console.warn("No se pudo cargar la versión:", err); }

    // Load saved game
    const saved = await window.electronAPI.loadGame();
    if (saved) {
      mergeState(saved);
      log('💾 Partida cargada');
    } else {
      log('🚀 Bienvenido a DevClicker!');
    }

    // Reapply upgrades
    workerMultiplier = 1;
    globalMultiplier = 1;
    for (const uid of Object.keys(state.upgrades)) {
      const upg = UPGRADES.find(u => u.id === uid);
      if (upg) upg.effect();
    }

    // Start loops
    tickInterval = setInterval(tick, 1000);
    saveInterval = setInterval(save, 30000);
    timeInterval = setInterval(() => { state.playTime++; }, 1000);

    UI.init(levels, WORKERS, COMPONENTS_COINS, COMPONENTS_GEMS, UPGRADES, ACHIEVEMENTS);
    UI.render(true);
  }

  function mergeState(saved) {
    Object.assign(state, saved);
  }

  // ── Tick ───────────────────────────────────────────────────────────────────
  function tick() {
    const lps = calcLPS();
    if (lps > 0) {
      const gained = lps;
      addLines(gained);
      // Gems from high production
      if (lps >= 100) {
        const gemChance = Math.min(0.1, lps / 100000);
        if (Math.random() < gemChance) {
          state.gems += 1;
          log(`💎 +1 Gem! (producción automática)`);
        }
      }
    }
    state.linesPerSec = lps;
    checkLevelComplete();
    checkAchievements();
    UI.render(false);
  }

  function calcLPS() {
    let lps = 0;
    for (const w of WORKERS) {
      const count = state.workers[w.id] || 0;
      if (count > 0) lps += w.baseLPS * count;
    }
    // Component bonuses
    for (const c of [...COMPONENTS_COINS, ...COMPONENTS_GEMS]) {
      const count = state.components[c.id] || 0;
      if (count > 0) lps += c.lpsBonus * count;
    }
    lps *= workerMultiplier * globalMultiplier;
    lps *= currentLevel()?.gameplay?.lpsMultiplier || 1;
    return lps;
  }

  function calcClickPower() {
    let base = state.linesPerClick;
    // Component click bonuses
    for (const c of [...COMPONENTS_COINS, ...COMPONENTS_GEMS]) {
      const count = state.components[c.id] || 0;
      if (count > 0) base += c.clickBonus * count;
    }
    base *= currentLevel()?.gameplay?.clickMultiplier || 1;
    base *= globalMultiplier;
    return Math.max(1, Math.floor(base));
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  function click() {
    const power = calcClickPower();
    addLines(power);
    state.totalClicks++;

    // Coin reward on click
    const coinMult = currentLevel()?.gameplay?.coinMultiplier || 1;
    const coinGain = Math.max(1, Math.floor(power * 0.5 * coinMult));
    state.coins += coinGain;

    // Gem rare chance on click
    if (Math.random() < 0.002) {
      state.gems += 1;
      UI.spawnFloater(`+1 💎`, true);
      log(`💎 ¡Gema encontrada!`);
    }

    UI.spawnFloater(`+${fmt(power)} 📄`);
    if (coinGain > 0) UI.spawnFloater(`+${fmt(coinGain)} 🪙`, true);
    checkLevelComplete();
    checkAchievements();
    UI.render(false);
  }

  function addLines(n) {
    state.totalLines += n;
    state.sessionLines += n;
    // Passive coin generation
    const coinMult = currentLevel()?.gameplay?.coinMultiplier || 1;
    state.coins += n * 0.3 * coinMult;
  }

  function buyWorker(id) {
    const w = WORKERS.find(x => x.id === id);
    if (!w) return;
    const count = state.workers[id] || 0;
    const cost = Math.floor(w.baseCost * Math.pow(w.costMult, count));

    if (!canAfford(w.currency, cost)) return;

    if (w.currency === 'coins') state.coins = Math.max(0, state.coins - cost);
    else state.gems -= cost;
    
    state.workers[id] = count + 1;
    log(`👷 Contratado: ${w.name} #${count + 1}`);
    UI.render(true);
  }

  function buyComponent(id) {
    const c = [...COMPONENTS_COINS, ...COMPONENTS_GEMS].find(x => x.id === id);
    if (!c) return;
    const count = state.components[id] || 0;
    const cost = Math.floor(c.cost * Math.pow(c.costMult, count));

    if (!canAfford(c.currency, cost)) return;

    if (c.currency === 'coins') state.coins = Math.max(0, state.coins - cost);
    else state.gems -= cost;
    
    state.components[id] = count + 1;
    log(`🔧 Comprado: ${c.name} x${count + 1}`);
    UI.render(true);
  }

  function buyUpgrade(id) {
    if (state.upgrades[id]) return;
    const u = UPGRADES.find(x => x.id === id);
    if (!u || !u.req()) return;

    if (!canAfford(u.currency, u.cost)) return;

    if (u.currency === 'coins') state.coins = Math.max(0, state.coins - u.cost);
    else state.gems -= u.cost;
    
    state.upgrades[id] = true;
    u.effect();
    log(`⬆️ Mejora desbloqueada: ${u.name}`);
    UI.render(true);
  }

  function canAfford(currency, cost) {
    const balance = (currency === 'coins') ? (state.coins + 0.01) : state.gems;
    return Math.floor(balance) >= cost;
  }

  // ── Level system ───────────────────────────────────────────────────────────
  function currentLevel() {
    return levels.find(l => (l.meta?.id || l.id) === state.currentLevelId);
  }

  function checkLevelComplete() {
    const lvl = currentLevel();
    if (!lvl) return;
    const required = lvl.gameplay?.linesRequired;
    const levelLines = state.sessionLines;
    if (levelLines >= required && !state.completedLevels.includes(state.currentLevelId)) {
      state.completedLevels.push(state.currentLevelId);
      // Unlock next level
      const sorted = [...levels].sort((a, b) => (a.meta?.order || a.order || 0) - (b.meta?.order || b.order || 0));
      const idx = sorted.findIndex(l => (l.meta?.id || l.id) === state.currentLevelId);
      if (idx >= 0 && idx + 1 < sorted.length) {
        const nextLvl = sorted[idx + 1];
        const nextId = nextLvl.meta?.id || nextLvl.id;
        const nextName = nextLvl.meta?.name || nextLvl.name;
        const nextIcon = nextLvl.meta?.icon || '📚';
        state.currentLevelId = nextId;
        state.sessionLines = 0; // reset for new level
        // Gem reward
        state.gems += 5 + state.completedLevels.length * 2;
        UI.showLevelBanner(nextIcon, nextName);
        log(`🎉 ¡Nivel completado! Nuevo lenguaje: ${nextName}`);
      }
    }
  }

  function switchLevel(id) {
    if (state.completedLevels.includes(id) || id === state.currentLevelId) {
      // Can revisit old levels but they're "done"
    }
    const lvl = levels.find(l => (l.meta?.id || l.id) === id);
    if (!lvl) return;
    const unlockLines = lvl.meta?.unlockLines || lvl.unlockLines || 0;
    if (state.totalLines < unlockLines) {
      log(`🔒 Necesitas ${fmt(unlockLines)} líneas totales`);
      return;
    }
    state.currentLevelId = id;
    UI.render(true);
  }

  // ── Prestige ───────────────────────────────────────────────────────────────
  function canPrestige() {
    return state.completedLevels.length >= 3;
  }

  function prestige() {
    if (!canPrestige()) return;
    UI.showModal(
      '⚡ Prestige',
      `¿Seguro? Perderás todo excepto:\n• Gemas (${state.gems} + ${Math.floor(state.completedLevels.length * 5)} bonus)\n• Logros desbloqueados\n\nEl juego se reinicia con multiplicadores permanentes.`,
      [
        { label: 'Cancelar', fn: UI.closeModal },
        { label: '⚡ Prestige!', fn: doPrestige, cls: 'confirm' }
      ]
    );
  }

  function doPrestige() {
    const gemBonus = Math.floor(state.completedLevels.length * 5);
    const keepGems = state.gems + gemBonus;
    const keepAch = { ...state.achievements };
    const keepPrestige = state.prestigeCount + 1;
    state = {
      coins: 0, gems: keepGems, totalLines: 0, sessionLines: 0, totalClicks: 0,
      linesPerClick: 1 + keepPrestige, linesPerSec: 0,
      currentLevelId: 'html', completedLevels: [],
      prestigeCount: keepPrestige, playTime: state.playTime,
      workers: {}, components: {}, upgrades: {}, achievements: keepAch,
      lastSave: Date.now()
    };
    workerMultiplier = 1;
    globalMultiplier = 1 + (keepPrestige * 0.5);
    log(`⚡ Prestige #${keepPrestige}! Multiplicador global: ×${globalMultiplier.toFixed(1)}`);
    UI.closeModal();
    save();
    UI.render(true);
  }

  function requestClose() {
    UI.showModal(
      'Salir del Juego',
      '¿Quieres guardar tu progreso antes de salir?',
      [
        { label: 'Guardar ahora', fn: () => { save(); UI.closeModal(); } },
        { label: 'Guardar y Salir', fn: async () => { await save(); window.electronAPI.close(); }, cls: 'confirm' },
        { label: 'Salir sin guardar', fn: () => { window.electronAPI.close(); }, cls: 'danger' },
        { label: 'Cancelar', fn: UI.closeModal }
      ]
    );
  }

  // ── Achievements ───────────────────────────────────────────────────────────
  function checkAchievements() {
    for (const ach of ACHIEVEMENTS) {
      if (!state.achievements[ach.id] && ach.check()) {
        state.achievements[ach.id] = true;
        log(`🏆 Logro desbloqueado: ${ach.name}`);
        UI.showAchievementToast(ach);
      }
    }
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function save() {
    state.lastSave = Date.now();
    await window.electronAPI.saveGame(state);
    log('💾 Guardado');
  }

  async function resetConfirm() {
    UI.showModal(
      '🗑️ Borrar Partida',
      '¿Seguro que quieres borrar todo? Esta acción es irreversible.',
      [
        { label: 'Cancelar', fn: UI.closeModal },
        { label: '🗑️ Borrar', fn: doReset, cls: 'confirm' }
      ]
    );
  }

  async function doReset() {
    await window.electronAPI.deleteSave();
    location.reload();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function totalWorkers() {
    return Object.values(state.workers).reduce((a, b) => a + b, 0);
  }

  function fmt(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return Math.floor(n + 0.01).toString();
  }

  const logs = [];
  function log(msg) {
    logs.unshift(msg);
    if (logs.length > 50) logs.pop();
    UI.setTicker(msg);
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    init, click, save, resetConfirm, prestige, requestClose,
    buyWorker, buyComponent, buyUpgrade, switchLevel, canAfford,
    getState: () => state,
    getLevels: () => levels,
    getWorkers: () => WORKERS,
    getComponentsCoins: () => COMPONENTS_COINS,
    getComponentsGems: () => COMPONENTS_GEMS,
    getUpgrades: () => UPGRADES,
    getAchievements: () => ACHIEVEMENTS,
    calcLPS, calcClickPower, currentLevel, canPrestige,
    totalWorkers, fmt,
    workerCost: (id) => {
      const w = WORKERS.find(x => x.id === id);
      if (!w) return 0;
      return Math.floor(w.baseCost * Math.pow(w.costMult, state.workers[id] || 0));
    },
    componentCost: (id) => {
      const c = [...COMPONENTS_COINS, ...COMPONENTS_GEMS].find(x => x.id === id);
      if (!c) return 0;
      return Math.floor(c.cost * Math.pow(c.costMult, state.components[id] || 0));
    },
    levelProgress: () => {
      const lvl = currentLevel();
      if (!lvl) return 0;
      return Math.min(1, (state.sessionLines) / (lvl.gameplay?.linesRequired || 1));
    },
    getLogs: () => logs,
  };
})();
