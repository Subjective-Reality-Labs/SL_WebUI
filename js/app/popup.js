export class Popup {
  constructor(div, updater) {
    this.container = div;
    this.popupDiv = div.querySelector(".popup");
    this.content = div.querySelector(".content");
    this.confButs = div.querySelector(".confirm-buttons");
    this.updater = updater;
  }
  draw(type, options) {
    this.clearPopup();
    switch (type) {
      case "wifi-connect":
        this.makeLabel(options.wifiName, "wifi-ap-password");
        this.makeInput("Password", "wifi-ap-password", "password");
        this.makeButton("Connect", () => {
          options.callback();
        });
        this.makeButton("Cancel", this.closePopup);

        break;
      case "wifi-manual":
        this.makeLabel("Add WiFi", "wifi-ap-name");
        this.makeInput("Name", "wifi-ap-name", "text");
        this.makeInput("Password", "wifi-ap-password", "password");
        this.makeButton("Connect", () => {
          
          wifiConnect(
            document.getElementById("wifi-ap-name").value,
            document.getElementById("wifi-ap-password").value
          );
        });
        this.makeButton("Cancel", this.closePopup);
        break;
      case "wifi-info":
        this.content.innerHTML = `<p>${options.wifiName}</p>
          <p>Signal strength: ${options.signal}</p>
          <p>Lamp's IP: ${options.ip}</p>`;
        this.makeButton("Ok", this.closePopup);
        break;
      case "reboot":
        this.makeAlert("Lamp will be rebooted.");
        this.makeButton("Ok", this.closePopup);
        this.makeButton("Cancel", this.closePopup);
        break;
      case "factory":
        this.makeAlert("Settings will be restored to factoy defaults.");
        this.makeButton("Ok", ()=>{
          this.clearPopup();
          this.makeAlertProgress("Rebooting the lamp");
          try {
            fetch("/factory");
          }
          catch (err) {
            console.log(err);
          }
          setTimeout(()=>location.reload(), 5000);
        });
        this.makeButton("Cancel", this.closePopup);
        break;
      case "mqtt":
        this.makeAlert("Don't forget to check MQTT settings.");
        this.makeButton("Ok", function () {
          this.closePopup();
          if (options.callback) options.callback();
        });
        break;
      case "connecting":
        this.makeAlertProgress("Connecting");
        break;
      case "alert":
        this.makeAlert(options.alertText);
        this.makeButton("Ok", this.closePopup);
        break;
      case "update":
        this.makeInputFile("Select firmware file", ()=>{
          this.content.parentElement.querySelector(".but").disabled = false;
        });
        this.makeCheckbox("Allow downgrade", "downgrade");
        this.makeButton("Upload", ()=>{
          const inputFile = this.content.querySelector(".file-input").files[0];
          this.clearPopup();
          // this.makeAlertProgress("Uploading firmware");
          this.makeAlert("Uploading firmware");
          this.updater.upload(inputFile, (e)=>{
            const alert = this.content.querySelector("h2");
            if (e.type === "progress") {
              alert.innerHTML = `Uploading update\n${parseInt(e.loaded/e.total*100)}%`;
            } else if (e.type === "updater") {
              alert.innerHTML = `${e.data}`;
            } else if (e.type === "tarprogress") {
              let text = alert.innerHTML.split("\n")[0];
              alert.innerHTML = `${text}\n${e.data}`;
            }
            // console.log(e);
          });
        }, true);
        this.makeButton("Cancel", this.closePopup);
    }
    this.container.classList.add("active");
  }
  clearPopup() {
    this.confButs.innerHTML = "";
    this.content.innerHTML = "";
  }
  closePopup() {
    this.container.addEventListener(
      "transitionend",
      () => {
        this.clearPopup();
      },
      { once: true }
    );
    this.container.classList.remove("active");
  }
  makeInputFile(text, func=null) {
    const id = `file_input_${Math.random().toString(36).slice(2, 7)}`;
    const fileContainerHTML = 
    `<div class="file-container">
    <input type="file" id="${id}" class="file-input">
    <label for="${id}" class="file-label">${text}</label>
    </div>`;
    this.content.innerHTML += fileContainerHTML;
    const input = document.getElementById(id);
    const label = input.nextElementSibling;
    const container = label.parentElement;
    input.addEventListener("change", (e) =>{
      label.innerHTML = e.target.value.split('\\').pop();
      if (func != null) func();
    });
    ;['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      container.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    })
    ;['dragenter', 'dragover'].forEach(eventName => {
      container.addEventListener(eventName, () => {
        container.classList.add("highlight");
      })
    });
    ;['dragleave', 'drop'].forEach(eventName => {
      container.addEventListener(eventName, () => {
        container.classList.remove("highlight");
      })
    });
    container.addEventListener("drop", (e) => {
      input.files = e.dataTransfer.files;
      label.innerHTML = input.value.split('\\').pop();
      if (func != null) func();
    });
  }
  makeButton(text, func, disabled = false) {
    const button = document.createElement("button");
    if (disabled) button.disabled = true;
    button.classList.add("but");
    button.innerText = text;
    button.addEventListener("click", func.bind(this));
    this.confButs.appendChild(button);
    return button;
  }
  makeAlert(text) {
    const labelHTML = `<h2>${text}</h2>`;
    this.content.innerHTML += labelHTML;
  }
  makeAlertProgress(text) {
    const labelHTML = `<h2 class="progress">${text}</h2>`;
    this.content.innerHTML += labelHTML;
  }
  makeLabel(text, name) {
    const labelHTML = `<label name=${name} for=${name}>${text}</label>`;
    this.content.innerHTML += labelHTML;
  }
  makeInput(text, name, type) {
    const inputHTML = `<input type="${type}" id=${name} placeholder=${text}>`;
    this.content.innerHTML += inputHTML;
  }
  makeCheckbox(text, name) {
    const inputHTML = `<div class="check-lbl">
    <input type="checkbox" id="${name}">
    <label for="${name}">${text}</label>
    </div>`;
    this.content.innerHTML += inputHTML;
  }
}

async function wifiConnect(name, password) {
  popup.draw("connecting");
  try {  
    let result = await fetch(encodeURI(`${URL}/wifi/connect?n=` + name + "&p=" + password), {method: "GET",})
      .then((response) => {
        return response.json();
      });
    if (result.status === "Not connected.") {
      popup.draw("alert", options={alertText: "Failed to connect"});
    } else if (result.status === "Connected") {
      popup.draw("alert", options={alertText: `Already connected to ${result.ssid}`});
    } else {
      popup.draw("alert", options={alertText: `${result.status} to ${result.ssid}`});
    }
  } catch(err) {
    console.log(err);
  }
}