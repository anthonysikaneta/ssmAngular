angular.module('ssmAngular', [])
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
                $activeDialog = null,
                dialogTplUrl = '/Client/tpl/DialogTpl.html',
                awaitDialogTpl = null; 

            this.setDialogTpl = function (dialogTpl) {

            };

            this.$get = ['ssmLayoutMan', '$rootScope', '$templateCache', '$http', '$q', '$compile', function (layoutManager, $rootScope, $templateCache, $http, $q, $compile) {
                return {
                    preload: function() {
                        awaitDialogTpl = $http.get(dialogTplUrl, {cache:$templateCache});
                    },
                    pushDialog: function (view) {
                        var that = this;
                        var c = $body.find('[ssm-dialog="true"]');
                        if (c.length > 0) {
                            $activeDialog.modal('hide');
                            dialogStack.push(c.detach());
                        }
                        $q.when(view.template).then(function (template) {
                            awaitDialogTpl.then(function (dialogHtml) {
                                var $dialog = $(dialogHtml.data);
                                $dialog.find('.modal-body').append(template);
                                // get the outerHTML by appending it to a div first, cause html() only returns inner.
                                view.template = $('<div />').append($dialog).html(); 

                                var vp = $('<div ssm-Viewport visual-Priority="' + (viewPortSlot++) + '" ssm-Dialog="true"></div>');
                                $body.append(vp);
                                $compile(vp)($rootScope.$new());
                                layoutManager.addView(view, viewPortSlot - 1).then(function () {
                                    $activeDialog = $body.find('[ssm-dialog="true"] .modal');
                                    $activeDialog.modal({});
                                    $activeDialog.on('hidden.bs.modal', function () {
                                        that.popDialog();
                                    });
                                    // restore the template back to normal.
                                    view.template = template;
                                });

                            });
                        });
                    },
                    popDialog: function () {
                        var c = $body.find('[ssm-dialog="true"]');
                        if (c.length > 0) {
                            $activeDialog.modal('hide');
                            c.remove();
                        }
                        if (dialogStack.length > 0) {
                            var p = dialogStack.pop();
                            $body.append(p);
                            $activeDialog = p.find('.modal');
                            $activeDialog.modal('show');
                            return true; 
                        }
                        return false;
                    }
                };
            }];
        })
;
