const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");

module.exports = class AlgodooTransfer {
  /**
   * @param {string} basePath path to algodoo user directory
   */
  constructor(basePath) {
    this.basePath = basePath;

    this.messageFile = path.join(basePath, "transfer-message.txt");

    this.bufferFile = path.join(basePath, "transfer-buffer.txt");
    this.metaFile = path.join(basePath, "transfer-meta.txt");
    this.receivedFile = path.join(basePath, "transfer-received.txt");

    this.sendPromiseResolves = [];
  }

  async initSender() {
    await this.clear();
    // handle received commands
    this.receivedFileWatcher = chokidar
      .watch(this.receivedFile)
      .on("change", async () => {
        const received = await fs.promises.readFile(this.receivedFile, "utf8");
        if (received === "") return; // ignore when cleared

        const [bufferId, ...indices] = received.split(" ");

        if (bufferId !== this.bufferId) {
          console.warn(
            `Warning: sent buffer id is ${this.bufferId} but received ${bufferId}`
          );
        }
        for (let index of indices) {
          const i = parseInt(index);
          if (i <= this.lastReceivedIndex) continue;

          this.sendPromiseResolves[i]();
        }
        const lastIndex = parseInt(indices[indices.length - 1]);

        if (lastIndex == this.bufferLength - 1) {
          // buffer is done processing
          this.clear();
        } else {
          this.lastReceivedIndex = lastIndex;
        }
      });
    this.senderRunning = true;
  }

  /**
   * Sends an expression for Algodoo to evaluate.
   * If using laser polling method, roundtrip latency varies from 6ms to 120ms
   * @param {string} expression thyme code evaluatable in the active algodoo scene
   * @returns {Promise<void>} A promise that resolves when Algodoo confirms the expression was evaluated
   */
  async sendExpression(expression) {
    if (!this.senderRunning) throw new Error("AlgodooTransfer not running!");

    await this.clearPromise; // make sure clear() is done to avoid inconsistent state
    if (!this.bufferId) {
      // basically unique id
      this.bufferId = Math.random()
        .toString(36)
        .substr(2, 4);
    }

    // append to create a buffer of commands
    let newLine = "\n";
    if (this.bufferLength === 0) {
      newLine = "";
    }

    let resolve;
    const sendPromise = new Promise(res => {
      resolve = res;
    });
    this.sendPromiseResolves.push(resolve);
    this.bufferLength++;

    try {
      await fs.promises.appendFile(this.bufferFile, newLine + expression);
      // a changed metaFile tells algodoo the buffer updated, so do this after updating the buffer
      await fs.promises.writeFile(
        this.metaFile,
        `${this.bufferId} ${this.bufferLength}`
      );
    } catch (e) {
      console.warn(`Warning: sendCommand failed: ${e}`);
    }
    return sendPromise;
  }

  /**
   * @param {(message: string) => void} cb message handler
   */
  handleMessage(cb) {
    if (this.handler)
      throw new Error("AlgodooTransfer already has message handler!");
    this.handler = cb;

    const onChange = async () => {
      const messages = await fs.promises.readFile(this.messageFile, "utf8");
      if (messages === "") return; // ignore when cleared

      for (let message of messages.split("\n")) {
        if (message === "") continue;

        cb(message);
      }

      fs.promises.writeFile(this.messageFile, "");
    };
    onChange(); // handle existing messages

    this.messageFileWatch = chokidar
      .watch(this.messageFile)
      .on("change", onChange);
  }

  async clear() {
    this.bufferId = "";
    this.bufferLength = 0;
    this.lastReceivedIndex = -1;
    this.sendPromiseResolves.length = 0;
    try {
      this.clearPromise = await Promise.all([
        fs.promises.writeFile(this.bufferFile, ""),
        fs.promises.writeFile(this.metaFile, ""),
        fs.promises.writeFile(this.receivedFile, "")
      ]);
    } catch (e) {
      console.warn(`Warning: clearTransferFiles failed: ${e}`);
    }
  }
};
