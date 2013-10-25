describe('ssmRouteTemplateMatcher', function () {
    beforeEach(module('ssmAngular', function (ssmRouteTemplateMatcherProvider) {
        ssmRouteTemplateMatcherProvider.addRouteTemplate('/:scene/view-:view');
        ssmRouteTemplateMatcherProvider.addRouteTemplate('/:scene/layout-:layout/:view-{config}/*');
        ssmRouteTemplateMatcherProvider.addRouteTemplate('/:scene/layout-:layout');
    }));

    describe('route matching and parsing.', function() {
        it('should match routes to their correct templates', inject(function (ssmRouteTemplateMatcher) { 
            expect(ssmRouteTemplateMatcher.matchTemplate('/AwesomeScene/layout-AwesomeLayout')).toBe('/:scene/layout-:layout');
            expect(ssmRouteTemplateMatcher.matchTemplate('/AwesomeScene/view-AwesomeLayout')).toBe('/:scene/view-:view');
            expect(ssmRouteTemplateMatcher.matchTemplate('/AwesomeScene/layout-AwesomeLayout/myAwesomeView-symbol-MSFT')).toBe('/:scene/layout-:layout/:view-{config}/*');
            expect(ssmRouteTemplateMatcher.matchTemplate('/ProductDetails/layout-VerticalHalfTpl/CRUD+Details-detailsFor-Product')).toBe('/:scene/layout-:layout/:view-{config}/*');
        }));

        it('should match url paths to their respective data objects', inject(function (ssmRouteTemplateMatcher) {
            expect(ssmRouteTemplateMatcher.parseRoute('/AwesomeScene/layout-AwesomeLayout')).toEqual({ scene: 'AwesomeScene', layout: 'AwesomeLayout' });
            expect(ssmRouteTemplateMatcher.parseRoute('/AwesomeScene/view-AwesomeView')).toEqual({ scene: 'AwesomeScene', views: [
                { name: 'AwesomeView' }
            ]});
            expect(ssmRouteTemplateMatcher.parseRoute('/Accounts/layout-AwesomeLayout/myAwesomeView-symbol-MSFT')).toEqual({scene: 'Accounts', layout: 'AwesomeLayout',
                views: [
                    { 
                        name: 'myAwesomeView', 
                        config: {
                            symbol: 'MSFT'   
                        }
                    }
                ]
            });
            expect(ssmRouteTemplateMatcher.parseRoute('/Accounts/layout-AwesomeLayout/myAwesomeView-symbol-GOOG-price-99.9')).toEqual({
                scene: 'Accounts', layout: 'AwesomeLayout',
                views: [
                    {
                        name: 'myAwesomeView',
                        config: {
                            symbol: 'GOOG',
                            price: '99.9'
                        }
                    }
                ]
            });
            expect(ssmRouteTemplateMatcher.parseRoute('/Accounts/layout-AwesomeLayout/myAwesome+View-symbol-GOOG-price-99.9/second-symbol-MSFT-price-100')).toEqual({
                scene: 'Accounts', layout: 'AwesomeLayout',
                views: [
                    {
                        name: 'myAwesome+View',
                        config: {
                            symbol: 'GOOG',
                            price: '99.9'
                        }
                    },
                    {
                        name: 'second',
                        config: {
                            symbol: 'MSFT',
                            price: '100'
                        }
                    }
                ]
            });

            expect(ssmRouteTemplateMatcher.parseRoute('/ProductDetails/layout-VerticalHalfTpl/CRUD+Details-detailsFor-Product')).toEqual({
                scene: 'ProductDetails', layout: 'VerticalHalfTpl',
                views: [
                    {
                        name: 'CRUD+Details',
                        config: {
                            detailsFor: 'Product'
                        }
                    }
                ]
            });
        }));
    });
});