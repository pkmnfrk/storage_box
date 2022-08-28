import fetch from "node-fetch";
import fs from "fs";
import cliProgress from "cli-progress";
import Spritesmith from "spritesmith";
import pLimit from "p-limit";

const fsp = fs.promises;

fetch("https://raw.githubusercontent.com/msikma/pokesprite/master/data/pokemon.json")
    .then(async (data) => {
        const pokedex = await data.json();

        const ids = Object.keys(pokedex).sort((a, b) => {
            return parseInt(a, 10) - parseInt(b, 10);
        });

        const fetches = [];
        const sprites = [];

        try {
            await fsp.mkdir("sprites");
        } catch(e) {}

        const bar = new cliProgress.SingleBar({}, cliProgress.Presets.legacy);
        const limiter = pLimit(4);
        for(const key of ids) {
            const path = `sprites/i${key}MS.png`;
            sprites.push(path);

            fetches.push(limiter(async (path) => {
                try {
                    await fsp.access(path, fs.constants.R_OK);
                } catch(e) {
                    const url = `https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8/regular/${pokedex[key].slug.eng}.png`;
                    const result = await fetch(url);
                    const buffer = await result.body;
                    await fsp.writeFile(path, buffer);
                } finally {
                    bar.increment();
                }
            }, path));
        }
        bar.start(fetches.length, 0);
        await Promise.all(fetches);
        bar.stop();

        /*
        [class^='pokemon'], [class*=' pokemon'] { background-image:url('./images.png'); width:68px; height:56px; }
        .pokemoni001MS { background-position:-123px -153px; }
        */
        
        let css = "[class^='pokemon'], [class*=' pokemon'] { background-image:url('./images.png'); width:68px; height:56px; }";

        const binary = await new Promise((resolve, reject) => {
            Spritesmith.run({
                src: sprites,
            }, (err, result) => {
                if(err) {
                    return reject(err);
                }

                for(const path of Object.keys(result.coordinates)) {
                    const spr = result.coordinates[path];

                    const match = /^sprites\/(.*)\.png$/.exec(path);
                    css += `\n.pokemon${match[1]}{background-position:${-spr.x}px ${-spr.y}px;}`;
                }
                
                resolve(result.image);
            })
        });

        await fsp.writeFile("images.css", css, "utf-8");
        await fsp.writeFile("images.png", binary);

        const legendaries = [
            "144-146", 150, 151,
            "249-251",
            "377-386",
            "480-493",
            494, "638-649",
            "716-721",
            "785-809",
            "888-898", 905
        ]
        function isLegendary(id) {
            for(const lid of legendaries) {
                if(typeof(lid) === "number") {
                    if(lid === id) return true;
                    if(id < lid) return false;
                    continue;
                }
                const parts = lid.split("-").map(i => parseInt(i, 10));
                if(id >= parts[0] && id <= parts[1]) {
                    return true;
                }
                if(id < parts[0]) {
                    return false;
                }
            }
            return false;
        }
        
        const newPokedex = {
            "pokedexes": [151,251,386,493,649,719,809,905].filter((id) => {
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
