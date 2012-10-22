'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
angular.module('myApp.services', ['ngResource']).
  factory('TEST', function($resource){
  	return $resource('/addcommand',{}, {
  		add: {method:'POST',params:{target:"0",type:"alert",command:"Hello world"}}
  	});
  }).
  factory('Command',function($http){
  	return {
  		add: function(params){
  			$.post('/addcommand', params, function(data){
				console.log("Command sent");
			});
  		},
  		doAnotherThing:function(){
  			console.log("doing another thing");
  		}
  	}
  }).
  factory('Node',function($http){
    return {
      update: function(id,params){
        console.log("updating node " + id);
        console.log(params);
        $.post('/updatenode',params, function(data){
            console.log("sending update request");
        });
      },
      flush: function(){
        console.log("flushing all memcache on server");
        $.post('/flushallnodes', {confirm:"yes"}, function(data){
          console.log("Flush command sent");
        });
      }
    }
  }).
  factory('GLOBAL', function(){
  	return {
      modal: {
        header: "Change the poll speed of this node",
        body: ""
      },
  	}
  });


