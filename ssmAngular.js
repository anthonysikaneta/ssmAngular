angular.module('ssmAngular', [])
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
