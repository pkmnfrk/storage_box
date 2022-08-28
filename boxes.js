/*jshint browser:true */
var body = document.getElementById("body");
//var pokedex;
var cells = {};
var gotten = [];
var boxes = [];
var generation = 0;

// var xhr = new XMLHttpRequest();
// xhr.onload = function(x) {
    
//         pokedex = JSON.parse(xhr.responseText);
        
//         onStart();
    
// };

// xhr.open("get", "pokedex.json", true);
// xhr.send();

// import pokedex from "./pokedex";

document.getElementById("save").addEventListener('change',onSaveChanged);
function onStart() {
    load();

    for(var i = 0; i < pokedex.pokemon.length; i+=30) {
        var table = document.createElement("table");

        var caption = document.createElement("caption");

        caption.appendChild(document.createTextNode((i+1) + " - " + (i + 30) + " "));
        
        var check = document.createElement("div");
        check.className = "check icheck";
        caption.appendChild(check);
        
        table.appendChild(caption);
        table.caption = caption;
        
        table.start = i + 1;
        table.end = i + 30;
        boxes.push(table);

        for(var j = i; j < i + 30; j += 6) {

            var row = document.createElement("tr");

            for(var k = j; k < j + 6; k++) {

                var cell = document.createElement("td");

                if(k < pokedex.pokemon.length) {
                    if(generation < pokedex.pokedexes.length && k >= pokedex.pokedexes[generation]) {
                        generation++;
                    }

                    cell.className = "gen" + (generation + 1);
                    
                    if(pokedex.pokemon[k].is_special) {
                        cell.className += " special";
                    }
                    //cell.appendChild(document.createTextNode(k + " "));
                    //cell.appendChild(document.createElement("br"));

                    check = document.createElement("div");
                    check.className = "check icheck";
                    cell.appendChild(check);

                    var img = document.createElement("div");
                    img.className = "pokemon pokemoni" + pad(k + 1) + "MS";
                    //img.src = "images/" + pad(k) + "MS.png";

                    cell.appendChild(img);
                    cell.appendChild(document.createElement("br"));
                    cell.appendChild(document.createTextNode(" " + pokedex.pokemon[k].name));

                    cell.addEventListener('click', onCellClick);
                    //cell.addEventListener('touchend', onCellClick);

                    cell.number = k;

                    cells[k] = cell;

                    if(gotten[k]) {
                        cell.className += " gotten";
                    } else {
                        gotten[k] = false;
                    }
                }

                row.appendChild(cell);

            }

            table.appendChild(row);

        }

        body.appendChild(table);
    }

    save();
}

function pad(n) {
	n = "" + n;
	
	while(n.length < 3) {
		n = "0" + n;
	}
	
	return n;
}

var lastClick = null;

function onCellClick(e) {
	e.preventDefault();
    if (e.stopPropagation)    e.stopPropagation();
    if (e.cancelBubble!==null) e.cancelBubble = true;
    e.stopImmediatePropagation();
    
	var cell = e.currentTarget;
	
	if(lastClick !== null && e.shiftKey) {
		var tog = !isGotten(cell);
		for(var i = Math.min(lastClick, cell.number); i <= Math.max(lastClick, cell.number); i++) {
			toggleCell(cells[i], tog);
		}
		//lastClick = null;
	} else {
		toggleCell(cell);
		lastClick = cell.number;
	}
	
	save();
	
	//alert(cell.number);
	return false;
}

var saving = false;

function onSaveChanged() {
	if(saving) return;
	
	var data = document.getElementById("save").value;
	
	for(var i = 0; i < pokedex.pokemon.length; i++) {
		
		var g = (i < data.length && data[i] == "1") ? true : false;
		
		toggleCell(cells[i], g);
		
	}
    
    save();
}

function returnself(a) { return a; }
function notlegendary(a, i) { return a && !pokedex.pokemon[i].is_special; }
function notlegendary_q(a) { return !a.is_special; }

function save() {
	saving = true;
	var data = JSON.stringify(gotten);
	
	localStorage.setItem("gotten", data);
	
	var savestring = "";
	
	for(var i = 0; i < gotten.length; i++) {
		savestring += gotten[i] ? "1" : "0";
	}
	
	document.getElementById("save").value = savestring;
	
	var stats = document.getElementById("statText");
	
	var statText = "";
    var glen = gotten.filter(returnself);
    var nonlegendary = pokedex.pokemon.filter(notlegendary_q);
    var llen = glen.filter(notlegendary);
    
	statText += "Total Obtained: " + glen.length + "/" + (gotten.length - 1) + " (" + Math.round(glen.length / gotten.length * 100) + "%)";
    
    statText += " " + llen.length + "/" + nonlegendary.length + " (" + Math.round(llen.length / nonlegendary.length * 100) + "%)";
    
    statText += "<br/>";
	
    
    
	var from = 0;
	var to = 0;
    var target;
	for(var gen = 0; gen < pokedex.pokedexes.length; gen++) {
		from = to;
		to = pokedex.pokedexes[gen];
		target = gotten.slice(from, to);
        nonlegendary = pokedex.pokemon.slice(from, to).filter(notlegendary_q);
		glen = target.filter(returnself).length;
        llen = target.filter(notlegendary).length; //this is wrong, need to fix
		
		
		statText += "Generation " + (gen + 1) + ": " + glen + "/" + target.length + " (" + Math.round(glen / target.length * 100) + "%)";
        statText += " " + llen + "/" + nonlegendary.length + " (" + Math.round(llen / nonlegendary.length * 100) + "%)";

		statText += "<br/>";
		
	}
	
	stats.innerHTML = statText;
    
    for(i = 0; i < boxes.length; i++) {
        var box = boxes[i];
        target = gotten.slice(box.start - 1, box.end);
        for(var j = 0; j < 30; j++) {
            if(target[j] === false) {
                target = false;
                break;
            }
        }
        
        if(target) {
            box.caption.className = "gotten";
        } else {
            box.caption.className = "";
        }
    }
	saving = false;
}

function load() {
	var data = localStorage.getItem("gotten");
	if(data) {
		gotten = JSON.parse(data);
        
        gotten.length = pokedex.pokemon.length;
    }
}

function isGotten(cell) {
	return cell.className.indexOf("gotten") > -1;
}

function toggleCell(cell, force) {
	var cls = cell.className.split(' ');
	
	var wasGotten = false;
	for(var i = 0; i < cls.length; i++) {
		if(cls[i] == "gotten") {
			if(force !== true) {
				cls[i] = "";
				gotten[cell.number] = false;
			}
			wasGotten = true;
		}
	}
	
	if(!wasGotten && force !== false) {
		cls.push("gotten");
		gotten[cell.number] = true;
	}
	
	cell.className = cls.join(" ");
}
		
// function updateSite(event) {
//     window.applicationCache.swapCache();
//     window.location = window.location;
// }
// window.applicationCache.addEventListener('updateready', updateSite, false);
onStart();
/*
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('worker.js')
            .then(registration => {
                console.log('Service Worker is registered', registration);
            })
            .catch(err => {
                console.error('Registration failed:', err);
            });
    });
}
*/