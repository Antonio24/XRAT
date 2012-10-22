'use strict';

angular.module('myApp', ['myApp.filters', 'myApp.services', 'myApp.directives']).
  config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/dashboard', {templateUrl: '/app/partials/dashboard.html', controller: DashboardCtrl});
    $routeProvider.when('/moduleinfo', {templateUrl: '/app/partials/modules.html', controller: ModuleInfoCtrl});
    $routeProvider.when('/jobs', {templateUrl: '/app/partials/jobs.html', controller: JobsCtrl});
    $routeProvider.when('/help', {templateUrl: '/app/partials/help.html', controller: HelpCtrl});
    $routeProvider.when('/settings', {templateUrl: '/app/partials/settings.html', controller: SettingsCtrl});
    $routeProvider.otherwise({redirectTo: '/dashboard'});
  }]);
