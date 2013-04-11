var renderContext = require('raptor/render-context'),
    templating = require('raptor/templating');


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

function contextRender(templateName, data) {

    var promise = templating.renderAsync(templateName, data, this),
        res = this.getAttributes().response;

    promise
        .then(
            function(output) {
                res.end();
            },
            function(err) {
                next(err);
            });
    return promise;
};

function raptorHandler(userHandler) {
    return function(req, res, next) {
        var context = renderContext.createContext(res);
        var attributes = context.getAttributes();
        attributes.request = req;
        attributes.response = res;
        attributes.expressApp = req.app;
        context.createDataProviders = contextCreateDataProviders;
        context.render = contextRender;
        userHandler(context, req, res, next);
    }
};

exports.handler = raptorHandler;
exports.dataProviders = dataProviders;