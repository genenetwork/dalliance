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

    var Csv = require('./csv.es6');
}

function QtlMapSource(source) {
    FeatureSourceBase.call(this);

    this.lodCsv = Csv.loadCsv(source.uri, {mode: "file"}, function() {});
}

QtlMapSource.prototype = Object.create(FeatureSourceBase.prototype);
QtlMapSource.prototype.constructor = QtlMapSource;

QtlMapSource.prototype.fetch = function(chr, min, max, scale, types, pool, callback) {
    var self = this;

    var cmMin = min / 1000000;
    var cmMax = max / 1000000;

    var features = [];
    var prevPos = 0;

    this.lodCsv.fetch(function(results, error) {
        results.forEach(function(row) {
            if (row["Chr"] === chr) {
                var feature = new DASFeature();

                feature.segment = chr;
                var pos = row["Mb"];

                feature.min = pos * 1000000;
                feature.max = pos * 1000000;

                if (row["LRS"]) {
                    feature.score = row["LRS"];
                } else if (row["LOD"]) {
                    feature.score = row["LOD"];

                }

                features.push(feature);
            }
        });
        return callback(null, features, 1);
    });
};

dalliance_registerSourceAdapterFactory(('qtl'), function(source) {
    return {
        features: new QtlMapSource(source)
    };
});
