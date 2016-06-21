/* jshint esversion: 6 */
"use strict";

import { drawFeatureTier,
         drawSeqTier } from "./feature-draw";


export { newRenderer };

function newRenderer(status, tier) {
    if (typeof(tier.dasSource.draw) === "function") {
        tier.dasSource.draw(tier);
    } else {
        drawTier(tier);
    }
    tier.updateStatus(status);
}

function drawTier(tier) {
    let features = tier.currentFeatures;
    let sequence = tier.currentSequence;
    if (sequence) {
        drawSeqTier(tier, sequence);
    } else {
        drawFeatureTier(tier);
    }


    let canvas = tier.viewport.getContext("2d");
    let retina = tier.browser.retina && window.devicePixelRatio > 1;
    if (retina) {
        canvas.scale(2, 2);
    }

    tier.paint();

    if (typeof(tier.dasSource.drawCallback) === "function") {
        tier.dasSource.drawCallback(canvas, tier);
    }

    tier.originHaxx = 0;
    tier.browser.arrangeTiers();
}
