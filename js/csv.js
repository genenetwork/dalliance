/* -*- mode: javascript; c-basic-offset: 4; indent-tabs-mode: nil -*- */

"use strict";

if (typeof(require) !== 'undefined') {
    var Papa = require('papaparse');
}

function CsvFile() {
}

// TODO: add indexing?
// Parses the given data? Or returns a thing with the data to be parsed further
function loadCsv(source, callback) {
    var csv = new CsvFile();
    csv.source = source;

    // This callback is literally only used in the test...
    callback(csv);
    return csv;
}

// Calls the callback with the fetched data, or with
// null as first parameter and an error message as second,
// if something went wrong.
// Min & max are the IDs to read, set max to zero to read everything after min
CsvFile.prototype.fetch = function(chr, min, max, parseCallback, doneCallback) {
    // console.log("fetching chr: " + chr + "\t in (" + min + ", " + max + ")");
    var self = this;
    var data = [];

    function step(results, parser) {
        // results has three fields: data, errors, meta.
        // meta contains, among other things, the field names parsed in the header

        // we want to add the line to the data if the line is in the range
        // to be parsed...

        // this is for _gmap files
        if (results.data[0].chr === chr) {
            if (results.data[0].pos > min && results.data[0].pos < max) {
                // The callback wraps the parsed line in a DAS feature
                // TODO: this should be called once per parsed line, in case we use chunks
                if (parseCallback !== undefined) {
                    parseCallback(results.data[0]);
                } else {
                    data.push(results.data[0]);
                }
            }
        }

        // This is for _geno files
        /*
        if (results.data[0].id > min && (max === 0 || results.data[0].id < max)) {
            data.push(results.data[0]);
        } else if (results.data[0].id > max && max !== 0) {
            console.log("after interval, aborting");
            parser.abort();
        }
        */
    }

    // The `step` field is the callback that's called on each
    // parsed line
    var config = { download: true,
                   header: true, // to get JSON output
                   step: step,
                   // preview: 10, // simplify trial & error
                   error: function(err, file) {
                       if (doneCallback !== undefined) {
                           doneCallback(null, err);
                       }
                   },
                   complete: function(results, file) {
                       if (doneCallback !== undefined) {
                           doneCallback(data);
                       }
                   }};

    Papa.parse(self.source.uri, config);
}


if (typeof(module) !== 'undefined') {
    module.exports = {
        CsvFile: CsvFile,
        loadCsv: loadCsv
    };
}
