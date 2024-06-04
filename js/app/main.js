import { Popup } from "./popup.js";
import { Settings } from "./settings.js";
import { Control } from "./control.js";
import { Updater } from "./updater.js";

window.mainJS = true;

const URL = "http://192.168.2.194"
let showSplash = true;
let level = 0;
let docHeight = Math.max(
  document.documentElement.clientHeight,
  window.innerHeight || 0
);

const settingsPlug = {
  wifi: {
    hotspot_name: "SRL",
    hotspot_password: "realityissubjective",
  },
  mqtt: {
    server: "",
    port: "1883",
    username: "",
    password: "",
    ha_discovery: true,
    topic: "",
    on_cmd: "",
    off_cmd: "",
  },
  lamp_name: "SL-001",
  power_on_state: 2,
  on_off_button: false,
  mqtt_use: false,
  serial_id: 1,
  sw_version: 70,
};

const updater = new Updater(`${URL}/update`,);
const popup = new Popup(document.querySelector(".popup-container"), updater);
const generalSettings = new Settings(
  document.querySelector(".card.set"),
  `${URL}/rest/settings`,
  {
    nested: {
      wifi: document.querySelector(".card.wifi"),
      mqtt: document.querySelector(".card.mqtt"),
    },
    default: settingsPlug,
  }
);
const control = new Control(`${URL?URL:location.hostname}/ws`, (s, l) => {
  // console.log(`${s},${l}`);
  importState(s, l);
});

//Selectors
const root = document.documentElement;
const onoff = document.querySelectorAll(".onoff .but");
const on = document.querySelector(".b-on");
const off = document.querySelector(".b-off");
const settings = document.querySelector(".settings");
const butSet = document.querySelector(".but.set");
// const cardSet = document.querySelector(".card.set");
const setButs = document.querySelectorAll(".set-buttons > .but");
const setCards = document.querySelectorAll(".cards > .card");
const moreButs = document.querySelectorAll(".more");
const wifiConnectDiv = document.querySelector(".wifi-connect");
const mainRange = document.querySelector(".main_range");
const mqttBut = document.querySelector(".but.mqtt");
const mqttCheck = document.getElementById("mqtt_use");
const mqttHA = document.getElementById("mqtt:ha_discovery");
const slider = document.querySelector(".slider");
mainRange.value = level;

const settingsWifi = {
  hotspot_name: "",
  hostpot_password: "",
};

///////////////////////
/// Event listeners ///
///////////////////////

window.addEventListener("pageshow", (e) => {
  if (e.persisted) {
    window.location.reload(); 
  }
});

if(document.readyState !== 'loading') {
  init();
}
else {
  document.addEventListener('DOMContentLoaded', function () {
      init()
  });
}

slider.addEventListener('touchstart', (e) => {
  // is not near edge of view, exit
  // if (e.pageX > 10 && e.pageX < window.innerWidth - 10) return;
  // prevent swipe to navigate gesture
  e.preventDefault();
  if (e.target === mainRange) {
    const offset = convertRemToPixels(3);
    let value = map(e.touches[0].clientY, mainRange.getBoundingClientRect().bottom - offset, mainRange.getBoundingClientRect().top + offset, 0, 100);
    mainRange.value = value.toFixed(0);
    mainRange.dispatchEvent(new Event('input', {bubbles:true}));
  }
});

slider.addEventListener("touchmove", e => {
  if (e.target === mainRange) {
    const offset = convertRemToPixels(3);
    let value = map(e.touches[0].clientY, mainRange.getBoundingClientRect().bottom - offset, mainRange.getBoundingClientRect().top + offset, 0, 100);
    mainRange.value = value.toFixed(0);
    mainRange.dispatchEvent(new Event('input', {bubbles:true}));
  }
});

// window.addEventListener("zoom")

mainRange.addEventListener("input", function () {
  this.parentNode.setAttribute("style", `--val: ${this.value}; --val-text: "${this.value}"`);
  // this.parentNode.setAttribute("style", "--val:" + this.value);
  // this.parentNode.style.setProperty("--val-text", JSON.stringify(this.value));
  control.setLevel(parseInt(this.value));
});
onoff.forEach((but) => {
  but.addEventListener("click", () => {
    toggleState();
  });
});
setButs.forEach((but) => {
  but.addEventListener("click", () => {
    const name = but.classList[0];
    const card = document.querySelector("." + name + ".card");
    if (
      but.classList.contains("active") ||
      !settings.classList.contains("active")
    ) {
      settings.classList.toggle("active");
      document.querySelector(".settings-background").classList.toggle("active");
      if (settings.classList.contains("active")) populateSettings();
    }
    switchCard(card, but);
  });
});

moreButs.forEach((but) => {
  but.addEventListener("click", () => {
    const cont = but.nextElementSibling;
    but.classList.toggle("active");
    toggleMore(cont);
  });
});

// Set window height to css variable on resize
window.addEventListener("resize", () => {
  docHeight = Math.max(
    document.documentElement.clientHeight,
    window.innerHeight || 0
  );
  root.style.setProperty(
    "--true-height",
    Math.max(document.documentElement.clientHeight, window.innerHeight || 0) +
      "px"
  );
});

// Show SAVE button on form changes
setCards.forEach((card) => {
  card.childNodes.forEach((el) => {
    el.addEventListener("change", () => {
      card.querySelector(".confirm-buttons").classList.add("visible");
    });
  });
});

document.querySelectorAll(".confirm-buttons .but.save").forEach((el) =>
  el.addEventListener("click", () => {
    if (!saveSettings(el.parentNode.parentNode))
      el.parentNode.classList.remove("visible");
  })
);

mqttCheck.addEventListener("change", function () {
  // const but = document.querySelector(".set-buttons > .but.mqtt");
  if (this.checked) {
    // but.classList.remove("hidden");
    // showSetButs(true);
    popup.draw("mqtt", {
      callback: () => {
        document
          .querySelector(".set-buttons > .but.mqtt")
          .classList.remove("hidden");
        showSetButs(true);
      },
    });
  } else {
    mqttBut.removeAttribute("style");
    mqttBut.classList.add("hidden");
    showSetButs(true);
  }
});

mqttHA.addEventListener("change", function () {
  const cont = this.parentElement.nextElementSibling;
  if (this.checked) {
    toggleMore(cont, false);
  } else {
    toggleMore(cont, true);
  }
});
document.querySelector(".but.update").addEventListener("click", () => {
  popup.draw("update");
});
document.querySelector(".but.factory").addEventListener("click", () => {
  popup.draw("factory");
});

//////////////////////////
///    WIFI section   ////
//////////////////////////
// Set wifi network list width on change
var ro = new ResizeObserver((entries) => {
  for (let entry of entries) {
    entry.target.style.setProperty(
      "--list-width",
      entry.target.clientWidth + "px"
    );
  }
});
ro.observe(wifiConnectDiv.querySelector(".networks"));

document
  .querySelector(".wifi-connect > .title")
  .addEventListener("click", function () {
    wifiScan(this.parentNode);
  });

document
  .querySelector(".wifi-connect > .manual")
  .addEventListener("click", function () {
    popup.draw("wifi-manual");
  });

document
  .querySelector(".but.wifi-current")
  .addEventListener("click", async function () {
    try {
      let wifiName; 
      let result = await fetch(`${URL}/wifi/report`, {method: "GET",})
        .then((response) => {
          return response.json();
        });
      console.log(result);
      if (result.status === "Not connected.") {
        wifiName = `AP mode: ${result.ap_ssid}`
      } else {
        wifiName =`${result.ssid}`;
      }
      popup.draw("wifi-info", {
        wifiName: wifiName,
        ip: result.ip,
        signal: `${result.rssi}%`,
        // signal: String(result.rssi),
      });
    } catch(err) {
      console.log(err);
    }
  });

//Back button to close menu
history.pushState(null, null, window.location.pathname);
window.addEventListener("popstate", (e) => {
  // The popstate event is fired each time when the current history entry changes.
  if (!settings.classList.contains("active")) {
    // Call Back button programmatically
    history.back();
    // Uncomment below line to redirect to the previous page instead.
    // window.location = document.referrer
  } else {
    // Stay on the current page.
    history.pushState(null, null, window.location.pathname);
    settings.classList.remove("active");
    document
      .querySelector(".set-buttons > .but.active")
      .classList.remove("active");
  }
});

////////////////////////////////////
///  END of event handlers////// ///
////////////////////////////////////

function init() {
  const preloads = document.querySelectorAll(".preload-transitions");
  preloads.forEach((el) => {
    el.classList.remove("preload-transitions");
  });
  
  checkFirstRun();
  //Enable/disable splash animation
  showSplash = JSON.parse(localStorage.getItem("splash"));
  if (showSplash === false) {
    document.querySelector(".splash").classList.add("disabled");
  } else {
    const paused = document.querySelectorAll(".paused");
    paused.forEach((el)=>{el.classList.remove("paused")});
  }
  toggleState();
  root.style.setProperty(
    "--true-height",
    Math.max(document.documentElement.clientHeight, window.innerHeight || 0) +
      "px"
  );
}

function map(x, in_min, in_max, out_min, out_max) {
  const result =(x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
  return Math.min(Math.max(result, out_min), out_max);
}

function convertRemToPixels(rem) {
  return rem * parseFloat(getComputedStyle(document.documentElement).fontSize);
}

function switchCard(c, b) {
  const index = Array.from(setCards).indexOf(c);
  setCards.forEach((card, i) => {
    if (card === c) {
      card.classList.add("active");
    } else {
      if (index > i) {
        card.classList.remove("hidden-down");
        card.classList.add("hidden-up");
      } else {
        card.classList.remove("hidden-up");
        card.classList.add("hidden-down");
      }
      card.classList.remove("active");
    }
  });
  setButs.forEach((but) => {
    if (but === b) {
      but.classList.toggle("active");
    } else {
      but.classList.remove("active");
    }
  });
}

const setButsObserver = new MutationObserver((m) => {
  m.forEach((mu) => {
    if (mu.type == "attributes" && mu.attributeName == "class") {
      let state = mu.target.classList.contains("active");
      showSetButs(state);
    }
  });
});
setButsObserver.observe(settings, { attributes: true });

function showSetButs(state) {
  const butsVisible = document.querySelectorAll(
    ".set-buttons > .but:not(.hidden)"
  );
  let arr = Array.from(butsVisible).reverse();
  let transWidth = 0;
  arr.forEach((i) => {
    if (state) {
      if (!i.classList.contains("set"))
        i.setAttribute("style", `transform:translateX(-${transWidth}px)`);
      transWidth += i.offsetWidth + convertRemToPixels(0.5);
    } else {
      if (!generalSettings.mqtt_use) {
        mqttBut.classList.add("hidden");
      }
      i.removeAttribute("style");
    }
  });
}

function checkFirstRun() {
  let run = JSON.parse(localStorage.getItem("firstrun"));
  if (run === null) {
    localStorage.setItem("firstrun", JSON.stringify(1));
    // showSplash = true;
  } else if (run >= 0 && run < 3) {
    run++;
    localStorage.setItem("firstrun", JSON.stringify(run));
  } else if (run >= 3) {
    if (localStorage.getItem("splash") === null) {
      localStorage.setItem("splash", JSON.stringify(false));
    }
  }
}

function toggleState() {
  // console.log(control.state);
  if (!control.state) {
    on.classList.add("active");
    off.classList.remove("active");
    control.setState(true);
  } else {
    // console.log("else");
    on.classList.remove("active");
    off.classList.add("active");
    control.setState(false);
  }
}

function importState(state, level) {
  if (state) {
    on.classList.add("active");
    off.classList.remove("active");
  } else {
    on.classList.remove("active");
    off.classList.add("active");
  }
  level = parseInt(level);
  mainRange.value = level;
  mainRange.parentNode.setAttribute("style", `--val: ${level}; --val-text: "${level}"`);
  // mainRange.parentNode.setAttribute("style", `--val-text: "${level}"`);
  // mainRange.parentNode.style.setProperty("--val-text", JSON.stringify(level));
  // var event = new Event("input");
  // mainRange.dispatchEvent(event);
}

function toggleMore(el, state = null) {
  if (el.classList.contains("active") || state === false) {
    el.setAttribute("style", "--h:" + 0);
    el.classList.remove("active");
  } else {
    el.style.setProperty("--h", el.scrollHeight);
    el.classList.add("active");
  }
}

function drawSignal(s, div) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  // div.innerHTML = "";
  svg.setAttribute("viewBox", "-100 -200 200 200");
  path.setAttribute("fill", "#000000");

  if (s < 100) {
    const stroke = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    const strokeMask = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    );
    path.setAttribute(
      "d",
      `m 0 -18 l ${s * -0.8} ${s * -0.8} q ${s * 0.8} ${s * -0.6} ${
        s * 1.6
      } 0 z`
    );
    stroke.setAttribute("d", `m 0 0 l -100 -100 q 100 -80 200 0 z`);
    stroke.setAttribute("fill", "#000000");
    strokeMask.setAttribute("d", `m 0 -18 l -80 -80 q 80 -60 160 0 z`);
    strokeMask.setAttribute("fill", "#FFFFFF");
    svg.appendChild(stroke);
    svg.appendChild(strokeMask);
  } else {
    path.setAttribute(
      "d",
      `m 0 0 l ${s * -1} ${s * -1} q ${s} ${s * -0.8} ${s * 2} 0 z`
    );
  }

  svg.appendChild(path);
  div.appendChild(svg);
}

function drawLock(div) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.innerHTML = `<rect x="5" width="40" height="25" fill="black" stroke="white"/>
  <rect y="21" width="50" height="35" fill="black"/>
  <rect x="15" y="9" width="20" height="12" fill="white"/>
  <rect x="20" y="34" width="10" height="10" fill="white"/>`;
  svg.setAttribute("viewBox", "0 0 56 56");
  svg.setAttribute(
    "style",
    "position: absolute; right: 0rem; bottom: 0rem; height: 0.4em; width: 0.4em;"
  );
  div.appendChild(svg);
}

function populateWifi(list, div) {
  div.innerHTML = "";
  list.split("\n").forEach((el) => {
    let wifiArr = el.split(",");
    const newNetwork = document.createElement("li");
    const netSignal = document.createElement("div");
    const netSecur = document.createElement("div");
    netSignal.classList.add("wifi-signal");
    netSecur.classList.add("wifi-security");
    drawSignal(wifiArr[0], netSignal);
    if (wifiArr[1] === "1") drawLock(netSignal);
    const netName = document.createElement("p");
    netName.innerText = wifiArr[2];
    newNetwork.addEventListener("click", function () {
      popup.draw("wifi-connect", { 
      wifiName: this.innerText, 
      callback: ()=>{
        wifiConnect(
          this.innerText,
          document.getElementById("wifi-ap-password").value
        );}
      });
    });
    div.appendChild(newNetwork);
    div.style.setProperty("--list-width", div.clientWidth + "px");
    newNetwork.appendChild(netSignal);
    newNetwork.appendChild(netName);
    newNetwork.appendChild(netSecur);
    getScrollWidth(netName);
  });
}

function getScrollWidth(el) {
  el.style.setProperty("--own-width", el.scrollWidth + "px");
  el.style.setProperty("animation-play-state", "running");
}

async function wifiScan(el) {
  const title = el.querySelector(".title > h3");
  const networks = el.querySelector(".networks");
  el.classList.add("scan");
  title.innerHTML = "Scanning";
  const wifiList = await fetch(`${URL}/wifi/list`, {
    method: "GET",
  }).then((response) => response.text());
  el.classList.remove("scan");
  title.innerHTML = "Available networks";
  el.classList.add("ready");
  populateWifi(wifiList, networks);
}

async function wifiConnect(name, password) {
  popup.draw("connecting");
  try {  
    let result = await fetch(encodeURI(`${URL}/wifi/connect?n=` + name + "&p=" + password), {method: "GET",})
      .then((response) => {
        return response.json();
      });
    if (result.status === "Not connected.") {
      popup.draw("alert", {alertText: "Failed to connect"});
    } else if (result.status === "Connected") {
      popup.draw("alert", {alertText: `Already connected to ${result.ssid}`});
    } else {
      popup.draw("alert", {alertText: `${result.status} to ${result.ssid}`});
    }
  } catch(err) {
    console.log(err);
  }
}

async function populateSettings() {
  const rpt = document.querySelector(".wifi-current.but");
  try {  
    let result = await fetch(`${URL}/wifi/report`, {method: "GET",})
      .then((response) => {
        return response.json();
      });
    if (result.status === "Not connected.") {
      rpt.innerHTML = `AP mode: ${result.ap_ssid}`
    } else {
      rpt.innerHTML=`${result.ssid}`;
    }
  } catch(err) {
    console.log(err);
  }
  
  settings.querySelectorAll(".confirm-buttons").forEach((but) => {
    but.classList.remove("visible");
  });
  document.querySelectorAll(".content .more-div").forEach((el) => {
    el.classList.remove("active");
    el.removeAttribute("style");
  });
  document.querySelectorAll(".content .more").forEach((el) => {
    el.classList.remove("active");
  });
  generalSettings.populateUI(true);
  if (generalSettings.mqtt_use) {
    mqttBut.classList.remove("hidden");
  } else {
    mqttBut.classList.add("hidden");
  }
  if (mqttHA.checked) {
    toggleMore(mqttHA.parentElement.nextElementSibling, false);
  }
}

function saveSettings(div) {
  let save = generalSettings.save(div, true);
  if (save) {
    save.classList.add("error");
    save.addEventListener(
      "input",
      function () {
        this.classList.remove("error");
      },
      { once: true }
    );
    return true;
  }
  return false;
}

await generalSettings.download();
document.title = generalSettings.settings.lamp_name;
// init();