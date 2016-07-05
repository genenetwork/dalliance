/* jshint esversion: 6 */
"use strict";

import { drawFeatureTier as oldDrawFeatureTier } from "./feature-draw.js";

import { drawSeqTier } from "./sequence-draw.js";

import { shallowCopy } from "./utils.js";

import * as OldRenderer from "./old-renderer.js";

import * as DefaultRenderer from "./default-renderer.es6";

export { renderTier, drawTier }


function renderTier(status, tier) {
    drawTier(tier);
    tier.updateStatus(status);
}

function drawTier(tier) {
    let oldTier = shallowCopy(tier);
    // let oldTierBefore = shallowCopy(oldTier);
    let defTier = shallowCopy(tier);

    let oldStBefore = null;
    let oldStAfter = null;

    /* Old renderer */
    if (!oldTier.sequenceSource) {
        // console.log("old, before");
        if (oldTier.subtiers) {
            oldStBefore = JSON.parse(JSON.stringify(oldTier.subtiers));
            // console.log(Object.keys(oldStBefore));
        } else {
            oldStBefore = oldTier.subtiers;
        }

        oldDrawFeatureTier(oldTier);
        if (oldTier.subtiers) {
            oldStAfter = JSON.parse(JSON.stringify(oldTier.subtiers));
        } else {
            oldStAfter = oldTier.subtiers;
        }

    }

    /* New renderer */

    let defStBefore = null;
    let defStAfter = null;

    if (!defTier.sequenceSource) {
        // console.log("def, before");
        if (defTier.subtiers) {
            defStBefore = JSON.parse(JSON.stringify(defTier.subtiers));
            // console.log(Object.keys(defStBefore));
        } else {
            defStBefore = defTier.subtiers;
        }

        let canvas = defTier.viewport.getContext("2d");
        DefaultRenderer.drawFeatureTier(defTier, canvas);
        if (defTier.subtiers) {
            defStAfter = JSON.parse(JSON.stringify(defTier.subtiers));
        } else {
            defStAfter = defTier.subtiers;
        }
    }

    /* compare output */

    console.log("old subtier type: " + typeof(oldStAfter));
    console.log("old subtier: " + oldStAfter);
    if (oldStAfter instanceof Array) {
        console.log(oldStAfter instanceof Array);
        console.log("old subtier length: " + oldStAfter.length);
    }

    console.log("def subtier type: " + typeof(defStAfter));
    console.log("def subtier: " + defStAfter);
    if (defStAfter instanceof Array) {
        console.log(defStAfter instanceof Array);
        console.log("def subtier length: " + defStAfter.length);
    }

    if (defStAfter instanceof Array &&
        oldStAfter instanceof Array) {
        if (compareObjects(oldStAfter, defStAfter)) {
            console.log("Test successful!");
        } else {
            console.log("Test failed");
        }
    }

}

function compareObjects(o1, o2, depth=0) {
    if (depth > 0) {
        let label = "";
        for (let i = 0; i < depth; i++) {
            label += "#";
        }
        console.log(label);
    }
    if (typeof(o1) !== typeof(o2)) {
        console.log("type mismatch!");
        console.log("o1: " + typeof(o1));
        console.log(o1);
        console.log("o2: " + typeof(o2));
        console.log(o2);
        return false;
    } else {
        if (o1 === null || o1 === undefined && o1 === o2) {
            console.log("objects null or undefined");
            console.log("o1: " + o1);
            console.log("o2: " + o2);
            return o1 === o2;
        }

        if (o1 instanceof Array &&
            o2 instanceof Array) {
            console.log("comparing arrays");

            if (o1.length === o2.length) {
                let cmp = true;
                for (let i = 0; i < o1.length; i++) {

                    console.log("recursing on element #" + i);
                    if (!compareObjects(o1[i], o2[i], depth+1)) {
                        cmp = false;
                        break;
                    }
                }
                return cmp;
            } else {
                console.log("Arrays of different length!");
                console.log("o1:");
                console.log(o1.length);
                console.log("o2:");
                console.log(o2.length);
                return false;
            }


        } else if (typeof(o1) === "object" && o1 && o2) {
            console.log("comparing objects");
            if (Object.keys(o1).length === Object.keys(o2).length ||
                Object.keys(o1).every(k => k in o2)) {
                console.log("keys equal, comparing values");

                let cmp = true;
                for (let k in o1) {
                    console.log("recursing on key " + k);
                    if (!compareObjects(o1[k], o2[k], depth+1)) {
                        cmp = false;
                        break;
                    }
                }
                return cmp;

            } else {
                console.log("Objects have different keys:");
                console.log("o1: ");
                console.log(Object.keys(o1));
                console.log("o2: ");
                console.log(Object.keys(o2));
                return false;
            }

        } else {
            console.log("comparing primitives: " + o1 + ", " + o2);
            if (o1 === o2) {
                return true;
            } else {
                console.log("primitives not equal: ");
                console.log("o1: ");
                console.log(o1);
                console.log("o2: ");
                console.log(o2);
                return false;
            }
        }
    }
}
