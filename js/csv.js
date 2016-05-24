/* -*- mode: javascript; c-basic-offset: 4; indent-tabs-mode: nil -*- */

"use strict";

if (typeof(require) !== 'undefined') {
    var Papa = require('papaparse');
}

function CsvFile() {
}

// TODO: add indexing?
// Parses the given data? Or returns a thing with the data to be parsed further
function loadCsv(uri, callback) {
    var csv = new CsvFile();
    csv.uri = uri;
    callback(csv);
    // TODO: just a test
    // csv.fetch(20,50,callback);
    return csv;
}

// Calls the callback with the fetched data, or with
// null as first parameter and an error message as second,
// if something went wrong.
// Min & max are the IDs to read, set max to zero to read everything after min
CsvFile.prototype.fetch = function(min, max, callback) {
    // console.log("fetching");
    var self = this;

    var data = [];

    function step(results, parser) {
        // results has three fields: data, errors, meta.
        // meta contains, among other things, the field names parsed in the header

        // we want to add the line to the data if the line is in the range
        // to be parsed...
        // TODO: shouldn't assume that the name of the id-field is "id"
        if (results.data[0].id > min && (max === 0 || results.data[0].id < max)) {
            data.push(results.data);
        } else if (results.data[0].id > max && max !== 0) {
            console.log("after interval, aborting");
            parser.abort();
        }
    }

    // The `step` field is the callback that's called on each
    // parsed line
    var config = { download: true,
                   header: true, // to get JSON output
                   step: step,
                   // preview: 10, // simplify trial & error
                   error: function(err, file) {
                       callback(null, err);
                   },
                   complete: function(results, file) {
                       callback(data);
                   }};

    Papa.parse(self.uri, config);
}


if (typeof(module) !== 'undefined') {
    module.exports = {
        CsvFile: CsvFile,
        loadCsv: loadCsv
    };
}
