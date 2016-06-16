"use strict";

if (typeof(require) !== 'undefined') {
    var sa = require('./sourceadapters');
    var dalliance_registerSourceAdapterFactory = sa.registerSourceAdapterFactory;
    var FeatureSourceBase = sa.FeatureSourceBase;
    var DASFeatureSource = sa.DASFeatureSource;

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
    console.log(self.sources[0]);
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


function stylesheetHelper(source) {
    var ssSource;
    if (source.stylesheet_uri || (
        !source.tier_type &&
            !source.bwgURI &&
            !source.bwgBlob &&
            !source.bamURI &&
            !source.bamBlob &&
            !source.twoBitURI &&
            !source.twoBitBlob &&
            !source.jbURI &&
            !source.overlay))
    {
        ssSource = new DASFeatureSource(source);
    } else {
        ssSource = source;
    }
    return ssSource;
}

MultiTrackSource.prototype.getStyleSheet = function(callback) {
    var self = this;
    console.log(self.sources[0]);
    console.log(self.sources[1]);
    var source0 = self.sources[0].features.source.source;
    console.log(source0);
    var ssSource0 = stylesheetHelper(source0);
    console.log(ssSource0);
    console.log(stylesheet0);

    // var source1 = self.sources[1].features.source.source;
    // var ssSource1 = stylesheetHelper(source);
    // var stylesheet0, stylesheet1;
    // ssSource0.getStyleSheet(function() {
    //     ssSource1.getStyleSheet(function() {
    //         stylesheet1 = 
    //     });
    // });
    // var stylesheet0 = ssSource.getStyleSheet(callback);
    // var stylesheet1 = ssSource.getStyleSheet(callback);

    // return callback(stylesheets);

    return ssSource0.getStyleSheet(callback);
    // return ssSource.getStyleSheet(callback);

    // var self = this;
    // var stylesheet = new DASStylesheet();
    // console.log(self.sources[0]);

    // self.sources[0].features.getStyleSheet(function(ss) {
    // self.sources[0].features.fetchStylesheet(function(ss) {
    //     console.log(ss);
        // return callback(ss);
        // callback(ss);
    // });
    // console.log(self.sources[0].features.fetchStylesheet);
    //self.sources[0].features.fetchStylesheet(callback);
};


dalliance_registerSourceAdapterFactory(('multi-track'), function(source, callback) {
    return {
        features: new MultiTrackSource(source, callback)
    };
});
