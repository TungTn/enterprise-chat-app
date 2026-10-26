const { app, BrowserWindow, Tray, Menu, Notification, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Enterprise Chat',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#020617',
    show: false,
  });

  // Load web app (local dev port 3000 or production build)
  const appUrl = process.env.CHAT_APP_URL || 'http://localhost:3000';
  mainWindow.loadURL(appUrl);

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
  tray = new Tray(path.join(__dirname, 'icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mở Enterprise Chat',
      click: () => {
        mainWindow.show();
      },
    },
    { type: 'separator' },
    {
      label: 'Trạng thái: Trực tuyến',
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

  tray.setToolTip('Enterprise Chat - Internal Company Platform');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  createWindow();
  // createTray();

  // IPC listener for native OS notifications
  ipcMain.on('show-notification', (event, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});
