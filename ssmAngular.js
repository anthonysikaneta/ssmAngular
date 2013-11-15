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
