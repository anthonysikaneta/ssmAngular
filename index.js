﻿(function (document, undefined) {
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
        .directive('ssmLayout', ['$compile', 'ssmRoute', 'ssmLayoutMan', '$log', function ($compile, $route, layoutManager, $log) {
            return {
                replace: true,
                compile: function (tElement, tAttrs) {
                    return function (scope, element, attrs) {
                        layoutManager.setTemplateFunc = function (tpl) {
                            var container = $(tpl);
                            // add the ssm-init directive which guesstimates when Angular is finihsed processing directives and fires 'initialized'
                            container.attr('ssm-init', '');
                            element.html('');
                            element.append(container);
                            $log.debug('ssmLayout: element.contents() ->');
                            $log.debug(element.contents());
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
                    $log.debug('attr visualPriority: ' + vp);

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
                                angular.extend(lastScope, view.locals);
                                view.locals.$scope = lastScope;
                                controller = $controller(view.controller, view.locals);
                                element.children().data('$ngControllerController', controller);
                            }
                            link(lastScope);
                        }
                    };
                }
            };
        }])
        .directive('ssmInit', ['$rootScope', '$log', function($rootScope, $log) {
            return {
                restrict: 'ECA',
                link: function($scope, $log) {
                    var to;
                    var listener = $scope.$watch(function() {
                        clearTimeout(to);
                        to = setTimeout(function () {
                            console.debug('ssmInit: initialized');
                            listener();
                            $rootScope.$emit('ssm:init');
                        }, 50);
                    });
                }
            };
        }])
        .provider('ssmDialogSvc', function() {
            var dialogStack = [],
                viewPortSlot = 100,
                $body = $('body'),
                activeDialog = null,
                dialogTplUrl = '/Client/tpl/DialogTpl.html',
                awaitDialogTpl = null,
                dialogList = [];

            this.setDialogTpl = function (dialogTpl) {

            };

            this.$get = ['ssmLayoutMan', '$rootScope', '$templateCache', '$http', '$q', '$compile', function (layoutManager, $rootScope, $templateCache, $http, $q, $compile) {
                return {
                    preload: function() {
                        awaitDialogTpl = $http.get(dialogTplUrl, {cache:$templateCache});
                    },
                    pushDialog: function (view) {
                        var that = this;
                        if (activeDialog) {
                            activeDialog.hide();
                            dialogStack.push(activeDialog);
                            activeDialog = null;
                        }

                        var dialog = _.find(dialogList, function (d) {
                            return d.view === view;
                        });

                        if (dialog) {
                            dialog.show();
                            return;
                        }

                        $q.when(view.template).then(function (template) {
                            awaitDialogTpl.then(function (dialogHtml) {
                                var $dialog = $(dialogHtml.data);
                                $dialog.find('.modal-body').append(template);
                                // get the outerHTML by appending it to a div first, cause html() only returns inner.
                                view.template = $('<div />').append($dialog).html(); 

                                var vp = $('<div ssm-Viewport visual-Priority="' + (viewPortSlot++) + '" ssm-dialog="true"></div>');
                                $body.append(vp);
                                $compile(vp)($rootScope.$new());
                                layoutManager.addView(view, viewPortSlot - 1).then(function () {
                                    $element = $body.find('[visual-Priority="' + (viewPortSlot-1) + '"] .modal');

                                    $element.modal({});

                                    $element.on('hidden.bs.modal', function () {
                                        that.popDialog();
                                    });
                                    // restore the template back to normal. (non dialog encumbered)
                                    view.template = template;

                                    activeDialog = {
                                        $element: $element,
                                        vpId: viewPortSlot - 1,
                                        vp: vp,
                                        view: view,
                                        hide: function () {
                                            this.$element.modal('hide');
                                        },
                                        show: function () {
                                            this.$element.modal('show');
                                        },
                                        destroy: function () {
                                            this.$element.modal('hide');
                                            // cannot destroy it until the modal fade transition is finished 
                                            // (otherwise it will cause the backdrop to remain behind)
                                            //setTimeout(layoutManager.viewPorts[this.vpId].destroy, 550);
                                            //$('body').removeClass('modal-open');
                                            //$('.modal-backdrop').remove();
                                        }
                                    };

                                    dialogList.push(activeDialog);
                                });
                            });
                        });
                    },
                    popDialog: function () {
                        if (activeDialog != null) {
                            activeDialog.destroy();
                            activeDialog = null;
                        }
                        if (dialogStack.length > 0) {
                            activeDialog = dialogStack.pop();
                            activeDialog.show();
                            return true; 
                        }
                        return false;
                    },
                    closeAll: function () {
                        while (this.popDialog());
                    }
                };
            }];
        })
;
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
                    return $q.when(view.template).then(function (template) { // TODO: refactor: could instead wait on the entire view's dependencies if I rolled the template into the resolve and just passed a view as a promise or a value.
                        view.template = template;
                        viewPort.renderView(view);  
                    });
                } else {
                    throw new Error('No viewport: ' + viewPortId);
                }
                return null;
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
                    that.setTemplateFunc(newTemplate);
                    d.resolve(that);
                });

                return d.promise;
            },
            setTemplateFunc: function (tpl) { } // gets set by the ssmLayout directive,
        };
    }];
}
﻿    function ssmProvider(ssmLayoutProvider) {
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

                return layoutManager.setTemplate(this.layout)
                    .then(function (slm) {
                        // render viewTemplates in their respective view priorities.
                        for (var viewName in that.config.viewPriorityMap) {
                            if (!that.config.viewPriorityMap.hasOwnProperty(viewName)) continue;
                            var actualViewName = viewName.replace('_', '');
                            var f = function (vw, viewName) {
                                that.waitForDepsToResolve.then(function () {
                                    console.debug('dependencies have resolved: ' + that.name);
                                    console.debug('view: ' + vw);
                                    console.debug(viewDefinitions);
                                    that.views[vw].template = viewDefinitions[vw].template;
                                    slm.addView(that.views[vw], that.config.viewPriorityMap[viewName]);
                                });
                            };
                            f(actualViewName, viewName); // need a closure around viewName so the async then function is invoked with the current value of viewName
                        }
                    });

            },
            resolveDependencies: function ($q, $http, $templateCache, $injector) {
                var deps = [];
                for (var viewName in this.views) {
                    if (!this.views.hasOwnProperty(viewName)) continue;
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
                        angular.extend(view.locals, locals);
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
            var that = this;
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
                scene.views[actualViewName] = angular.extend({}, viewDefinitions[actualViewName]);
            }
            scene.layout = scene.config.layouts[0];
            scene.layouts = scene.config.layouts;
            if (scene.config.dialogs) {
                _.forEach(scene.config.dialogs, function (dialog) {
                    var dialogLocals = {
                        Title: dialog.title,
                        Continue: dialog.dialogContinueButtonTxt,
                        Back: dialog.dialogBackButtonTxt,
                        NoFooter: dialog.noFooter
                    };

                    if (viewDefinitions[dialog.view]) {
                        viewDefinitions[dialog.view].locals = angular.extend(viewDefinitions[dialog.view].locals, dialogLocals);
                    } else {
                        that.addView(dialog.view, null, {
                            locals: dialogLocals
                        });
                    }

                    scene.views[dialog.view] = angular.copy(viewDefinitions[dialog.view]);
                });
            }
        };

        this.$get = ['$q', '$http', '$templateCache', '$rootScope', 'ssmLayoutMan', '$injector', 'ssmDialogSvc', function ($q, $http, $templateCache, $rootScope, layoutManager, $injector, ssmDialogSvc) {
            // TODO: move these addTemplate calls to config, but before I can do that I must make a provider for layoutManager.
            return {
                scenes: this.scenes,
                showDialog: function(viewName) {
                    ssmDialogSvc.pushDialog(viewDefinitions[viewName]);
                },
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
                        return nextScene.show($rootScope, layoutManager);
                    };

                    nextScene.resolveDependencies($q, $http, $templateCache, $injector);

                    if (!_currentScene) {
                        return showScene();
                    } else {
                        // this lets the current scene know which scene we are going to
                        return $q.when(_currentScene.transitionTo(nextScene)).then(function () {
                            return showScene();
                        });
                    }
                    //} else {
                    //    throw Error('Invalid scene name: ' + sceneName);
                    //}
                }
            };
        }];
    };

    ssmProvider.$inject = ['ssmLayoutManProvider'];﻿    /**
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

                $rootScope.$broadcast('$routeChangeSuccess', $location.path());
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
    .provider('ssmLayoutMan', ssmLayoutManProvider)
    .provider('ssm', ssmProvider);

})(window.document);