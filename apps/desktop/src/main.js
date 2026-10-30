const { app, BrowserWindow, Tray, Menu, Notification, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;
let isQuitting = false;

// Default LAN IP of development host machine
const DEFAULT_SERVER_URL = 'http://10.2.8.231:3000';

function getConfigFilePath() {
  return path.join(app.getPath('userData'), 'server-config.json');
}

function getServerUrl() {
  if (process.env.CHAT_APP_URL) {
    return process.env.CHAT_APP_URL;
  }
  try {
    const configPath = getConfigFilePath();
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (data && data.serverUrl) {
        return data.serverUrl;
      }
    }
  } catch (e) {
    console.warn('Read config error:', e);
  }
  return DEFAULT_SERVER_URL;
}

function saveServerUrl(url) {
  try {
    const configPath = getConfigFilePath();
    fs.writeFileSync(configPath, JSON.stringify({ serverUrl: url.trim() }, null, 2), 'utf8');
  } catch (e) {
    console.error('Save config error:', e);
  }
}

function createWindow() {
  const iconPath = path.join(__dirname, 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    title: 'Enterprise Chat',
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#020617',
    show: false,
  });

  // Enable Ctrl+R / F5 reload and F12 / Ctrl+Shift+I DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
    if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
      mainWindow.webContents.reloadIgnoringCache();
      event.preventDefault();
    }
  });

  // Automatically grant camera and microphone permissions for WebRTC calls
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ['media', 'notifications', 'camera', 'microphone', 'display-capture'];
    callback(allowed.includes(permission));
  });

  const appUrl = getServerUrl();
  console.log('Loading Enterprise Chat from:', appUrl);
  mainWindow.loadURL(appUrl);

  // Fallback to connection settings screen if server cannot be reached
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.warn(`Connection failed to ${validatedURL}: [${errorCode}] ${errorDescription}`);
    const connectPath = path.join(__dirname, 'connect.html');
    if (fs.existsSync(connectPath)) {
      mainWindow.loadFile(connectPath);
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Minimize to tray instead of closing on close button
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, 'icon.png');
  if (!fs.existsSync(iconPath)) return;

  try {
    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Mở Enterprise Chat',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        },
      },
      {
        label: '⚙️ Cài đặt địa chỉ máy chủ...',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.loadFile(path.join(__dirname, 'connect.html'));
            mainWindow.focus();
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Trạng thái: Trực tuyến (Online)',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Thoát ứng dụng',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);

    tray.setToolTip('Enterprise Chat - Nền tảng Giao tiếp Doanh nghiệp');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    console.warn('Tray creation skipped:', err.message);
  }
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    createTray();


  // IPC listener to retrieve current configured URL
  ipcMain.handle('get-server-url', () => {
    return getServerUrl();
  });

  // IPC listener when user submits new server URL from connect.html
  ipcMain.on('set-server-url', (event, newUrl) => {
    if (newUrl && mainWindow) {
      saveServerUrl(newUrl);
      mainWindow.loadURL(newUrl);
    }
  });

  // IPC listener for native OS notifications
  ipcMain.on('show-notification', (event, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({
        title: title || 'Enterprise Chat',
        body: body || 'Bạn có tin nhắn mới',
        icon: path.join(__dirname, 'icon.png'),
      }).show();
    }
  });

  // IPC listener for taskbar unread badge
  ipcMain.on('set-badge', (event, count) => {
    if (app.setBadgeCount) {
      app.setBadgeCount(count || 0);
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

  app.on('before-quit', () => {
    isQuitting = true;
  });
}

