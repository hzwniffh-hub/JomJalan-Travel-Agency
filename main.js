const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        title: "JomJalan - Travel Agency",
        backgroundColor: "#F8FAFC",
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

ipcMain.handle("get-packages", async () => {
    try {
        const filePath = path.join(__dirname, "data", "packages.json");
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
        console.error("Unable to load packages:", error);
        return [];
    }
});

app.whenReady().then(() => {
    createWindow();
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});