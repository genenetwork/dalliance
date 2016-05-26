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
    // TODO: this should take a control file URI that should be parsed & contain the other URIs
    // Right now it's just in the source definition in the browser
    this.genoCsv = Csv.loadCsv(source.genoUri, function(){});
    this.gmapCsv = Csv.loadCsv(source.gmapUri, function(){});

    // This is where we save all the marker positions
    this.markerPositions = {};
};

RqtlGenotypeSource.prototype = Object.create(FeatureSourceBase.prototype);
RqtlGenotypeSource.prototype.constructor = RqtlGenotypeSource;

RqtlGenotypeSource.prototype.fetch = function(chr, min, max, scale, types, pool, callback) {
    var self = this;
    // Convert to centimorgan
    var cmMin = min / 1000000;
    var cmMax = max / 1000000;
    // should fetch X number of individuals from _geno file
    // The color should depend on the genotype - SS, SB, or BB - 1 2 3, as given in the control file.

    // Maybe the RqtlGenotypeSource constructor should take a config object as well
    // which contains the alleles and genotypes.

    // What should the N/A values be displayed as?


    // This fetches the markers and saves their positions
    this.gmapCsv.fetch({chr: chr, pos: {min: cmMin, max: cmMax}}, function(results, error) {
        self.markerPositions[results.marker] = results.pos;
    });

    // And this fetches the genotype data itself, returning features
    // first argument is null since we want all lines parsed
    this.genoCsv.fetch(null, function(results, error) {
    // this.source.fetch(chr, cmMin, cmMax, function(results, error) {
        // TODO: fix the stylesheet...
        var features = [];

        // We want to go through all the keys (that aren't 'id') - they're the markers
        Object.keys(results).map(function (key) {
            if (key !== 'id') {
                var feature = new DASFeature();
                feature.id = results.id;
                feature.label = key;
                feature.type = "marker";
                feature.segment = chr;
                var pos = self.markerPositions[key];
                feature.itemRgb = "rgb(255,0,0)";

                if (pos) {
                    feature.min = (pos * 1000000);
                    feature.max = (pos * 1000000) + 150;
                }

                features.push(feature);
            }
        });
        // callback takes status, features, and scale...
        return callback(null, features, 1000000);
    });
};

// Add the source adapter to BD, so it can be used in the browser
dalliance_registerSourceAdapterFactory('rqtl', function(source) {
    return {features: new RqtlGenotypeSource(source)};
});
