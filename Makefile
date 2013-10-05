build: components ssmAngular.css template.js
	@component build --dev

#index.js: ssmAngular.js ssmProvider.js  ssmRouteProvider.js
#	cat ssmAngular.js > index.js 
#	cat ssmProvider.js >> index.js 
#	cat ssmRouteProvider.js >> index.js

template.js: template.html
	@component convert $<

components: component.json
	@component install --dev

clean:
	rm -fr build components template.js

.PHONY: clean
