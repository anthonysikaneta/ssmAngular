(function (document, undefined) {

    function ssmProvider() {
        var _currentScene = null;
        var sceneBase = {
            name: 'Unknown',
            defaults: {}, // default configuration
            transitionTo: function (nextScene) {
                console.log('transitioning to next scene: ' + nextScene.name);
                return true;
            },
            show: function (config) {
                console.log('showing my scene: ' + this.name)
            }
        };

        this.scenes = {};

        this.addScene = function (scene) {
            this.scenes[scene.name] = angular.extend({}, sceneBase, scene);
        };

        this.$get = ['$q', '$rootScope', 'ssmLayoutMan', function ($q, $rootScope, layoutManager) {
            // TODO: move these addTemplate calls to config, but before I can do that I must make a provider for layoutManager.
            layoutManager.addTemplate('SingleTpl');
            layoutManager.addTemplate('SideBarTpl');
            return {
                scenes: this.scenes,
                transitionTo: function (sceneName, options) {
                    var nextScene = null;
                    if (nextScene = this.scenes[sceneName]) {
                        var showScene = function () {
                            _currentScene = nextScene;
                            _currentScene.show($rootScope, layoutManager);
                        };

                        if (!_currentScene) {
                            showScene();
                        } else {
                            // this lets the current scene know which scene we are going to
                            $q.when(_currentScene.transitionTo(nextScene)).then(function () {
                                showScene();
                            });
                        }
                    } else {
                        // TODO: do proper error throwing here.
                        throw 'Invalid scene name: ' + sceneName;
                    }
                }
            };
        }];
    };

    angular.module('ssmAngular')
        .provider('ssm', ssmProvider);

})(window.document);