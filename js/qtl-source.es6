/* jshint esversion: 6 */


import { registerSourceAdapterFactory,
         makeParser,
         FeatureSourceBase
       } from "./sourceadapters.js";

import { DASStylesheet,
         DASStyle,
         DASFeature,
         DASGroup
       } from "./das.js";

import * as Csv from "./csv.es6";

class QtlMapSource extends FeatureSourceBase {
    constructor(source) {
        super();

        this.qtlCsv = Csv.loadCsv(source.uri, {mode: "file"}, function() {});

    }

    fetch(chr, min, max, scale, types, pool, callback) {
        let cmMin = min / 1000000;
        let cmMax = max / 1000000;

        let features = [];
        let prevPos = 0;

        this.qtlCsv.fetch((results, error) => {
            if (error) {
                return callback(error);
            }

            results.forEach(row => {
                // console.log(row);
                if (row["Chr"] === chr) {
                    // console.log("adding feature");
                    let feature = new DASFeature();

                    feature.segment = chr;
                    let pos = row["Mb"];

                    feature.min = pos * 1000000;
                    feature.max = pos * 1000000;

                    if (row["LRS"]) {
                        feature.score = row["LRS"];
                    } else if (row["LOD"]) {
                        feature.score = row["LOD"];

                    }

                    features.push(feature);
                }
            });

            return callback(null, features, 1);
        });
    }
}


registerSourceAdapterFactory('qtl', source => {
    return {
        features: new QtlMapSource(source)
    };
});
