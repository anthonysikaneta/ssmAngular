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

        this.$get = ['$rootScope', '$location', '$q', 'ssm', 'ssmRouteTemplateMatcher', 'ssmDialogSvc', '$anchorScroll', '$log',
        function ($rootScope, $location, $q, ssm, routeParser, ssmDialogSvc, $anchorScroll, $log) {
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

            var goToHash = function () {
                $log.debug('ssmRoute: checking for hash');
                // only call anchor scroll if the hash isn't empty since we set it to empty after scrolling
                if ($location.hash()) {
                    $log.debug('ssmRoute: hash found... scrolling to it now');
                    $anchorScroll();
                    $location.hash('');
                }
            };

            $rootScope.$on('ssm:init', goToHash);

            return $route;

            function updateRoute() {
                
                ssmDialogSvc.closeAll();

                if (lastPath == $location.path()) {
                    goToHash();
                    return;  // early quit if the path hasn't changed.
                } else {
                    lastPath = $location.path();
                }

                var sceneData = routeParser.parseRoute($location.path());

                $rootScope.$broadcast('$routeChangeStart', sceneData, prevSceneData);

                // transition to the new scene.
                ssm.transitionTo(sceneData.scene + 'Scene', sceneData);

                $rootScope.$broadcast('$routeChangeSuccess', sceneData, prevSceneData);
                prevSceneData = sceneData;
            }
        }];
    }
