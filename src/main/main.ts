import { BrowserWindow, app, globalShortcut, ipcMain } from "electron";
import path from "path";
import * as channels from "../common/channels";
import { browserViews, onCreateView, onLogError, onLogInfo, onSetViewRectangle, onSetViewUrl, onShowContextMenu } from "../common/listeners";
import { logger } from "../common/logger";
import * as prefixes from "../common/logPrefixes";

export const editMargin: number = 20;
export let mainWindow: BrowserWindow | null;
export let editModeEnabled: boolean = false;
const viteURL: string = "http://localhost:5173";
const editShortcut: string = "Control+e";
let focused: boolean = false;

const fileName: string = "main.ts";

function main(): void {
  const logOptions = { ts: fileName, fn: main.name };
  ipcMain.on(channels.showContextMenu, async (event) => {
    logger.info(logOptions, `${prefixes.eventReceived}: ${channels.showContextMenu}`);
    const result = await onShowContextMenu();
    event.reply(channels.showContextMenuResponse, result);
  });
  ipcMain.on(channels.createView, async (event, id, options) => {
    logger.info(logOptions, `${prefixes.eventReceived}: ${channels.createView}`);
    const result = await onCreateView(event, id, mainWindow as BrowserWindow, options);
    event.reply(channels.createViewResponse, result);
  });
  ipcMain.on(channels.setViewRectangle, (event, id, rectangle) => {
    logger.info(logOptions, `${prefixes.eventReceived}: ${channels.setViewRectangle}`);
    onSetViewRectangle(event, id, rectangle);
  });
  ipcMain.on(channels.setViewUrl, (event, id, url) => {
    logger.info(logOptions, `${prefixes.eventReceived}: ${channels.setViewUrl}`);
    onSetViewUrl(event, id, url);
  });
  ipcMain.on(channels.logInfo, (event, options, message) => {
    //logger.info(logOptions, `${prefixes.eventReceived}: ${channels.logInfo}`);
    onLogInfo(event, options, message);
  });
  ipcMain.on(channels.logError, (event, options, message) => {
    //logger.info(logOptions, `${prefixes.eventReceived}: ${channels.logError}`);
    onLogError(event, options, message);
  });

  onAppReady(createMainWindow);

  app.on("ready", () => {
    globalShortcut.register(editShortcut, onEdit);
  });
  app.on("will-quit", () => {
    globalShortcut.unregister(editShortcut);
    globalShortcut.unregisterAll();
  });
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
  app.on("activate", () => {
    if (mainWindow == null) {
      createMainWindow();
    }
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(app.getAppPath(), "out", "preload", "preload.js"),
      zoomFactor: 1.0,
    },
    width: 1400,
    height: 700
  });
  mainWindow.setMenu(null);
  mainWindow.on("focus", () => {
    focused = true;
    globalShortcut.register("CommandOrControl+0", () => { return; });
    globalShortcut.register("CommandOrControl+plus", () => { return; });
    globalShortcut.register("CommandOrControl+=", () => { return; });
    globalShortcut.register("CommandOrControl+-", () => { return; });
    globalShortcut.register("CommandOrControl+_", () => { return; });
    globalShortcut.register("Control+r", () => { return; });
  });
  mainWindow.on("blur", () => {
    focused = false;
    globalShortcut.unregister("CommandOrControl+0");
    globalShortcut.unregister("CommandOrControl+plus");
    globalShortcut.unregister("CommandOrControl+=");
    globalShortcut.unregister("CommandOrControl+-");
    globalShortcut.unregister("CommandOrControl+_");
    globalShortcut.unregister("Control+r");
  });
  mainWindow.loadURL(viteURL);
  mainWindow.webContents.openDevTools();
  mainWindow.on("closed", () => mainWindow = null);
}

async function onAppReady(
  windowFunction: () => void
): Promise<void> {
  try {
    await app.whenReady();
    windowFunction();
  }
  catch (err) {
    console.error(err);
  }
}

function onEdit() {
  const logOptions = { ts: fileName, fn: onEdit.name };
  if (!focused) {
    return;
  }
  if (editModeEnabled) {
    logger.info(logOptions, `${prefixes.toggling}: Edit Mode on`);
    mainWindow?.webContents.send(channels.toggleEditMode, false);
    editModeEnabled = false;
    for (const id in browserViews) {
      browserViews[id].unshrink();
    }
  }
  else {
    logger.info(logOptions, `${prefixes.toggling}: Edit Mode off`);
    mainWindow?.webContents.send(channels.toggleEditMode, true);
    editModeEnabled = true;
    for (const id in browserViews) {
      browserViews[id].shrink();
    }
  }
}

main();
