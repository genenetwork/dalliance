/* -*- mode: javascript; c-basic-offset: 4; indent-tabs-mode: nil -*- */

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

function CsvFeatureSource(uri) {
    FeatureSourceBase.call(this);
    this.source = Csv.loadCsv(uri, function(){});
}

CsvFeatureSource.prototype = Object.create(FeatureSourceBase.prototype);
CsvFeatureSource.prototype.constructor = CsvFeatureSource;

CsvFeatureSource.prototype.fetch = function(chr, min, max, scale, types, pool, callback) {
    // Convert to centimorgan
    var cmMin = min / 1000000;
    var cmMax = max / 1000000;
    this.source.fetch(chr, cmMin, cmMax, function(results, error) {
        // Wrap the parsed lines in a feature to be displayed by BD
        var feature = new DASFeature();
        feature.label = results.marker;
        feature.type = "marker";
        feature.segment = chr;
        feature.min = (results.pos * 1000000) - 10;
        feature.max = (results.pos * 1000000) + 10;
        // callback takes status, features, and scale...
        return callback(null, [feature], 1000000);
    });
}

// Add the source adapter to BD, so it can be used in the browser
dalliance_registerSourceAdapterFactory('rqtl', function(source) {
    return {features: new CsvFeatureSource(source)};
});
