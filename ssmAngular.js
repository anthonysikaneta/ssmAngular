(function (document, undefined) {

    angular.module('ssmAngular', [])
                .factory('ssmLayoutMan', ['$http', '$templateCache', '$q', function ($http, $templateCache, $q) {
                    var viewPorts = [],
                        views = [],  // list of all views shown and in which viewports they belong.
                        templates = {},
                        baseURL = 'Client/tpl/';

                    return {
                        addView: function (view, viewPortId) {
                            var viewPort = null;
                            views[viewPortId] = view;
                            if (viewPort = viewPorts[viewPortId]) {
                                viewPort.renderView(view);  // TODO: make sure view template has been downloaded.
                            } else {
                                // TODO: proper error throw
                                throw 'No viewport: ' + viewPortId;
                            }
                        },
                        viewPorts: viewPorts,  // gets set by the ssm-Viewport directives as they link.
                        setTemplate: function (templateName) {
                            var d = $q.defer();
                            var that = this;
                            var newTemplate = null;
                            if (!(newTemplate = templates[templateName])) throw 'No template: ' + templateName;

                            // must first destroy the views in each viewport because they are connected to $watch and other events
                            angular.forEach(viewPorts, function (viewPort, index) {
                                if (viewPort) viewPort.destroy();
                            });

                            // load the new template
                            $q.when(newTemplate).then(function (newTemplate) {
                                d.resolve(that);
                                $q.when(that.setTemplateFunc(newTemplate)).then(function () {
                                    for (var i = 0; i < views.length; i++) {
                                        viewPorts[i].renderView(views[i]);
                                    }
                                });
                            });

                            return d.promise;
                        },
                        setTemplateFunc: function (tpl) { }, // gets set by the ssmLayout directive,
                        addTemplate: function (tplName, tpl) {
                            if (tpl) {
                                templates[tplName] = tpl;
                            } else {
                                var d = $q.defer();
                                $http.get(baseURL + tplName + '.html', { cache: $templateCache })
                                  .success(function (html) {
                                      d.resolve(html);
                                  })
                                  .error(function () { throw 'Failed to load template: ' + tplName });
                                templates[tplName] = d.promise;
                            }
                        }
                    };
                }])
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
            .directive('ssmViewport', ['$compile', 'ssmLayoutMan', function ($compile, layoutManager) {
                return {
                    restrict: 'AE',
                    link: function (scope, element, attrs) {
                        console.log('attr visualPriority: ' + attrs.visualPriority);
                        layoutManager.viewPorts[parseInt(attrs.visualPriority, 10)] = {
                            destroy: function () { },
                            renderView: function (view) {
                                element.html(view.template);
                                $compile(element.contents())(scope);
                            }
                        };
                    }
                };
            }])
})(window.document);