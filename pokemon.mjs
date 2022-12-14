import {fetch, evict} from "./fetcher.mjs";
// import { Pokedex, PokemonSpecies } from "pokedex-promise-v2/types";

//const BASE_URL = "https://pokeapi.co/api/v2";
const BASE_URL = "http://localhost:8000/api/v2";

export default class Pokemon {
    constructor() {
        this.cache = {
            urls: {},
        }
    }

    /**
     * @param {integer} id 
     * @returns {import("pokedex-promise-v2").PokemonSpecies}
     */
    async species(id) {
        return await this.get(`${BASE_URL}/pokemon-species/${id}/`);
    }

    /**
     * @param {integer} id 
     * @returns {import("pokedex-promise-v2").Pokedex}
     */
    async pokedex(id) {
        return await this.get(`${BASE_URL}/pokedex/${id}/`);
    }

    /**
     * 
     * @param {integer} id 
     * @returns {import("pokedex-promise-v2").PokemonEncounter[]}
     */
    async encounters(id) {
        return await this.get(`${BASE_URL}/pokemon/${id}/encounters`);
    }

    /**
     * 
     * @param {integer} id 
     * @returns {import("pokedex-promise-v2").LocationArea}
     */
    async location(id) {
        return await this.get(`${BASE_URL}/location-area/${id}`);
    }

    /**
     * @returns {import("pokedex-promise-v2").NamedAPIResource[]}
     */
    async pokedexes() {
        return await this.getMany(`${BASE_URL}/pokedex/`);
    }

    /**
     * 
     * @returns {import("pokedex-promise-v2").NamedAPIResource[]}
     */
    async allSpecies() {
        return await this.getMany(`${BASE_URL}/pokemon-species/`);
    }

    async get(url) {
        if(!(url in this.cache.urls)) {
            let response = await fetch(url);
            
            if(response.status !== 200) {
                await response.ejectFromCache();
                response = await fetch(url);
            }

            this.cache.urls[url] = await response.json();
        }
        return this.cache.urls[url];
    }

    async getMany(url) {
        const results = [];
        while(url) {
            const data = await this.get(url);
            results.push(...data.results);
            url = data.next;
        }
        return results;
    }
}