(function (document, undefined) {
    function resolveTemplate(tplName, tplUrl, resolved, $q, $http, $templateCache) {
        var d = $q.defer();
        $http.get(tplUrl, { cache: $templateCache })
            .success(function (html) {
                d.resolve(html);
            })
            .error(function () { throw 'Failed to load template: ' + tplName });
        resolved[tplName] = d.promise;
    }
﻿angular.module('ssmAngular', [])
        .directive('ssmLayout', ['$compile', 'ssmRoute', 'ssmLayoutMan', function ($compile, $route, layoutManager) {
            return {
                replace: true,
                compile: function (tElement, tAttrs) {
                    return function (scope, element, attrs) {
                        layoutManager.setTemplateFunc = function (tpl) {
                            element.html(tpl);
                            $compile(element.contents())(scope);
                            return true; // right now this func is expected to return a promise or value (which gets converted to a promise)
                        };
                    };
                },
            };
        }])
        .directive('ssmViewport', ['$compile', 'ssmLayoutMan', '$log', '$controller', function ($compile, layoutManager, $log, $controller) {
            return {
                restrict: 'AE',
                link: function (scope, element, attrs) {
                    var vp = parseInt(attrs.visualPriority, 10),
                        lastScope; 
                    $log.log('attr visualPriority: ' + vp);

                    function destroyLastScope() {
                        if (lastScope) {
                            lastScope.$destroy();
                            lastScope = null;
                        }
                    }

                    function clearContent() {
                        element.html('');
                        destroyLastScope();
                    }

                    layoutManager.viewPorts[vp] = {
                        destroy: function() { clearContent(); }, 
                        renderView: function (view) {
                            clearContent();
                            element.html(view.template);

                            var link = $compile(element.contents()),
                                controller;

                            lastScope = view.scope = scope.$new();
                            if (view.controller) {
                                view.locals.$scope = lastScope;
                                controller = $controller(view.controller, view.locals);
                                element.children().data('$ngControllerController', controller);
                            }
                            link(lastScope);
                        }
                    };
                }
            };
        }]);
﻿function ssmLayoutManProvider() {
    var viewPorts = [],
        views = [],  // list of all views shown and in which viewports they belong.
        layouts = {}, // layouts in here are either raw html string templates or promises from the API.
        layoutNames = {}, // layoutNames with their templates if they have one.
        layoutNamesBaseURL = 'Client/layouts/';

    this.setTemplatelayoutNamesBaseURL = function (path) {
        layoutNamesBaseURL = path;
    };

    this.addLayout = function(layoutName, layoutMarkup) {
        layoutNames[layoutName] = layoutMarkup;
    }

    this.$get = ['$http', '$templateCache', '$q', function ($http, $templateCache, $q) {
        // download any layoutNames that must be downloaded immediately.
        for (var layoutName in layoutNames) {
            if (!layoutNames.hasOwnProperty(layoutName)) continue;

            if (layoutNames[layoutName]) {
                layouts[layoutName] = layoutNames[layoutName];
            } else {
                resolveTemplate(layoutName, layoutNamesBaseURL + layoutName + '.html', layouts, $q, $http, $templateCache);
            }
        }

        return {
            addView: function (view, viewPortId) {
                var viewPort = null;
                views[viewPortId] = view;
                if (viewPort = viewPorts[viewPortId]) {
                    $q.when(view.template).then(function (template) { // TODO: refactor: could instead wait on the entire view's dependencies if I rolled the template into the resolve and just passed a view as a promise or a value.
                        view.template = template;
                        viewPort.renderView(view);  
                    });
                } else {
                    throw new Error('No viewport: ' + viewPortId);
                }
            },
            viewPorts: viewPorts,  // gets set by the ssm-Viewport directives as they link.
            setTemplate: function (templateName) {
                var d = $q.defer();
                var that = this;
                var newTemplate = null;
                if (!(newTemplate = layouts[templateName])) throw 'No template: ' + templateName;

                // must first destroy the views in each viewport because they are connected to $watch and other events
                angular.forEach(viewPorts, function (viewPort, index) {
                    if (viewPort) viewPort.destroy();
                });

                // load the new template
                $q.when(newTemplate).then(function (newTemplate) {
                    d.resolve(that);
                    $q.when(that.setTemplateFunc(newTemplate)).then(function () {
                        for (var i = 0; i < views.length; i++) {
                            if (views[i])
                                viewPorts[i].renderView(views[i]);
                        }
                    });
                });

                return d.promise;
            },
            setTemplateFunc: function (tpl) { } // gets set by the ssmLayout directive,
        };
    }];
}
﻿    function ssmProvider() {
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

                layoutManager.setTemplate(this.config.layouts[0])
                    .then(function (slm) {
                        // render viewTemplates in their respective view priorities.
                        for (var viewName in that.config.viewPriorityMap) {
                            if (!that.config.viewPriorityMap.hasOwnProperty(viewName)) continue;
                            var f = function (vw) {
                                that.waitForDepsToResolve.then(function () {
                                    console.log('dependencies have resolved: ' + that.name);
                                    slm.addView(viewDefinitions[vw.replace('_', '')], that.config.viewPriorityMap[vw]);
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
            this.scenes[scene.name] = angular.extend({}, sceneBase, scene);
        };

        this.$get = ['$q', '$http', '$templateCache', '$rootScope', 'ssmLayoutMan', '$injector', function ($q, $http, $templateCache, $rootScope, layoutManager, $injector) {
            // TODO: move these addTemplate calls to config, but before I can do that I must make a provider for layoutManager.
            return {
                scenes: this.scenes,
                transitionTo: function (sceneName, options) {
                    var nextScene = this.scenes[sceneName];
                    if (!nextScene) nextScene = this.scenes[defaultScene];  // TODO: allow default scene name to be configured.

                    nextScene.resolveDependencies($q, $http, $templateCache, $injector);

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
﻿    /**
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

        this.$get = ['$rootScope', '$location', '$routeParams', '$q', '$injector', 'ssm', 'ssmRouteTemplateMatcher',
        function ($rootScope, $location, $routeParams, $q, $injector, ssm, routeParser) {
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
﻿    function ssmRouteTemplateMatcherProvider() {
        var routeTemplates = {};
        var compiledRouteTemplates = {};
        var templateElementParsers = {};
        var route = null;


        var compileRouteTemplate = function (tpl) {
            compiledRouteTemplates[tpl] = {
                chunks: getChunks(tpl)
            };
        };

        // You can add a new template element and provide a parser for it.  
        // Example template element: {myTemplateElement}  
        // Template elements are marked by the curly braces within the template. 
        // parseFunc must match the following interface function(match) { return { }; }
        this.addTemplateElement = function(templateElementString, parseFunc) {
            templateElementParsers[templateElementString] = parseFunc; 
        };

        this.addTemplateElement('config', function (part) {
            var splitByDash = part.split('-');
            var ret = {};
            for (var i = 0; i < splitByDash.length; i += 2) {
                ret[splitByDash[i]] = splitByDash[i + 1];
            }
            return ret;
        });

        this.addRouteTemplate = function (tpl, desc) {
            routeTemplates[tpl] = desc;
            compileRouteTemplate(tpl);
        };

        // returns true if the chunk was a match.
        function matchChunkToPart(chunk, part, ret) {
            if (chunk.params) {
                var match = part.match(chunk.regex);
                if (!match) return false;
                for (var pIndex = 0; pIndex < chunk.params.length; pIndex++) {
                    if (chunk.params[pIndex] == 'view') {
                        if (!ret['views']) ret['views'] = [];
                        var view = {
                            name: match[pIndex + 1],
                        };
                        if (chunk.elementParser) {
                            var elementPart = part.replace(match[pIndex], '');
                            if (elementPart[0] == '-') elementPart = elementPart.substr(1);
                            view[chunk.elementName] = chunk.elementParser(elementPart);
                        }
                        ret['views'].push(view);
                    } else {
                        ret[chunk.params[pIndex]] = match[pIndex + 1];
                    }
                }
                return true;
            }
        }
        
        // in order for a template to be considered a match, all chunks must much each part.
        var matchTemplate = function (path) {
            var parts = path.split('/');
            
            for (var tpl in compiledRouteTemplates) {
                var ret = {};
                if (!compiledRouteTemplates.hasOwnProperty(tpl)) continue;
                var compiled = compiledRouteTemplates[tpl];
                // parts.length is subtraced by 1 because the path must start with a '/' and so first element is empty.
                if ((parts.length-1) >= compiled.chunks.length) {
                    var isMatch = false;
                    var chunkIndex = 1;
                    for (var i = 1; i < parts.length; i++) {
                        var chunk = compiled.chunks[chunkIndex];
                        if (undefined === chunk) {
                            isMatch = false;
                            break;
                        }
                        var repeat = chunk.repeatPrevious;
                        if (repeat) chunk = compiled.chunks[chunkIndex-1];  // assumes there is more than one for performance optimization.

                        isMatch = matchChunkToPart(chunk, parts[i], ret);
                        
                        if (!repeat) {
                            chunkIndex++;
                            if (!isMatch) break;
                        }
                        else if (repeat && !isMatch) {
                            chunkIndex++;
                            if (chunkIndex < compiled.chunks.length) {
                                isMatch = matchChunkToPart(compiled.chunks[chunkIndex], parts[i], ret);
                                if (!isMatch) break;
                                chunkIndex++;
                            } else {
                                isMatch = false;
                                break;
                            }
                        }
                    }
                    if (isMatch) return [tpl, ret];
                } 
            }
            return [null, null];
        };

        this.$get = function () {
            return {
                matchTemplate: function (path) { return matchTemplate(path)[0]; }, // exposed for unit testing only.
                // method: parsePathIntoParams
                // converts a path Ex. "/userscene/layout-awesomelayout"
                // into: {sceneName: "usersscene", layout: "awesomeLayout" }
                parseRoute: function (path) {
                    return matchTemplate(path)[1];
                },
                route: route
            };
        };

        function getParams(path) {
            var params = path.match(/:(\w+)/g)
            for (var i = 0; i < params.length; i++) {
                params[i] = params[i].replace(':', '');
            }
            return params;
        };

        function getChunks(path) {
            var parts = path.split('/');
            var chunks = {};
            var repeats = 0;
            for (var i = 1; i < parts.length; i++) {
                var part = parts[i],
                    els = null;
                //if (t.indexOf('-') > 0) {
                //    els = t.split('-');
                //}

                if (part == '*') {
                    chunks[i] = {
                        repeatPrevious: true
                    }
                    repeats += 1;
                } else {
                    var re = /:(\w+)/g,
                        regex = '',
                        paramMatch,
                        lastMatchedIndex = 0,
                        trimmedPart = part,
                        params = [],
                        templateElement;

                    if (part.indexOf('{') > 0) {
                        var startOfElement = path.indexOf('{');
                        trimmedPart = part.substr(0, startOfElement);
                        // template elements are defined between the squiggly brackets
                        templateElement = path.substr(startOfElement + 1, path.indexOf('}') - startOfElement - 1);
                    }

                    while ((paramMatch = re.exec(trimmedPart)) !== null) {
                        // Find each :param in `when` and replace it with a capturing group.
                        // Append all other sections of when unchanged.
                        regex += trimmedPart.slice(lastMatchedIndex, paramMatch.index);
                        regex += '([^\\/-]*)';
                        params.push(paramMatch[1]);
                        lastMatchedIndex = re.lastIndex;
                    }

                    chunks[i] = {
                        params: params,
                        regex: new RegExp(regex),
                        elementParser: templateElement ? templateElementParsers[templateElement] : null,
                        elementName: templateElement,
                        repeatPrevious: false
                    }
                }
            }
            chunks.length = parts.length - 1 - repeats; // the first element will be empty because each template is supposed to have a slash (/) at the beginning.
            return chunks;
        }
    }
﻿angular.module('ssmAngular')
    .provider('ssmRoute', ssmUrlRouterProvider)
    .provider('ssmRouteTemplateMatcher', ssmRouteTemplateMatcherProvider)
    .provider('ssm', ssmProvider)
    .provider('ssmLayoutMan', ssmLayoutManProvider);
})(window.document);