/* jshint esversion: 6 */
"use strict";

import { drawFeatureTier } from "./feature-draw.js";

import { drawSeqTier } from "./sequence-draw.js";

import { OverlayLabelCanvas } from "./glyphs.js";

// renderTier and drawTier MUST be exported. paint is used in other renderers
export { renderTier, drawTier, paint };


function renderTier(status, tier) {
    drawTier(tier);
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

    // tier.paint();

    paint(tier, canvas, retina, true);
    tier.drawOverlay();
    tier.paintQuant();

    if (typeof(tier.dasSource.drawCallback) === "function") {
        tier.dasSource.drawCallback(canvas, tier);
    }

    tier.originHaxx = 0;
    tier.browser.arrangeTiers();
}


function paint(tier, canvas, retina, clear=true) {
    let subtiers = tier.subtiers;
    if (!subtiers)
        return;

    let desiredWidth = tier.browser.featurePanelWidth + 2000;
    if (retina) {
        desiredWidth *= 2;
    }

    let fpw = tier.viewport.width|0;
    if (fpw < desiredWidth - 50) {
        tier.viewport.width = fpw = desiredWidth;
    }

    let lh = tier.padding;
    subtiers.forEach(s => lh += s.height + tier.padding);
    lh += 6;
    lh = Math.max(lh, tier.browser.minTierHeight);

    let canvasHeight = lh;
    if (retina) {
        canvasHeight *= 2;
    }

    if (canvasHeight != tier.viewport.height) {
        tier.viewport.height = canvasHeight;
    }

    let tierHeight = Math.max(lh, tier.browser.minTierHeight);
    tier.viewportHolder.style.left = '-1000px';
    tier.viewport.style.width = retina ? ('' + (fpw/2) + 'px') : ('' + fpw + 'px');
    tier.viewport.style.height = '' + lh + 'px';
    tier.layoutHeight =  Math.max(lh, tier.browser.minTierHeight);

    tier.updateHeight();
    tier.norigin = tier.browser.viewStart;

    if (clear) {
        canvas.clearRect(0, 0, fpw, canvasHeight);
        canvas.save();
        if (retina) {
            canvas.scale(2, 2);
        }
    }

    let drawStart =  tier.browser.viewStart - 1000.0/tier.browser.scale;
    let drawEnd = tier.browser.viewEnd + 1000.0/tier.browser.scale;
    let unmappedBlocks = [];
    if (tier.knownCoverage) {
        let knownRanges = tier.knownCoverage.ranges();
        knownRanges.forEach((range, index) => {
            if (index === 0) {
                if (range.min() > drawStart)
                    unmappedBlocks.push({min: drawStart, max: range.min() - 1});
            } else {
                unmappedBlocks.push({min: knownRanges[index-1].max() + 1, max: range.min() - 1});
            }

            if (index == knownRanges.length - 1 && range.max() < drawEnd) {
                unmappedBlocks.push({min: range.max() + 1, max: drawEnd});
            }
        });
    }
    if (unmappedBlocks.length > 0) {
        canvas.fillStyle = 'gray';
        unmappedBlocks.forEach(block => {
            let min = (block.min - tier.browser.viewStart) * tier.browser.scale + 1000;
            let max = (block.max - tier.browser.viewStart) * tier.browser.scale + 1000;
            canvas.fillRect(min, 0, max - min, lh);
        });
    }

    let overlayLabelCanvas = new OverlayLabelCanvas();
    let offset = ((tier.glyphCacheOrigin - tier.browser.viewStart)*tier.browser.scale)+1000;
    canvas.translate(offset, tier.padding);
    overlayLabelCanvas.translate(0, tier.padding);

    tier.paintToContext(canvas, overlayLabelCanvas, offset);

    if (overlayLabelCanvas.glyphs.length > 0)
        tier.overlayLabelCanvas = overlayLabelCanvas;
    else
        tier.overlayLabelCanvas = null;

    canvas.restore();
}
