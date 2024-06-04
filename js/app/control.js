export class Control {
  constructor(url, stateCallback) {
    this.state = false;
    this.level = 0;
    this.state_new = false;
    this.level_new = 0;
    this.url = url;
    this.canSend = true;
    this.willSend = false;
    this.connecting = false;
    try{
      this.connect();
    }
    catch(err) {
      console.log(err);
      this.connection = null;
    }
    this.stateCallback = stateCallback;
    // console.log(typeof stateCallback);
    // console.log(typeof this.stateCallback);
  }
  connect() {
    try {
      this.connecting = true;  
      this.connection = new WebSocket(`ws://${this.url}`);

      this.connection.addEventListener("open", () => {
        this.connection.send("Connected");
        this.connecting = false;
      });
      this.connection.addEventListener("error", (error) => {
        console.log("WebSocket Error ", error);
        this.connection.close();
      });
      this.connection.addEventListener("message", (e) => {
        if (e.data.slice(0, 2) == "S:") {
          this.state = Boolean(parseInt(e.data.split(";")[0].split(":")[1]));
          this.level = parseInt(e.data.split(";")[1].split(":")[1]);
          this.stateCallback(this.state, this.level);
        }

        console.log("Server: ", e.data);
      });
      this.connection.addEventListener("close", () => {
        console.log("WebSocket connection closed");
        delete this.connection;
        let timeout = 500;
        setTimeout(this.connect(), Math.min(5000, (timeout += timeout)));
      });
    }
    catch (err) {
      console.log(err);
      this.connecting = false;
    }
  }
  setState(state) {
    this.state = state;
    try {
      this.send();
    }
    catch (err) {
      console.log(err);
    }
  }
  setLevel(level) {
    // console.log(typeof(level), level);
    let newState = true;
    if (level === 0) {
      level = 1;
      newState = false;
    }
    if (level === this.level) return;
    this.level = level;
    if (newState != this.state) this.setState(newState);
    try {
      this.send();
    }
    catch (err) {
      console.log(err);
    }
  }
  send() {
    //Anti DoS system
    this.state_new = this.state;  //always send last input
    this.level_new = this.level;
    if (!this.canSend) {
      this.willSend = true;
      return;
    }
    this.canSend = false;
    this.willSend = false;
    if (this.connection.readyState === 1) {
      this.connection.send(`S:${this.state_new ? 1 : 0};L:${this.level_new};`);
    } else {
      if (!this.connecting) {
        delete this.connection;
        this.connect();
        this.connection.addEventListener(
          "open",
          () => {
            console.log("SENT");
            this.connection.send(`S:${this.state_new ? 1 : 0};L:${this.level_new};`);
          },
          { once: true }
        );
      }
    }
    setTimeout(() => {
      this.canSend = true;
      if (this.willSend) this.send();
    }, 500);
  }
}
