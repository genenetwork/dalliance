/* jshint esversion: 6 */
"use strict";

import { registerSourceAdapterFactory,
         makeParser,
         FeatureSourceBase
       } from "./sourceadapters.js";

import { DASStylesheet,
         DASStyle,
         DASFeature,
         DASGroup
       } from "./das.js";

import * as Csv from "./csv.js";

function RqtlGenotypeSource(source) {
    FeatureSourceBase.call(this);

    this.genoCsv = Csv.loadCsv(source.control.geno, {mode: "file"}, function() {});
    this.gmapCsv = Csv.loadCsv(source.control.gmap, {mode: "file"}, function() {});

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
    // We need to keep track of the previous feature since we're filling
    // each one out to the next
    var prevFeature = null;

    // This fetches the markers and saves their positions
    this.gmapCsv.fetch(null, function(results, error) {
        console.log(results);
        self.markerPositions[results.marker] = results.pos;
    });
    /*this.gmapCsv.fetch({
        chr: chr,
        pos: {
            min: cmMin,
            max: cmMax
        }
    }, function(results, error) {
        self.markerPositions[results.marker] = results.pos;
    });*/

    console.log("markers");
    console.log(self.markerPositions);

    // And this fetches the genotype data itself, returning features
    // first argument is null since we want all lines parsed
    this.genoCsv.fetch(null, function(results, error) {
        // this.source.fetch(chr, cmMin, cmMax, function(results, error) {
        // TODO: fix the stylesheet...
        var indivFeatures = [];

        // console.log(Object.keys(results));
        // We want to go through all the keys (that aren't 'id') - they're the markers
        Object.keys(results).map(function(key) {
            if (key !== 'id' || key !== 'marker') {
                var feature = new DASFeature();
                feature.id = results.id;
                // Features are ordered by type then label
                feature.label = results.id;
                feature.type = "id";
                // feature.method = results[key];
                feature.segment = chr;

                feature.marker = key;
                feature.genotype = results[key];

                var pos = self.markerPositions[key];
                // console.log(pos);
                if (pos) {
                    feature.min = (pos * 1000000);
                }
                // If we're not at the final feature
                if (prevFeature !== null) {
                    prevFeature.max = (pos * 1000000) - 10;
                    indivFeatures.push(prevFeature);
                }
                prevFeature = feature;

                // indivFeatures.push(feature);
            }
        });
        // Need to keep track of all features for all parsed lines
        self.features = self.features.concat(indivFeatures);

    }, function(results, error) {
        // finally we need to set the size of the last feature and add it
        prevFeature.max = cmMax;
        self.features.push(prevFeature);
        // console.log("rqtl");
        // console.log(self.features);
        // when it's all parsed, we can return
        // callback takes status, features, and scale...
        return callback(null, self.features, 1);
    });
};


RqtlGenotypeSource.prototype.getStyleSheet = function(callback) {
    var stylesheet = new DASStylesheet();

    var height = 7;
    var line = 0.5;

    // TODO: should handle all N/A strings
    var naStyle = new DASStyle();
    naStyle.glyph = "BOX";
    naStyle.LINE = line;
    naStyle.FGCOLOR = "black";
    naStyle.BGCOLOR = "white";
    naStyle.BGITEM = true;
    naStyle.HEIGHT = height;
    naStyle.BUMP = true;
    stylesheet.pushStyle({
        type: "default",
        method: "-"
    }, null, naStyle);

    var ssStyle = new DASStyle();
    ssStyle.glyph = "BOX";
    ssStyle.LINE = line;
    ssStyle.FGCOLOR = "blue";
    ssStyle.BGCOLOR = "blue";
    ssStyle.HEIGHT = height;
    ssStyle.BUMP = true;
    stylesheet.pushStyle({
        type: "default",
        method: "SS"
    }, null, ssStyle);

    var sbStyle = new DASStyle();
    sbStyle.glyph = "BOX";
    sbStyle.LINE = line;
    sbStyle.FGCOLOR = "green";
    sbStyle.BGCOLOR = "green";
    sbStyle.HEIGHT = height;
    sbStyle.BUMP = true;
    stylesheet.pushStyle({
        type: "default",
        method: "SB"
    }, null, sbStyle);

    var bbStyle = new DASStyle();
    bbStyle.glyph = "BOX";
    bbStyle.LINE = line;
    bbStyle.FGCOLOR = "red";
    bbStyle.BGCOLOR = "red";
    bbStyle.HEIGHT = height;
    bbStyle.BUMP = true;
    stylesheet.pushStyle({
        type: "default",
        method: "BB"
    }, null, bbStyle);

    return callback(stylesheet);
};

registerSourceAdapterFactory('rqtl-genotype', function(source) {
    return {
        features: new RqtlGenotypeSource(source)
    };
});
