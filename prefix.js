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
