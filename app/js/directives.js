'use strict';

/* Directives */


angular.module('myApp.directives', []).
  directive('appVersion', ['version', function(version) {
    return function(scope, elm, attrs) {
      elm.text(version);
    };
  }]).
  directive('test',function(){
  	return {
  		restrict: 'E',
  		template: '<p>Hello World</p>'
  	}
  });