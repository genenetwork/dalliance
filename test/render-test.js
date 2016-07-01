"use strict";

// for JSON.decycle
require("../js/cycle.js");

// require("jasmine-fixtures");

var Browser = require("../js/cbrowser.js").Browser;
// console.log(Browser);
var Tier = require("../js/tier.js");
var fd = require("../js/feature-draw.js");

var utils = require("../js/utils.js");



describe("test renderer", function() {

    var b;

    beforeEach(function(done) {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;

        var holder = document.createElement("div");
        holder.id = "svgHolder";
        document.body.appendChild(holder);

        b = new Browser({
            chr:                 '22',
            viewStart:           30700000,
            viewEnd:             30900000,
            cookieKey:           'human-grc_h37',

            coordSystem: {
                speciesName: 'Human',
                taxon: 9606,
                auth: 'GRCh',
                version: '37',
                ucscName: 'hg19'
            },

            chains: {
                hg18ToHg19: {
                    uri: '//www.biodalliance.org/datasets/hg18ToHg19.bb',
                    type: 'bigbed',
                    coords: {
                        speciesName: 'Human',
                        taxon: 9606,
                        auth: 'NBCI',
                        version: 36,
                        ucscName: 'hg17'
                    }
                }
            },

            sources:          [{name:                 'Genome',
                                twoBitURI:            '//www.biodalliance.org/datasets/hg19.2bit',
                                tier_type: 'sequence'},
                               {name: 'Genes',
                                desc: 'Gene structures from GENCODE 19',
                                bwgURI: 'http://www.biodalliance.org/datasets/gencode.bb',
                                stylesheet_uri: '//www.biodalliance.org/stylesheets/gencode.xml',
                                collapseSuperGroups: true,
                                trixURI: 'http://www.biodalliance.org/datasets/geneIndex.ix'},
                               {name: 'Repeats',
                                desc: 'Repeat annotation from Ensembl 59',
                                bwgURI: 'http://www.biodalliance.org/datasets/repeats.bb',
                                stylesheet_uri: '//www.biodalliance.org/stylesheets/bb-repeats.xml'}
                               ,{name: 'Conservation',
                                 desc: 'Conservation',
                                 bwgURI: 'http://www.biodalliance.org/datasets/phastCons46way.bw',
                                 noDownsample: true}
                               ,{name: 'GM12878 ChromHMM', desc: 'GM12878 ChromHMM Genome Segmentation',
                                 pennant: 'http://genome.ucsc.edu/images/encodeThumbnail.jpg',
                                 bwgURI: 'http://ftp.ebi.ac.uk/pub/databases/ensembl/encode/integration_data_jan2011/byDataType/segmentations/jan2011/hub/gm12878.ChromHMM.bb',
                                 style: [{type: 'bigbed', style: {glyph: 'BOX', FGCOLOR: 'black', BGCOLOR: 'blue', HEIGHT: 8, BUMP: false, LABEL: false, ZINDEX: 20, BGITEM: true, id: 'style1'}},
                                         {type: 'bb-translation', style: {glyph: 'BOX', FGCOLOR: 'black', BGITEM: true, BGCOLOR: 'red', HEIGHT: 10, BUMP: true, ZINDEX: 20, id: 'style2'}},
                                         {type: 'bb-transcript', style: {glyph: 'BOX', FGCOLOR: 'black', BGCOLOR: 'white', HEIGHT: 10, ZINDEX: 10, BUMP: true, LABEL: true, id: 'style3'}}]}
                              ],

            uiPrefix: '//www.biodalliance.org/release-0.13/',
            fullScreen: true,

            browserLinks: {
                Ensembl: 'http://www.ensembl.org/Homo_sapiens/Location/View?r=${chr}:${start}-${end}',
                UCSC: 'http://genome.ucsc.edu/cgi-bin/hgTracks?db=hg19&position=chr${chr}:${start}-${end}',
                Sequence: 'http://www.derkholm.net:8080/das/hg19comp/sequence?segment=${chr}:${start},${end}'
            },

            hubs: ['http://ngs.sanger.ac.uk/production/ensembl/regulation/hub.txt', 'http://ftp.ebi.ac.uk/pub/databases/ensembl/encode/integration_data_jan2011/hub.txt']
        });

        b.sources.forEach(function(s) {
            b.addTier(s);
        });

        var tiersBefore = [];
        console.log("is it here");
        b.tiers.forEach(function(t, i) {
            tiersBefore[i] = utils.shallowCopy(t);
        });

        console.log("#######before");
        // Object.keys(b.tiers[1]).forEach(function(k) {
        //     console.log(k);
        // });
        // console.log(Object.keys(b.tiers[1]).length);

        // try {
        // b.retrieveTierData(b.tiers, function() {
        // });

        setTimeout(function() {
            console.log("FAAARTS");
            done();
        }, 4500);
    });

    
    it("farts", function() {

        var tier2JSON = require("./mouse38-tier2-before.json");

        // } catch (e) {
        //     console.log(e.stack);
        // }
        console.log("#########after");
        // console.log(Object.keys(b.tiers[1]).length);
        
    })
    // Object.keys(b.tiers[1]).forEach(function(k) {
    //     console.log(k);
    // });

    // this.retrieveTierData(this.tiers, defaultTierRenderer);
    // this.drawOverlays();
    // this.positionRuler();


    // b.addTier(b.sources[0]);

    // console.log("print browser");
    // console.log(b.tiers);
    // console.log(b.tiers[1].id);
    // console.log(Object.keys(b.tiers[1]).length);
    // console.log(Object.keys(tier2JSON).length);
    // b.tiers[1].
    // var keys = [];
    // Object.keys(tier2JSON).forEach(function(k) {
    //     if (k in b.tiers[1]) {
    //     } else {
    //         console.log(k);
    //         keys.push(k);
    //         b.tiers[1][k] = tier2JSON[k];
    //     }
    // });

    // keys.forEach(function(k) {
    // console.log(tier2JSON[k]);
    //     console.log(b.tiers[1][k]);
    // })
    // b.tiers[1].forEach(function (t,i) {
    //     console.log("i: " + i + ", " + t.dasSource);
    //     console.log(t.dasSource);
    // });

    // console.log(Object.keys(tier2JSON.dasSource));
    // console.log(b.tiers..dasSource);
    // console.log("json2: " + tier2JSON);
    // console.log(tier2JSON);

    // tier2JSON.browser = b;

    
    try {
        fd.drawFeatureTier(b.tiers[1]);
    } catch (e) {
        console.log(e.stack);
    }
});



