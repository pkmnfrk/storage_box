/*jshint browser:true */
var body = document.getElementById("body");
var pokedex;
var cells = {};
var gotten = [];
var boxes = [];
var generation = 0;

var xhr = new XMLHttpRequest();
xhr.onload = function(x) {
    
        pokedex = JSON.parse(xhr.responseText);
        
        onStart();
    
};

xhr.open("get", "pokedex.json", true);
xhr.send();

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
                    //cell.appendChild(document.createTextNode(k + " "));
                    //cell.appendChild(document.createElement("br"));

                    check = document.createElement("div");
                    check.className = "check icheck";
                    cell.appendChild(check);

                    var img = document.createElement("div");
                    img.className = "pokemon i" + pad(k + 1) + "MS";
                    //img.src = "images/" + pad(k) + "MS.png";

                    cell.appendChild(img);

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
	var cell = e.currentTarget;
	
	if(lastClick && e.shiftKey) {
		var tog = !isGotten(cell);
		for(var i = Math.min(lastClick, cell.number); i <= Math.max(lastClick, cell.number); i++) {
			toggleCell(cells[i], tog);
		}
		lastClick = null;
	} else {
		toggleCell(cell);
		lastClick = cell.number;
	}
	
	save();
	
	//alert(cell.number);
	
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
    var glen = gotten.filter(returnself).length;
	statText += "Total Obtained: " + glen + "/" + (gotten.length - 1) + " (" + Math.round(glen / gotten.length * 100) + "%)<br/>";
	
    
    
	var from = 0;
	var to = -1;
    var target;
	for(var gen = 0; gen < pokedex.pokedexes.length; gen++) {
		from = to + 1;
		to = pokedex.pokedexes[gen];
		target = gotten.slice(from, to);
		glen = target.filter(returnself).length;
		
		
		
		statText += "Generation " + (gen + 1) + ": " + glen + "/" + target.length + " (" + Math.round(glen / target.length * 100) + "%)";

		if(glen == target.length) {
			
		}
		
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
	if(data)
		gotten = JSON.parse(data);
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
		
function updateSite(event) {
    window.applicationCache.swapCache();
    window.location = window.location;
}
window.applicationCache.addEventListener('updateready', updateSite, false);
