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

function RqtlGenotypeSource(source) {
    FeatureSourceBase.call(this);

    this.genoCsv = Csv.loadCsv(source.control.geno, function(){});
    this.gmapCsv = Csv.loadCsv(source.control.gmap, function(){});

    this.alleles = source.control.alleles;
    this.genotypes = source.control.genotypes;

    // This is where we save all the marker positions
    this.markerPositions = {};
}

RqtlGenotypeSource.prototype = Object.create(FeatureSourceBase.prototype);
RqtlGenotypeSource.prototype.constructor = RqtlGenotypeSource;

RqtlGenotypeSource.prototype.fetch = function(chr, min, max, scale, types, pool, callback) {
    var self = this;
    // Convert to centimorgan
    var cmMin = min / 1000000;
    var cmMax = max / 1000000;

    self.features = [];

    // This fetches the markers and saves their positions
    this.gmapCsv.fetch({chr: chr, pos: {min: cmMin, max: cmMax}}, function(results, error) {
        self.markerPositions[results.marker] = results.pos;
    });

    // And this fetches the genotype data itself, returning features
    // first argument is null since we want all lines parsed
    this.genoCsv.fetch(null, function(results, error) {
    // this.source.fetch(chr, cmMin, cmMax, function(results, error) {
        // TODO: fix the stylesheet...
        var indivFeatures = [];

        // We want to go through all the keys (that aren't 'id') - they're the markers
        Object.keys(results).map(function (key) {
            if (key !== 'id') {
                var feature = new DASFeature();
                feature.id = results.id;
                // Features are ordered by type then label
                feature.label = results.id;
                feature.type = "marker";
                feature.segment = chr;

                feature.genotype = results[key];

                var pos = self.markerPositions[key];
                if (pos) {
                    feature.min = (pos * 1000000);
                    feature.max = (pos * 1000000) + 150;
                }
                // TODO: this should be configured in a stil
                if (feature.genotype === "SS") {
                    feature.itemRgb = "rgb(255,0,0)";
                } else if (feature.genotype === "SB") {
                    feature.itemRgb = "rgb(0,255,0)";
                } else if (feature.genotype === "BB") {
                    feature.itemRgb = "rgb(0,0,255)";
                } else if (feature.genotype === "-") {
                    feature.itemRgb = "rgb(0,0,0)";
                }

                indivFeatures.push(feature);
            }
        });
        // Need to keep track of all features for all parsed lines
        self.features = self.features.concat(indivFeatures);

    }, function(results, error) {
        // when it's all parsed, we can return
        // callback takes status, features, and scale...
        return callback(null, self.features, 1000000);
    });
};


RqtlGenotypeSource.prototype.getStyleSheet = function(callback) {
    var stylesheet = new DASStylesheet();

    var height = 5;

    // TODO: should handle all N/A strings
    var naStyle = new DASStyle();
    naStyle.glyph = "BOX";
    naStyle.LINE = 0.2;
    naStyle.FGCOLOR = "black";
    // naStyle.BGCOLOR = "black";
    naStyle.BGITEM = true;
    naStyle.HEIGHT = height;
    naStyle.BUMP = true;
    stylesheet.pushStyle({type: "default"}, null, naStyle);

    // The colors are set in fetch() for now
    /*
    var ssStyle = new DASStyle();
    ssStyle.glyph = "BOX";
    ssStyle.LINE = 0.2;
    ssStyle.FGCOLOR = "black";
    ssStyle.BGCOLOR = "blue";
    ssStyle.HEIGHT = height;
    ssStyle.BUMP = true;
    stylesheet.pushStyle({type: "ss"}, null, ssStyle);

    var sbStyle = new DASStyle();
    sbStyle.glyph = "BOX";
    sbStyle.LINE = 0.2;
    sbStyle.FGCOLOR = "black";
    sbStyle.BGCOLOR = "green";
    sbStyle.HEIGHT = height;
    sbStyle.BUMP = true;
    stylesheet.pushStyle({type: "sb"}, null, sbStyle);

    var bbStyle = new DASStyle();
    bbStyle.glyph = "BOX";
    bbStyle.LINE = 0.2;
    bbStyle.FGCOLOR = "black";
    bbStyle.BGCOLOR = "red";
    bbStyle.HEIGHT = height;
    bbStyle.BUMP = true;
    stylesheet.pushStyle({type: "bb"}, null, bbStyle);
    */

    return callback(stylesheet);
};

// Add the source adapter to BD, so it can be used in the browser
dalliance_registerSourceAdapterFactory('rqtl', function(source) {
    return {features: new RqtlGenotypeSource(source)};
});
