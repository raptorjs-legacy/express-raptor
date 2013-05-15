var renderContext = require('raptor/render-context');
var templating = require('raptor/templating');
var ExpressResetter = require('./ExpressResetter');
var raptor = require('raptor');

function dataProviders(app, newProviders){
    var dataProviders = app.__raptorDataProviders;
    
    if (!dataProviders) {
        dataProviders = app.__raptorDataProviders = new require('raptor/data-providers').create();
    }

    if (arguments.length > 1) {
        dataProviders.register.apply(dataProviders, arguments);    
    }

    return dataProviders;
};

function context_createDataProviders() {
    var appDataProviders = dataProviders(this.getAttributes().expressApp);
    return require('raptor/data-providers').create(appDataProviders);
}

function context_renderTemplate(templateName, data) {
    // The first "renderTemplate" call is special because it is used
    // to render the page and we automatically close the connection
    // when the rendering is complete. We restore the original 
    // "renderTemplate" method after the first call to this
    // renderTemplate function
    this.renderTemplate = this._oldRenderTemplate;
    var _this = this;

    function onError(e) {
        var wrappedError = raptor.createError(new Error('Call to context.renderTemplate("' + templateName + '", ...) failed: ' + e), e);
        _this.getAttributes().expressNext(wrappedError);
    }

    try
    {
        var promise = templating.renderAsync(templateName, data, this),
        res = this.getAttributes().response;

        promise
            .then(
                function(output) {
                    res.end();
                },
                onError);
        return promise; 
    }
    catch(e) {
        onError(e);
    }
};

function context_getRequest() {
    return this.getAttributes().request;
}

function context_getResponse() {
    return this.getAttributes().response;
}

function raptorHandler(userHandler) {
    return function(req, res, next) {
        var context = renderContext.createContext(res);
        var attributes = context.getAttributes();
        attributes.request = req;
        attributes.response = res;
        attributes.expressApp = req.app;
        attributes.expressNext = next;
        context.createDataProviders = context_createDataProviders;
        context._oldRenderTemplate = context.renderTemplate;
        context.renderTemplate = context_renderTemplate;
        context.getRequest = context_getRequest;
        context.getResponse = context_getResponse;
        userHandler(context, req, res, next);
    }
};


function createExpressResetter(app, express) {
    return new ExpressResetter(app, express);
}

function addOptimizerRoutes(app, pageOptimizer, express) {
    express = express || require('express');

    if (!pageOptimizer) {
        pageOptimizer = require('raptor/optimizer').getDefaultPageOptimizer();
    }
    var config = pageOptimizer.getConfig();
    var sourceMappings = config.getServerSourceMappings();
    if (sourceMappings && sourceMappings.length) {
        sourceMappings.forEach(function(sourceMapping) {
            var urlPrefix = sourceMapping.urlPrefix;
            var baseDir = sourceMapping.baseDir;
            app.use(urlPrefix, express.static(baseDir)); 
        });
    }

    var outputDir = config.getOutputDir();
    var urlPrefix = config.getUrlPrefix();
    
    if (outputDir && urlPrefix) {
        app.use(urlPrefix, express.static(outputDir));
    }
}

exports.handler = raptorHandler;
exports.dataProviders = dataProviders;
exports.createExpressResetter = createExpressResetter;
exports.addOptimizerRoutes = addOptimizerRoutes;
exports.resetRoutes = function(app, express) {
    if (app._expressResetter) {
        app._expressResetter.reset();
    }
    else {
        app._expressResetter = createExpressResetter(app, express);
    }
}