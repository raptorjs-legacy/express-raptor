var renderContext = require('raptor/render-context');
var templating = require('raptor/templating');
var ExpressResetter = require('./ExpressResetter');

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

function contextCreateDataProviders() {
    var appDataProviders = dataProviders(this.getAttributes().expressApp);
    return require('raptor/data-providers').create(appDataProviders);
}

function contextRenderTemplate(templateName, data) {

    try
    {
        var promise = templating.renderAsync(templateName, data, this),
        res = this.getAttributes().response;

        promise
            .then(
                function(output) {
                    res.end();
                },
                function(err) {
                    require('raptor/logging').logger('express-raptor').error('Call to context.renderTemplate failed: ' + err, err);
                    this.getAttributes().expressNext(err);
                });
        return promise; 
    }
    catch(e) {
        require('raptor/logging').logger('express-raptor').error('Call to context.renderTemplate failed: ' + e, e);
        this.getAttributes().expressNext(e);
    }
};

function raptorHandler(userHandler) {
    return function(req, res, next) {
        var context = renderContext.createContext(res);
        var attributes = context.getAttributes();
        attributes.request = req;
        attributes.response = res;
        attributes.expressApp = req.app;
        attributes.expressNext = next;
        context.createDataProviders = contextCreateDataProviders;
        context.renderTemplate = contextRenderTemplate;
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