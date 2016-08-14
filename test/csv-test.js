"use strict";

var loadCsv = require('../js/csv.js').loadCsv;

describe('CSV files', function() {
    // currently serving this using Caddy; needs CORS
    var csvSource = {uri: 'http://localhost:8000/grav2_gmap.csv'};
    var csv;

    it('can be created by connecting to a URI', function(done) {
        csv = loadCsv(csvSource, done);
        console.log("Test CSV object is truthy");
        expect(csv).toBeTruthy();
    });

    it('can retrieve lines given an interval', function(done) {
        csv = loadCsv(csvSource, function() {});
        csv.fetch({id: { min: 5, max: 15 }}, undefined, function(data, err) {
            console.log("Test error to be falsy");
            expect(err).toBeFalsy();
            console.log("Test parsed data to be truthy");
            expect(data).toBeTruthy();
            console.log("Test all parsed lines to be correct chromosome & pos");
            data.map(function (line) {
                expect(line.id).toBeGreaterThan(4);
                expect(line.id).toBeLessThan(15);
            });
            done();
        });
    });

    // TODO: make sure the retrieved data actually is correct
    it('can retrieve lines given an interval and additional constraint', function(done) {
        csv = loadCsv(csvSource, function() {});
        csv.fetch({chr: '3', pos: { min: 30.0, max: 45.0 }}, undefined, function(data, err) {
            console.log("Test error to be falsy");
            expect(err).toBeFalsy();
            console.log("Test parsed data to be truthy");
            expect(data).toBeTruthy();
            console.log("Test all parsed lines to be correct chromosome & pos");
            data.map(function (line) {
                expect(line.chr).toBe('3');
                expect(line.pos).toBeGreaterThan(30.0);
                expect(line.pos).toBeLessThan(45.0);
            });
            done();
        });
    });
});
