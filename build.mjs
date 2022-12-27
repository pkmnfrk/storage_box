import {fetch} from "./fetcher.mjs";
import cliProgress from "cli-progress";
import pLimit from "p-limit";
import Spritesmith from "spritesmith";
import Vinyl from "vinyl";
import fs from "fs";
import {chunk} from "underscore";
import glob from "glob";
import path from "path";

import { getEnglish } from "./util.mjs";

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

const include_encounters = false;

const now = Date.now().toString();

try {
    await fsp.rm("dist", {recursive: true});
} catch(e) {}

try {
    await fsp.mkdir("dist");
} catch(e) {}

const template = await fsp.readFile("./template.html", "utf-8");

const pokemonApi = new Pokemon();

const bar = new cliProgress.SingleBar({
    format: "progress [{bar}] {percentage}% | {value}/{total} | {step}"
}, cliProgress.Presets.legacy);
let progressTotal = 5; // data + pokedexes + pokemon + gen sprites + gen css

bar.start(progressTotal, 0);

await copyStaticFiles();

bar.increment({"step": "Downloading Pokedexes..."});

const pokedexes = await getAllPokedexes();

bar.increment(0, {"step": "Downloading pokemon..."});

const pokemon = await getAllPokemon();

bar.increment(0, {"step": "Downloading sprites..."});

const sprites = await downloadSprites(bar);
bar.increment(0, {"step": "Building spritesheet..."});
const spritesheet = await buildSpritesheet(sprites);

bar.increment(0, {"step": "Writing CSS..."});
await writeCss(spritesheet);

await writeHtmlFiles(pokedexes);

bar.stop();

function addProgress(p) {
    progressTotal += p;
    bar.setTotal(progressTotal);
}

async function downloadSprites() {
    const fetches = [];
    
    // const pokedex = await (await fetch("https://raw.githubusercontent.com/msikma/pokesprite/master/data/pokemon.json")).json();

    // for(const pid of Object.keys(pokedex)) {
    //     const newPid = (parseInt(pid, 10)).toString();

    //     if(newPid != pid) {
    //         pokedex[newPid] = pokedex[pid];
    //         delete pokedex[pid];
    //     }
    // }

    // const ids = Object.keys(pokedex);
    // ids.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    // addProgress(ids.length);

    const work = [
        ...Object.values(pokemon).map(mon => ({
            url: `https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8/regular/${mon.name}.png`,
            filename: `${mon.id}.png`,
            name: mon.name,
        })),
        {
            url: `https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8/unknown-gen5.png`,
            filename: "0.png",
            name: "unknown",
        }
    ];

    addProgress(work.length);

    const limiter = pLimit(4);
    for(const item of work) {
        fetches.push(limiter(async () => {
            try {
                const result = await fetch(item.url);
                
                if(result.status == 200) {
                    const blob = await result.blob();
                    const buffer = blob.stream()

                    return new Vinyl({
                        path: item.filename,
                        contents: buffer,
                    });
                }

                
                // no sprite, try a fallback in extra sprites
                const extra_sprites = await fs.promises.readdir("extra_sprites/icon", { withFileTypes:false , encoding: "utf-8" });

                for(const spr of extra_sprites) {
                    const ns = spr.toLowerCase().replace(/ /g, "-").replace(".png", "");
                    if(ns === item.name || ns === item.name + "-paldea"){
                        return new Vinyl({
                            path: item.filename,
                            contents: await fs.promises.readFile("extra_sprites/icon/" + spr),
                        })
                    }
                }

                console.log("Warning: No sprite for", item.name);

            } finally {
                bar.increment();
            }
        }));
    }

    const ret = (await Promise.all(fetches)).filter(x => x);

    return ret;
}

async function getAllPokedexes() {
    const pokedexList = await pokemonApi.pokedexes();
    bar.increment();

    addProgress(pokedexList.length);

    const results = [];

    for(const dex of pokedexList) {
        const actualDex = await pokemonApi.pokedex(dex.name);
        if(actualDex.is_main_series) {
            results.push({
                ...actualDex,
                filename: actualDex.name,
            });
        }
        bar.increment(1);
    }

    //gross hax: inject a Fire Red / Leaf Green dex
    const frlg = {
        ...results[1],
        id: 999,
        // name: "frlg",
        names: [
            {
                language: {
                    name: "en",
                },
                name: "FireRed/LeafGreen Kanto dex",
            }
        ],
        descriptions: [
            {
                language: {
                    name: "en",
                },
                description: "FireRed/LeafGreen Kanto dex (same as R/B/Y, but with 30 slots per box)",
            }
        ],
        filename: "frlg",
    };

    results.splice(4, 0, frlg);

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
        if(!match) {
            debugger
        }
        css += `.p${match[1]}{background-position:${-c.x}px ${-c.y}px;}\n`;
    }

    await fsp.writeFile("dist/pokemon.css", css, "utf-8");
    bar.increment();
}

async function writeHtmlFiles(pokedexes) {
    addProgress(pokedexes.length + 1);

    await writeIndexFile(pokedexes);

    for(const dex of pokedexes) {
        bar.increment(0, {"step": "Building Dex " + dex.name + "..."});

        const size_override = dex.name in box_overrides && dex.id < 999 ? box_overrides[dex.name] : null;

        await writeHtmlFile(dex, size_override);
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
        const name = getEnglish(dex.names, {name:dex.id}).name;
        const desc = getEnglish(dex.descriptions, {description:""}).description;
        contents += `<li><a href="${dex.filename}.html">${desc || name}</a></li>`;
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
async function writeHtmlFile(dex, size_override) {
    let contents = "";
    const size = size_override ? size_override.size : 30;
    const width = size_override ? size_override.width : 6;

    bar.increment(0, {"step": dex.name + " dex - Fetching version groups"});

    let relevantVersions = [];
    if(include_encounters) {
        for(const group of dex.version_groups) {
            /** @type {import("pokedex-promise-v2").VersionGroup}*/
            let versionGroup = await pokemonApi.get(group.url);
            for(const v of versionGroup.versions) {
                relevantVersions[v.name] = await pokemonApi.get(v.url);
            }
        }
    }

    bar.increment(0, {"step": dex.name + " dex - Writing chunks"});
    

    const dexPokemon = Object.values(pokemon).filter(p => p.pokedex_numbers[dex.name]);
    dexPokemon.sort((a, b) => a.pokedex_numbers[dex.name] - b.pokedex_numbers[dex.name]);

    let start = 1;
    let end = size;
    
    {
        const name = getEnglish(dex.names, {name: dex.name}).name;
        const desc = getEnglish(dex.descriptions, {description: ""}).description;

        contents += `<h1>${name}</h1>\n`;
        if(desc) {
            contents += `<p>${desc}</p>`;
        }
        contents += `<p><a id="back" href="./">Back</a></p>\n`;

        contents += `<p>Completion: <span id="completion_num"></span>/<span id="total_pokemon">${dexPokemon.length}</span> (<span id="completion_perc"></span>%)</p>`
        contents += `<p>Boxes Complete: <span id="box_num"></span>/${Math.ceil(dexPokemon.length / size)}</p>`
    }

    contents += `<div id="dex" data-dex="${dex.filename}">`;
    for(const table of chunk(dexPokemon, size)) {
        
        contents += `<table data-start="${start}" data-end="${Math.min(end, dexPokemon.length)}">\n`;
        contents += `<caption>${start} - ${Math.min(end, dexPokemon.length)} <div class="check"></div></caption>\n`;

        bar.increment(0, {"step": dex.name + " dex - Writing chunk " + start + " - " + end + "..."});

        for(const row of chunk(table, width)) {
            contents += `<tr>\n`;
            for(const mon of row) {

                let encounterText = Object.fromEntries(Object.keys(relevantVersions).map(v => [v, []]));

                // if(dex.name != "national" && include_encounters) {
                //     const encounters = await pokemonApi.encounters(mon.id);
                //     for(const encounter of encounters) {
                //         for(const v of encounter.version_details) {
                //             if(!isRelevantEncounter(v, relevantVersions)) {
                //                 continue;
                //             }

                //             /** @type {import("pokedex-promise-v2").LocationArea} */
                //             const location = await pokemonApi.get(encounter.location_area.url);
                //             encounterText[v.version.name].push(await getLocationName(location));
                //         }
                //     }
                // }

                let finalEncounterText = "";
                // {
                //     const tmp = [];
                //     for(const version of Object.keys(relevantVersions)) {
                //         if(encounterText[version].length) {
                //             tmp.push(`${getEnglish(relevantVersions[version].names).name}: ${encounterText[version].join(", ")}`);
                //         }
                //     }
                //     if(tmp.length) {
                //         finalEncounterText = `title="${tmp.join("\n")}"`;
                //     }
                // }

                const dexId = mon.pokedex_numbers[dex.name];
                contents += `<td data-id="${dexId}" ${finalEncounterText}><div class="pokemon p${mon.id}"></div><br>#${dexId} ${mon.english_name}</td>\n`;
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

    bar.increment(0, {"step": dex.name + " dex - Writing file"});
    await fsp.writeFile(`dist/${dex.filename}.html`, finalHtml, "utf-8");
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
    const location = await pokemonApi.get(locationArea.location.url);
    let ret = getEnglish(location.names).name;

    const areaEng = getEnglish(locationArea.names);
    if(areaEng && areaEng.name) {
        ret += ": " + areaEng.name;
    }
    return ret;
}

/** 
 * @typedef PokemonSpecies
 * @property {number} id
 * @property {boolean} is_legendary
 * @property {Object.<string, number>} pokedex_numbers
 * @property {string} name
 * @property {string} english_name
 */

async function getAllPokemon() {
    const list = await pokemonApi.allSpecies();

    const limit = pLimit(4);

    const fetches = list.map(l => limit(async () => {
        /** @type {import("pokedex-promise-v2").PokemonSpecies} */
        const data = await pokemonApi.get(l.url);

        return [data.name, {
            id: data.id,
            name: data.name,
            is_legendary: data.is_legendary || data.is_mythical,
            pokedex_numbers: Object.fromEntries(data.pokedex_numbers.map((dn) => {
                return [dn.pokedex.name, dn.entry_number]
            })),
            english_name: getEnglish(data.names, { name: data.name }).name,
        }];
    }))

    /** @type {Object.<string, PokemonSpecies>} */
    const data = Object.fromEntries(await Promise.all(fetches));

    return data;
}