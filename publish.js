const fs = require("fs");
const glob = require("glob");
const path = require("path");

const patterns = [
    "index.html",
    "images.css",
    "images.png",
    "pokedex.js",
    "worker.js",
    "boxes.js",
    "boxes.css",
    "images/*",
]
const now = Date.now();

let replacement = ".$1?v=" + now + '"';

if(process.argv[2] == "undo") {
    replacement = ".$1\"";
}



try {
    fs.rmSync("dist", {
        force: true,
        recursive: true,
    });
} catch(e) {}

fs.mkdirSync("dist");
fs.mkdirSync("dist/images");

for(const pattern of patterns) {
    const files = glob.sync(pattern, {
    });

    for(const file of files) {
        const newPath = path.join("dist", file);
        if(file.endsWith(".html")) {
            let text = fs.readFileSync(file, "utf-8");

            text = text.replace(/\.(css|mjs|js|png)(?:\?v=\d+)?"/g, replacement);

            fs.writeFileSync(newPath, text, "utf-8");
        } else {
            fs.copyFileSync(file, newPath);
        }
    }
}

