function ssmLayoutManProvider() {
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
                    that.setTemplateFunc(newTemplate);
                    d.resolve(that);
                });

                return d.promise;
            },
            setTemplateFunc: function (tpl) { } // gets set by the ssmLayout directive,
        };
    }];
}
