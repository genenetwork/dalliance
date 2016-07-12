/* jshint esversion: 6 */
"use strict";

import { drawSeqTier } from "./sequence-draw.js";

import * as DefaultRenderer from "./default-renderer.es6";

export { renderTier, drawTier };

/* To be used by tiers which are to be drawn in a multitier
   using the multi-renderer.

   Makes sure the multi-renderer is called when the subtier is ready to be drawn.
 */

function renderTier(status, tier) {
    drawTier(tier);
    tier.updateStatus(status);
}

function drawTier(tier) {
    let features = tier.currentFeatures;
    let sequence = tier.currentSequence;

    let browser = tier.browser;

    let multiTier = browser.tiers
            .filter(t => t.dasSource.renderer === 'multi' &&
                   t.dasSource.multi.multi_id === tier.dasSource.sub.multi_id);

    multiTier.forEach(t => browser.refreshTier(t));
}
