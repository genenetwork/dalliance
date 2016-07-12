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

    // Filter out only tiers that are to be drawn in this multitier,
    // and also have fetched data.
    let tiers = multiTier.browser.tiers
            .filter(tier => typeof(tier.dasSource.sub) === "object" &&
                    tier.dasSource.sub.multi_id === multiTier.dasSource.multi.multi_id &&
                    (tier.currentFeatures || tier.currentSequence));

    let subtiers = [];

    tiers.forEach(tier => {
        let features = tier.currentFeatures;
        let sequence = tier.currentSequence;

        if (tier.sequenceSource) {
            drawSeqTier(tier, sequence);
        } else {
            DefaultRenderer.prepareSubtiers(tier, canvas, tier.dasSource.sub.offset);
        }

        if (!multiTier.glyphCacheOrigin)
            multiTier.glyphCacheOrigin = tier.glyphCacheOrigin;

        subtiers.push(tier.subtiers);
    });

    let minOffset = R.pipe(
        R.map(tier => tier.dasSource.sub.offset),
        R.reduce((acc, offset) => offset > acc ? offset : acc, 0)
    )(tiers);

    let canvasHeight = R.pipe(
        R.map(tier =>
              R.map(subtier => subtier.height + tier.dasSource.sub.offset,
                    tier.subtiers)),
        R.flatten,
        R.reduce((acc, h) => h > acc ? h : acc, -Infinity)
    )(tiers);

    prepareViewport(multiTier, canvas, retina, canvasHeight, false);

    tiers.sort((t1, t2) => t1.dasSource.sub.z > t2.dasSource.sub.z);

    tiers.forEach(tier => {
        canvas.save();
        DefaultRenderer.paint(tier, canvas, retina, false);
        canvas.restore();
    });

    multiTier.drawOverlay();
    multiTier.paintQuant();

    if (typeof(multiTier.dasSource.drawCallback) === "function") {
        multiTier.dasSource.drawCallback(canvas, multiTier);
    }

    multiTier.originHaxx = 0;
    multiTier.browser.arrangeTiers();
}

function prepareViewport(tier, canvas, retina, canvasHeight, clear=true) {
    let desiredWidth = tier.browser.featurePanelWidth + 2000;
    if (retina) {
        desiredWidth *= 2;
    }

    let fpw = tier.viewport.width|0;
    if (fpw < desiredWidth - 50) {
        tier.viewport.width = fpw = desiredWidth;
    }

    // ... shouldn't the padding be enough?
    canvasHeight += 6;
    canvasHeight = Math.max(canvasHeight, tier.browser.minTierHeight);

    if (canvasHeight != tier.viewport.height) {
        tier.viewport.height = canvasHeight;

        if (retina) {
            tier.viewport.height *= 2;
        }
    }

    let tierHeight = Math.max(canvasHeight, tier.browser.minTierHeight);
    tier.viewportHolder.style.left = '-1000px';
    tier.viewport.style.width = retina ? ('' + (fpw/2) + 'px') : ('' + fpw + 'px');
    tier.viewport.style.height = '' + canvasHeight + 'px';
    tier.layoutHeight =  Math.max(canvasHeight, tier.browser.minTierHeight);

    tier.updateHeight();
    tier.norigin = tier.browser.viewStart;

    if (clear) {
        DefaultRenderer.clearViewport(canvas, fpw, canvasHeight);
    }

    DefaultRenderer.drawUnmapped(tier, canvas, canvasHeight);

}
