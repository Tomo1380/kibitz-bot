import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  shell,
  Notification,
} from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import screenshot from 'screenshot-desktop';
import activeWin from 'active-win';
import axios from 'axios';

// ----------- Config -----------
const DEFAULT_AI_SERVICE_URL =
  process.env.KIBITZ_AI_SERVICE_URL ?? 'https://kibitz-ai.railway.app';
const CAPTURE_INTERVAL_MS = 3000;
const SCREENSHOT_QUALITY = 80;

// ----------- State -----------
interface AppState {
  serverUrl: string;
  isCapturing: boolean;
  currentGame: string | null;
  recentReactions: ReactionEntry[];
  connectionStatus: 'connected' | 'disconnected' | 'error';
}

interface ReactionEntry {
  id: string;
  text: string;
  personaName: string;
  timestamp: Date;
}

const state: AppState = {
  serverUrl: DEFAULT_AI_SERVICE_URL,
  isCapturing: false,
  currentGame: null,
  recentReactions: [],
  connectionStatus: 'disconnected',
};

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let captureTimer: ReturnType<typeof setInterval> | null = null;

// ----------- Game Detection -----------
const KNOWN_GAMES: Array<{ processName: string; displayName: string; genre: string }> = [
  { processName: 'VALORANT-Win64-Shipping', displayName: 'VALORANT', genre: 'fps' },
  { processName: 'r5apex', displayName: 'Apex Legends', genre: 'fps' },
  { processName: 'FortniteClient-Win64-Shipping', displayName: 'Fortnite', genre: 'survival' },
  { processName: 'League of Legends', displayName: 'League of Legends', genre: 'moba' },
  { processName: 'RainbowSix', displayName: 'Rainbow Six Siege', genre: 'fps' },
  { processName: 'Overwatch', displayName: 'Overwatch 2', genre: 'fps' },
  { processName: 'javaw', displayName: 'Minecraft Java', genre: 'survival' },
  { processName: 'Minecraft.Windows', displayName: 'Minecraft Bedrock', genre: 'survival' },
  { processName: 'GenshinImpact', displayName: 'Genshin Impact', genre: 'rpg' },
  { processName: 'ZenlessZoneZero', displayName: 'Zenless Zone Zero', genre: 'action' },
  { processName: 'HonkaiStarRail', displayName: 'Honkai: Star Rail', genre: 'rpg' },
  { processName: 'ffxiv_dx11', displayName: 'Final Fantasy XIV', genre: 'rpg' },
  { processName: 'ELDENRING', displayName: 'Elden Ring', genre: 'action' },
  { processName: 'sekiro', displayName: 'SEKIRO', genre: 'action' },
  { processName: 'Cyberpunk2077', displayName: 'Cyberpunk 2077', genre: 'rpg' },
  { processName: 'Palworld-Win64-Shipping', displayName: 'Palworld', genre: 'survival' },
  { processName: 'bg3', displayName: "Baldur's Gate 3", genre: 'rpg' },
  { processName: 'MonsterHunterWorld', displayName: 'Monster Hunter World', genre: 'action' },
  { processName: 'MonsterHunterRise', displayName: 'Monster Hunter Rise', genre: 'action' },
  { processName: 'GTA5', displayName: 'GTA V', genre: 'action' },
];

async function detectCurrentGame(): Promise<{ name: string; genre: string } | null> {
  try {
    const activeWindow = await activeWin();
    if (!activeWindow) return null;

    const ownerName = activeWindow.owner.name.toLowerCase();
    const title = activeWindow.title.toLowerCase();

    // Check against known games
    for (const game of KNOWN_GAMES) {
      const processLower = game.processName.toLowerCase();
      if (ownerName.includes(processLower) || title.includes(game.displayName.toLowerCase())) {
        return { name: game.displayName, genre: game.genre };
      }
    }

    // Heuristic: if exe is in common game directories, treat as "unknown game"
    const processPath = activeWindow.owner.path?.toLowerCase() ?? '';
    if (
      processPath.includes('steamapps') ||
      processPath.includes('epic games') ||
      processPath.includes('gog galaxy') ||
      processPath.includes('battle.net')
    ) {
      return { name: activeWindow.owner.name, genre: 'other' };
    }

    return null;
  } catch {
    return null;
  }
}

// ----------- Screenshot & React -----------
async function captureAndReact(): Promise<void> {
  try {
    const game = await detectCurrentGame();

    const previousGame = state.currentGame;
    state.currentGame = game ? game.name : null;

    if (state.currentGame !== previousGame) {
      broadcastState();
    }

    if (!game) return; // no game detected — skip sending

    // Capture screenshot
    const rawBuffer: Buffer = await screenshot({ format: 'jpg' });
    const base64Image = rawBuffer.toString('base64');

    // Send to AI service /react endpoint
    const response = await axios.post<{ reaction: string; persona_name: string }>(
      `${state.serverUrl}/react`,
      {
        image: base64Image,
        eventType: 'periodic',
        gameName: game.name,
        genre: game.genre,
      },
      { timeout: 30000 }
    );

    state.connectionStatus = 'connected';

    const { reaction, persona_name } = response.data;
    if (!reaction) return;

    const entry: ReactionEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text: reaction,
      personaName: persona_name,
      timestamp: new Date(),
    };

    // Keep only last 20 reactions
    state.recentReactions = [entry, ...state.recentReactions].slice(0, 20);

    broadcastState();

    // Show OS notification for the reaction
    if (Notification.isSupported()) {
      new Notification({
        title: `Kibitz (${persona_name})`,
        body: reaction,
        silent: true,
      }).show();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (axios.isAxiosError(err) && err.code !== 'ECONNABORTED') {
      state.connectionStatus = 'error';
      broadcastState();
    }
    console.error('[Kibitz Capture] captureAndReact error:', msg);
  }
}

// ----------- Capture Loop -----------
function startCapture(): void {
  if (captureTimer) return;
  state.isCapturing = true;
  captureTimer = setInterval(() => {
    captureAndReact().catch(console.error);
  }, CAPTURE_INTERVAL_MS);
  broadcastState();
}

function stopCapture(): void {
  if (captureTimer) {
    clearInterval(captureTimer);
    captureTimer = null;
  }
  state.isCapturing = false;
  broadcastState();
}

// ----------- IPC -----------
function broadcastState(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('state-update', {
      serverUrl: state.serverUrl,
      isCapturing: state.isCapturing,
      currentGame: state.currentGame,
      connectionStatus: state.connectionStatus,
      recentReactions: state.recentReactions.map((r) => ({
        ...r,
        timestamp: r.timestamp.toISOString(),
      })),
    });
  }
  updateTrayMenu();
}

ipcMain.handle('get-state', () => ({
  serverUrl: state.serverUrl,
  isCapturing: state.isCapturing,
  currentGame: state.currentGame,
  connectionStatus: state.connectionStatus,
  recentReactions: state.recentReactions.map((r) => ({
    ...r,
    timestamp: r.timestamp.toISOString(),
  })),
}));

ipcMain.handle('set-server-url', (_event, url: string) => {
  state.serverUrl = url.trim().replace(/\/$/, '');
  broadcastState();
  return { ok: true };
});

ipcMain.handle('start-capture', () => {
  startCapture();
  return { ok: true };
});

ipcMain.handle('stop-capture', () => {
  stopCapture();
  return { ok: true };
});

ipcMain.handle('test-connection', async () => {
  try {
    await axios.get(`${state.serverUrl}/health`, { timeout: 5000 });
    state.connectionStatus = 'connected';
    broadcastState();
    return { ok: true };
  } catch {
    state.connectionStatus = 'error';
    broadcastState();
    return { ok: false };
  }
});

// ----------- Tray -----------
function getTrayIconPath(): string {
  // Use a bundled PNG icon; fall back to a nativeImage from data URI for dev
  const candidates = [
    path.join(__dirname, '../../assets/tray-icon.png'),
    path.join(process.resourcesPath ?? '', 'assets/tray-icon.png'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return ''; // will use empty nativeImage
}

function createTray(): void {
  const iconPath = getTrayIconPath();
  const icon = iconPath ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('Kibitz — AI Game Companion');
  updateTrayMenu();

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

function updateTrayMenu(): void {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    {
      label: state.isCapturing
        ? `Capturing — ${state.currentGame ?? 'no game detected'}`
        : 'Not capturing',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: state.isCapturing ? 'Stop Capture' : 'Start Capture',
      click: () => (state.isCapturing ? stopCapture() : startCapture()),
    },
    {
      label: 'Open Kibitz',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(menu);
}

// ----------- Window -----------
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 640,
    minWidth: 380,
    minHeight: 480,
    title: 'Kibitz',
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: getTrayIconPath() || undefined,
    show: true,
    frame: true,
    backgroundColor: '#1a1a2e',
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Hide to tray instead of closing
  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ----------- App Lifecycle -----------
app.whenReady().then(() => {
  createWindow();
  createTray();

  // Auto-start capturing on launch
  startCapture();
});

app.on('window-all-closed', () => {
  // Keep running in tray — do not quit
});

app.on('before-quit', () => {
  stopCapture();
  // Allow window to actually close now
  if (mainWindow) {
    mainWindow.removeAllListeners('close');
    mainWindow.close();
  }
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
  }
});
