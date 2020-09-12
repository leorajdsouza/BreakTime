const moment = require("moment");
const { getData } = require("./settings");
const { ipcRenderer } = require("electron");

const time = document.getElementById("time");

var countDownTime = moment().add(getData("breakLength"), "minutes"); // new Date(now + 60 * 1000);
let diff = countDownTime.diff(moment());
time.innerHTML = moment.utc(diff).format("mm:ss");

let interval = setInterval(() => {
  let diff = countDownTime.diff(moment());
  time.innerHTML = moment.utc(diff).format("mm:ss");
  if (diff <= 0) {
    clearInterval(interval);
    ipcRenderer.send("break-done");
  }
}, 1000);
