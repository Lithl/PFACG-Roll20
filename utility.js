var bshields = bshields || {};
bshields.splitArgs = (function() {
    'use strict';
    
    var version = 1.0;
    
    function splitArgs(input, separator) {
        var singleQuoteOpen = false,
            doubleQuoteOpen = false,
            tokenBuffer = [],
            ret = [],
            arr = input.split(''),
            element, i, matches;
        separator = separator || /\s/g;
        
        for (i = 0; i < arr.length; i++) {
            element = arr[i];
            matches = element.match(separator);
            if (element === '\'') {
                if (!doubleQuoteOpen) {
                    singleQuoteOpen = !singleQuoteOpen;
                    continue;
                }
            } else if (element === '"') {
                if (!singleQuoteOpen) {
                    doubleQuoteOpen = !doubleQuoteOpen;
                    continue;
                }
            }
            
            if (!singleQuoteOpen && !doubleQuoteOpen) {
                if (matches) {
                    if (tokenBuffer && tokenBuffer.length > 0) {
                        ret.push(tokenBuffer.join(''));
                        tokenBuffer = [];
                    }
                } else {
                    tokenBuffer.push(element);
                }
            } else if (singleQuoteOpen || doubleQuoteOpen) {
                tokenBuffer.push(element);
            }
        }
        if (tokenBuffer && tokenBuffer.length > 0) {
            ret.push(tokenBuffer.join(''));
        }
        
        return ret;
    }
    
    return splitArgs;
}());
bshields.stringFormat = (function() {
    'use strict';
    
    var version = 1.0;
    
    function stringFormat() {
        var args = arguments;
        return this.replace(/\{\{|\}\}|\{(\d+)\}/g, function (curlyBrack, index) {
            return ((curlyBrack == "{{") ? "{" : ((curlyBrack == "}}") ? "}" : args[index]));
        });
    }
    
    return stringFormat;
}());
bshields.firstCap = (function() {
    'use strict';
    
    var version = 1.0;
    
    function capitalizeFirstLetter() { return this.charAt(0).toUpperCase() + this.slice(1); }
    
    return capitalizeFirstLetter;
}());
bshields.guid = (function() {
    'use strict';
    
    var version = 0.1,
        template = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
    
    function generateGUID() {
        var date = date = new Date().getTime();
        
        return template.replace(/[xy]/g, function(chr) {
            var rand = (date + Math.random() * 16) % 16 | 0;
            date = Math.floor(date / 16);
            return (chr === 'x' ? rand : (rand & 3 | 8)).toString(16);
        });
    }
    
    return generateGUID;
}());

String.prototype.splitArgs = String.prototype.splitArgs || function(separator) {
    return bshields.splitArgs(this, separator);
};

String.prototype.format = String.prototype.format || bshields.stringFormat;
String.prototype.firstCap = String.prototype.firstCap || bshields.firstCap;

String.guid = String.guid || bshields.guid;
