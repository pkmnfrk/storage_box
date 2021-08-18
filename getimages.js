const fetch = require("node-fetch");
const nsg = require("node-sprite-generator");
const fs = require("fs");
const fsp = fs.promises;

fetch("https://raw.githubusercontent.com/msikma/pokesprite/master/data/pokemon.json")
    .then(async (data) => {
        const pokedex = await data.json();
        const fetches = [];
        try {
            await fsp.mkdir("sprites");
        } catch(e) {}

        for(const key of Object.keys(pokedex)) {
            fetches.push((async () => {
                const path = `sprites/i${key}MS.png`;

                try {
                    await fsp.access(path, fs.constants.R_OK);
                } catch(e) {
                    console.log("Fetching", pokedex[key].slug.eng);
                    const url = `https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8/regular/${pokedex[key].slug.eng}.png`;
                    const result = await fetch(url);
                    const buffer = await result.buffer();
                    await fsp.writeFile(path, buffer);
                }
            })());
        }
        console.log(fetches.length, "fetches");
        await Promise.all(fetches);

        await new Promise((resolve, reject) => {
            nsg({
                src: [
                    "sprites/*MS.png"
                ],
                spritePath: "images.png",
                stylesheetPath: "images.css",
                stylesheet: "prefixed-css",
                stylesheetOptions: {
                    prefix: "pokemon",
                },
                layout: "packed",
                compositor: "jimp",
                
            }, (err) => {
                if(err) {
                    return reject(err);
                }
                return resolve();
            })
        });

        const legendaries = [
            "144-146", 150, 151,
            "249-251",
            "377-386",
            "480-493",
            494, "638-649",
            "716-721",
            "785-809",
            "888-898"
        ]
        function isLegendary(id) {
            for(const lid of legendaries) {
                if(typeof(lid) === "number") {
                    if(lid === id) return true;
                    if(lid < id) return false;
                    continue;
                }
                const parts = lid.split("-").map(i => parseInt(i, 10));
                if(id >= parts[0] && id <= parts[1]) {
                    return true;
                }
            }
            return false;
        }
        const ids = Object.keys(pokedex).sort((a, b) => {
            return parseInt(a, 10) - parseInt(b, 10);
        });
        
        const newPokedex = {
            "pokedexes": [151,251,386,493,649,719,809,898],
            "pokemon": ids.map((id) => {
                const pokemon = pokedex[id];
                const numId = parseInt(id, 10);
                return {
                    "id": numId,
                    name: pokemon.name.eng,
                    is_special: isLegendary(numId) ? true : undefined,
                }
            }),
        }

        const newPokedexJson = JSON.stringify(newPokedex);
        await fsp.writeFile("pokedex.js", "window.pokedex=" + newPokedexJson, "utf-8");

        console.log("Done!");
    }).catch((e) => {
        console.error(e);
    });
