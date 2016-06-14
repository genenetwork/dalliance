"use strict";

if (typeof(require) !== 'undefined') {
    var das = require('./das');

    var tier = require('./tier');
    var DasTier = tier.DasTier;
}

function Ruler(options) {
    var self = this;

    self.value = options.value;
    self.min = options.min;
    self.max = options.max;
    self.width = options.width;
    self.color = options.color;

    Object.keys(self).map(function(key) {
        if (self[key] === undefined) {
            console.log("WARNING: Ruler option " + key + " not set");
        }
    });
}

// DasTier.prototype.paintRulers = function(tier, rulers) {
//     DasTier.prototype.paintRulers = function(tier, rulers) {
function paintRulers(tier, rulers) {
    if (!(rulers instanceof Array)) {
        console.log("rulers.js: 'rulers' should be an Array");
    }

    var gc = tier.viewport.getContext('2d');

    var retina = tier.browser.retina && window.devicePixelRatio > 1;
    if (retina) {
        gc.scale(2, 2);
    }

    rulers.map(function(r) {
        var rulerHeight = ((r.max - r.value) * tier.viewport.height) - (tier.padding * 2);
        var viewWidth = tier.viewport.width;

        gc.strokeStyle = "#ff0000";
        gc.beginPath();
        gc.moveTo(-viewWidth, rulerHeight);
        // Other parts of the code rely on not having changed the lineWidth...
        // So we need to change it back when we're done.
        var oldLineWidth = gc.lineWidth;
        gc.lineWidth = r.width;
        gc.lineTo(2*viewWidth, rulerHeight);
        gc.stroke();
        gc.lineWidth = oldLineWidth;
    });
    gc.save();
}


if (typeof(module) !== 'undefined') {
    module.exports = {
        Ruler: Ruler,
        paintRulers: paintRulers
    };
}
