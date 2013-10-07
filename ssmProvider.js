    function ssmProvider() {
        var _currentScene = null,
            viewDefinitions = {},
            viewPriorityMap = {},
            views = {},
            viewTemplatesBaseURL = "/Client/tpl/",
            defaultScene = 'DefaultScene';

        this.scenes = {};

        var sceneBase = {
            name: 'Unknown',
            transitionTo: function (nextScene) {
                console.debug('transitioning to next scene: ' + nextScene.name);

                return true;
            },
            // the sequence filter should be built into the eventAggregator and not have to be passed in seperately.
            show: function (eventAggregator, layoutManager, behaviourSvc, sequenceFilter) {
                var that = this;
                console.log('showing my scene: ' + this.name)
                layoutManager.setTemplate(this.config.layouts[0])
                    .then(function (slm) {
                        // render views in their respective view priorities.
                        for (var viewName in that.config.viewPriorityMap) {
                            if (!that.config.viewPriorityMap.hasOwnProperty(viewName)) continue;
                            slm.addView(views[viewName.replace('_', '')], that.config.viewPriorityMap[viewName]);
                        }
                    });
            },
            resolveDependencies: function($q, $http, $templateCache) {
                for (var viewName in this.config.viewPriorityMap) {
                    if (!this.config.viewPriorityMap.hasOwnProperty(viewName)) continue;

                    viewName = viewName.replace('_', '');
                    views[viewName] = viewDefinitions[viewName].template;
                    if (viewDefinitions[viewName].templateUrl) {
                        resolveTemplate(viewName, viewDefinitions[viewName].templateUrl, views, $q, $http, $templateCache);
                    }
                }
            }
        };

        this.defaultScene = function (sceneName) {
            defaultScene = sceneName;
        };

        this.addView = function (name, template, config) {
            var view = {
                name: name,
                templateUrl: template ? null : viewTemplatesBaseURL + name + ".html",
                template: template,
                config: config
            };
            viewDefinitions[name] = view;
            return this;
        };

        this.addScene = function (scene) {
            this.scenes[scene.name] = angular.extend({}, sceneBase, scene);
        };

        this.$get = ['$q', '$http', '$templateCache', '$rootScope', 'ssmLayoutMan', function ($q, $http, $templateCache, $rootScope, layoutManager) {
            // TODO: move these addTemplate calls to config, but before I can do that I must make a provider for layoutManager.
            return {
                scenes: this.scenes,
                transitionTo: function (sceneName, options) {
                    var nextScene = this.scenes[sceneName];
                    if (!nextScene) nextScene = this.scenes[defaultScene];  // TODO: allow default scene name to be configured.

                    nextScene.resolveDependencies($q, $http, $templateCache);

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
                    //} else {
                    //    throw Error('Invalid scene name: ' + sceneName);
                    //}
                }
            };
        }];
    };
