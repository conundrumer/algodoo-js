const path = require("path");
const request = require("request");
const fs = require("fs");

const AlgodooTransfer = require(".");

const DEFAULT_PATH = "/Users/delu/Library/Application Support/Algodoo";
const basePath = process.argv[2] || DEFAULT_PATH;

const algodooTransfer = new AlgodooTransfer(basePath);

// profile pics are JPGs and 88 by default
const getPlaceholderImageUrl = id => `https://picsum.photos/id/${id}/88`;

const jsToThymeObject = obj =>
  Object.keys(obj)
    .map(key => `${key}=${JSON.stringify(obj[key])}`)
    .join(";");

algodooTransfer.initSender().then(() => {
  const N = 10;
  let i = 0;

  // keep track of images we already downloaded so we don't redownload them
  const images = {}; // [id]: file name

  const addBall = texture => {
    console.log(texture);

    const radius = 0.2;

    let props = {
      radius
    };
    if (texture != null) {
      const s = 0.5 / radius; // texture scale

      props = {
        ...props,
        drawCake: false,
        drawBorder: false,
        texture: texture,
        textureClamped: [false, false],
        textureMatrix: [s, 0, 0.5, 0, s, 0.5, 0, 0, 1]
      };
    }

    const propString = jsToThymeObject(props);
    algodooTransfer.sendExpression(`Scene.addCircle{${propString}};`);
  };

  setInterval(() => {
    const id = i + 100;
    if (id in images) {
      addBall(images[id]);
    } else {
      const imageUrl = getPlaceholderImageUrl(id);
      const texture = `${id}.jpg`;
      const dest = path.join(basePath, "textures", texture);
      download(imageUrl, dest)
        .then(() => {
          images[id] = texture;
          addBall(texture);
        })
        .catch(err => {
          images[id] = null;
          addBall(null);
          console.warn(err);
        });
    }
    i = (i + 1) % N;
  }, 1000);
});

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const onError = err => {
      fs.unlink(dest, () => {});
      reject(err.message);
    };

    const file = fs.createWriteStream(dest);
    file.on("finish", resolve);
    file.on("error", onError);

    const req = request.get(url);
    req.on("response", response => {
      if (response.statusCode === 200) {
        req.pipe(file);
      } else {
        file.close();
        onError(
          new Error(
            `Server responded with ${response.statusCode}: ${response.statusMessage}`
          )
        );
      }
    });
    req.on("error", err => {
      file.close();
      onError(err);
    });
  });
}
