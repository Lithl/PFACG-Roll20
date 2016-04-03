var bshieds = bshields || {};
bshields.freeze = (function() {
    'use strict';
    
    var version = 0.1;
    
    function handleMoveCard(obj, prev) {
        if (obj.get('name').toLowerCase().indexOf('freeze') >= 0) {
            obj.set({
                top: prev.top,
                left: prev.left
            });
        }
    }
    
    function registerEventHandlers() {
        on('change:graphic:top', handleMoveCard);
        on('change:graphic:left', handleMoveCard);
    }
    
    return {
        registerEventHandlers: registerEventHandlers
    };
}());

on('ready', function() {
    bshields.freeze.registerEventHandlers();
});
