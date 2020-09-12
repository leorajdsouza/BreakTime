const { ipcRenderer } = require("electron");
const { getData } = require("./settings");

const saveTime = document.getElementById("time");
const saveTips = document.getElementById("showTips");
const showSession = document.getElementById("showSession");
const breakLength = document.getElementById("breakLength");
const resetBtn = document.getElementById("reset-btn");

saveTime.value = getData("time");
saveTips.checked = getData("showTips");
showSession.checked = getData("showSession");
breakLength.value = getData("breakLength");

saveTime.addEventListener("change", () => {
  ipcRenderer.send("save-time", saveTime.value);
});

saveTips.addEventListener("click", () => {
  ipcRenderer.send("save-tips", saveTips.checked);
});
showSession.addEventListener("click", () => {
  ipcRenderer.send("show-session", showSession.checked);
});

breakLength.addEventListener("change", () => {
  ipcRenderer.send("save-length", breakLength.value);
});

resetBtn.addEventListener("click", () => {
  ipcRenderer.send("reset");
});
