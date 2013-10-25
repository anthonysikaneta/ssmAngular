    function ssmProvider(ssmLayoutProvider) {
        var _currentScene = null,
            viewDefinitions = {},
            viewPriorityMap = {},
            viewTemplates = {},
            viewTemplatesBaseURL = "/Client/tpl/",
            viewBaseURL = '/Client/views/',
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
          
                console.log('waiting for dependencies to resolve: ' + this.name);

                layoutManager.setTemplate(this.layout)
                    .then(function (slm) {
                        // render viewTemplates in their respective view priorities.
                        for (var viewName in that.config.viewPriorityMap) {
                            if (!that.config.viewPriorityMap.hasOwnProperty(viewName)) continue;
                            
                            var f = function (vw) {
                                that.waitForDepsToResolve.then(function () {
                                    console.log('dependencies have resolved: ' + that.name);
                                    that.views[vw].template = viewDefinitions[vw.replace('_', '')].template;
                                    slm.addView(that.views[vw], that.config.viewPriorityMap[vw]);
                                });
                            };
                            f(viewName); // need a closure around viewName so the async then function is invoked with the current value of viewName
                        }
                    });

            },
            resolveDependencies: function ($q, $http, $templateCache, $injector) {
                var deps = [];
                for (var viewName in this.config.viewPriorityMap) {
                    if (!this.config.viewPriorityMap.hasOwnProperty(viewName)) continue;
                    viewName = viewName.replace('_', '');
                    var view = viewDefinitions[viewName];
                    if (!view) throw Error('The view: ' + viewName + ' doesnt exist.');

                    viewTemplates[viewName] = view.template;
                    if (viewDefinitions[viewName].templateUrl) {
                        resolveTemplate(viewName, viewDefinitions[viewName].templateUrl, viewTemplates, $q, $http, $templateCache);
                        view.template = viewTemplates[viewName]; // TODO: fix this code bc it has grown complex due to unnecessary viewTemplates obj.   just treat the template as a resolve.
                    }

                    var keys = [],
                        values = [],
                        template;

                    angular.forEach(view.resolve || {}, function (value, key) {
                        keys.push(key);
                        values.push(angular.isString(value) ? $injector.get(value) : $injector.invoke(value));
                    });

                    var waitForAllViewDependenciesToResolve = $q.all(values).then(function (values) {
                        var locals = {};
                        angular.forEach(values, function (value, index) {
                            locals[keys[index]] = value;
                        });
                        return locals;
                    })
                    .then(function(locals) {
                        view.locals = locals;
                        // TODO: add the route parameters (view configs) to the locals
                        return locals; // this return is not being used but I think it must return something.. not sure...
                    });

                    deps.push(waitForAllViewDependenciesToResolve);
                }
                return this.waitForDepsToResolve = $q.all(deps);
            }
        };

        this.defaultScene = function (sceneName) {
            defaultScene = sceneName;
        };

        this.addView = function (name, template, config) {
            var baseURL = name.indexOf('+') < 0 ? viewTemplatesBaseURL : viewBaseURL;

            if (!config) config = {  };
            var view = {
                name: name,
                templateUrl: template ? null : baseURL + name.replace('+','/') + ".html",
                template: template,
                locals: config.locals ? config.locals : {},
                controller: config.controller ? config.controller : name.replace('+','') + 'Ctrl',
                resolve: config.resolve ? config.resolve : {}
            };
            viewDefinitions[name] = view;
            return this;
        };

        this.addScene = function (scene) {
            for (var i = 0; i < scene.config.layouts.length; i++) {
                ssmLayoutProvider.addLayout(scene.config.layouts[i]);
            }
            
            scene = this.scenes[scene.name] = angular.extend({}, sceneBase, scene);
            scene.views = {};
            for (var viewName in scene.config.viewPriorityMap) {
                if (!scene.config.viewPriorityMap.hasOwnProperty(viewName)) continue;
                var actualViewName = viewName.replace('_', '');
                // when choosing a view whatever access the views collection must be aware that underscores need
                // to be stripped in viewName.  This is to support having many of the same view in the same scene.
                scene.views[viewName] = angular.extend({}, viewDefinitions[actualViewName]);
            }
            scene.layout = scene.config.layouts[0];
            scene.layouts = scene.config.layouts;
        };

        this.$get = ['$q', '$http', '$templateCache', '$rootScope', 'ssmLayoutMan', '$injector', function ($q, $http, $templateCache, $rootScope, layoutManager, $injector) {
            // TODO: move these addTemplate calls to config, but before I can do that I must make a provider for layoutManager.
            return {
                scenes: this.scenes,
                transitionTo: function (sceneName, options) {
                    var nextScene = this.scenes[sceneName];
                    if (!nextScene) nextScene = this.scenes[defaultScene];

                    if (options.views) {
                        _.forEach(options.views, function (viewData) {
                            if(viewData.name)
                                nextScene.views[viewData.name].locals = { locals: viewData.config };
                        });
                    }

                    if (nextScene.layouts.indexOf(options.layout) >= 0) {
                        nextScene.layout = options.layout;
                    }

                    var showScene = function () {
                        nextScene = nextScene;
                        nextScene.show($rootScope, layoutManager);
                    };

                    nextScene.resolveDependencies($q, $http, $templateCache, $injector);

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

    ssmProvider.$inject = ['ssmLayoutManProvider'];