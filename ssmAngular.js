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
        .directive('ssmViewport', ['$compile', 'ssmLayoutMan', function ($compile, layoutManager) {
            return {
                restrict: 'AE',
                link: function (scope, element, attrs) {
                    console.log('attr visualPriority: ' + attrs.visualPriority);
                    layoutManager.viewPorts[parseInt(attrs.visualPriority, 10)] = {
                        destroy: function () { },
                        renderView: function (view) {
                            element.html(view);
                            $compile(element.contents())(scope);
                        }
                    };
                }
            };
        }]);
