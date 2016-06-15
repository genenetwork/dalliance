"use strict";

if (typeof(require) !== 'undefined') {
    var sa = require('./sourceadapters');
    var dalliance_registerSourceAdapterFactory = sa.registerSourceAdapterFactory;
    var FeatureSourceBase = sa.FeatureSourceBase;

    var das = require('./das');
    var DASStylesheet = das.DASStylesheet;
    var DASStyle = das.DASStyle;
    var DASFeature = das.DASFeature;
}

function MultiTrackSource(sourceConfig, callback) {
    var self = this;
    FeatureSourceBase.call(self);
    if (!(sourceConfig.sources instanceof Array)) {
        console.log("WARNING: MultiTrackSource sources not in array!");
    }

    self.sources = [];

    sourceConfig.sources.map(function(s) {
        if (s.tier_type === "multi-track") {
            console.log("Ignoring multi-track source within multi-track");
        } else {
            console.log(self.sources);
            self.sources.push(callback(s));
        }
    });

    console.log(self.sources);
}

MultiTrackSource.prototype = Object.create(FeatureSourceBase.prototype);
MultiTrackSource.prototype.construct = MultiTrackSource;

MultiTrackSource.prototype.fetch = function(chr, min, max, scale, types, pool, callback) {
    var self = this;
    return self.sources[0].features.fetch(chr, min, max, scale, types, pool, callback);
    /*
    var self = this;
    var allFeatures = [];
    self.sources.map(function(source) {
        console.log("source");
        console.log(source.features);
        source.features.fetch(chr, min, max, scale, types, pool, function(f) {
            allFeatures = allFeatures.concat(f);
        });
    });
    while (allFeatures === []) {
        console.log("this is terrible");
    }
    return callback(null, allFeatures, 1);*/
};


dalliance_registerSourceAdapterFactory(('multi-track'), function(source, callback) {
    return {
        features: new MultiTrackSource(source, callback)
    };
});
