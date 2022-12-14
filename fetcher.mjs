import defaultFetch, { fetchBuilder, FileSystemCache, MemoryCache } from "node-fetch-cache";

let fetch = defaultFetch;
let cache = new MemoryCache();

if(true) {
    cache = new FileSystemCache({
        cacheDirectory: "./cache",
    })
}

fetch = fetchBuilder.withCache(cache);

export async function evict(key) {
    await cache.remove(key);
}

export {fetch};