const dex = $("#dex");
const dexId = dex.data("dex");

const localDex = loadLocalDex(dexId);

const gottenBoxes = [];
const pokemonCount = parseInt($("#total_pokemon").text(), 10);

// localStorage["dex-latest"] = dexId;

for(let i = 0; i < localDex.length; i++) {
    if(localDex[i]) {
        $("td[data-id=" + (i + 1) + "]").addClass("gotten");
    }
}

for(const table of $("table")) {
    adjustGottenStatus(table);
}

updateStats();

// $("#back").on("click", () => {
//     window.localStorage["dex-latest"] = "";
// })

dex.on("click", "td", function(e) {
    const id = $(this).data("id");

    localDex[id - 1] = !localDex[id - 1];

    if(localDex[id - 1]) {
        $(this).addClass("gotten");
    } else {
        $(this).removeClass("gotten");
    }

    const table = $(this).closest("table");
    adjustGottenStatus(table);

    writeLocalDex(dexId, localDex);
    updateStats();
});

function adjustGottenStatus(table) {
    const start = $(table).data("start");
    const end = $(table).data("end");

    let allGotten = true;
    for(let i = start - 1; i < end; i++) {
        allGotten = allGotten && localDex[i];
    }
    
    if(allGotten) {
        $(table).addClass("gotten");
        if(gottenBoxes.indexOf(start) == -1) {
            gottenBoxes.push(start);
        }
    } else {
        $(table).removeClass("gotten");
        if(gottenBoxes.indexOf(start) !== -1) {
            gottenBoxes.splice(gottenBoxes.indexOf(start), 1);
        }
    }
}

function loadLocalDex(id) {
    const data = localStorage["dex-" + id];

    if(data) {
        return parseRle(data);
    } 
    
    return [];
}

function writeLocalDex(id, dex) {
    const data = writeRle(dex);

    localStorage["dex-" + id] = data;
}

function parseRle(data) {
    const ret = [];

    while(data.length) {
        const num = /^(\d+)/.exec(data);
        if(num) {
            data = data.substring(num[1].length);
            const c = data[0];
            data = data.substring(1);

            if(c != "t" && c != "f") {
                throw new Error("Unexpected character " + c);
            }

            for(let i = 0; i < parseInt(num[1], 10); i++) {
                ret.push(c == "t" ? true : false);
            }
        } else {
            const c = data[0];
            data = data.substring(1);

            if(c != "t" && c != "f") {
                throw new Error("Unexpected character " + c);
            }

            ret.push(c == "t" ? true : false);
        }
    }

    return ret;
}

function writeRle(data) {
    let ret = "";
    
    for(let i = 0; i < data.length; i++) {
        const c = !!data[i];
        let count = 1;
        for(i += 1; i < data.length; i++) {
            if((!!data[i]) === c) {
                count += 1;
            } else {
                i -= 1;
                break;
            }
        }

        if(count > 2) {
            ret += count.toString();
            ret += c ? "t" : "f";
        } else {
            for(let j = 0; j < count; j++) {
                ret += c ? "t" : "f";
            }
        }
    }

    return ret;
}

function updateStats() {
    let havePokemon = localDex.filter(x => x).length;
    let perc = Math.floor(havePokemon / pokemonCount * 1000) / 10;
    
    $("#completion_num").text(havePokemon.toString());
    $("#completion_perc").text(perc.toString());
    $("#box_num").text(gottenBoxes.length);

}