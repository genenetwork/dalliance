/* jshint esversion: 6 */

import { registerSourceAdapterFactory,
         FeatureSourceBase
       } from "./sourceadapters.js";

import { DASFeature
       } from "./das.js";

import * as Csv from "./csv.es6";

import * as R from "ramda";


class RqtlGenotypeSource extends FeatureSourceBase {
    constructor(source) {
        super();

        this.source = source;
        this.URIBase = source.URIBase;
        this.control = null;
    }

    fetchControl() {
        return new Promise((resolve, reject) => {
            if (this.source.control) {
                this.configure(this.source.control);


                resolve();
            } else if (this.source.controlURI) {
                let req = new XMLHttpRequest();

                req.open("GET", this.source.controlURI);

                req.onload = () => {
                    this.configure(JSON.parse(req.responseText));
                    resolve();
                };

                req.onerror = () => {
                    console.log("Error when fetching control file");
                    console.log(e.stack);
                    reject();
                };

                req.send();
            }
        });
    }

    configure(control) {
        if (!control.geno ||
            !control.gmap) {
            let e = new Error("RQTL control misconfigured");
            console.log(e.stack);
            return;
        }
        this.control = control;
        this.genoCsv = Csv.loadCsv(this.URIBase + this.control.geno);
        this.gmapCsv = Csv.loadCsv(this.URIBase + this.control.gmap);
        this.alleles = this.control.alleles;
        this.genotypes = this.control.genotypes;

        this.transposed = R.defaultTo(true, this.source.transposed);
        this.markerPositions = {};
    }


    fetchGmap(chr, callback) {
        return new Promise((resolve, reject) => {
            this.gmapCsv.fetch((results, error) => {
                if (error) {
                    reject(error);
                }

                results.map((row, index) => {
                    let chr = row.chr;
                    let min = R.defaultTo(row.pos, row.Mb);
                    min = min * 1000000;
                    let max = Infinity;
                    if (index < results.length-1) {
                        let nextRow = results[index+1];
                        max = R.defaultTo(nextRow.pos, nextRow.Mb);
                        max = max * 1000000 - 10;
                    }
                    this.markerPositions[row.marker] = {chr, min, max};
                });
                resolve(chr, callback);
            });
        });
    }

    fetchGeno(chr, callback) {
        return new Promise((resolve, reject) => {
            this.genoCsv.fetch((results, error) => {
                if (error) {
                    reject(error);
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
                            if ((indId !== "id" || indId !== "marker") &&
                                this.markerPositions[marker].chr === chr) {
                                let feature = new DASFeature();
                                feature.label = marker;
                                feature.type = indId;

                                feature.method = row[indId];

                                feature.segment = chr;
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

                resolve();
                return callback(null, features, 1);
            });
        });
    }


    fetch(chr, min, max, scale, types, pool, callback) {
        console.log("Fetching genotype track");

        let cmMin = min / 1000000;
        let cmMax = max / 1000000;


        if (this.control === null) {
            this.fetchControl(chr, callback)
                .then(() => this.fetchGmap(chr, callback))
                .then(() => this.fetchGeno(chr, callback));
        } else {
            this.fetchGmap(chr, callback)
                .then(() => this.fetchGeno(chr, callback));
        }

    }
}


registerSourceAdapterFactory('rqtl-genotype', source => {
    return {
        features: new RqtlGenotypeSource(source)
    };
});
