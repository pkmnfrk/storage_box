var body = document.getElementById("body");
		var nPokemon = 719;
		var generations = [151, 251, 386, 493, 649, 719];
		var cells = {};
		var gotten = [];
		
		var generation = 0;
		
		load();
		
		for(var i = 1; i <= nPokemon; i+=30) {
			var table = document.createElement("table");
			
			var caption = document.createElement("caption");
			
			caption.appendChild(document.createTextNode(i + " - " + (i + 30)));
			
			table.appendChild(caption);
			
			for(var j = i; j < i + 30; j += 6) {
				
				var row = document.createElement("tr");
				
				for(var k = j; k < j + 6; k++) {
					
					var cell = document.createElement("td");
					
					if(k <= nPokemon) {
						if(generation < generations.length && k > generations[generation]) {
							generation++;
						}
						
						cell.className = "gen" + (generation + 1);
						//cell.appendChild(document.createTextNode(k + " "));
						//cell.appendChild(document.createElement("br"));
						
						var check = document.createElement("div");
						check.className = "check icheck";
						cell.appendChild(check);
						
						var img = document.createElement("div");
						img.className = "pokemon i" + pad(k) + "MS";
						//img.src = "images/" + pad(k) + "MS.png";
					
						cell.appendChild(img);
						
						cell.onclick = onCellClick;
						
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
		
		function pad(n) {
			n = "" + n;
			
			while(n.length < 3) {
				n = "0" + n;
			}
			
			return n;
		}
		
		var lastClick = null;
		
		function onCellClick(e) {
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
		
		function save() {
			var data = JSON.stringify(gotten);
			
			localStorage.setItem("gotten", data);
			
			var savestring = "";
			
			for(var i = 1; i < gotten.length; i++) {
				savestring += gotten[i] ? "1" : "0";
			}
			
			document.getElementById("save").value = savestring;
			
			var stats = document.getElementById("statText");
			
			var statText = "";
			statText += "Total Obtained: " + gotten.filter(function(a) { return a; }).length + "/" + (gotten.length - 1) + "<br/>";
			
			var from = 0;
			var to = 0;
			for(var gen = 0; gen < generations.length; gen++) {
				from = to + 1;
				to = generations[gen];
				var target = gotten.slice(from, to + 1);
				var gc = target.filter(function(a) { return a; }).length;
				
				
				
				statText += "Generation " + (gen + 1) + ": " + gc + "/" + target.length;

				if(gc == target.length) {
					
				}
				
				statText += "<br/>";
				
			}
			
			stats.innerHTML = statText;
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