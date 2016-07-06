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
        if (compareObjects(oldStAfter, defStAfter, 0, [{o1: "old " + oldTier.id, o2: "def " + defTier.id}])) {
            console.log("Test successful!");
        } else {
            console.log("Test failed");
        }
    }

}

function compareObjects(o1, o2, depth=0, stack=[]) {
    if (typeof(o1) !== typeof(o2)) {
        printDeep("type mismatch!", depth);
        printDeep("o1: " + typeof(o1), depth);
        console.log(o1);
        printDeep("o2: " + typeof(o2), depth);
        console.log(o2);
        printDeep("stack:", depth);
        printStack(stack);
        console.log("-".repeat(depth));
        return false;
    } else {
        if (o1 === null || o1 === undefined && o1 === o2) {
            return o1 === o2;
        }

        if (o1 instanceof Array &&
            o2 instanceof Array) {

            if (o1.length === o2.length) {
                let cmp = true;
                for (let i = 0; i < o1.length; i++) {

                    stack.push({o1: o1[i], o2: o2[i]});
                    if (!compareObjects(o1[i], o2[i], depth+1, stack)) {
                        cmp = false;
                        printDeep("fail on element #" + i, depth);
                        printDeep("stack:", depth);
                        printStack(stack);
                        console.log("-".repeat(depth));
                        break;
                    }
                }
                return cmp;
            } else {
                printDeep("Arrays of different lengths", depth);
                printDeep("o1: " + typeof(o1), depth);
                printDeep(o1.length, depth);
                printDeep("o2: " + typeof(o2), depth);
                printDeep(o2.length, depth);
                printDeep("stack:", depth);
                printStack(stack);
                console.log("-".repeat(depth));
                return false;
            }


        } else if (typeof(o1) === "object" && o1 && o2) {
            if (Object.keys(o1).length === Object.keys(o2).length ||
                Object.keys(o1).every(k => k in o2)) {

                let cmp = true;
                for (let k in o1) {
                    stack.push({o1: o1[k], o2: o2[k]});
                    if (!compareObjects(o1[k], o2[k], depth+1, stack)) {
                        cmp = false;
                        printDeep("fail when recursing on key " + k, depth);
                        printDeep("stack:", depth);
                        printStack(stack);
                        console.log("-".repeat(depth));
                        break;
                    }
                }
                return cmp;

            } else {
                printDeep("Objects have different keys:", depth);
                printDeep("o1: ", depth);
                console.log(Object.keys(o1));
                printDeep("o2: ", depth);
                console.log(Object.keys(o2));
                printDeep("stack:", depth);
                printStack(stack);
                console.log("-".repeat(depth));
                return false;
            }

        } else {
            if (o1 === o2) {
                return true;
            } else {
                printDeep("fail when comparing primitives", depth);
                printDeep("primitives not equal: ", depth);
                printDeep("o1: ", depth);
                console.log(o1);
                printDeep("o2: ", depth);
                console.log(o2);
                printDeep("stack:", depth);
                printStack(stack);
                console.log("-".repeat(depth));
                return false;
            }
        }
    }
}


function printStack(stack) {
    stack.forEach(o => console.log(o));
}

function printDeep(str, d=0) {
    console.log(" ".repeat(d) + str);
}
