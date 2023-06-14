// ./public/electron.js
const path = require('path');

const { app, BrowserWindow } = require('electron');
const isDev = require('electron-is-dev');
// const isDev = false

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true, contextIsolation: false
    },
  });

  // and load the index.html of the app.
  // win.loadFile("index.html");
  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );
  // Open the DevTools.
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  globalShortcut.register('Alt+CommandOrControl+I', () => {
    mainWindow.webContents.send('key-shortcut', 1);
  })
  globalShortcut.register('Alt+CommandOrControl+O', () => {
    mainWindow.webContents.send('key-shortcut-ocr', 2);
  })
  globalShortcut.register('Esc', () => {
    mainWindow.webContents.send('close-crop');
  })
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bars to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
