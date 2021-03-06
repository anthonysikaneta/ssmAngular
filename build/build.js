
/**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */

function require(path, parent, orig) {
  var resolved = require.resolve(path);

  // lookup failed
  if (null == resolved) {
    orig = orig || path;
    parent = parent || 'root';
    var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
    err.path = orig;
    err.parent = parent;
    err.require = true;
    throw err;
  }

  var module = require.modules[resolved];

  // perform real require()
  // by invoking the module's
  // registered function
  if (!module._resolving && !module.exports) {
    var mod = {};
    mod.exports = {};
    mod.client = mod.component = true;
    module._resolving = true;
    module.call(this, mod.exports, require.relative(resolved), mod);
    delete module._resolving;
    module.exports = mod.exports;
  }

  return module.exports;
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Registered aliases.
 */

require.aliases = {};

/**
 * Resolve `path`.
 *
 * Lookup:
 *
 *   - PATH/index.js
 *   - PATH.js
 *   - PATH
 *
 * @param {String} path
 * @return {String} path or null
 * @api private
 */

require.resolve = function(path) {
  if (path.charAt(0) === '/') path = path.slice(1);

  var paths = [
    path,
    path + '.js',
    path + '.json',
    path + '/index.js',
    path + '/index.json'
  ];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    if (require.modules.hasOwnProperty(path)) return path;
    if (require.aliases.hasOwnProperty(path)) return require.aliases[path];
  }
};

/**
 * Normalize `path` relative to the current path.
 *
 * @param {String} curr
 * @param {String} path
 * @return {String}
 * @api private
 */

require.normalize = function(curr, path) {
  var segs = [];

  if ('.' != path.charAt(0)) return path;

  curr = curr.split('/');
  path = path.split('/');

  for (var i = 0; i < path.length; ++i) {
    if ('..' == path[i]) {
      curr.pop();
    } else if ('.' != path[i] && '' != path[i]) {
      segs.push(path[i]);
    }
  }

  return curr.concat(segs).join('/');
};

/**
 * Register module at `path` with callback `definition`.
 *
 * @param {String} path
 * @param {Function} definition
 * @api private
 */

require.register = function(path, definition) {
  require.modules[path] = definition;
};

/**
 * Alias a module definition.
 *
 * @param {String} from
 * @param {String} to
 * @api private
 */

require.alias = function(from, to) {
  if (!require.modules.hasOwnProperty(from)) {
    throw new Error('Failed to alias "' + from + '", it does not exist');
  }
  require.aliases[to] = from;
};

/**
 * Return a require function relative to the `parent` path.
 *
 * @param {String} parent
 * @return {Function}
 * @api private
 */

require.relative = function(parent) {
  var p = require.normalize(parent, '..');

  /**
   * lastIndexOf helper.
   */

  function lastIndexOf(arr, obj) {
    var i = arr.length;
    while (i--) {
      if (arr[i] === obj) return i;
    }
    return -1;
  }

  /**
   * The relative require() itself.
   */

  function localRequire(path) {
    var resolved = localRequire.resolve(path);
    return require(resolved, parent, path);
  }

  /**
   * Resolve relative to the parent.
   */

  localRequire.resolve = function(path) {
    var c = path.charAt(0);
    if ('/' == c) return path.slice(1);
    if ('.' == c) return require.normalize(p, path);

    // resolve deps by returning
    // the dep in the nearest "deps"
    // directory
    var segs = parent.split('/');
    var i = lastIndexOf(segs, 'deps') + 1;
    if (!i) i = 0;
    path = segs.slice(0, i + 1).join('/') + '/deps/' + path;
    return path;
  };

  /**
   * Check if module is defined at `path`.
   */

  localRequire.exists = function(path) {
    return require.modules.hasOwnProperty(localRequire.resolve(path));
  };

  return localRequire;
};
require.register("ssmAngular/index.js", Function("exports, require, module",
"﻿(function (document, undefined) {\r\n\
    function resolveTemplate(tplName, tplUrl, resolved, $q, $http, $templateCache) {\r\n\
        var d = $q.defer();\r\n\
        $http.get(tplUrl, { cache: $templateCache })\r\n\
            .success(function (html) {\r\n\
                d.resolve(html);\r\n\
            })\r\n\
            .error(function () { throw 'Failed to load template: ' + tplName });\r\n\
        resolved[tplName] = d.promise;\r\n\
    }\r\n\
﻿angular.module('ssmAngular', [])\r\n\
        .directive('ssmLayout', ['$compile', 'ssmRoute', 'ssmLayoutMan', '$log', function ($compile, $route, layoutManager, $log) {\r\n\
            return {\r\n\
                replace: true,\r\n\
                compile: function (tElement, tAttrs) {\r\n\
                    return function (scope, element, attrs) {\r\n\
                        layoutManager.setTemplateFunc = function (tpl) {\r\n\
                            var container = $(tpl);\r\n\
                            // add the ssm-init directive which guesstimates when Angular is finihsed processing directives and fires 'initialized'\r\n\
                            container.attr('ssm-init', '');\r\n\
                            element.html('');\r\n\
                            element.append(container);\r\n\
                            $log.debug('ssmLayout: element.contents() ->');\r\n\
                            $log.debug(element.contents());\r\n\
                            $compile(element.contents())(scope);\r\n\
                            return true; // right now this func is expected to return a promise or value (which gets converted to a promise)\r\n\
                        };\r\n\
                    };\r\n\
                },\r\n\
            };\r\n\
        }])\r\n\
        .directive('ssmViewport', ['$compile', 'ssmLayoutMan', '$log', '$controller', function ($compile, layoutManager, $log, $controller) {\r\n\
            return {\r\n\
                restrict: 'AE',\r\n\
                link: function (scope, element, attrs) {\r\n\
                    var vp = parseInt(attrs.visualPriority, 10),\r\n\
                        lastScope; \r\n\
                    $log.debug('attr visualPriority: ' + vp);\r\n\
\r\n\
                    function destroyLastScope() {\r\n\
                        if (lastScope) {\r\n\
                            lastScope.$destroy();\r\n\
                            lastScope = null;\r\n\
                        }\r\n\
                    }\r\n\
\r\n\
                    function clearContent() {\r\n\
                        element.html('');\r\n\
                        destroyLastScope();\r\n\
                    }\r\n\
\r\n\
                    layoutManager.viewPorts[vp] = {\r\n\
                        destroy: function() { clearContent(); }, \r\n\
                        renderView: function (view) {\r\n\
                            clearContent();\r\n\
                            element.html(view.template);\r\n\
\r\n\
                            var link = $compile(element.contents()),\r\n\
                                controller;\r\n\
\r\n\
                            lastScope = view.scope = scope.$new();\r\n\
                            if (view.controller) {\r\n\
                                angular.extend(lastScope, view.locals);\r\n\
                                view.locals.$scope = lastScope;\r\n\
                                controller = $controller(view.controller, view.locals);\r\n\
                                element.children().data('$ngControllerController', controller);\r\n\
                            }\r\n\
                            link(lastScope);\r\n\
                        }\r\n\
                    };\r\n\
                }\r\n\
            };\r\n\
        }])\r\n\
        .directive('ssmInit', ['$rootScope', '$log', function($rootScope, $log) {\r\n\
            return {\r\n\
                restrict: 'ECA',\r\n\
                link: function($scope, $log) {\r\n\
                    var to;\r\n\
                    var listener = $scope.$watch(function() {\r\n\
                        clearTimeout(to);\r\n\
                        to = setTimeout(function () {\r\n\
                            console.debug('ssmInit: initialized');\r\n\
                            listener();\r\n\
                            $rootScope.$emit('ssm:init');\r\n\
                        }, 50);\r\n\
                    });\r\n\
                }\r\n\
            };\r\n\
        }])\r\n\
        .provider('ssmDialogSvc', function() {\r\n\
            var dialogStack = [],\r\n\
                viewPortSlot = 100,\r\n\
                $body = $('body'),\r\n\
                activeDialog = null,\r\n\
                dialogTplUrl = '/Client/tpl/DialogTpl.html',\r\n\
                awaitDialogTpl = null,\r\n\
                dialogList = [];\r\n\
\r\n\
            this.setDialogTpl = function (dialogTpl) {\r\n\
\r\n\
            };\r\n\
\r\n\
            this.$get = ['ssmLayoutMan', '$rootScope', '$templateCache', '$http', '$q', '$compile', function (layoutManager, $rootScope, $templateCache, $http, $q, $compile) {\r\n\
                return {\r\n\
                    preload: function() {\r\n\
                        awaitDialogTpl = $http.get(dialogTplUrl, {cache:$templateCache});\r\n\
                    },\r\n\
                    pushDialog: function (view) {\r\n\
                        var that = this;\r\n\
                        if (activeDialog) {\r\n\
                            activeDialog.hide();\r\n\
                            dialogStack.push(activeDialog);\r\n\
                            activeDialog = null;\r\n\
                        }\r\n\
\r\n\
                        var dialog = _.find(dialogList, function (d) {\r\n\
                            return d.view === view;\r\n\
                        });\r\n\
\r\n\
                        if (dialog) {\r\n\
                            dialog.show();\r\n\
                            return;\r\n\
                        }\r\n\
\r\n\
                        $q.when(view.template).then(function (template) {\r\n\
                            awaitDialogTpl.then(function (dialogHtml) {\r\n\
                                var $dialog = $(dialogHtml.data);\r\n\
                                $dialog.find('.modal-body').append(template);\r\n\
                                // get the outerHTML by appending it to a div first, cause html() only returns inner.\r\n\
                                view.template = $('<div />').append($dialog).html(); \r\n\
\r\n\
                                var vp = $('<div ssm-Viewport visual-Priority=\"' + (viewPortSlot++) + '\" ssm-dialog=\"true\"></div>');\r\n\
                                $body.append(vp);\r\n\
                                $compile(vp)($rootScope.$new());\r\n\
                                layoutManager.addView(view, viewPortSlot - 1).then(function () {\r\n\
                                    $element = $body.find('[visual-Priority=\"' + (viewPortSlot-1) + '\"] .modal');\r\n\
\r\n\
                                    $element.modal({});\r\n\
\r\n\
                                    $element.on('hidden.bs.modal', function () {\r\n\
                                        that.popDialog();\r\n\
                                    });\r\n\
                                    // restore the template back to normal. (non dialog encumbered)\r\n\
                                    view.template = template;\r\n\
\r\n\
                                    activeDialog = {\r\n\
                                        $element: $element,\r\n\
                                        vpId: viewPortSlot - 1,\r\n\
                                        vp: vp,\r\n\
                                        view: view,\r\n\
                                        hide: function () {\r\n\
                                            this.$element.modal('hide');\r\n\
                                        },\r\n\
                                        show: function () {\r\n\
                                            this.$element.modal('show');\r\n\
                                        },\r\n\
                                        destroy: function () {\r\n\
                                            this.$element.modal('hide');\r\n\
                                            // cannot destroy it until the modal fade transition is finished \r\n\
                                            // (otherwise it will cause the backdrop to remain behind)\r\n\
                                            //setTimeout(layoutManager.viewPorts[this.vpId].destroy, 550);\r\n\
                                            //$('body').removeClass('modal-open');\r\n\
                                            //$('.modal-backdrop').remove();\r\n\
                                        }\r\n\
                                    };\r\n\
\r\n\
                                    dialogList.push(activeDialog);\r\n\
                                });\r\n\
                            });\r\n\
                        });\r\n\
                    },\r\n\
                    popDialog: function () {\r\n\
                        if (activeDialog != null) {\r\n\
                            activeDialog.destroy();\r\n\
                            activeDialog = null;\r\n\
                        }\r\n\
                        if (dialogStack.length > 0) {\r\n\
                            activeDialog = dialogStack.pop();\r\n\
                            activeDialog.show();\r\n\
                            return true; \r\n\
                        }\r\n\
                        return false;\r\n\
                    },\r\n\
                    closeAll: function () {\r\n\
                        while (this.popDialog());\r\n\
                    }\r\n\
                };\r\n\
            }];\r\n\
        })\r\n\
;\r\n\
﻿function ssmLayoutManProvider() {\r\n\
    var viewPorts = [],\r\n\
        views = [],  // list of all views shown and in which viewports they belong.\r\n\
        layouts = {}, // layouts in here are either raw html string templates or promises from the API.\r\n\
        layoutNames = {}, // layoutNames with their templates if they have one.\r\n\
        layoutNamesBaseURL = 'Client/layouts/';\r\n\
\r\n\
    this.setTemplatelayoutNamesBaseURL = function (path) {\r\n\
        layoutNamesBaseURL = path;\r\n\
    };\r\n\
\r\n\
    this.addLayout = function(layoutName, layoutMarkup) {\r\n\
        layoutNames[layoutName] = layoutMarkup;\r\n\
    }\r\n\
\r\n\
    this.$get = ['$http', '$templateCache', '$q', function ($http, $templateCache, $q) {\r\n\
        // download any layoutNames that must be downloaded immediately.\r\n\
        for (var layoutName in layoutNames) {\r\n\
            if (!layoutNames.hasOwnProperty(layoutName)) continue;\r\n\
\r\n\
            if (layoutNames[layoutName]) {\r\n\
                layouts[layoutName] = layoutNames[layoutName];\r\n\
            } else {\r\n\
                resolveTemplate(layoutName, layoutNamesBaseURL + layoutName + '.html', layouts, $q, $http, $templateCache);\r\n\
            }\r\n\
        }\r\n\
\r\n\
        return {\r\n\
            addView: function (view, viewPortId) {\r\n\
                var viewPort = null;\r\n\
                views[viewPortId] = view;\r\n\
                if (viewPort = viewPorts[viewPortId]) {\r\n\
                    return $q.when(view.template).then(function (template) { // TODO: refactor: could instead wait on the entire view's dependencies if I rolled the template into the resolve and just passed a view as a promise or a value.\r\n\
                        view.template = template;\r\n\
                        viewPort.renderView(view);  \r\n\
                    });\r\n\
                } else {\r\n\
                    throw new Error('No viewport: ' + viewPortId);\r\n\
                }\r\n\
                return null;\r\n\
            },\r\n\
            viewPorts: viewPorts,  // gets set by the ssm-Viewport directives as they link.\r\n\
            setTemplate: function (templateName) {\r\n\
                var d = $q.defer();\r\n\
                var that = this;\r\n\
                var newTemplate = null;\r\n\
                if (!(newTemplate = layouts[templateName])) throw 'No template: ' + templateName;\r\n\
\r\n\
                // must first destroy the views in each viewport because they are connected to $watch and other events\r\n\
                angular.forEach(viewPorts, function (viewPort, index) {\r\n\
                    if (viewPort) viewPort.destroy();\r\n\
                });\r\n\
\r\n\
                // load the new template\r\n\
                $q.when(newTemplate).then(function (newTemplate) {\r\n\
                    that.setTemplateFunc(newTemplate);\r\n\
                    d.resolve(that);\r\n\
                });\r\n\
\r\n\
                return d.promise;\r\n\
            },\r\n\
            setTemplateFunc: function (tpl) { } // gets set by the ssmLayout directive,\r\n\
        };\r\n\
    }];\r\n\
}\r\n\
﻿    function ssmProvider(ssmLayoutProvider) {\r\n\
        var _currentScene = null,\r\n\
            viewDefinitions = {},\r\n\
            viewPriorityMap = {},\r\n\
            viewTemplates = {},\r\n\
            viewTemplatesBaseURL = \"/Client/tpl/\",\r\n\
            viewBaseURL = '/Client/views/',\r\n\
            defaultScene = 'DefaultScene';\r\n\
\r\n\
        this.scenes = {};\r\n\
\r\n\
        var sceneBase = {\r\n\
            name: 'Unknown',\r\n\
            transitionTo: function (nextScene) {\r\n\
                console.debug('transitioning to next scene: ' + nextScene.name);\r\n\
\r\n\
                return true;\r\n\
            },\r\n\
            // the sequence filter should be built into the eventAggregator and not have to be passed in seperately.\r\n\
            show: function (eventAggregator, layoutManager, behaviourSvc, sequenceFilter) {\r\n\
                var that = this;\r\n\
          \r\n\
                console.log('waiting for dependencies to resolve: ' + this.name);\r\n\
\r\n\
                return layoutManager.setTemplate(this.layout)\r\n\
                    .then(function (slm) {\r\n\
                        // render viewTemplates in their respective view priorities.\r\n\
                        for (var viewName in that.config.viewPriorityMap) {\r\n\
                            if (!that.config.viewPriorityMap.hasOwnProperty(viewName)) continue;\r\n\
                            var actualViewName = viewName.replace('_', '');\r\n\
                            var f = function (vw, viewName) {\r\n\
                                that.waitForDepsToResolve.then(function () {\r\n\
                                    console.debug('dependencies have resolved: ' + that.name);\r\n\
                                    console.debug('view: ' + vw);\r\n\
                                    console.debug(viewDefinitions);\r\n\
                                    that.views[vw].template = viewDefinitions[vw].template;\r\n\
                                    slm.addView(that.views[vw], that.config.viewPriorityMap[viewName]);\r\n\
                                });\r\n\
                            };\r\n\
                            f(actualViewName, viewName); // need a closure around viewName so the async then function is invoked with the current value of viewName\r\n\
                        }\r\n\
                    });\r\n\
\r\n\
            },\r\n\
            resolveDependencies: function ($q, $http, $templateCache, $injector) {\r\n\
                var deps = [];\r\n\
                for (var viewName in this.views) {\r\n\
                    if (!this.views.hasOwnProperty(viewName)) continue;\r\n\
                    var view = viewDefinitions[viewName];\r\n\
                    if (!view) throw Error('The view: ' + viewName + ' doesnt exist.');\r\n\
\r\n\
                    viewTemplates[viewName] = view.template;\r\n\
                    if (viewDefinitions[viewName].templateUrl) {\r\n\
                        resolveTemplate(viewName, viewDefinitions[viewName].templateUrl, viewTemplates, $q, $http, $templateCache);\r\n\
                        view.template = viewTemplates[viewName]; // TODO: fix this code bc it has grown complex due to unnecessary viewTemplates obj.   just treat the template as a resolve.\r\n\
                    }\r\n\
\r\n\
                    var keys = [],\r\n\
                        values = [],\r\n\
                        template;\r\n\
\r\n\
                    angular.forEach(view.resolve || {}, function (value, key) {\r\n\
                        keys.push(key);\r\n\
                        values.push(angular.isString(value) ? $injector.get(value) : $injector.invoke(value));\r\n\
                    });\r\n\
\r\n\
                    var waitForAllViewDependenciesToResolve = $q.all(values).then(function (values) {\r\n\
                        var locals = {};\r\n\
                        angular.forEach(values, function (value, index) {\r\n\
                            locals[keys[index]] = value;\r\n\
                        });\r\n\
                        return locals;\r\n\
                    })\r\n\
                    .then(function(locals) {\r\n\
                        angular.extend(view.locals, locals);\r\n\
                        // TODO: add the route parameters (view configs) to the locals\r\n\
                        return locals; // this return is not being used but I think it must return something.. not sure...\r\n\
                    });\r\n\
\r\n\
                    deps.push(waitForAllViewDependenciesToResolve);\r\n\
                }\r\n\
                return this.waitForDepsToResolve = $q.all(deps);\r\n\
            }\r\n\
        };\r\n\
\r\n\
        this.defaultScene = function (sceneName) {\r\n\
            defaultScene = sceneName;\r\n\
        };\r\n\
\r\n\
        this.addView = function (name, template, config) {\r\n\
            var baseURL = name.indexOf('+') < 0 ? viewTemplatesBaseURL : viewBaseURL;\r\n\
\r\n\
            if (!config) config = {  };\r\n\
            var view = {\r\n\
                name: name,\r\n\
                templateUrl: template ? null : baseURL + name.replace('+','/') + \".html\",\r\n\
                template: template,\r\n\
                locals: config.locals ? config.locals : {},\r\n\
                controller: config.controller ? config.controller : name.replace('+','') + 'Ctrl',\r\n\
                resolve: config.resolve ? config.resolve : {}\r\n\
            };\r\n\
            viewDefinitions[name] = view;\r\n\
            return this;\r\n\
        };\r\n\
\r\n\
        this.addScene = function (scene) {\r\n\
            var that = this;\r\n\
            for (var i = 0; i < scene.config.layouts.length; i++) {\r\n\
                ssmLayoutProvider.addLayout(scene.config.layouts[i]);\r\n\
            }\r\n\
            \r\n\
            scene = this.scenes[scene.name] = angular.extend({}, sceneBase, scene);\r\n\
            scene.views = {};\r\n\
            for (var viewName in scene.config.viewPriorityMap) {\r\n\
                if (!scene.config.viewPriorityMap.hasOwnProperty(viewName)) continue;\r\n\
                var actualViewName = viewName.replace('_', '');\r\n\
                // when choosing a view whatever access the views collection must be aware that underscores need\r\n\
                // to be stripped in viewName.  This is to support having many of the same view in the same scene.\r\n\
                scene.views[actualViewName] = angular.extend({}, viewDefinitions[actualViewName]);\r\n\
            }\r\n\
            scene.layout = scene.config.layouts[0];\r\n\
            scene.layouts = scene.config.layouts;\r\n\
            if (scene.config.dialogs) {\r\n\
                _.forEach(scene.config.dialogs, function (dialog) {\r\n\
                    var dialogLocals = {\r\n\
                        Title: dialog.title,\r\n\
                        Continue: dialog.dialogContinueButtonTxt,\r\n\
                        Back: dialog.dialogBackButtonTxt,\r\n\
                        NoFooter: dialog.noFooter\r\n\
                    };\r\n\
\r\n\
                    if (viewDefinitions[dialog.view]) {\r\n\
                        viewDefinitions[dialog.view].locals = angular.extend(viewDefinitions[dialog.view].locals, dialogLocals);\r\n\
                    } else {\r\n\
                        that.addView(dialog.view, null, {\r\n\
                            locals: dialogLocals\r\n\
                        });\r\n\
                    }\r\n\
\r\n\
                    scene.views[dialog.view] = angular.copy(viewDefinitions[dialog.view]);\r\n\
                });\r\n\
            }\r\n\
        };\r\n\
\r\n\
        this.$get = ['$q', '$http', '$templateCache', '$rootScope', 'ssmLayoutMan', '$injector', 'ssmDialogSvc', function ($q, $http, $templateCache, $rootScope, layoutManager, $injector, ssmDialogSvc) {\r\n\
            // TODO: move these addTemplate calls to config, but before I can do that I must make a provider for layoutManager.\r\n\
            return {\r\n\
                scenes: this.scenes,\r\n\
                showDialog: function(viewName) {\r\n\
                    ssmDialogSvc.pushDialog(viewDefinitions[viewName]);\r\n\
                },\r\n\
                transitionTo: function (sceneName, options) {\r\n\
                    var nextScene = this.scenes[sceneName];\r\n\
                    if (!nextScene) nextScene = this.scenes[defaultScene];\r\n\
\r\n\
                    if (options.views) {\r\n\
                        _.forEach(options.views, function (viewData) {\r\n\
                            if(viewData.name)\r\n\
                                nextScene.views[viewData.name].locals = { locals: viewData.config };\r\n\
                        });\r\n\
                    }\r\n\
\r\n\
                    if (nextScene.layouts.indexOf(options.layout) >= 0) {\r\n\
                        nextScene.layout = options.layout;\r\n\
                    }\r\n\
\r\n\
                    var showScene = function () {\r\n\
                        nextScene = nextScene;\r\n\
                        return nextScene.show($rootScope, layoutManager);\r\n\
                    };\r\n\
\r\n\
                    nextScene.resolveDependencies($q, $http, $templateCache, $injector);\r\n\
\r\n\
                    if (!_currentScene) {\r\n\
                        return showScene();\r\n\
                    } else {\r\n\
                        // this lets the current scene know which scene we are going to\r\n\
                        return $q.when(_currentScene.transitionTo(nextScene)).then(function () {\r\n\
                            return showScene();\r\n\
                        });\r\n\
                    }\r\n\
                    //} else {\r\n\
                    //    throw Error('Invalid scene name: ' + sceneName);\r\n\
                    //}\r\n\
                }\r\n\
            };\r\n\
        }];\r\n\
    };\r\n\
\r\n\
    ssmProvider.$inject = ['ssmLayoutManProvider'];﻿    /**\r\n\
    * @ngdoc provider\r\n\
    * @name ssmUrlRouterProvider\r\n\
    * @methodOf ng.$route\r\n\
    *\r\n\
    * @description\r\n\
    * Creates an ssmRoute service which listens for url changes and passes that data off to the\r\n\
    * appropriate scene.\r\n\
    * {@link ng.$location $location} hasn't changed.\r\n\
    *\r\n\
    * As a result of that, {@link ng.directive:ngView ngView}\r\n\
    * creates new scope, reinstantiates the controller.\r\n\
    */\r\n\
    function ssmUrlRouterProvider() {\r\n\
\r\n\
        this.$get = ['$rootScope', '$location', '$q', 'ssm', 'ssmRouteTemplateMatcher', 'ssmDialogSvc', '$anchorScroll', '$log',\r\n\
        function ($rootScope, $location, $q, ssm, routeParser, ssmDialogSvc, $anchorScroll, $log) {\r\n\
            var forceReload = false,\r\n\
            $route = {\r\n\
                /**\r\n\
                    * @ngdoc method\r\n\
                    * @name ng.$route#reload\r\n\
                    * @methodOf ng.$route\r\n\
                    *\r\n\
                    * @description\r\n\
                    * Causes `$route` service to reload the current route even if\r\n\
                    * {@link ng.$location $location} hasn't changed.\r\n\
                    *\r\n\
                    * As a result of that, {@link ng.directive:ngView ngView}\r\n\
                    * creates new scope, reinstantiates the controller.\r\n\
                    */\r\n\
                reload: function () {\r\n\
                    forceReload = true;  // currently not hooked up.  --JM\r\n\
                    $rootScope.$evalAsync(updateRoute);\r\n\
                }\r\n\
            },\r\n\
            lastPath = null,\r\n\
            prevSceneData = null;\r\n\
\r\n\
            $rootScope.$on('$locationChangeSuccess', updateRoute);\r\n\
\r\n\
            var goToHash = function () {\r\n\
                $log.debug('ssmRoute: checking for hash');\r\n\
                // only call anchor scroll if the hash isn't empty since we set it to empty after scrolling\r\n\
                if ($location.hash()) {\r\n\
                    $log.debug('ssmRoute: hash found... scrolling to it now');\r\n\
                    $anchorScroll();\r\n\
                    $location.hash('');\r\n\
                }\r\n\
            };\r\n\
\r\n\
            $rootScope.$on('ssm:init', goToHash);\r\n\
\r\n\
            return $route;\r\n\
\r\n\
            function updateRoute() {\r\n\
                \r\n\
                ssmDialogSvc.closeAll();\r\n\
\r\n\
                if (lastPath == $location.path()) {\r\n\
                    goToHash();\r\n\
                    return;  // early quit if the path hasn't changed.\r\n\
                } else {\r\n\
                    lastPath = $location.path();\r\n\
                }\r\n\
\r\n\
                var sceneData = routeParser.parseRoute($location.path());\r\n\
\r\n\
                $rootScope.$broadcast('$routeChangeStart', sceneData, prevSceneData);\r\n\
\r\n\
                // transition to the new scene.\r\n\
                ssm.transitionTo(sceneData.scene + 'Scene', sceneData);\r\n\
\r\n\
                $rootScope.$broadcast('$routeChangeSuccess', $location.path());\r\n\
                prevSceneData = sceneData;\r\n\
            }\r\n\
        }];\r\n\
    }\r\n\
﻿    function ssmRouteTemplateMatcherProvider() {\r\n\
        var routeTemplates = {};\r\n\
        var compiledRouteTemplates = {};\r\n\
        var templateElementParsers = {};\r\n\
        var route = null;\r\n\
\r\n\
\r\n\
        var compileRouteTemplate = function (tpl) {\r\n\
            compiledRouteTemplates[tpl] = {\r\n\
                chunks: getChunks(tpl)\r\n\
            };\r\n\
        };\r\n\
\r\n\
        // You can add a new template element and provide a parser for it.  \r\n\
        // Example template element: {myTemplateElement}  \r\n\
        // Template elements are marked by the curly braces within the template. \r\n\
        // parseFunc must match the following interface function(match) { return { }; }\r\n\
        this.addTemplateElement = function(templateElementString, parseFunc) {\r\n\
            templateElementParsers[templateElementString] = parseFunc; \r\n\
        };\r\n\
\r\n\
        this.addTemplateElement('config', function (part) {\r\n\
            var splitByDash = part.split('-');\r\n\
            var ret = {};\r\n\
            for (var i = 0; i < splitByDash.length; i += 2) {\r\n\
                ret[splitByDash[i]] = splitByDash[i + 1];\r\n\
            }\r\n\
            return ret;\r\n\
        });\r\n\
\r\n\
        this.addRouteTemplate = function (tpl, desc) {\r\n\
            routeTemplates[tpl] = desc;\r\n\
            compileRouteTemplate(tpl);\r\n\
        };\r\n\
\r\n\
        // returns true if the chunk was a match.\r\n\
        function matchChunkToPart(chunk, part, ret) {\r\n\
            if (chunk.params) {\r\n\
                var match = part.match(chunk.regex);\r\n\
                if (!match) return false;\r\n\
                for (var pIndex = 0; pIndex < chunk.params.length; pIndex++) {\r\n\
                    if (chunk.params[pIndex] == 'view') {\r\n\
                        if (!ret['views']) ret['views'] = [];\r\n\
                        var view = {\r\n\
                            name: match[pIndex + 1],\r\n\
                        };\r\n\
                        if (chunk.elementParser) {\r\n\
                            var elementPart = part.replace(match[pIndex], '');\r\n\
                            if (elementPart[0] == '-') elementPart = elementPart.substr(1);\r\n\
                            view[chunk.elementName] = chunk.elementParser(elementPart);\r\n\
                        }\r\n\
                        ret['views'].push(view);\r\n\
                    } else {\r\n\
                        ret[chunk.params[pIndex]] = match[pIndex + 1];\r\n\
                    }\r\n\
                }\r\n\
                return true;\r\n\
            }\r\n\
        }\r\n\
        \r\n\
        // in order for a template to be considered a match, all chunks must much each part.\r\n\
        var matchTemplate = function (path) {\r\n\
            var parts = path.split('/');\r\n\
            \r\n\
            for (var tpl in compiledRouteTemplates) {\r\n\
                var ret = {};\r\n\
                if (!compiledRouteTemplates.hasOwnProperty(tpl)) continue;\r\n\
                var compiled = compiledRouteTemplates[tpl];\r\n\
                // parts.length is subtraced by 1 because the path must start with a '/' and so first element is empty.\r\n\
                if ((parts.length-1) >= compiled.chunks.length) {\r\n\
                    var isMatch = false;\r\n\
                    var chunkIndex = 1;\r\n\
                    for (var i = 1; i < parts.length; i++) {\r\n\
                        var chunk = compiled.chunks[chunkIndex];\r\n\
                        if (undefined === chunk) {\r\n\
                            isMatch = false;\r\n\
                            break;\r\n\
                        }\r\n\
                        var repeat = chunk.repeatPrevious;\r\n\
                        if (repeat) chunk = compiled.chunks[chunkIndex-1];  // assumes there is more than one for performance optimization.\r\n\
\r\n\
                        isMatch = matchChunkToPart(chunk, parts[i], ret);\r\n\
                        \r\n\
                        if (!repeat) {\r\n\
                            chunkIndex++;\r\n\
                            if (!isMatch) break;\r\n\
                        }\r\n\
                        else if (repeat && !isMatch) {\r\n\
                            chunkIndex++;\r\n\
                            if (chunkIndex < compiled.chunks.length) {\r\n\
                                isMatch = matchChunkToPart(compiled.chunks[chunkIndex], parts[i], ret);\r\n\
                                if (!isMatch) break;\r\n\
                                chunkIndex++;\r\n\
                            } else {\r\n\
                                isMatch = false;\r\n\
                                break;\r\n\
                            }\r\n\
                        }\r\n\
                    }\r\n\
                    if (isMatch) return [tpl, ret];\r\n\
                } \r\n\
            }\r\n\
            return [null, null];\r\n\
        };\r\n\
\r\n\
        this.$get = function () {\r\n\
            return {\r\n\
                matchTemplate: function (path) { return matchTemplate(path)[0]; }, // exposed for unit testing only.\r\n\
                // method: parsePathIntoParams\r\n\
                // converts a path Ex. \"/userscene/layout-awesomelayout\"\r\n\
                // into: {sceneName: \"usersscene\", layout: \"awesomeLayout\" }\r\n\
                parseRoute: function (path) {\r\n\
                    return matchTemplate(path)[1];\r\n\
                },\r\n\
                route: route\r\n\
            };\r\n\
        };\r\n\
\r\n\
        function getParams(path) {\r\n\
            var params = path.match(/:(\\w+)/g)\r\n\
            for (var i = 0; i < params.length; i++) {\r\n\
                params[i] = params[i].replace(':', '');\r\n\
            }\r\n\
            return params;\r\n\
        };\r\n\
\r\n\
        function getChunks(path) {\r\n\
            var parts = path.split('/');\r\n\
            var chunks = {};\r\n\
            var repeats = 0;\r\n\
            for (var i = 1; i < parts.length; i++) {\r\n\
                var part = parts[i],\r\n\
                    els = null;\r\n\
                //if (t.indexOf('-') > 0) {\r\n\
                //    els = t.split('-');\r\n\
                //}\r\n\
\r\n\
                if (part == '*') {\r\n\
                    chunks[i] = {\r\n\
                        repeatPrevious: true\r\n\
                    }\r\n\
                    repeats += 1;\r\n\
                } else {\r\n\
                    var re = /:(\\w+)/g,\r\n\
                        regex = '',\r\n\
                        paramMatch,\r\n\
                        lastMatchedIndex = 0,\r\n\
                        trimmedPart = part,\r\n\
                        params = [],\r\n\
                        templateElement;\r\n\
\r\n\
                    if (part.indexOf('{') > 0) {\r\n\
                        var startOfElement = path.indexOf('{');\r\n\
                        trimmedPart = part.substr(0, startOfElement);\r\n\
                        // template elements are defined between the squiggly brackets\r\n\
                        templateElement = path.substr(startOfElement + 1, path.indexOf('}') - startOfElement - 1);\r\n\
                    }\r\n\
\r\n\
                    while ((paramMatch = re.exec(trimmedPart)) !== null) {\r\n\
                        // Find each :param in `when` and replace it with a capturing group.\r\n\
                        // Append all other sections of when unchanged.\r\n\
                        regex += trimmedPart.slice(lastMatchedIndex, paramMatch.index);\r\n\
                        regex += '([^\\\\/-]*)';\r\n\
                        params.push(paramMatch[1]);\r\n\
                        lastMatchedIndex = re.lastIndex;\r\n\
                    }\r\n\
\r\n\
                    chunks[i] = {\r\n\
                        params: params,\r\n\
                        regex: new RegExp(regex),\r\n\
                        elementParser: templateElement ? templateElementParsers[templateElement] : null,\r\n\
                        elementName: templateElement,\r\n\
                        repeatPrevious: false\r\n\
                    }\r\n\
                }\r\n\
            }\r\n\
            chunks.length = parts.length - 1 - repeats; // the first element will be empty because each template is supposed to have a slash (/) at the beginning.\r\n\
            return chunks;\r\n\
        }\r\n\
    }\r\n\
﻿angular.module('ssmAngular')\r\n\
    .provider('ssmRoute', ssmUrlRouterProvider)\r\n\
    .provider('ssmRouteTemplateMatcher', ssmRouteTemplateMatcherProvider)\r\n\
    .provider('ssmLayoutMan', ssmLayoutManProvider)\r\n\
    .provider('ssm', ssmProvider);\r\n\
\r\n\
})(window.document);//@ sourceURL=ssmAngular/index.js"
));
require.register("ssmAngular/template.js", Function("exports, require, module",
"module.exports = '';//@ sourceURL=ssmAngular/template.js"
));
require.alias("ssmAngular/index.js", "ssmAngular/index.js");