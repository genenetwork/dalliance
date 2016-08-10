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

import * as R from "ramda";

class RqtlGenotypeSource extends FeatureSourceBase {
    constructor(source) {
        super();

        this.genoCsv = Csv.loadCsv(source.control.geno);
        this.gmapCsv = Csv.loadCsv(source.control.gmap);

        this.alleles = source.control.alleles;
        this.genotypes = source.control.genotypes;

        this.transposed = R.defaultTo(true, source.transposed);

        this.markerPositions = {};
    }

    fetch(chr, min, max, scale, types, pool, callback) {
        let cmMin = min / 1000000;
        let cmMax = max / 1000000;

        let prevFeature = null;


        this.gmapCsv.fetch((results, error) => {
            if (error) {
                return callback(error);
            }

            results.map((row, index) => {
                let chr = row.chr;
                let min = R.defaultTo(row.pos, row.Mb);
                min = min * 1000000;
                let max = Infinity;
                if (index < results.length-1) {
                    let nextRow = results[index+1];
                    max = nextRow.Mb * 1000000 - 10;
                    max = R.defaultTo(nextRow.pos, nextRow.Mb);
                    max = max * 1000000 - 10;
                }
                this.markerPositions[row.marker] = {chr, min, max};
            });

            this.genoCsv.fetch((results, error) => {
                if (error) {
                    return callback(error);
                }

                let features = [];

                if (this.transposed) {
                    // the current row holds the marker as well as the
                    // corresponding genotypes for all individuals
                    results.forEach(row => {
                        let marker = row.marker;
                        let pos = this.markerPositions[marker];

                        // then, for each marker, add all the individuals.
                        Object.keys(row).forEach(indId => {
                            if (indId !== "id" || indId !== "marker" &&
                               this.markerPositions[marker].chr === chr) {
                                let feature = new DASFeature();
                                feature.id = indId;
                                feature.label = marker;

                                feature.method = row[indId];

                                feature.min = pos.min;
                                feature.max = pos.max;

                                features.push(feature);
                            }
                        });

                    });
                } else {
                    // in this case each key in the results is a marker
                    results.forEach(row => {
                        Object.keys(row).map(marker => {
                            if (marker !== "id") {
                                let feature = new DASFeature();
                                feature.method = row[marker];

                                let pos = this.markerPositions[marker];
                                feature.min = pos.min;
                                feature.max = pos.max;

                                features.push(feature);
                            }
                        });
                    });
                }

                return callback(null, features, 1);
            });
        });

    }
}


registerSourceAdapterFactory('rqtl-genotype', source => {
    return {
        features: new RqtlGenotypeSource(source)
    };
});
