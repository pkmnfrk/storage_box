import { fetchBuilder, FileSystemCache } from "node-fetch-cache";
import cliProgress from "cli-progress";
import pLimit from "p-limit";
import Spritesmith from "spritesmith";
import Vinyl from "vinyl";
import fs from "fs";
import {chunk} from "underscore";
import glob from "glob";
import path from "path";


const fsp = fs.promises;

import Pokemon from "./pokemon.mjs";

const box_overrides = {
    kanto: {
        size: 20,
        width: 5,
    },
    "original-johto": {
        size: 20,
        width: 5,
    }
};

const now = Date.now().toString();

try {
    await fsp.rm("dist", {recursive: true});
} catch(e) {}

try {
    await fsp.mkdir("dist");
} catch(e) {}

const template = await fsp.readFile("./template.html", "utf-8");

const fetch = fetchBuilder.withCache(new FileSystemCache({
    cacheDirectory: "./cache",
}));

const pokemon = new Pokemon(fetch);

const bar = new cliProgress.SingleBar({}, cliProgress.Presets.legacy);
let progressTotal = 4; // data + pokedexes + gen sprites + gen css

bar.start(progressTotal, 0);

await copyStaticFiles();

const pokedex = await (await fetch("https://raw.githubusercontent.com/msikma/pokesprite/master/data/pokemon.json")).json();

const ids = Object.keys(pokedex);
ids.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

bar.increment();

const pokedexes = await getAllPokedexes();

const sprites = await downloadSprites(bar);
const spritesheet = await buildSpritesheet(sprites);

await writeCss(spritesheet);
await writeHtmlFiles(pokedexes);

bar.stop();

function addProgress(p) {
    progressTotal += p;
    bar.setTotal(progressTotal);
}

async function downloadSprites() {
    const fetches = [];
    
    addProgress(ids.length);

    const limiter = pLimit(4);
    for(const key of ids) {
        fetches.push(limiter(async (key) => {
            try {
                await fsp.access(path, fs.constants.R_OK);
            } catch(e) {
                const filename = `${pokedex[key].slug.eng}.png`;
                const url = `https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8/regular/${filename}`;
                const result = await fetch(url);
                const blob = await result.blob();
                const buffer = blob.stream()

                const ret = new Vinyl({
                    path: parseInt(key, 10).toString() + ".png",
                    contents: buffer,
                });

                return ret;
            } finally {
                bar.increment();
            }
        }, key));
    }

    return await Promise.all(fetches);
}

async function getAllPokedexes() {
    const pokedexList = await pokemon.pokedexes();
    bar.increment();

    addProgress(pokedexList.length);

    const results = [];

    for(const dex of pokedexList) {
        const actualDex = await pokemon.pokedex(dex.name);
        if(actualDex.is_main_series) {
            results.push(actualDex);
        }
        bar.increment(1);
    }

    return results;
}

async function buildSpritesheet(sprites) {
    const spritesheet = await new Promise((resolve, reject) => {
        Spritesmith.run({src:sprites}, (err, data) => {
            if(err) {
                return reject(err);
            }

            resolve(data);
        });
    });
    await fsp.writeFile("dist/pokemon.png", spritesheet.image);
    bar.increment();
    return spritesheet;
}

async function writeCss(spritesheet) {
    let css = "";
    
    css += `.pokemon { background-image:url('./pokemon.png?v=${now}');}\n`;

    for(const key of Object.keys(spritesheet.coordinates)) {
        const c = spritesheet.coordinates[key];
        const match = /^(\d+)\.png$/.exec(key);
        css += `.p${match[1]}{background-position:${-c.x}px ${-c.y}px;}\n`;
    }

    await fsp.writeFile("dist/pokemon.css", css, "utf-8");
    bar.increment();
}

async function writeHtmlFiles(pokedexes) {
    addProgress(pokedexes.length + 1);

    await writeIndexFile(pokedexes);

    for(const dex of pokedexes) {
        bar.update(null, {
            thing: "Dex: " + dex.name,
        })
        await writeHtmlFile(dex);
        bar.increment();
    }
}

/**
 * 
 * @param {import("pokedex-promise-v2").Pokedex[]} pokedexes
 */
async function writeIndexFile(pokedexes) {
    let contents = "";

    contents += `<ul>\n`;
    for(const dex of pokedexes) {
        const name = getEnglish(dex.names).name;
        const desc = getEnglish(dex.descriptions).description;
        contents += `<li><a href="${dex.name}.html">${desc || name}</a></li>`;
    }
    contents += `</ul>\n`;

    // contents += `<script>
    // if(localStorage["dex-latest"]) {
    //     window.location = localStorage["dex-latest"] + ".html";
    // }
    // </script>`;

    let finalHtml = template.replace(/\.css/g, ".css?v=" + now).replace("{{content}}", contents);
    await fsp.writeFile(`dist/index.html`, finalHtml, "utf-8");
}

/**
 * 
 * @param {import("pokedex-promise-v2").Pokedex} dex
 */
async function writeHtmlFile(dex) {
    let contents = "";
    const size = dex.name in box_overrides ? box_overrides[dex.name].size : 30;
    const width = dex.name in box_overrides ? box_overrides[dex.name].width : 6;

    let relevantVersions = [];
    for(const group of dex.version_groups) {
        /** @type {import("pokedex-promise-v2").VersionGroup}*/
        let versionGroup = await pokemon.get(group.url);
        for(const v of versionGroup.versions) {
            relevantVersions[v.name] = await pokemon.get(v.url);
        }
    }
    

    let start = 1;
    let end = size;
    {
        const name = getEnglish(dex.names).name;
        const desc = getEnglish(dex.descriptions).description;

        contents += `<h1>${name}</h1>\n`;
        if(desc) {
            contents += `<p>${desc}</p>`;
        }
        contents += `<p><a id="back" href="./">Back</a></p>\n`;
    }

    contents += `<div id="dex" data-dex="${dex.name}">`;
    for(const table of chunk(dex.pokemon_entries, size)) {
        
        contents += `<table data-start="${start}" data-end="${Math.min(end, dex.pokemon_entries.length)}">\n`;
        contents += `<caption>${start} - ${Math.min(end, dex.pokemon_entries.length)} <div class="check"></div></caption>\n`;


        
        for(const row of chunk(table, width)) {
            contents += `<tr>\n`;
            for(const c of row) {
                const mon = await pokemon.species(c.pokemon_species.name);
                const name = getEnglish(mon.names).name;

                let encounterText = Object.fromEntries(Object.keys(relevantVersions).map(v => [v, []]));

                if(dex.name != "national") {
                    const encounters = await pokemon.encounters(mon.id);
                    for(const encounter of encounters) {
                        for(const v of encounter.version_details) {
                            if(!isRelevantEncounter(v, relevantVersions)) {
                                continue;
                            }

                            /** @type {import("pokedex-promise-v2").LocationArea} */
                            const location = await pokemon.get(encounter.location_area.url);
                            encounterText[v.version.name].push(await getLocationName(location));
                        }
                    }
                }

                let finalEncounterText = "";
                {
                    const tmp = [];
                    for(const version of Object.keys(relevantVersions)) {
                        if(encounterText[version].length) {
                            tmp.push(`${getEnglish(relevantVersions[version].names).name}: ${encounterText[version].join(", ")}`);
                        }
                    }
                    if(tmp.length) {
                        finalEncounterText = `title="${tmp.join("\n")}"`;
                    }
                }

                contents += `<td data-id="${c.entry_number}" ${finalEncounterText}><div class="pokemon p${mon.id}"></div><br>#${c.entry_number} ${name}</td>\n`;
            }

            if(end > dex.pokemon_entries.length) {
                let extra = width - row.length;
                while(extra--) {
                    contents += `<td><div class="empty"></div></td>\n`;
                }
            }

            contents += `</tr>\n`;
        }

        if(end > dex.pokemon_entries.length) {
            const rows_per_box = size / width;
            const total_rows = Math.ceil(dex.pokemon_entries.length / size) * rows_per_box;
            const finished_rows = Math.ceil(dex.pokemon_entries.length / width);
            
            let extra = total_rows - finished_rows;
            while(extra--) {
                contents += `<tr>`;
                for(let i = 0; i < width; i++) {
                    contents += `<td><div class="empty"></div></td>`;
                }
                contents += `</tr>\n`;
            }
        }

        contents += `</table>\n`;

        start += size;
        end += size;
        
    }
    contents += `</div>`;
    contents += `<script src="boxes.js?v=${now}"></script>`;

    let finalHtml = template.replace(/\.css/g, ".css?v=" + now).replace("{{content}}", contents);
    await fsp.writeFile(`dist/${dex.name}.html`, finalHtml, "utf-8");
}

async function copyStaticFiles() {
    const staticFiles = glob.sync("static/**/*", {
        nodir: true,
    });

    addProgress(staticFiles.length);

    for(const file of staticFiles) {
        const newFile = file.replace(/^static\//, "dist/");
        const dir = path.dirname(newFile);

        try {
            await fsp.mkdir(dir);
        } catch(e){}

        await fsp.copyFile(file, newFile);
        bar.increment();
    }
}

function getEnglish(list) {
    return list.filter(n => n.language.name == "en")[0];
}

/**
 * 
 * @param {import("pokedex-promise-v2").PokemonEncounterVersionDetailObject} encounter
 * @param {object} versions
 */
function isRelevantEncounter(encounter, versions) {
    return encounter.version.name in versions;
}

/**
 * 
 * @param {import("pokedex-promise-v2").LocationArea} locationArea
 * @return {Promise<string>}
 */
async function getLocationName(locationArea) {
    /** @type {import("pokedex-promise-v2").Location} */
    const location = await pokemon.get(locationArea.location.url);
    let ret = getEnglish(location.names).name;

    const areaEng = getEnglish(locationArea.names);
    if(areaEng && areaEng.name) {
        ret += ": " + areaEng.name;
    }
    return ret;
}