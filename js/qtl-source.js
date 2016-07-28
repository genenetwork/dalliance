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

    this.lodCsv = Csv.loadCsv(source.uri, {mode: "file"}, function() {});
}

QtlMapSource.prototype = Object.create(FeatureSourceBase.prototype);
QtlMapSource.prototype.constructor = QtlMapSource;

QtlMapSource.prototype.fetch = function(chr, min, max, scale, types, pool, callback) {
    console.log("fetching")
    var self = this;

    var cmMin = min / 1000000;
    var cmMax = max / 1000000;

    var features = [];
    var prevPos = 0;

    this.lodCsv.fetch(null, function(results, error) {
        if (results["Chr"] === chr) {
            var feature = new DASFeature();

            feature.segment = chr;
            var pos = results["Mb"];

            feature.min = pos * 1000000;
            feature.max = pos * 1000000;

            if (results["LRS"]) {
                feature.score = results["LRS"];
            } else if (results["LOD"]) {
                feature.score = results["LOD"];
            }

            features.push(feature);
        }
    }, function (results, error) {
        return callback(null, features, 1);
    });

};

dalliance_registerSourceAdapterFactory(('qtl'), function(source) {
    return {
        features: new QtlMapSource(source)
    };
});
