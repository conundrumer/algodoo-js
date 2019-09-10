const AlgodooTransfer = require(".");

const DEFAULT_PATH = "/Users/delu/Library/Application Support/Algodoo";
const basePath = process.argv[2] || DEFAULT_PATH;

const algodooTransfer = new AlgodooTransfer(basePath);

algodooTransfer.initSender().then(() => {
  // every 2 seconds, send 10 expressions at an increasing frequency to simulate variability and bursts
  let evaluated = [];
  setInterval(() => {
    // don't send more expressions when previous expressions haven't been evaluated
    if (!evaluated.every(x => x)) return;

    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        evaluated[i] = false;
        console.time("" + i);

        algodooTransfer
          // .sendExpression(`print("Hello ${i}");`)
          .sendExpression(
            `entity = Scene.entityByID(34); entity.text = "${i}";`
          )
          .then(() => {
            console.timeEnd("" + i);
            evaluated[i] = true;
          });
      }, 1100 - i * i * 10);
    }
  }, 2000);
});

algodooTransfer.handleMessage(message => {
  console.log("collide " + message);
});
