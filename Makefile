build: components index.js ssmAngular.css template.js
	@component build --dev

index.js: prefix.js ssmAngular.js ssmLayoutManagerProvider.js ssmProvider.js ssmRouteProvider.js ssmRouteTemplateMatcher.js  suffix.js
	cat prefix.js > index.js
	cat ssmAngular.js >> index.js
	cat ssmLayoutManagerProvider.js >> index.js
	cat ssmProvider.js >> index.js
	cat ssmRouteProvider.js >> index.js
	cat ssmRouteTemplateMatcher.js >> index.js
	cat suffix.js >> index.js

template.js: template.html
	@component convert $<

components: component.json
	@component install --dev

clean:
	rm -fr build components template.js

.PHONY: clean
