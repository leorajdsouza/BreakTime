const Store = require("electron-store");
const store = new Store();

const setData = (key, data) => {
  store.set(key, data);
  console.log(store);
};

const getData = (key) => {
  return store.get(key);
};

module.exports = { setData, getData };
