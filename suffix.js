angular.module('ssmAngular')
    .provider('ssmRoute', ssmUrlRouterProvider)
    .provider('ssmRouteTemplateMatcher', ssmRouteTemplateMatcherProvider)
    .provider('ssm', ssmProvider)
    .provider('ssmLayoutMan', ssmLayoutManProvider);
})(window.document);