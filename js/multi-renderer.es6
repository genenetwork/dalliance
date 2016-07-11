/* jshint esversion: 6 */
"use strict";

import { drawSeqTier } from "./sequence-draw.js";

import { OverlayLabelCanvas } from "./glyphs.js";

import * as DefaultRenderer from "./default-renderer.es6";

import * as R from "ramda";

export { renderTier, drawTier };


/* Renders multiple tiers in a single track.
   Works by simply drawing several tiers to a single canvas.
   The tiers that are drawn are ones with the "multi: true"
   property in their BD config.

   Actual rendering is done using default-renderer.es6
 */

function renderTier(status, tier) {
    drawTier(tier);
    tier.updateStatus(status);
}

function drawTier(multiTier) {
    let canvas = multiTier.viewport.getContext("2d");

    let retina = multiTier.browser.retina && window.devicePixelRatio > 1;
    if (retina) {
        canvas.scale(2, 2);
    }

    let tiers = multiTier.browser.tiers.filter(tier => tier.dasSource.multi === true);
    let subtiers = [];
    tiers.forEach(tier => {
        tier.browser.refreshTier(tier);

        let features = tier.currentFeatures;
        let sequence = tier.currentSequence;
        if (tier.sequenceSource) {
            drawSeqTier(tier, sequence);
        } else if (features) {
            DefaultRenderer.prepareSubtiers(tier, canvas);
            console.log(tier.subtiers);
        } else {
            console.log("No sequence or features in tier!");
        }

        // Hacks to make sure these properties aren't undefined/NaN
        if (!multiTier.glyphCacheOrigin)
            multiTier.glyphCacheOrigin = tier.glyphCacheOrigin;

        if (!multiTier.padding)
            multiTier.padding = tier.padding;

        subtiers.push(tier.subtiers);
    });

    multiTier.subtiers = R.flatten(subtiers);

    if (multiTier.subtiers) {
        DefaultRenderer.prepareViewport(multiTier, canvas, retina, true);
        DefaultRenderer.paint(multiTier, canvas, retina, true);
    }
    multiTier.drawOverlay();
    multiTier.paintQuant();

    if (typeof(multiTier.dasSource.drawCallback) === "function") {
        multiTier.dasSource.drawCallback(canvas, multiTier);
    }

    multiTier.originHaxx = 0;
    multiTier.browser.arrangeTiers();
}
