var renderContext = require('raptor/render-context');
var templating = require('raptor/templating');
var raptor = require('raptor');
var dataProviders = require('raptor/data-providers');
var Context = require('raptor/render-context/Context');

var RequestContext = define.Class(
    {
        superclass: Context
    },
    function(require, exports, module) {
        
        var oldRenderTemplate = Context.prototype.renderTemplate;

        function RequestContext(request, response) {
            // Use the response object as the output writer
            RequestContext.superclass.constructor.call(this, response);

            var attributes = this.getAttributes();
            attributes.request = request;
            attributes.response = response;
            attributes.app = request.app;
        }

        // Copy properties to our new prototype to keep the prototype chain short:
        raptor.extend(RequestContext.prototype, Context.prototype);

        RequestContext.prototype.createDataProviders = function() {
            // This method is invoked by the context.dataProviders method to
            // create the initial DataProviders object
            var appDataProviders = require('./index').dataProviders(this.app);

            // Create a new DataProviders object for this context that extends
            // the application data providers
            return dataProviders.create(appDataProviders);
        };

        RequestContext.prototype.renderTemplate = function(templateName, data) {
            // The first "renderTemplate" call is special because it is used
            // to render the page and we automatically close the connection
            // when the rendering is complete. We restore the original 
            // "renderTemplate" method after the first call to this
            // renderTemplate function
            this.renderTemplate = oldRenderTemplate;
            var _this = this;

            function onError(e) {
                var wrappedError = raptor.createError(new Error('Call to context.renderTemplate("' + templateName + '", ...) failed: ' + e), e);
                _this.next(wrappedError);
            }

            try
            {
                var promise = templating.renderAsync(templateName, data, this),
                    response = this.response;

                promise
                    .then(
                        function(output) {
                            response.end();
                        },
                        onError);
                return promise; 
            }
            catch(e) {
                onError(e);
            }
        };

        return RequestContext;
    });

Object.defineProperty(RequestContext.prototype, "request", {
    get: function() { return this.getAttributes().request; },
    set: function(request) { this.getAttributes().request = request; }
});

Object.defineProperty(RequestContext.prototype, "response", {
    get: function() {return this.getAttributes().response; },
    set: function(response) { this.getAttributes().response = response; }
});

Object.defineProperty(RequestContext.prototype, "app", {
    get: function() { return this.getAttributes().app; },
    set: function(app) { this.getAttributes().app = app; }
});

Object.defineProperty(RequestContext.prototype, "next", {
    get: function() {return this.getAttributes().next; },
    set: function(next) { this.getAttributes().next = next; }
});

module.exports = RequestContext;