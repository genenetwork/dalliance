"use strict";

if (typeof(require) !== 'undefined') {
    var sa = require('./sourceadapters');
    var dalliance_registerSourceAdapterFactory = sa.registerSourceAdapterFactory;
    var dalliance_makeParser = sa.makeParser;
    var FeatureSourceBase = sa.FeatureSourceBase;

    var das = require('./das');
    var DASStylesheet = das.DASStylesheet;
    var DASStyle = das.DASStyle;
    var DASFeature = das.DASFeature;
    var DASGroup = das.DASGroup;

    var Csv = require('./csv');
}

function QtlMapSource(source) {
    FeatureSourceBase.call(this);

    this.lodCsv = Csv.loadCsv(source.uri, function() {});
}

QtlMapSource.prototype = Object.create(FeatureSourceBase.prototype);
QtlMapSource.prototype.constructor = QtlMapSource;

QtlMapSource.prototype.fetch = function(chr, min, max, scale, types, pool, callback) {
    var self = this;

    var cmMin = min / 1000000;
    var cmMax = max / 1000000;

    var features = [];
    var prevPos = 0;

    /*
    var lrs = 0.1;
    var lrsFeature = new DASFeature();
    lrsFeature.min = 1;
    lrsFeature.max = 125000000;
    lrsFeature.score = lrs;
    lrsFeature.type = "ruler";
    features.push(lrsFeature);
     */

    this.lodCsv.fetch({chr: chr}, function(results, error) {
        var feature = new DASFeature();

        feature.segment = chr;
        var pos = results["pos"];

        feature.min = pos * 1000000;
        feature.max = pos * 1000000;

        feature.score = results["lod"];

        features.push(feature);
    }, function (results, error) {
        return callback(null, features, 1);
    });

};

/*
QtlMapSource.prototype.getStylesheet = function(callback) {
    var stylesheet = new DASStylesheet();

    var rulerStyle = new DASStyle();
    rulerStyle.glyph = "LINE";
    rulerStyle.HEIGHT = 10;
    rulerStyle.FGCOLOR = "red";
    rulerStyle.BGCOLOR = "red";
    var style = new DASStyle();
    style.glyph = "HISTOGRAM";
    style.HEIGHT = 500;
    style.COLOR1 = "blue";
    style.COLOR2 = style.COLOR1;
    style.COLOR3 = style.COLOR1;
    style.MIN = 0;
    style.MAX = 5000;
    style.STEPS = 100;
    style.ZINDEX = 0;

    // stylesheet.pushStyle({type: "ruler"}, null, rulerStyle);
    stylesheet.pushStyle({type: "default"}, null, style);

    return callback(stylesheet);
};
*/

dalliance_registerSourceAdapterFactory(('qtl'), function(source) {
    return {
        features: new QtlMapSource(source)
    };
});
