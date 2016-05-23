/* -*- mode: javascript; c-basic-offset: 4; indent-tabs-mode: nil -*- */

"use strict";

if (typeof(require) !== 'undefined') {
    var spans = require('./spans');
    var Range = spans.Range;
    var union = spans.union;
    var intersection = spans.intersection;

    var Papa = require('papaparse');
}

function CsvFile() {
}

// TODO: add indexing?
// Parses the given data? Or returns a thing with the data to be parsed further
function loadCsv(uri, callback) {
    var csv = new CsvFile();
    csv.uri = uri;

    csv.fetch('',20,50,function(){});
}

// Calls the callback with the fetched data????
// chr is what
// min & max are what
// what's the callback do
CsvFile.prototype.fetch = function(chr, min, max, callback) {
    var thisC = this;

    var data = [];

    function lineFunction(results, parser) {
        // results has three fields: data, errors, meta.
        // meta contains, among other things, the field names parsed in the header

        // we want to add the line to the data if the line is in the range
        // to be parsed...
        // TODO: shouldn't assume that the name of the id-field is "id"!
        if (results.data.id > min && results.data.id < max) {
            data.push(results.data);
            console.log(results.data);
        }
    }

    // The `step` field is the callback that's called on each
    // parsed line
    var config = { download: true,
                   header: true, // to get JSON output
                   step: lineFunction,
                   error: function(err, file) {
                       callback(null, err);
                   },
                   completed: function(results, file) {
                       callback(results.data);
                   };

    Papa.parse(thisC.uri, config);
}


if (typeof(module) !== 'undefined') {
    module.exports = {
        CsvFile: CsvFile,
        loadCsv: loadCsv
    };
}
