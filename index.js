var ExpressResetter = require('./ExpressResetter');
var raptor = require('raptor');
var dataProviders = require('raptor/data-providers');
var RequestContext = require('./RequestContext');
var CONTEXT_KEY = 'raptorContext';
var APP_DATA_PROVIDERS_KEY = '__raptorDataProviders';
RequestContext.CONTEXT_KEY = CONTEXT_KEY;
RequestContext.APP_DATA_PROVIDERS_KEY = APP_DATA_PROVIDERS_KEY;

function getAppDataProviders(app, newProviders){

    // See if data providers are already associated with the app...
    var appDataProviders = app[APP_DATA_PROVIDERS_KEY];

    if (!appDataProviders) {
        // It not, create the app data providers
        appDataProviders = app[APP_DATA_PROVIDERS_KEY] = dataProviders.create();
    }

    // If new providers have been passed in, then reigster those providers
    if (arguments.length > 1) {
        appDataProviders.register.apply(appDataProviders, raptor.arrayFromArguments(arguments, 1));
    }

    return appDataProviders;
}


function raptorHandler(userHandler) {
    return function(req, res, next) {
        var context = req[CONTEXT_KEY];
        if (!context) {
            context = new RequestContext(req, res);
        }

        context.next = next;

        userHandler(context, req, res, next);
    };
}

function getContext(req, res) {
    var context = req[CONTEXT_KEY];

    if (!context && arguments.length === 2) {
        // We currently don't have a context, but we can record it now
        context = new RequestContext(req, res);
    }

    return context;
}

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
exports.dataProviders = getAppDataProviders;
exports.createExpressResetter = createExpressResetter;
exports.addOptimizerRoutes = addOptimizerRoutes;
exports.RequestContext = RequestContext;
exports.getContext = getContext;
exports.patchExpress = require('./patch-express');

exports.middleware = {
    context: function() {
        return function(req, res, next) {
            var context = req[CONTEXT_KEY];
            if (!context) {
                context = new RequestContext(req, res);
            }
            next();
        };
    }
}

exports.resetRoutes = function(app, express) {
    if (app._expressResetter) {
        app._expressResetter.reset();
    }
    else {
        app._expressResetter = createExpressResetter(app, express);
    }
}