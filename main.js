const {
  app,
  Menu,
  Tray,
  Notification,
  BrowserWindow,
  ipcMain,
} = require("electron");

const moment = require("moment");
const path = require("path");
const { setData, getData } = require("./settings");

let notification = false;
let appIcon = null;
let icon = path.join(__dirname, "/img/break-small.png");
let contextMenu = Menu.buildFromTemplate([
  { label: "Starting", type: "normal" },
]);
let interval = false;
let nextNotification = getNextNotificationDate();

/* 
  Default values to set when init app launch
*/

const DEFAULT_TIME = 1;
const DEFAULT_BREAK = 5;
const DEFAULT_TIPS = true;
const DEFAULT_SESSION = false;

app.on("ready", () => {
  appIcon = new Tray(icon);
  rebuildMenu();
  startInterval();
  //Load default data

  if (!getData("time")) {
    defaultSettings();
  }
  startPowerMonitoring();
});

app.on("window-all-closed", () => {
  // do nothing, so app wont get closed
});

// Set to default values
function defaultSettings() {
  setData("time", DEFAULT_TIME);
  setData("showTips", DEFAULT_TIPS);
  setData("breakLength", DEFAULT_BREAK);
  setData("showSession", DEFAULT_SESSION);
}
/* 
  Monitor if the system is in lock mode
  clear the interval when in lock mode
  When its resumed restart the timer000
 */

function startPowerMonitoring() {
  const electron = require("electron");
  electron.powerMonitor.on("suspend", onSuspendOrLock);
  electron.powerMonitor.on("lock-screen", onSuspendOrLock);
  electron.powerMonitor.on("resume", onResumeOrUnlock);
  electron.powerMonitor.on("unlock-screen", onResumeOrUnlock);
}

function onSuspendOrLock() {
  clearInterval(interval);
}

function onResumeOrUnlock() {
  nextNotification = getNextNotificationDate();
  startInterval();
}

/* 
  Build and Send the notify the user
*/

function sendNotification() {
  notification = new Notification({
    title: "Break Time",
    body: getIdea(),
    closeButtonText: "Done",
    timeoutType: "never",
    actions: {
      type: "button",
      text: "Snooze",
    },
  });

  notification.on("click", () => {
    nextNotification = getNextNotificationDate();
    startInterval();
  });
  notification.on("close", () => {
    nextNotification = getNextNotificationDate();
    startInterval();
  });
  notification.on("action", (data) => {
    snooze();
  });

  /*
    If the user has selected break session window
    Else show the notification, is default
 */
  if (getData("showSession")) {
    openBreakWindow();
  } else {
    notification.show();
  }

  /*
    Wait till the break end and start the timer again
   */
  const restartCount = +getBreakTime() * 60000;
  setTimeout(() => {
    nextNotification = getNextNotificationDate();
    startInterval();
  }, restartCount);
}

/*
  Core timer trigger the notifcation
 */

function startInterval() {
  clearInterval(interval);
  interval = setInterval(() => {
    if (nextNotification.isBefore(moment().subtract(5, "minutes"))) {
      // computer when to sleep for more then 5 minutes.
      nextNotification = getNextNotificationDate();
    } else if (nextNotification.isBefore(moment())) {
      clearInterval(interval);
      sendNotification();
    }
    //rebuildMenu();
  }, 1000);
}

/* 
  Get the random tips for the notification alert
*/

function getIdea() {
  let microbreakIdeasData;
  if (getData("showTips")) {
    microbreakIdeasData = require("./utils/defaultMicrobreakIdeas");
    const rand = Math.floor(Math.random() * microbreakIdeasData.length);
    return microbreakIdeasData[rand];
  } else {
    return "Time to get up and Stretch !";
  }
}

/*
    Build the menu for notification tray dropdown
 */

function rebuildMenu() {
  let timelabel = "";
  if (nextNotification.isBefore(moment())) {
    timelabel = "Take a Break!";
  } else {
    timelabel = "Next break " + moment().to(nextNotification);
  }
  contextMenu = Menu.buildFromTemplate([
    {
      label: timelabel,
      type: "normal",
    },
    {
      type: "separator",
    },
    {
      label: "Reset timer",
      type: "normal",
      click: () => {
        nextNotification = getNextNotificationDate();
        startInterval();
        rebuildMenu();
      },
    },
    {
      label: "Snooze 5 minutes",
      type: "normal",
      click: () => {
        snooze();
      },
    },
    {
      label: "Settings",
      type: "normal",
      click: () => {
        //html file
        openPreference();
      },
    },
    {
      type: "separator",
    },
    {
      label: "Quit",
      role: "quit",
    },
  ]);
  appIcon.setContextMenu(contextMenu);
}

/* 
  Allows the user to snooze for 5 minutes
 */

function snooze() {
  if (notification) {
    notification.close();
  }
  nextNotification = moment().add(5, "minutes");
  startInterval();
  rebuildMenu();

  //close loading window
  breakWin.close();
  preferencesWin = null;
}

/* 
  Get the Actaul Timer and break time
 */

function getNextNotificationDate() {
  return moment().add(getData("time"), "minutes");
  //return moment().add(0, "minutes");
}

function getBreakTime() {
  return getData("breakLength");
}

/* 
  Windows to open when user click on menu or when break type id full window
 */

let preferencesWin = null;
function openPreference() {
  if (preferencesWin) {
    preferencesWin.show();
    return;
  }
  preferencesWin = new BrowserWindow({
    autoHideMenuBar: true,
    width: 400,
    height: 300,
    resizable: false,
    title: "",
    minimizable: false,
    fullscreenable: false,
    backgroundColor: "#EDEDED",
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });

  preferencesWin.loadURL("file://" + __dirname + "/preferences.html");
  preferencesWin.on("closed", () => {
    preferencesWin = null;
  });
}

let breakWin = null;

function openBreakWindow() {
  if (breakWin) {
    breakWin.show();
    return;
  }
  breakWin = new BrowserWindow({
    autoHideMenuBar: true,
    title: "",
    minimizable: false,
    fullscreenable: true,
    fullscreen: true,
    backgroundColor: "#EDEDED",
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
  });

  breakWin.loadURL("file://" + __dirname + "/minBreak.html");
  breakWin.on("closed", () => {
    breakWin = null;
  });
}

/* 
  IPC communication from other window
  Receiver the notification from the preference menu
 */

ipcMain.on("save-time", (event, arg) => {
  nextNotification = moment().add(arg, "minutes");
  setData("time", +arg);
  startInterval();
  rebuildMenu();
});

ipcMain.on("save-tips", (event, arg) => {
  setData("showTips", arg);
});

ipcMain.on("save-length", (event, arg) => {
  setData("breakLength", +arg);
});

ipcMain.on("show-session", (event, arg) => {
  setData("showSession", +arg);
});

ipcMain.on("reset", (event, arg) => {
  defaultSettings();
  preferencesWin.close();
  preferencesWin = null;
});

ipcMain.on("break-done", (event, arg) => {
  breakWin.close();
  breakWin = null;
});
