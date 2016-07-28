"use strict";

if (typeof(require) !== 'undefined') {
    var Papa = require('papaparse');
}

function CsvFile() {
}

// TODO: add indexing?
// Parses the given data? Or returns a thing with the data to be parsed further
// options = { uri : string, mode : "step" | "chunk" | "file" }
function loadCsv(uri, options, callback) {
    var csv = new CsvFile();

    csv.uri = uri;
    csv.options = options;

    // This callback is literally only used in the test...
    callback(csv);
    return csv;
}

// Calls the callback with the fetched data, or with
// null as first parameter and an error message as second,
// if something went wrong.
// Min & max are the IDs to read, set max to zero to read everything after min
// CsvFile.prototype.fetch = function(chr, min, max, filterParams, parseCallback, doneCallback) {
CsvFile.prototype.fetch = function(filterParams, parseCallback, doneCallback) {
    console.log("fetching");
    // We need a function that returns true depending on some values in the parsed
    // line, that is, generalize the data[0].chr === chr stuff.

    // Or just an object, containing the keys and values corresponding to the lines we
    // want to parse. E.g. { chr: chr, pos: { min: min, max: max }
    // or { id: { min: min, max: max }
    // or just everything if there's no object given.

    var self = this;
    if (!self.options.mode) {
        self.options.mode = "chunk";
        console.log("CSV parse mode not set - defaulting to chunks");
    }

    var data = [];

    function parseLine(line) {
        if (parseCallback !== undefined) {
            parseCallback(line);
        } else {
            data.push(line);
        }
    }

    function parseChunk(results, parser) {
        // results has three fields: data, errors, meta.
        // meta contains, among other things, the field names parsed in the header

        // we want to add the line to the data if the line is in the range
        // to be parsed...

        results.data.map(function(data) {
        // this is for _gmap files
        if (filterParams) {
            // console.log(filterParams);
            // This could be done better by looping through / mapping over the filterParams keys, but effort
            if (filterParams.id !== undefined &&
                filterParams.id === data.id) {
                parseLine(data);
            } else if (filterParams.chr !== undefined &&
                       filterParams.chr === data.chr) {
                // We want to parse the line if we're in the right chromosome
                // and if we're in the right interval. if we're not given an interval
                // we assume we want the whole thing
                if (filterParams.pos !== undefined) {
                    if (data.pos > filterParams.pos.min &&
                        data.pos < filterParams.pos.max) {
                        parseLine(data);
                    }
                } else {
                    parseLine(data);
                }
            }
        } else {
            parseLine(data);
        }
        });


    }

    // The `step` field is the callback that's called on each
    // parsed line
    var config = { download: true,
                   header: true, // to get JSON output
                   // step: step,
                   // chunk: parseChunk,
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
                   }
                   // complete: function(results, file) {
                   //     parseChunk(results);
                   //     if (doneCallback !== undefined) {
                   //         doneCallback(data);
                   //     }
                   // }
                 };

    if (self.options.mode === "step") {
        config.step = parseChunk;
    } else if (self.options.mode === "chunk") {
        config.chunk = parseChunk;
    } else if (self.options.mode === "file") {
        config.complete = function(results, file) {
            parseChunk(results);
            if (doneCallback !== undefined) {
                doneCallback(data);
            }
        };
    }

    console.log("uri: " + self.uri);
    Papa.parse(self.uri, config);
}


if (typeof(module) !== 'undefined') {
    module.exports = {
        CsvFile: CsvFile,
        loadCsv: loadCsv
    };
}
