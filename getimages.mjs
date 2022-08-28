import fetch from "node-fetch";
import fs from "fs";
import cliProgress from "cli-progress";

const fsp = fs.promises;

fetch("https://raw.githubusercontent.com/msikma/pokesprite/master/data/pokemon.json")
    .then(async (data) => {
        const pokedex = await data.json();

        const ids = Object.keys(pokedex).filter((id) => {
            return parseInt(id, 10) <= 898;
        }).sort((a, b) => {
            return parseInt(a, 10) - parseInt(b, 10);
        });

        const fetches = [];
        try {
            await fsp.mkdir("sprites");
        } catch(e) {}

        const bar = new cliProgress.SingleBar({}, cliProgress.Presets.legacy);

        for(const key of ids) {

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
                } finally {
                    bar.increment();
                }
            })());
        }
        // console.log(fetches.length, "fetches");
        bar.start(fetches.length, 0);
        await Promise.all(fetches);
        bar.stop();

        /*
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
        */

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
        
        const newPokedex = {
            "pokedexes": [151,251,386,493,649,719,809,898].filter((id) => {
                return ids.indexOf(`${id}`) !== -1
            }),
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

        const newPokedexJson = JSON.stringify(newPokedex, null, 2);
        await fsp.writeFile("pokedex.js", "window.pokedex=" + newPokedexJson, "utf-8");

        console.log("Done!");
    }).catch((e) => {
        console.error(e);
    });
