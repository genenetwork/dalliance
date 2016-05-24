/* -*- mode: javascript; c-basic-offset: 4; indent-tabs-mode: nil -*- */

"use strict";

if (typeof(require) !== 'undefined') {
    var sa = require('./sourceadapters');
    var dalliance_registerSourceAdapterFactory = sa.registerSourceAdapterFactory;
    var dalliance_makeParser = sa.makeParser;
    var FeatureSourceBase = sa.FeatureSourceBase;


    var Csv = require('./csv');
}

function CsvSequenceSource(uri) {
    this.source = Csv.loadCsv(uri);

}

CsvSequenceSource.prototype.fetch = function(chr, min, max, pool, callback) {
    this.source.fetch(min, max, callback);
}
