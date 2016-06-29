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
    let defTier = shallowCopy(tier);

    /* Old renderer */
    if (!oldTier.sequenceSource) {
        console.log("old, before");
        var oldStBefore = JSON.stringify(oldTier.subtiers);
        oldDrawFeatureTier(oldTier);
        console.log("old, after");
        var oldStAfter = JSON.stringify(oldTier.subtiers);
    }

    console.log("equal? " + (oldTier == defTier));

    if (!defTier.sequenceSource) {
        console.log("def, before");
        var defStBefore = JSON.stringify(defTier.subtiers);
        DefaultRenderer.drawFeatureTier(defTier);
        console.log("def, after");
        var defStAfter = JSON.stringify(defTier.subtiers);
    }

    console.log("st equal? " + (oldStAfter == defStAfter));

    console.log(oldStAfter);
    console.log(defStAfter);

}
