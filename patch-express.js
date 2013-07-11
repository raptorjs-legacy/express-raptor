var DELAY_PROMISES_KEY = '_raptorDelayPromises';
var promises = require('raptor/promises');

module.exports = function(express) {
    if (express.__hasRaptorPatch) {
        return;
    }

    var response = express.response;
    var request = express.request;

    var oldEnd = response.end;

    response.end = function() {

        var _this = this;
        var args = arguments;

        // Emit the "beforeEnd" event now to give other modules
        // a chance to delay the actual end
        //this.emit('beforeEnd');

        var delayPromises = this[DELAY_PROMISES_KEY]

        function doEnd() {
            oldEnd.apply(_this, args);
            _this.emit('afterEnd');
        }

        if (delayPromises) {
            promises.all(delayPromises)
                .then(
                    function() {
                        doEnd();
                    },
                    function(e) {
                        var logger = require('raptor/logging').logger('express-raptor/patch-express');
                        logger.error('One or more promises added to delay response.end() was rejected. Error: ' + e, e);
                        doEnd();
                    })
        }
        else {
            oldEnd.apply(this, args);
            this.emit('afterEnd');
        }
    }

    response.isRedirect = function() {
        return this.statusCode === 300 || this.statusCode === 301;
    }

    response.delayEnd = function(promise) {
        var delayPromises = this[DELAY_PROMISES_KEY];

        if (!delayPromises) {
            this[DELAY_PROMISES_KEY] = [promise];
        }
        else {
            delayPromises.push(promise);    
        }
    }

    function getAttributes() {
        return this.attributes;
    }

    request.getAttributes = getAttributes;
    response.getAttributes = getAttributes;
}

