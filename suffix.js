angular.module('ssmAngular')
    .provider('ssmRoute', ssmUrlRouterProvider)
    .provider('ssmRouteTemplateMatcher', ssmRouteTemplateMatcherProvider)
    .provider('ssmLayoutMan', ssmLayoutManProvider)
    .provider('ssm', ssmProvider);

})(window.document);