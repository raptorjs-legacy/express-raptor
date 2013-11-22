var DELAY_PROMISES_KEY = '_raptorDelayPromises';
var promises = require('raptor/promises');

module.exports = function(express) {
    if (express.__hasRaptorPatch) {
        return;
    }

    var response = express.response;
    var request = express.request;

    response.isRedirect = function() {
        return this.statusCode === 300 || this.statusCode === 301;
    };

    response.delayEnd = function(promise) {
        var delayPromises = this[DELAY_PROMISES_KEY];

        if (!delayPromises) {
            this[DELAY_PROMISES_KEY] = [promise];
        }
        else {
            delayPromises.push(promise);
        }
    };

    function getAttributes() {
        return this.attributes;
    }

    function dataProviders() {
        var raptorContext = this.attributes.raptorContext;
        this.attributes.raptorContext.dataProviders.apply(raptorContext, arguments);
    }

    request.dataProviders = dataProviders;
    request.dataProvider = dataProviders;

    request.getAttributes = getAttributes;
    response.getAttributes = getAttributes;
};

