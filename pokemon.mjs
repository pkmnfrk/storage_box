// import { Pokedex, PokemonSpecies } from "pokedex-promise-v2/types";

export default class Pokemon {
    constructor(fetch) {
        this.fetch = fetch;
        this.cache = {
            species: {},
            pokedexes: {},
        }
    }

    /**
     * @param {integer} id 
     * @returns {import("pokedex-promise-v2").PokemonSpecies}
     */
    async species(id) {
        if(!(id in this.cache.species)) {
            this.cache.species[id] = await this.get(`https://pokeapi.co/api/v2/pokemon-species/${id}/`);
        }
        
        return this.cache.species[id];
    }

    /**
     * @param {integer} id 
     * @returns {import("pokedex-promise-v2").Pokedex}
     */
    async pokedex(id) {
        if(!(id in this.cache.pokedexes)) {
            this.cache.pokedexes[id] = await this.get(`https://pokeapi.co/api/v2/pokedex/${id}/`);
        }

        return this.cache.pokedexes[id];
    }

    /**
     * @returns {import("pokedex-promise-v2").NamedAPIResource[]}
     */
    async pokedexes() {
        return await this.getMany(`https://pokeapi.co/api/v2/pokedex/`);
    }

    async get(url) {
        return await (await this.fetch(url)).json();
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