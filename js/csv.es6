/* jshint esversion: 6 */

import * as Papa from "papaparse";

export { CsvFile, loadCsv };

function CsvFile() {}

function loadCsv(uri, options, callback) {
    let csv = new CsvFile();

    csv.uri = uri;
    csv.options = options;

    if (callback)
        callback(csv);
    return csv;
}

CsvFile.prototype.fetch = function(doneCallback) {
    var config = { download: true,
                   header: true,
                   error: function(err, file) {
                       if (doneCallback !== undefined) {
                           doneCallback(null, err);
                       }
                   },
                   complete: function(results, file) {
                       if (doneCallback !== undefined) {
                           doneCallback(results.data);
                       }
                   }
                 };

    Papa.parse(this.uri, config);
};
