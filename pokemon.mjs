// import { Pokedex, PokemonSpecies } from "pokedex-promise-v2/types";

const BASE_URL = "https://pokeapi.co/api/v2";

export default class Pokemon {
    constructor(fetch) {
        this.fetch = fetch;
        this.cache = {
            urls: {},
            species: {},
            pokedexes: {},
            encounters: {},
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

    async get(url) {
        if(!(url in this.cache.urls)) {
            this.cache.urls[url] = await (await this.fetch(url)).json();
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