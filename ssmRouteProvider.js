(function (document, undefined) {

    /**
    * @ngdoc provider
    * @name ssmUrlRouterProvider
    * @methodOf ng.$route
    *
    * @description
    * Creates an ssmRoute service which listens for url changes and passes that data off to the
    * appropriate scene.
    * {@link ng.$location $location} hasn't changed.
    *
    * As a result of that, {@link ng.directive:ngView ngView}
    * creates new scope, reinstantiates the controller.
    */
    function ssmUrlRouterProvider() {
        var routes = {};

        this.when = function (path, route) {
            routes[path] = angular.extend({ reloadOnSearch: true }, route);

            // create redirection for trailing slashes
            if (path) {
                var redirectPath = (path[path.length - 1] == '/')
                    ? path.substr(0, path.length - 1)
                    : path + '/';

                routes[redirectPath] = { redirectTo: path };
            }

            return this;
        };

        this.otherwise = function (params) {
            this.when(null, params);
            return this;
        };

        this.$get = ['$rootScope', '$location', '$routeParams', '$q', '$injector', '$http', 'ssm',
        function ($rootScope, $location, $routeParams, $q, $injector, $http, ssm) {
            var forceReload = false,
            $route = {
                routes: routes,

                /**
                    * @ngdoc method
                    * @name ng.$route#reload
                    * @methodOf ng.$route
                    *
                    * @description
                    * Causes `$route` service to reload the current route even if
                    * {@link ng.$location $location} hasn't changed.
                    *
                    * As a result of that, {@link ng.directive:ngView ngView}
                    * creates new scope, reinstantiates the controller.
                    */
                reload: function () {
                    forceReload = true;
                    $rootScope.$evalAsync(updateRoute);
                },
                current: routes['/']
            };

            $rootScope.$on('$locationChangeSuccess', updateRoute);
            return $route;

            function parseRoute(path) {
                for (var urlTemplate in routes) {
                    if (!routes.hasOwnProperty(urlTemplate)) continue;
                    if (path.indexOf(urlTemplate) >= 0) return routes[urlTemplate];
                }
                //var sections = path.split('/');
                //var sceneName = sections[0];
                return routes[null];
            }
            function updateRoute() {
                var next = parseRoute($location.path()),
                    last = $route.current;

                if (next && last && next.$$route === last.$$route
                    && angular.equals(next.pathParams, last.pathParams) && !next.reloadOnSearch && !forceReload) {
                    last.params = next.params;
                    angular.copy(last.params, $routeParams);
                    $rootScope.$broadcast('$routeUpdate', last);
                } else if (next) {
                    forceReload = false;
                    $rootScope.$broadcast('$routeChangeStart', next, last);
                    $route.current = next;

                    // transition to the new scene.
                    $q.when(next).
                    then(function () {
                        if (next) {
                            var keys = [],
                                values = [],
                                template;

                            angular.forEach(next.resolve || {}, function (value, key) {
                                keys.push(key);
                                values.push(isString(value) ? $injector.get(value) : $injector.invoke(value));
                            });
                            return $q.all(values).then(function (values) {
                                var locals = {};
                                angular.forEach(values, function (value, index) {
                                    locals[keys[index]] = value;
                                });
                                return locals;
                            });
                        }
                    }).
                    // after route change
                    then(function (locals) {
                        if (next == $route.current) {
                            if (next) {
                                next.locals = locals;
                                angular.copy(next.params, $routeParams);
                                var scene = null;
                                ssm.transitionTo(next.scene, next);
                            }
                            $rootScope.$broadcast('$routeChangeSuccess', next, last);
                        }
                    }, function (error) {
                        if (next == $route.current) {
                            $rootScope.$broadcast('$routeChangeError', next, last, error);
                        }
                    });
                }
            }
        }];
    }

    angular.module('ssmAngular')
        .provider('ssmRoute', ssmUrlRouterProvider);

})(window.document);