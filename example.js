const AlgodooTransfer = require(".");

const DEFAULT_PATH = "/Users/delu/Library/Application Support/Algodoo";
const basePath = process.argv[2] || DEFAULT_PATH;

const algodooTransfer = new AlgodooTransfer(basePath);

algodooTransfer.init().then(() => {
  // every 2 seconds, send 10 messages at an increasing frequency to simulate variability and bursts
  setInterval(() => {
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        console.time("" + i);
        algodooTransfer
          // .sendExpression(`print("Hello ${i}");`)
          .sendExpression(`entity = Scene.entityByID(34); entity.text = "${i}";`)
          .then(() => {
            console.timeEnd("" + i);
          });
      }, 1100 - i * i * 10);
    }
  }, 2000);
});
