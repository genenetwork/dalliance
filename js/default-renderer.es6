/* jshint esversion: 6 */
"use strict";

import { SubTier, makeLineGlyph } from "./feature-draw.js";

import { drawSeqTier } from "./sequence-draw.js";

import { OverlayLabelCanvas } from "./glyphs.js";

import { Range, union } from "./spans.js";

import { shallowCopy, pusho } from "./utils.js";


import * as Glyphs from "./glyphs.js";

import { isDasBooleanTrue,
         isDasBooleanNotFalse,
         DASFeature } from "./das.js";

import { makeGradient } from "./color.js";

import { parseCigar } from "./cigar.js";

// renderTier and drawTier MUST be exported. paint is used in other renderers
export { renderTier, drawTier, prePaint, paint };


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

    prePaint(tier, canvas, retina, true);
    paint(tier, canvas, retina, true);
    tier.drawOverlay();
    tier.paintQuant();

    if (typeof(tier.dasSource.drawCallback) === "function") {
        tier.dasSource.drawCallback(canvas, tier);
    }

    tier.originHaxx = 0;
    tier.browser.arrangeTiers();
}

function glyphsForGroup(canvas, features, y, groupElement, tier) {
    let gstyle = tier.styleForFeature(groupElement);
    let label;
    let labelWanted = false;

    let glyphs = [];
    let strand = null;

    features.forEach(f => {
        if (f.orientation && strand === null) {
            strand = f.orientation;
        }

        if (!label && f.label) {
            label = f.label;
        }

        let style = tier.styleForFeature(f);
        if (style && !f.parts) {
            if (isDasBooleanTrue(style.LABEL))
                labelWanted = true;

            let glyph = glyphForFeature(canvas, f, 0, style, tier, null, true);
            if (glyph)
                glyphs.push(glyph);
        }
    });

    if (glyphs.length === 0)
        return null;

    let connector = 'flat';
    if (gstyle && gstyle.glyph === 'LINE') {
        // Stick with flat...
    } else {
        if (tier.dasSource.collapseSuperGroups && !tier.bumped) {
            if (strand === '+' || strand === '-') {
                connector = 'collapsed' + strand;
            }
        } else {
            if (strand === '+' || strand === '-') {
                connector = 'hat' + strand;
            }
        }
    }

    let labelText = null;
    if ((label && labelWanted) ||
        (gstyle && (isDasBooleanTrue(gstyle.LABEL)
                    || isDasBooleanTrue(gstyle.LABELS)))) {  // HACK, LABELS should work.
        labelText = groupElement.label || label;
    }

    let groupGlyph = new Glyphs.GroupGlyph(glyphs, connector);
    if (labelText) {
        if (strand === '+') {
            labelText = '>' + labelText;
        } else if (strand === '-') {
            labelText = '<' + labelText;
        }
        groupGlyph = new Glyphs.LabelledGlyph(canvas, groupGlyph, labelText, false);
    }
    groupGlyph.bump = true;
    return groupGlyph;
}

function glyphForFeature(canvas, feature, y, style, tier, forceHeight, noLabel) {

    let scale = tier.browser.scale;
    let origin = tier.browser.viewStart;
    let gtype = style.glyph || 'BOX';

    let min = feature.min;
    let max = feature.max;
    let strand = feature.orientation;
    let score = feature.score;
    let label = feature.label || feature.id;

    let minPos = (min - origin) * scale;
    let rawMaxPos = ((max - origin + 1) * scale);
    let maxPos = Math.max(rawMaxPos, minPos + 1);

    let height = tier.forceHeight || style.HEIGHT || forceHeight || 12;
    let requiredHeight = height * 1.0;
    let bump = style.BUMP && isDasBooleanTrue(style.BUMP);

    let glyph;
    let quant;

    // Create one of these glyphs
    if (gtype === 'CROSS' ||
        gtype === 'EX' ||
        gtype === 'TRIANGLE' ||
        gtype === 'DOT' ||
        gtype === 'SQUARE' ||
        gtype === 'STAR' ||
        gtype === 'PLIMSOLL') {


        let stroke = style.FGCOLOR || 'black';
        let fill = style.BGCOLOR || 'none';
        let outline = style.STROKECOLOR;

        if (style.BGITEM && feature.itemRgb) {
            stroke = feature.itemRgb;
        } else if (isDasBooleanTrue(style.COLOR_BY_SCORE2)) {
            let grad = style.BGGRAD || style._gradient;
            if (!grad) {
                grad = makeGradient(50, style.COLOR1, style.COLOR2, style.COLOR3);
                style._gradient = grad;
            }

            let score2 = feature.score2;
            if (score2 !== undefined || !stroke) {
                score2 = score2 || 0;

                let smin2 = style.MIN2 ? (1.0 * style.MIN2) : 0.0;
                let smax2 = style.MAX2 ? (1.0 * style.MAX2) : 1.0;
                let relScore2 = ((1.0 * score2) - smin2) / (smax2-smin2);

                let step = (relScore2*grad.length) | 0;
                step = Math.min(step, 0);
                step = Math.max(step, grad.length - 1);
                if (step >= grad.length)
                    step = grad.length - 1;
                stroke = grad[step];
            }
        }

        // TODO: This is probably completely pointless
        height = tier.forceHeight || style.HEIGHT || forceHeight || 12;
        requiredHeight = height * 1.0;

        let size = style.SIZE || height;
        if (style.RSIZE) {
            size = (1.0 * style.RSIZE) * height;
        }

        if (style.STROKETHRESHOLD) {
            if (size < (1.0 * style.STROKETHRESHOLD))
                outline = null;
        }

        // size = 1.0 * size;

        let mid = (minPos + maxPos)/2;

        if (gtype === 'EX') {
            glyph = new Glyphs.ExGlyph(mid, size, stroke);
        } else if (gtype === 'TRIANGLE') {
            var dir = style.DIRECTION || 'N';
            var width = style.LINEWIDTH || size;
            glyph = new Glyphs.TriangleGlyph(mid, size, dir, width, stroke, outline);
        } else if (gtype === 'DOT') {
            glyph = new Glyphs.DotGlyph(mid, size, stroke, outline);
        } else if (gtype === 'PLIMSOLL') {
            glyph = new Glyphs.PlimsollGlyph(mid, size, 0.2 * size, stroke, outline);
        } else if (gtype === 'SQUARE') {
            glyph = new Glyphs.BoxGlyph(mid - size/2, 0, size, size, stroke, outline);
        } else if (gtype === 'STAR') {
            let points = 5;
            if (style.POINTS)
                points = style.POINTS | 0;
            glyph = new Glyphs.StarGlyph(mid, size/2, points, stroke, outline);
        } else {
            glyph = new Glyphs.CrossGlyph(mid, size, stroke);
        }

        if (fill && fill != 'none' && (maxPos - minPos) > 5) {
            let boxGlyph = new Glyphs.BoxGlyph(minPos, 0, (maxPos - minPos), size, fill);
            glyph = new Glyphs.GroupGlyph([boxGlyph, glyph]);
        }

        if (isDasBooleanTrue(style.SCATTER)) {
            let [smin, smax] = getScoreMinMax(tier, style);

            let relScore = ((1.0 * score) - smin) / (smax-smin);
            let relOrigin = (-1.0 * smin) / (smax - smin);

            if (relScore < 0.0 || relScore > 1.0) {
                // Glyph is out of bounds.
                // Should we allow for "partially showing" glyphs?

                return null;
            } else {
                if (relScore >= relOrigin) {
                    height = Math.max(1, (relScore - relOrigin) * requiredHeight);
                    y = y + ((1.0 - relOrigin) * requiredHeight) - height;
                } else {
                    height = Math.max(1, (relScore - relOrigin) * requiredHeight);
                    y = y + ((1.0 - relOrigin) * requiredHeight);
                }

                quant = {min: smin, max: smax};

                let heightFudge = 0;
                let featureLabel;
                if (typeof(feature.forceLabel) !== 'undefined')
                    featureLabel = feature.forceLabel;
                else
                    featureLabel = style.LABEL;

                if (isDasBooleanNotFalse(featureLabel) && label && !noLabel) {
                    glyph = new Glyphs.LabelledGlyph(canvas, glyph, label,
                                                     true, null,
                                                     featureLabel == 'above' ? 'above' : 'below');
                    if (featureLabel == 'above') {
                        heightFudge = glyph.textHeight + 2;
                    }
                    noLabel = true;
                }
                glyph = new Glyphs.TranslatedGlyph(glyph, 0, y - (size / 2) - heightFudge, requiredHeight);
            }
        }
    } else if (gtype === 'HISTOGRAM' || gtype === 'GRADIENT' && score !== 'undefined') {
        var centerOnAxis = isDasBooleanTrue(style["AXISCENTER"]);

        let [smin, smax] = getScoreMinMax(tier, style);

        if ((1.0 * score) < (1.0 * smin)) {
            score = smin;
        }
        if ((1.0 * score) > (1.0 * smax)) {
            score = smax;
        }

        // Shift smin/smax in case we want to center the histogram
        // on the horizontal axis
        if (centerOnAxis) {
            var tmin = tier.quantMin(style);
            var tmax = tier.quantMax(style);
            smin = tmin - ((tmax - tmin) / 2);
            smax = tmax - ((tmax - tmin) / 2);
        }

        let relScore = ((1.0 * score) - smin) / (smax-smin);
        let relOrigin = (-1.0 * smin) / (smax - smin);

        if (gtype === 'HISTOGRAM') {
            if (relScore >= relOrigin) {
                height = (relScore - Math.max(0, relOrigin)) * requiredHeight;
                y = y + ((1.0 - Math.max(0, relOrigin)) * requiredHeight) - height;

                if (centerOnAxis)
                    y += height / 2;
            } else {
                height = (Math.max(0, relOrigin) - relScore) * requiredHeight;
                y = y + ((1.0 - Math.max(0, relOrigin)) * requiredHeight);

                if (centerOnAxis)
                    y -= height / 2;
            }
            if (isDasBooleanTrue(style["HIDEAXISLABEL"]))
                quant = null;
            else
                quant = {min: smin, max: smax};
        }

        let stroke = style.FGCOLOR || null;
        let fill = style.BGCOLOR || style.COLOR1 || 'green';
        if (style.BGITEM && feature.itemRgb)
            fill = feature.itemRgb;
        var alpha = style.ALPHA ? (1.0 * style.ALPHA) : null;

        if (style.BGGRAD) {
            let grad = style.BGGRAD;
            let step = (relScore*grad.length)|0;
            if (step < 0) step = 0;
            if (step >= grad.length) step = grad.length - 1;
            fill = grad[step];
        }

        if (style.COLOR2) {
            let grad = style._gradient;
            if (!grad) {
                grad = makeGradient(50, style.COLOR1, style.COLOR2, style.COLOR3);
                style._gradient = grad;
            }

            let step = (relScore*grad.length) | 0;
            step = Math.min(step, 0);
            step = Math.max(step, grad.length - 1);
            fill = grad[step];
        }

        let tempGlyph = new Glyphs.BoxGlyph(minPos, y, (maxPos - minPos), height, fill, stroke, alpha);
        glyph = new Glyphs.TranslatedGlyph(tempGlyph, 0, 0, requiredHeight);

    } else if (gtype === 'HIDDEN') {
        glyph = new Glyphs.PaddedGlyph(null, minPos, maxPos);
        noLabel = true;

    } else if (gtype === 'ARROW') {
        let color = style.FGCOLOR || 'purple';
        let parallel = isDasBooleanTrue(style.PARALLEL);
        let sw = isDasBooleanTrue(style.SOUTHWEST);
        let ne = isDasBooleanTrue(style.NORTHEAST);
        glyph = new Glyphs.ArrowGlyph(minPos, maxPos, height, color, parallel, sw, ne);

    } else if (gtype === 'ANCHORED_ARROW') {
        let stroke = style.FGCOLOR || 'none';
        let fill = style.BGCOLOR || 'green';
        glyph = new Glyphs.AArrowGlyph(minPos, maxPos, height, fill, stroke, strand);
        glyph.bump = true;

    } else if (gtype === 'SPAN') {
        let stroke = style.FGCOLOR || 'black';
        glyph = new Glyphs.SpanGlyph(minPos, maxPos, height, stroke);

    } else if (gtype === 'LINE') {
        let stroke = style.FGCOLOR || 'black';
        let lineStyle = style.STYLE || 'solid';
        glyph = new Glyphs.LineGlyph(minPos, maxPos, height, lineStyle, strand, stroke);

    } else if (gtype === 'PRIMERS') {
        let stroke = style.FGCOLOR || 'black';
        let fill = style.BGCOLOR || 'red';
        glyph = new Glyphs.PrimersGlyph(minPos, maxPos, height, fill, stroke);

    } else if (gtype === 'TEXT') {
        let string = style.STRING || 'text';
        let fill = style.FGCOLOR || 'black';
        glyph = new Glyphs.TextGlyph(canvas, minPos, maxPos, height, fill, string);

    } else if (gtype === 'TOOMANY') {
        let stroke = style.FGCOLOR || 'gray';
        let fill = style.BGCOLOR || 'orange';
        glyph = new Glyphs.TooManyGlyph(minPos, maxPos, height, fill, stroke);

    } else if (gtype === 'POINT') {
        let height = tier.forceHeight || style.HEIGHT || 30;
        let [smin, smax] = getScoreMinMax(tier, style);
        let yscale = ((1.0 * height) / (smax - smin));
        let relScore = ((1.0 * score) - smin) / (smax-smin);
        let sc = ((score - (1.0*smin)) * yscale)|0;
        quant = {min: smin, max: smax};

        let fill = style.FGCOLOR || style.COLOR1 || 'black';
        if (style.COLOR2) {
            let grad = style._gradient;
            if (!grad) {
                grad = makeGradient(50, style.COLOR1, style.COLOR2, style.COLOR3);
                style._gradient = grad;
            }

            let step = (relScore*grad.length)|0;
            if (step < 0) step = 0;
            if (step >= grad.length) step = grad.length - 1;
            fill = grad[step];
        }

        glyph = new Glyphs.PointGlyph((minPos + maxPos)/2, height-sc, height, fill);
    } else if (gtype === '__SEQUENCE') {
        let rawseq = feature.seq;
        let seq = rawseq;
        let rawquals = feature.quals;
        let quals = rawquals;
        let insertionLabels = isDasBooleanTrue(style.__INSERTIONS);

        let indels = [];
        if (feature.cigar) {
            let ops = parseCigar(feature.cigar);
            seq = '';
            quals = '';
            let cursor = 0;
            for (var ci = 0; ci < ops.length; ++ci) {
                var co = ops[ci];
                if (co.op == 'M') {
                    seq += rawseq.substr(cursor, co.cnt);
                    quals += rawquals.substr(cursor, co.cnt);
                    cursor += co.cnt;
                } else if (co.op == 'D') {
                    for (var oi = 0; oi < co.cnt; ++oi) {
                        seq += '-';
                        quals += 'Z';
                    }
                } else if (co.op == 'I') {
                    var inseq =  rawseq.substr(cursor, co.cnt);
                    var ig = new Glyphs.TriangleGlyph(minPos + (seq.length*scale), 5, 'S', 5, tier.browser.baseColors['I']);
                    if (insertionLabels)
                        ig = new Glyphs.LabelledGlyph(canvas, ig, inseq, false, 'center', 'above', '7px sans-serif');
                    ig.feature = {label: 'Insertion: ' + inseq, type: 'insertion', method: 'insertion'};
                    indels.push(ig);

                    cursor += co.cnt;
                } else if (co.op == 'S') {
                    cursor += co.cnt;
                } else {
                    console.log('unknown cigop' + co.op);
                }
            }
        }

        var refSeq = getRefSeq(tier, min, max);
        if (seq && refSeq && (style.__SEQCOLOR === 'mismatch' || style.__SEQCOLOR === 'mismatch-all')) {
            var mismatchSeq = [];
            var match = feature.orientation === '-' ? ',' : '.';
            for (var i = 0; i < seq.length; ++i)
                mismatchSeq.push(seq[i] == refSeq[i] ? match : seq[i]);
            seq = mismatchSeq.join('');
        }

        var strandColor;
        if (feature.orientation === '-')
            strandColor = style._minusColor || 'lightskyblue';
        else
            strandColor = style._plusColor || 'lightsalmon';

        if (style.__disableQuals)
            quals = false;
        
        glyph = new Glyphs.SequenceGlyph(
            tier.browser.baseColors, 
            strandColor, 
            minPos, 
            maxPos, 
            height, 
            seq, 
            refSeq, 
            style.__SEQCOLOR, 
            quals,
            !isDasBooleanTrue(style.__CLEARBG),
            tier.scaleVertical
        );
        if (insertionLabels)
            glyph = new Glyphs.TranslatedGlyph(glyph, 0, 7);
        if (indels.length > 0) {
            indels.splice(0, 0, glyph);
            glyph = new Glyphs.GroupGlyph(indels);
        }
    } else if (gtype === '__INSERTION') {
        let ig = new Glyphs.TriangleGlyph(minPos, 5, 'S', 5, tier.browser.baseColors['I']);
        glyph = new Glyphs.LabelledGlyph(canvas, ig, feature.insertion || feature.altAlleles[0], false, 'center', 'above', '7px sans-serif');
        if ((maxPos - minPos) > 1) {
            var fill = style.BGCOLOR || style.COLOR1 || 'green';
            var bg = new Glyphs.BoxGlyph(minPos, 5, (maxPos - minPos), height, fill, stroke);
            glyph = new Glyphs.GroupGlyph([bg, glyph]);
        }
    } else if (glyphType === '__NONE') {
        return null;
    } else /* default to BOX */ {
        let stroke = style.FGCOLOR || null;
        let fill = style.BGCOLOR || style.COLOR1 || 'green';
        if (style.BGITEM && feature.itemRgb)
            fill = feature.itemRgb;
        let scale = (maxPos - minPos) / (max - min);
        if (feature.type == 'translation' &&
            (feature.method == 'protein_coding' || feature.readframeExplicit) &&
            (!feature.tags || feature.tags.indexOf('cds_start_NF') < 0 || feature.readframeExplicit) &&
            (!tier.dasSource.collapseSuperGroups || tier.bumped)
            && scale >= 0.5) {
            let refSeq = getRefSeq(tier, min, max);
            glyph = new Glyphs.AminoAcidGlyph(minPos,
                                           maxPos,
                                           height,
                                           fill,
                                           refSeq,
                                           feature.orientation,
                                           feature.readframe);
        } else {
            glyph = new Glyphs.BoxGlyph(minPos, 0, (maxPos - minPos),
                                     height, fill, stroke);
        }
    }

    if ((isDasBooleanTrue(style.LABEL) || feature.forceLabel) &&
        label && !noLabel) {
        glyph = new Glyphs.LabelledGlyph(canvas, glyph, label, false);
    }

    if (bump) {
        glyph.bump = true;
    }

    glyph.feature = feature;

    if (isDasBooleanTrue(style["HIDEAXISLABEL"]))
        quant = null;
    if (quant) {
        glyph.quant = quant;
    }

    if (style.ZINDEX) {
        glyph.zindex = style.ZINDEX | 0;
    }

    return glyph;
}

function drawFeatureTier(tier, canvas)
{
    // why
    var MIN_PADDING = 3;
    if (typeof(tier.dasSource.padding) === 'number')
        tier.padding = tier.dasSource.padding;
    else
        tier.padding = MIN_PADDING;

    // this can be done better right
    if (typeof(tier.dasSource.scaleVertical) === 'boolean')
        tier.scaleVertical = tier.dasSource.scaleVertical;
    else
        tier.scaleVertical = false;

    var glyphs = [];

    // group by style
    var gbsFeatures = {};
    // so group by style styles???
    var gbsStyles = {};

    // what's an uft

    // so this should be a grouping function
    for (let uft in tier.ungroupedFeatures) {
        let ufl = tier.ungroupedFeatures[uft];
        ufl.forEach(f => {
            let style = tier.styleForFeature(f);

            if (f.parts || !style)
                return;

            if (style.glyph === 'LINEPLOT') {
                pusho(gbsFeatures, style.id, f);
                gbsStyles[style.id] = style;
            } else {
                let glyph = glyphForFeature(canvas, f, 0, style, tier);
                if (glyph)
                    glyphs.push(glyph);
            }
        });
    }

    for (let gbs in gbsFeatures) {
        let gf = gbsFeatures[gbs];
        let style = gbsStyles[gbs];
        if (style.glyph == 'LINEPLOT') {
            let lineGraphGlyphs = makeLineGlyph(gf, style, tier);
            lineGraphGlyphs.forEach(g => glyphs.push(g));
        }
    }

    // Merge supergroups

    // and this should be a merge supergroups-function
    if (tier.dasSource.collapseSuperGroups && !tier.bumped) {
        for (let sgId in tier.superGroups) {
        // for (var sg in tier.superGroups) {
            // let sgg = tier.superGroups[superGroup];
            let sgGroup = tier.superGroups[sgId];
            tier.groups[sgId] = shallowCopy(tier.groups[sgId]);
            let group = tier.groups[sgId];
            group.isSuperGroup = true;
            let featuresByType = {};

            let sgMin = 10000000000, sgMax = -10000000000;
            let sgSeg = null;

            sgGroup.forEach((g, i) => {
                let groupedFeature = tier.groupedFeatures[sgGroup[i]];
                if (!groupedFeature)
                    return;

                groupedFeature.forEach(feature => {
                    pusho(featuresByType, feature.type, feature);
                    sgMin = Math.min(feature.min, sgMin);
                    sgMax = Math.max(feature.max, sgMax);
                    if (feature.segment && !sgSeg)
                        sgSeg = feature.segment;
                });

                if (group && !group.links || group.links.length === 0) {
                    group.links = tier.groups[sgGroup[0]].links;
                }

                delete tier.groupedFeatures[sgGroup[g]];

            });

            /*
            for (var g = 0; g < sgg.length; ++g) {
                var gf = tier.groupedFeatures[sgg[g]];
                if (!gf)
                    continue;

                for (var fi = 0; fi < gf.length; ++fi) {
                    var f = gf[fi];
                    pusho(featsByType, f.type, f);
                    sgMin = Math.min(f.min, sgMin);
                    sgMax = Math.max(f.max, sgMax);
                    if (f.segment && !sgSeg)
                        sgSeg = f.segment;
                }

                if (tier.groups[sg] && !tier.groups[sg].links || tier.groups[sg].links.length == 0) {
                   tier.groups[sg].links = tier.groups[sgg[0]].links;
                }

                delete tier.groupedFeatures[sgg[g]];  // 'cos we don't want to render the unmerged version.
            }
             */

            tier.groups[sgId].max = sgMax;
            tier.groups[sgId].min = sgMin;
            tier.groups[sgId].segment = sgSeg;

            for (let t in featuresByType) {
                let features = featuresByType[t];
                let template = features[0];
                let loc = null;

                features.forEach(feature => {
                    let fl = new Range(feature.min, feature.max);
                    if (!loc) {
                        loc = fl;
                    } else {
                        loc = union(loc, fl);
                    }
                });

                let mergedRanges = loc.ranges();

                mergedRanges.forEach(range => {
                    let posCoverage = ((range.max() | 0) - (range.min() | 0) + 1) * sgGroup.length;
                    let actCoverage = 0;

                    features.forEach(feature => {
                        if ((feature.min | 0) <= range.max() &&
                            (feature.max | 0) >= range.min()) {
                            let umin = Math.max(feature.min | 0, range.min());
                            let umax = Math.min(feature.max | 0, range.max());
                            actCoverage += (umax - umin + 1);
                        }
                    });

                    let newFeature = new DASFeature();
                    for (let key in template) {
                        newFeature[key] = template[key];
                    }

                    newFeature.min = range.min();
                    newFeature.max = range.max();
                    if (newFeature.label && sgGroup.length > 1) {
                        newFeature.label += ' (' + sgGroup.length + ' vars)';
                    }

                    newFeature.visualWeight = ((1.0 * actCoverage) / posCoverage);

                    pusho(tier.groupedFeatures, sgId, newFeature);
                });
            }
            delete tier.superGroups[sgId]; // Do we want this?
            // I DON'T KNOW DO WE??
        }
    }

    // Glyphify groups.
    // meaning????

    let groupIds = [];
    for (let gid in tier.groupedFeatures) {
        groupIds.push(gid);
    }
    // let groupIds = Object.keys(tier.groupedFeatures);

    // this has got to be done in a better way... what the hell
    // arrow function, swap g1 & g2 in sub then return d.
    groupIds.sort((g1, g2) =>
            tier.groupedFeatures[g2][0].score - tier.groupedFeatures[g1][0].score);

    let groupGlyphs = {};

    groupIds.forEach(gId => {
        let glyphs = glyphsForGroup(canvas, tier.groupedFeatures[gId], 0, tier.groups[gId], tier,
                               (tier.dasSource.collapseSuperGroups && !tier.bumped)
                               ? 'collapsed_gene' : 'tent'
                              );

        if (glyphs) {
            glyphs.group = tier.groups[gId];
            groupGlyphs[gId] = glyphs;
        }
    });

    for (let sgId in tier.superGroups) {

        let superGroup = tier.superGroups[sgId];
        let sgGlyphs = [];

        let sgMin = 10000000000;
        let sgMax = -10000000000;

        superGroup.forEach(glyphs => {
            let gGlyphs = groupGlyphs[glyphs];
            if (gGlyphs) {
                sgGlyphs.push(gGlyphs);
                sgMin = Math.min(sgMin, gGlyphs.min());
                sgMax = Math.max(sgMax, gGlyphs.max());
            }
        });

        sgGlyphs.forEach(glyph => {
            glyphs.push(new PaddedGlyph(glyph, sgMin, sgMax));
        });
    }

    for (let gId in groupGlyphs) {
        let glyph = groupGlyphs[gId];
        if (gId) {
            glyphs.push(glyph);
        }
    }

    // Bumping

    let unbumpedST = new SubTier();
    let bumpedSTs = [];
    let subtierMax =
            tier.subtierMax ||
            tier.dasSource.subtierMax ||
            tier.browser.defaultSubtierMax;

    let subtiersExceeded = false;


    // We want to add each glyph to either the subtier
    // containing unbumped subtiers, or to the first bumped subtier.
    glyphs.forEach(glyph => {
        // if the glyph is to be bumped...
        if (glyph.bump &&
            tier.bumped ||
            tier.dasSource.collapseSuperGroups) {

            let glyphTier = bumpedSTs.find(st => st.hasSpaceFor(glyph));

            if (glyphTier) {
                glyphTier.add(glyph);
            } else if (bumpedSTs.length >= subtierMax) {
                subtiersExceeded = true;
            } else {
                let subtier = new SubTier();
                subtier.add(glyph);
                bumpedSTs.push(subtier);
            }
        } else {
            unbumpedST.add(glyph);
        }
    });

    if (unbumpedST.glyphs.length > 0) {
        bumpedSTs = [unbumpedST].concat(bumpedSTs);
    }

    bumpedSTs.forEach(subtier => {
        if (subtier.quant) {
            subtier.glyphs.unshift(new Glyphs.GridGlyph(subtier.height));
        }
    });


    bumpedSTs.forEach(subtier => {
        subtier.glyphs.sort((g1, g2) => (g1.zindex || 0) - (g2.zindex || 0));
    });

    tier.glyphCacheOrigin = tier.browser.viewStart;

    if (subtiersExceeded)
        tier.updateStatus('Bumping limit exceeded, use the track editor to see more features');
    else
        tier.updateStatus();

    // TODO: try to return the subtiers instead
    tier.subtiers = bumpedSTs;
}

function prePaint(tier, canvas, retina, clear=true) {
    let subtiers = tier.subtiers;
    // console.log(subtiers);
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
}

function paint(tier, canvas, retina, clear=true) {
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
function getScoreMinMax(tier, style) {
    let smin = tier.quantMin(style);
    let smax = tier.quantMax(style);

    if (!smax) {
        if (smin < 0) {
            smax = 0;
        } else {
            smax = 10;
        }
    }
    if (!smin) {
        smin = 0;
    }
    return [smin, smax];
}

function relScoreOrigin(score, smin, smax) {
    let relScore = ((1.0 * score) - smin) / (smax-smin);
    let relOrigin = (-1.0 * smin) / (smax - smin);

    return [relScore, relOrigin];
}

function getRefSeq(tier, min, max) {
    let refSeq = null;
    if (tier.currentSequence) {
        let csStart = tier.currentSequence.start|0;
        let csEnd = tier.currentSequence.end|0;
        if (csStart <= max && csEnd >= min) {
            let sfMin = Math.max(min, csStart);
            let sfMax = Math.min(max, csEnd);

            refSeq = tier.currentSequence.seq.substr(sfMin - csStart, sfMax - sfMin + 1);
            while (min < sfMin) {
                refSeq = 'N' + refSeq;
                sfMin--;
            }
            while (max > sfMax) {
                refSeq = refSeq + 'N';
                sfMax++;
            }
        }
    }
    return refSeq;
}
