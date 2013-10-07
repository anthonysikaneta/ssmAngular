    function ssmRouteTemplateMatcherProvider() {
        var routeTemplates = {};
        var compiledRouteTemplates = {};
        var templateElementParsers = {};
        var route = null;


        var compileRouteTemplate = function (tpl) {
            compiledRouteTemplates[tpl] = {
                chunks: getChunks(tpl)
            };
        };

        // You can add a new template element and provide a parser for it.  
        // Example template element: {myTemplateElement}  
        // Template elements are marked by the curly braces within the template. 
        // parseFunc must match the following interface function(match) { return { }; }
        this.addTemplateElement = function(templateElementString, parseFunc) {
            templateElementParsers[templateElementString] = parseFunc; 
        };

        this.addTemplateElement('config', function (part) {
            var splitByDash = part.split('-');
            var ret = {};
            for (var i = 0; i < splitByDash.length; i += 2) {
                ret[splitByDash[i]] = splitByDash[i + 1];
            }
            return ret;
        });

        this.addRouteTemplate = function (tpl, desc) {
            routeTemplates[tpl] = desc;
            compileRouteTemplate(tpl);
        };

        // returns true if the chunk was a match.
        function matchChunkToPart(chunk, part, ret) {
            if (chunk.params) {
                var match = part.match(chunk.regex);
                if (!match) return false;
                for (var pIndex = 0; pIndex < chunk.params.length; pIndex++) {
                    if (chunk.params[pIndex] == 'view') {
                        if (!ret['views']) ret['views'] = [];
                        var view = {
                            name: match[pIndex + 1],
                        };
                        if (chunk.elementParser) {
                            var elementPart = part.replace(match[pIndex], '');
                            if (elementPart[0] == '-') elementPart = elementPart.substr(1);
                            view[chunk.elementName] = chunk.elementParser(elementPart);
                        }
                        ret['views'].push(view);
                    } else {
                        ret[chunk.params[pIndex]] = match[pIndex + 1];
                    }
                }
                return true;
            }
        }
        
        // in order for a template to be considered a match, all chunks must much each part.
        var matchTemplate = function (path) {
            var parts = path.split('/');
            
            for (var tpl in compiledRouteTemplates) {
                var ret = {};
                if (!compiledRouteTemplates.hasOwnProperty(tpl)) continue;
                var compiled = compiledRouteTemplates[tpl];
                // parts.length is subtraced by 1 because the path must start with a '/' and so first element is empty.
                if ((parts.length-1) >= compiled.chunks.length) {
                    var isMatch = false;
                    var chunkIndex = 1;
                    for (var i = 1; i < parts.length; i++) {
                        var chunk = compiled.chunks[chunkIndex];
                        if (undefined === chunk) {
                            isMatch = false;
                            break;
                        }
                        var repeat = chunk.repeatPrevious;
                        if (repeat) chunk = compiled.chunks[chunkIndex-1];  // assumes there is more than one for performance optimization.

                        isMatch = matchChunkToPart(chunk, parts[i], ret);
                        
                        if (!repeat) {
                            chunkIndex++;
                            if (!isMatch) break;
                        }
                        else if (repeat && !isMatch) {
                            chunkIndex++;
                            if (chunkIndex < compiled.chunks.length) {
                                isMatch = matchChunkToPart(compiled.chunks[chunkIndex], parts[i], ret);
                                if (!isMatch) break;
                                chunkIndex++;
                            } else {
                                isMatch = false;
                                break;
                            }
                        }
                    }
                    if (isMatch) return [tpl, ret];
                } 
            }
            return [null, null];
        };

        this.$get = function () {
            return {
                matchTemplate: function (path) { return matchTemplate(path)[0]; }, // exposed for unit testing only.
                // method: parsePathIntoParams
                // converts a path Ex. "/userscene/layout-awesomelayout"
                // into: {sceneName: "usersscene", layout: "awesomeLayout" }
                parseRoute: function (path) {
                    return matchTemplate(path)[1];
                },
                route: route
            };
        };

        function getParams(path) {
            var params = path.match(/:(\w+)/g)
            for (var i = 0; i < params.length; i++) {
                params[i] = params[i].replace(':', '');
            }
            return params;
        };

        function getChunks(path) {
            var parts = path.split('/');
            var chunks = {};
            var repeats = 0;
            for (var i = 1; i < parts.length; i++) {
                var part = parts[i],
                    els = null;
                //if (t.indexOf('-') > 0) {
                //    els = t.split('-');
                //}

                if (part == '*') {
                    chunks[i] = {
                        repeatPrevious: true
                    }
                    repeats += 1;
                } else {
                    var re = /:(\w+)/g,
                        regex = '',
                        paramMatch,
                        lastMatchedIndex = 0,
                        trimmedPart = part,
                        params = [],
                        templateElement;

                    if (part.indexOf('{') > 0) {
                        var startOfElement = path.indexOf('{');
                        trimmedPart = part.substr(0, startOfElement);
                        // template elements are defined between the squiggly brackets
                        templateElement = path.substr(startOfElement + 1, path.indexOf('}') - startOfElement - 1);
                    }

                    while ((paramMatch = re.exec(trimmedPart)) !== null) {
                        // Find each :param in `when` and replace it with a capturing group.
                        // Append all other sections of when unchanged.
                        regex += trimmedPart.slice(lastMatchedIndex, paramMatch.index);
                        regex += '([^\\/-]*)';
                        params.push(paramMatch[1]);
                        lastMatchedIndex = re.lastIndex;
                    }

                    chunks[i] = {
                        params: params,
                        regex: new RegExp(regex),
                        elementParser: templateElement ? templateElementParsers[templateElement] : null,
                        elementName: templateElement,
                        repeatPrevious: false
                    }
                }
            }
            chunks.length = parts.length - 1 - repeats; // the first element will be empty because each template is supposed to have a slash (/) at the beginning.
            return chunks;
        }
    }
