import {fetch} from "./fetcher.mjs";
import Pokemon from "./pokemon.mjs";
import { getEnglish } from "./util.mjs";
import pLimit from "p-limit";

const rootUrl = "https://bulbapedia.bulbagarden.net/w/index.php"
const pokemon = new Pokemon();

//{{Availability/Entry2|v=Let's Go Pikachu|v2=Let's Go Eevee|area=[[Route]]s {{rtn|12|Kanto}} and {{rtn|13|Kanto}}}}
const extractorBoth = /^\{\{Availability\/Entry\d(?:\/None)?\|v=Let's Go Pikachu\|v2=Let's Go Eevee\|area=(.*)\}\}$/m;
const extractorPikachu = /^\{\{Availability\/Entry\d(?:\/None)?\|v=Let's Go Pikachu\|area=(.*)\}\}$/m;
const extractorEevee = /^\{\{Availability\/Entry\d(?:\/None)?\|v=Let's Go Eevee\|area=(.*)\}\}$/m;

export async function getLGPELocationsFromBulbapedia(pokemon) {
    const url = `${rootUrl}?title=${pokemon}_(Pok%C3%A9mon)&action=edit`;
    const data = await (await fetch(url)).text();

    const availability = extractorBoth.exec(data);

    if(availability) {
        return {"both": availability[1]};
    }

    const ret = {};
    const availabilityPikachu = extractorPikachu.exec(data);
    const availabilityEevee = extractorEevee.exec(data);

    if(availabilityPikachu) {
        ret.pikachu = availabilityPikachu[1];
    }
    if(availabilityEevee) {
        ret.eevee = availabilityEevee[1];
    }
    
    return ret;
}

function parseEncounterText(text) {
    const badTerms = [
        "Evolution",
        "Route",
        "Cinnabar Island",
    ]
    const ret = [];
    let nextIsTrade = false;
    console.log(text);
    for(const b of text.matchAll(/(?:\[\[(.*?)(?:\|(.*?))?\]\])|(?:\{\{rtn?\|(\d+)\|Kanto\}\})/g)) {
        console.log(b);
        if(b[2] && b[2].toLowerCase() === "only one") {
            ret[ret.length - 1].type = "event";
        } else if(b[2] && b[2].toLowerCase() === "only two") {
            ret[ret.length - 2].type = "event";
            ret[ret.length - 1].type = "event";
        } else if(b[1] === "Cinnabar Lab") {
            ret[ret.length - 1].type = "revive";
        } else if(b[1] === "Poké Ball Plus") {
            ret.push({
                type: "pay2win",
                name: "Poké Ball Plus",
            });
        } else if(b[2] === "Sea Skim") {
            for(const r of ret) {
                r.type = "surf";
            }
        } else if(b[2] === "Buy") {
            ret.push({
                type: "buy",
                name: "Magikarp salesman on Route 4"
            });
        } else if(badTerms.indexOf(b[1]) !== -1) {
            continue;
        } else if(b[1] === "In-game trade") {
            nextIsTrade = true;
        } else if(b[3]) {
            ret.push({
                type: "location",
                name: "Route " + b[3],
            })
        } else {
            ret.push({
                type: nextIsTrade ? "trade" : "location",
                name: b[1],
            });
        }

    }

    return ret;
}

function formatEncounters(encounters) {
    if(!encounters.length) {
        return "Not found";
    }

    let ret = "";

    for(const e of encounters) {
        if(ret) {
            ret += ", ";
        }

        switch(e.type) {
            case "event":
                ret += `${e.name} (event)`;
                break;
            case "trade":
                ret += `${e.name} (trade)`;
                break;
            case "location":
                ret += `${e.name} (walking)`;
                break;
            case "pay2win":
                ret += `${e.name} (accessory)`;
                break;
            case "revive":
                ret += `${e.name} (fossil)`;
                break;
            case "buy":
                ret += e.name;
                break;
            case "surf":
                ret += `${e.name} (surfing)`;
                break;
            default:
                ret += `${e.name} (unknown)`;
                break;
        }
    }

    return ret;

}

const actions = [];
const limit = pLimit(10);

for(let id = 1; id <= 151; id++) {
    actions.push(limit(async (id) => {
        const mon = await pokemon.species(id);
        const name = getEnglish(mon.names).name;
        return [id, name];
    }, id));
}

const mons = await Promise.all(actions);

actions.splice(0, actions.length);

for(const mon of mons) {
    actions.push(limit(async (mon) => {
        const encounters = await getLGPELocationsFromBulbapedia(mon[1]);

        if(encounters.both) {
            const encountersB = parseEncounterText(encounters.both);
            return `#${mon[0]} ${mon[1]}: (P/E) ${formatEncounters(encountersB)}`;
        }

        const encountersP = parseEncounterText(encounters.pikachu);
        const encountersE = parseEncounterText(encounters.eevee);

        return `#${mon[0]} ${mon[1]}: (P) ${formatEncounters(encountersP)} (E) ${formatEncounters(encountersE)}`;
    }, mon));
}

const encounters = await Promise.all(actions);

for(const e of encounters) {
    console.log(e);
}

// await getLGPELocationsFromBulbapedia("ditto");