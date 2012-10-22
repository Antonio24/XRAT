var XModules = {
	
	Command: function(){},

	CommandFactory: function(fn,obj){

		XModules[fn] = function(id,data){
			this.id = id;
			this.data = data;
			this.type = fn;
		};

		XModules[fn].prototype = new XModules.Command();
		XModules[fn].prototype.constructor = XModules[fn];

		for(var key in obj){
			XModules[fn].prototype[key] = obj[key];
		}

		return XModules;
	},

};

window.XModules = XModules;

XModules.Command.prototype.perform = function(){
	console.log(this.id + " is performing");
}
XModules.Command.prototype.complete = function() {
	console.log("completing " + this.id);
};
XModules.Command.prototype.reportProgress = function(obj) {
	console.log(this.id + " reporting: ");
	console.log("Completion: " + obj.completion + "%");
	console.log("Results: " + obj.results);
};
XModules.Command.prototype.info = function() {
	console.log("ID: " + this.id);
	console.log("TYPE: " + this.type);
	console.log(this);
};


// How one might use this factory pattern to create Command Modules
// By declaring the name that they would like to use
// Convention for the name is capitalized with the word Command appended at the end
// EX: RouterCommand
// Then just write your code inside the object that is the second parameter
// Every Command Module implements the perform function differently
// They DO NOT touch the complete function


XModules.
	CommandFactory('RouterCommand',{

		test:12,
		another:15,

		perform: function(){
			console.log("special perform");
			console.log(this);
			myresults = [];
			for(var i=1;i<=this.data.upper;i++){
				myresults.push(i);
				this.reportProgress({completion:i*(100/this.data.upper),results:myresults});
			}
			this.complete();
		},
		
	}).
	CommandFactory('AnotherCommand', {
		crazy: "yes it is",

		perform: function(){
			console.log("is this crazy? " + this.crazy);
			this.complete();
		}
	}).
	CommandFactory('BigCommand', {
		perform: function(){
			console.log("this");
			console.log("has");
			console.log("a lot");
			console.log("of steps");
			this.complete();
		}
	});



var newTest = new XModules.RouterCommand('02302',{upper:30,omg:"indeed"});
newTest.info();
newTest.perform();
// newTest.reportProgress({completion: .65,results:["monday","tuesday","wednesday"]});

var anotherTest = new XModules.AnotherCommand('02302',{test:"wtf",omg:"indeed"});
anotherTest.info();
anotherTest.perform();


