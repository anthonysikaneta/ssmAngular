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

        this.$get = ['$rootScope', '$location', '$q', '$injector', 'ssm', 'ssmRouteTemplateMatcher',
        function ($rootScope, $location, $q, $injector, ssm, routeParser) {
            var forceReload = false,
            $route = {
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
                    forceReload = true;  // currently not hooked up.  --JM
                    $rootScope.$evalAsync(updateRoute);
                }
            },
            lastPath = null,
            prevSceneData = null;

            $rootScope.$on('$locationChangeSuccess', updateRoute);
            return $route;

            function updateRoute() {

                if (lastPath == $location.path()) {
                    return;  // early quit if the path hasn't changed.
                } else {
                    lastPath = $location.path();
                }

                var sceneData = routeParser.parseRoute($location.path());

                $rootScope.$broadcast('$routeChangeStart', sceneData, prevSceneData);

                // transition to the new scene.
                ssm.transitionTo(sceneData.scene+'Scene', sceneData);
                
                $rootScope.$broadcast('$routeChangeSuccess', sceneData, prevSceneData);
                prevSceneData = sceneData;
            }
        }];
    }
