const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.bounds;

  mainWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    resizable: true,
    movable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: false,
    backgroundColor: '#0d0d0f',
    show: false,
    fullscreen: true,
    skipTaskbar: false,
    alwaysOnTop: false,
    icon: path.join(__dirname, '../assets/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
    mainWindow.setKiosk(true);
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ── IPC: Window controls ──────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow.close());

// ── IPC: Save / Load game ─────────────────────────────────────────────────────
const savePath = path.join(app.getPath('userData'), 'savegame.json');

ipcMain.handle('save-game', async (_, data) => {
  fs.writeFileSync(savePath, JSON.stringify(data, null, 2));
  return true;
});

ipcMain.handle('load-game', async () => {
  if (!fs.existsSync(savePath)) return null;
  try { return JSON.parse(fs.readFileSync(savePath, 'utf8')); }
  catch { return null; }
});

ipcMain.handle('delete-save', async () => {
  if (fs.existsSync(savePath)) fs.unlinkSync(savePath);
  return true;
});

// ── IPC: Load levels ──────────────────────────────────────────────────────────
const levelsDir = path.join(__dirname, '../levels');

ipcMain.handle('load-levels', async () => {
  if (!fs.existsSync(levelsDir)) return [];
  const files = fs.readdirSync(levelsDir).filter(f => f.endsWith('.levelSGS'));
  const levels = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(levelsDir, file), 'utf8');
      const data = parseLevelSGS(raw);
      levels.push(data);
    } catch (e) {
      console.error('Failed to parse level:', file, e);
    }
  }
  return levels.sort((a, b) => a.order - b.order);
});

// ── .levelSGS parser ──────────────────────────────────────────────────────────
function parseLevelSGS(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const obj = {};
  let currentSection = null;
  let sectionData = {};

  for (const line of lines) {
    if (line.startsWith('[') && line.endsWith(']')) {
      if (currentSection) obj[currentSection] = sectionData;
      currentSection = line.slice(1, -1).toLowerCase();
      sectionData = {};
    } else if (line.includes('=')) {
      const [key, ...rest] = line.split('=');
      const val = rest.join('=').trim();
      const parsedVal = isNaN(val) ? (val === 'true' ? true : val === 'false' ? false : val) : Number(val);
      if (currentSection) sectionData[key.trim()] = parsedVal;
      else obj[key.trim()] = parsedVal;
    }
  }
  if (currentSection) obj[currentSection] = sectionData;
  return obj;
}
