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


function glyphsForGroup(features, y, groupElement, tier, connectorType) {
    var gstyle = tier.styleForFeature(groupElement);
    var label;
    var labelWanted = false;

    var glyphs = [];
    var strand = null;
    for (var i = 0; i < features.length; ++i) {
        var f = features[i];
        if (f.orientation && strand==null) {
            strand = f.orientation;
        }
         if (!label && f.label) {
            label = f.label;
        }

        var style = tier.styleForFeature(f);
        if (!style) {
            continue;
        }
        if (f.parts) {  // FIXME shouldn't really be needed
            continue;
        }
        if (isDasBooleanTrue(style.LABEL))
            labelWanted = true;

        var g = glyphForFeature(f, 0, style, tier, null, true);
        if (g) {
            glyphs.push(g);
        }
    }

    if (glyphs.length == 0)
        return null;
    
    var connector = 'flat';
    if (gstyle && gstyle.glyph === 'LINE') {
        // Stick with flat...
    } else {
        if (tier.dasSource.collapseSuperGroups && !tier.bumped) {
            if (strand === '+') {
                connector = 'collapsed+';
            } else if (strand === '-') {
                connector = 'collapsed-';
            }
        } else {
            if (strand === '+') {
                connector = 'hat+';
            } else if (strand === '-') {
                connector = 'hat-';
            }
        }
    }   

    var labelText = null;
    if ((label && labelWanted) || (gstyle && (isDasBooleanTrue(gstyle.LABEL) || isDasBooleanTrue(gstyle.LABELS)))) {  // HACK, LABELS should work.
        labelText = groupElement.label || label;
    }

    var gg = new GroupGlyph(glyphs, connector);
    if (labelText) {
        if (strand === '+') {
            labelText = '>' + labelText;
        } else if (strand === '-') {
            labelText = '<' + labelText;
        }
        gg = new LabelledGlyph(GLOBAL_GC, gg, labelText, false);
    }
    gg.bump = true;
    return gg;
}

function glyphForFeature(feature, y, style, tier, forceHeight, noLabel)
{
    function getRefSeq(tier, min, max) {
        var refSeq = null;
        if (tier.currentSequence) {
            var csStart = tier.currentSequence.start|0;
            var csEnd = tier.currentSequence.end|0;
            if (csStart <= max && csEnd >= min) {
                var sfMin = Math.max(min, csStart);
                var sfMax = Math.min(max, csEnd);

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

    var scale = tier.browser.scale, origin = tier.browser.viewStart;
    var gtype = style.glyph || 'BOX';
    var glyph;

    var min = feature.min;
    var max = feature.max;
    var type = feature.type;
    var strand = feature.orientation;
    var score = feature.score;
    var label = feature.label || feature.id;

    var minPos = (min - origin) * scale;
    var rawMaxPos = ((max - origin + 1) * scale);
    var maxPos = Math.max(rawMaxPos, minPos + 1);

    var height = tier.forceHeight || style.HEIGHT || forceHeight || 12;
    var requiredHeight = height = 1.0 * height;
    var bump = style.BUMP && isDasBooleanTrue(style.BUMP);

    var gg, quant;

    if (gtype === 'CROSS' || gtype === 'EX' || gtype === 'TRIANGLE' || gtype === 'DOT' || gtype === 'SQUARE' || gtype === 'STAR' || gtype === 'PLIMSOLL') {
        var stroke = style.FGCOLOR || 'black';
        var fill = style.BGCOLOR || 'none';
        var outline = style.STROKECOLOR;

        if (style.BGITEM && feature.itemRgb) {
            stroke = feature.itemRgb;
        } else if (isDasBooleanTrue(style.COLOR_BY_SCORE2)) {
            var grad = style.BGGRAD || style._gradient;
            if (!grad) {
                grad = makeGradient(50, style.COLOR1, style.COLOR2, style.COLOR3);
                style._gradient = grad;
            }

            var sc2 = feature.score2;
            if (sc2 != undefined || !stroke) {
                sc2 = sc2 || 0;

                var smin2 = style.MIN2 ? (1.0 * style.MIN2) : 0.0;
                var smax2 = style.MAX2 ? (1.0 * style.MAX2) : 1.0;
                var relScore2 = ((1.0 * sc2) - smin2) / (smax2-smin2);

                var step = (relScore2*grad.length)|0;
                if (step < 0) step = 0;
                if (step >= grad.length) step = grad.length - 1;
                stroke = grad[step];
            }
        }



        var height = tier.forceHeight || style.HEIGHT || forceHeight || 12;
        requiredHeight = height = 1.0 * height;

        var size = style.SIZE || height;
        if (style.RSIZE) {
            size = (1.0 * style.RSIZE) * height;
        }

        if (style.STROKETHRESHOLD) {
            if (size < (1.0 * style.STROKETHRESHOLD))
                outline = null;
        }
        
        size = 1.0 * size;

        var mid = (minPos + maxPos)/2;
        var hh = size/2;

        var mark;
        var bMinPos = minPos, bMaxPos = maxPos;

        if (gtype === 'EX') {
            gg = new ExGlyph(mid, size, stroke);
        } else if (gtype === 'TRIANGLE') {
            var dir = style.DIRECTION || 'N';
            var width = style.LINEWIDTH || size;
            gg = new TriangleGlyph(mid, size, dir, width, stroke, outline);
        } else if (gtype === 'DOT') {
            gg = new DotGlyph(mid, size, stroke, outline);
        } else if (gtype === 'PLIMSOLL') {
            gg = new PlimsollGlyph(mid, size, 0.2 * size, stroke, outline);
        } else if (gtype === 'SQUARE') {
            gg = new BoxGlyph(mid - hh, 0, size, size, stroke, outline);
        } else if (gtype === 'STAR') {
            var points = 5;
            if (style.POINTS) 
                points = style.POINTS | 0;
            gg = new StarGlyph(mid, hh, points, stroke, outline);
        } else {
            gg = new CrossGlyph(mid, size, stroke);
        }

        if (fill && fill != 'none' && (maxPos - minPos) > 5) {
            var bgg = new BoxGlyph(minPos, 0, (maxPos - minPos), size, fill);
            gg = new GroupGlyph([bgg, gg]);
        }

        if (isDasBooleanTrue(style.SCATTER)) {
            var smin = tier.quantMin(style);
            var smax = tier.quantMax(style);

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

            var relScore = ((1.0 * score) - smin) / (smax-smin);
            var relOrigin = (-1.0 * smin) / (smax - smin);

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

                var heightFudge = 0;
                var featureLabel;
                if (typeof(feature.forceLabel) !== 'undefined')
                    featureLabel = feature.forceLabel;
                else
                    featureLabel = style.LABEL;

                if (isDasBooleanNotFalse(featureLabel) && label && !noLabel) {
                    gg = new LabelledGlyph(GLOBAL_GC, gg, label, true, null, featureLabel == 'above' ? 'above' : 'below');
                    if (featureLabel == 'above') {
                        heightFudge = gg.textHeight + 2;
                    }
                    noLabel = true;
                }
                gg = new TranslatedGlyph(gg, 0, y - hh - heightFudge, requiredHeight);
            }
        }
    } else if (gtype === 'HISTOGRAM' || gtype === 'GRADIENT' && score !== 'undefined') {
        var centerOnAxis = isDasBooleanTrue(style["AXISCENTER"]);

        var smin = tier.quantMin(style);
        var smax = tier.quantMax(style);

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

        if ((1.0 * score) < (1.0 *smin)) {
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

        var relScore = ((1.0 * score) - smin) / (smax-smin);
        var relOrigin = (-1.0 * smin) / (smax - smin);

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

        var stroke = style.FGCOLOR || null;
        var fill = style.BGCOLOR || style.COLOR1 || 'green';
        if (style.BGITEM && feature.itemRgb)
            fill = feature.itemRgb;
        var alpha = style.ALPHA ? (1.0 * style.ALPHA) : null;

        if (style.BGGRAD) {
            var grad = style.BGGRAD;
            var step = (relScore*grad.length)|0;
            if (step < 0) step = 0;
            if (step >= grad.length) step = grad.length - 1;
            fill = grad[step];
        }
        if (style.COLOR2) {
            var grad = style._gradient;
            if (!grad) {
                grad = makeGradient(50, style.COLOR1, style.COLOR2, style.COLOR3);
                style._gradient = grad;
            }

            var step = (relScore*grad.length)|0;
            if (step < 0) step = 0;
            if (step >= grad.length) step = grad.length - 1;
            fill = grad[step];
        }

        gg = new BoxGlyph(minPos, y, (maxPos - minPos), height, fill, stroke, alpha);
        gg = new TranslatedGlyph(gg, 0, 0, requiredHeight);
    } else if (gtype === 'HIDDEN') {
        gg = new PaddedGlyph(null, minPos, maxPos);
        noLabel = true;
    } else if (gtype === 'ARROW') {
        var color = style.FGCOLOR || 'purple';
        var parallel = isDasBooleanTrue(style.PARALLEL);
        var sw = isDasBooleanTrue(style.SOUTHWEST);
        var ne = isDasBooleanTrue(style.NORTHEAST);
        gg = new ArrowGlyph(minPos, maxPos, height, color, parallel, sw, ne);
    } else if (gtype === 'ANCHORED_ARROW') {
        var stroke = style.FGCOLOR || 'none';
        var fill = style.BGCOLOR || 'green';
        gg = new AArrowGlyph(minPos, maxPos, height, fill, stroke, strand);
        gg.bump = true;
    } else if (gtype === 'SPAN') {
        var stroke = style.FGCOLOR || 'black';
        gg = new SpanGlyph(minPos, maxPos, height, stroke);
    } else if (gtype === 'LINE') {
        var stroke = style.FGCOLOR || 'black';
        var lineStyle = style.STYLE || 'solid';
        gg = new LineGlyph(minPos, maxPos, height, lineStyle, strand, stroke);
    } else if (gtype === 'PRIMERS') {
        var stroke = style.FGCOLOR || 'black';
        var fill = style.BGCOLOR || 'red';
        gg = new PrimersGlyph(minPos, maxPos, height, fill, stroke);
    } else if (gtype === 'TEXT') {
        var string = style.STRING || 'text';
        var fill = style.FGCOLOR || 'black';
        gg = new TextGlyph(GLOBAL_GC, minPos, maxPos, height, fill, string);
    } else if (gtype === 'TOOMANY') {
        var stroke = style.FGCOLOR || 'gray';
        var fill = style.BGCOLOR || 'orange';
        gg = new TooManyGlyph(minPos, maxPos, height, fill, stroke);
    } else if (gtype === 'POINT') {
        var height = tier.forceHeight || style.HEIGHT || 30;
        var smin = tier.quantMin(style);
        var smax = tier.quantMax(style);
        var yscale = ((1.0 * height) / (smax - smin));
        var relScore = ((1.0 * score) - smin) / (smax-smin);
        var sc = ((score - (1.0*smin)) * yscale)|0;
        quant = {min: smin, max: smax};

        var fill = style.FGCOLOR || style.COLOR1 || 'black';
        if (style.COLOR2) {
            var grad = style._gradient;
            if (!grad) {
                grad = makeGradient(50, style.COLOR1, style.COLOR2, style.COLOR3);
                style._gradient = grad;
            }

            var step = (relScore*grad.length)|0;
            if (step < 0) step = 0;
            if (step >= grad.length) step = grad.length - 1;
            fill = grad[step];
        } 

        gg = new PointGlyph((minPos + maxPos)/2, height-sc, height, fill);
    } else if (gtype === '__SEQUENCE') {
        var rawseq = feature.seq;
        var seq = rawseq;
        var rawquals = feature.quals;
        var quals = rawquals;
        var insertionLabels = isDasBooleanTrue(style.__INSERTIONS);

        var indels = [];
        if (feature.cigar) {
            var ops = parseCigar(feature.cigar);
            seq = ''
            quals = '';
            var cursor = 0;
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
                    var ig = new TriangleGlyph(minPos + (seq.length*scale), 5, 'S', 5, tier.browser.baseColors['I']);
                    if (insertionLabels)
                        ig = new LabelledGlyph(GLOBAL_GC, ig, inseq, false, 'center', 'above', '7px sans-serif');
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
        
        gg = new SequenceGlyph(
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
            gg = new TranslatedGlyph(gg, 0, 7);
        if (indels.length > 0) {
            indels.splice(0, 0, gg);
            gg = new GroupGlyph(indels);
        }
    } else if (gtype === '__INSERTION') {
        var ig = new TriangleGlyph(minPos, 5, 'S', 5, tier.browser.baseColors['I']);
        gg = new LabelledGlyph(GLOBAL_GC, ig, feature.insertion || feature.altAlleles[0], false, 'center', 'above', '7px sans-serif');
        if ((maxPos - minPos) > 1) {
            var fill = style.BGCOLOR || style.COLOR1 || 'green';
            var bg = new BoxGlyph(minPos, 5, (maxPos - minPos), height, fill, stroke);
            gg = new GroupGlyph([bg, gg]);
        }
    } else if (gtype === '__NONE') {
        return null;
    } else /* default to BOX */ {
        var stroke = style.FGCOLOR || null;
        var fill = style.BGCOLOR || style.COLOR1 || 'green';
        if (style.BGITEM && feature.itemRgb)
            fill = feature.itemRgb;
        var scale = (maxPos - minPos) / (max - min);
        if (feature.type == 'translation' &&
            (feature.method == 'protein_coding' || feature.readframeExplicit) &&
            (!feature.tags || feature.tags.indexOf('cds_start_NF') < 0 || feature.readframeExplicit) &&
            (!tier.dasSource.collapseSuperGroups || tier.bumped)
            && scale >= 0.5) {
            var refSeq = getRefSeq(tier, min, max);
            gg = new AminoAcidGlyph(minPos, maxPos, height, fill, refSeq, feature.orientation, feature.readframe);    
        } else {
            gg = new BoxGlyph(minPos, 0, (maxPos - minPos), height, fill, stroke);
        }
        // gg.bump = true;
    }

    if ((isDasBooleanTrue(style.LABEL) || feature.forceLabel) && label && !noLabel) {
        gg = new LabelledGlyph(GLOBAL_GC, gg, label, false);
    }

    if (bump) {
        gg.bump = true;
    }

    gg.feature = feature;
    if (quant) {
        gg.quant = quant;
    }

    if (style.ZINDEX) {
        gg.zindex = style.ZINDEX | 0;
    }

    return gg;
}

function drawFeatureTier(tier)
{
    var start = Date.now()|0;
    GLOBAL_GC = tier.viewport.getContext('2d'); // Should only be used for metrics.
    if (typeof(tier.dasSource.padding) === 'number')
        tier.padding = tier.dasSource.padding;
    else
        tier.padding = MIN_PADDING;
    
    if (typeof(tier.dasSource.scaleVertical) === 'boolean')
        tier.scaleVertical = tier.dasSource.scaleVertical;
    else
        tier.scaleVertical = false;

    var glyphs = [];
    var specials = false;

    // group by style
    var gbsFeatures = {};
    var gbsStyles = {};

    for (var uft in tier.ungroupedFeatures) {
        var ufl = tier.ungroupedFeatures[uft];
        
        for (var pgid = 0; pgid < ufl.length; ++pgid) {
            var f = ufl[pgid];
            if (f.parts) {  // FIXME shouldn't really be needed
                continue;
            }

            var style = tier.styleForFeature(f);
            if (!style)
                continue;

            if (style.glyph == 'LINEPLOT') {
                pusho(gbsFeatures, style.id, f);
                gbsStyles[style.id] = style;
            } else {
                var g = glyphForFeature(f, 0, style, tier);
                if (g)
                    glyphs.push(g);
            }
        }
    }

    for (var gbs in gbsFeatures) {
        var gf = gbsFeatures[gbs];
        var style = gbsStyles[gbs];
        if (style.glyph == 'LINEPLOT') {
            var lineGraphGlyphs = makeLineGlyph(gf, style, tier);
            lineGraphGlyphs.forEach(function(lgg) {
                glyphs.push(lgg);
            });
            specials = true;
        }
    }

    // Merge supergroups    

    if (tier.dasSource.collapseSuperGroups && !tier.bumped) {
        for (var sg in tier.superGroups) {
            var sgg = tier.superGroups[sg];
            tier.groups[sg] = shallowCopy(tier.groups[sg]);
            tier.groups[sg].isSuperGroup = true;
            var featsByType = {};

            var sgMin = 10000000000, sgMax = -10000000000;
            var sgSeg = null;
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

            tier.groups[sg].max = sgMax;
            tier.groups[sg].min = sgMin;
            tier.groups[sg].segment = sgSeg;

            for (var t in featsByType) {
                var feats = featsByType[t];
                var template = feats[0];
                var loc = null;
                for (var fi = 0; fi < feats.length; ++fi) {
                    var f = feats[fi];
                    var fl = new Range(f.min, f.max);
                    if (!loc) {
                        loc = fl;
                    } else {
                        loc = union(loc, fl);
                    }
                }
                var mergedRanges = loc.ranges();
                for (var si = 0; si < mergedRanges.length; ++si) {
                    var r = mergedRanges[si];

                    // begin coverage-counting
                    var posCoverage = ((r.max()|0) - (r.min()|0) + 1) * sgg.length;
                    var actCoverage = 0;
                    for (var fi = 0; fi < feats.length; ++fi) {
                        var f = feats[fi];
                        if ((f.min|0) <= r.max() && (f.max|0) >= r.min()) {
                            var umin = Math.max(f.min|0, r.min());
                            var umax = Math.min(f.max|0, r.max());
                            actCoverage += (umax - umin + 1);
                        }
                    }
                    var visualWeight = ((1.0 * actCoverage) / posCoverage);
                    // end coverage-counting

                    var newf = new DASFeature();
                    for (var k in template) {
                        newf[k] = template[k];
                    }
                    newf.min = r.min();
                    newf.max = r.max();
                    if (newf.label && sgg.length > 1) {
                        newf.label += ' (' + sgg.length + ' vars)';
                    }
                    newf.visualWeight = ((1.0 * actCoverage) / posCoverage);
                    pusho(tier.groupedFeatures, sg, newf);
                    // supergroups are already in tier.groups.
                }
            }

            delete tier.superGroups[sg]; // Do we want this?
        }       
    }

    // Glyphify groups.

    var gl = new Array();
    for (var gid in tier.groupedFeatures) {
        gl.push(gid);
    }
    gl.sort(function(g1, g2) {
        var d = tier.groupedFeatures[g1][0].score - tier.groupedFeatures[g2][0].score;
        if (d > 0) {
            return -1;
        } else if (d == 0) {
            return 0;
        } else {
            return 1;
        }
    });

    var groupGlyphs = {};
    for (var gx = 0; gx < gl.length; ++gx) {
        var gid = gl[gx];
        var g = glyphsForGroup(tier.groupedFeatures[gid], 0, tier.groups[gid], tier,
                               (tier.dasSource.collapseSuperGroups && !tier.bumped) ? 'collapsed_gene' : 'tent');
        if (g) {
            g.group = tier.groups[gid];
            groupGlyphs[gid] = g;
        }
    }

    for (var sg in tier.superGroups) {
        var sgg = tier.superGroups[sg];
        var sgGlyphs = [];
        var sgMin = 10000000000;
        var sgMax = -10000000000;
        for (var sgi = 0; sgi < sgg.length; ++sgi) {
            var gg = groupGlyphs[sgg[sgi]];
            groupGlyphs[sgg[sgi]] = null;
            if (gg) {
                sgGlyphs.push(gg);
                sgMin = Math.min(sgMin, gg.min());
                sgMax = Math.max(sgMax, gg.max());
            }
        }
        for (var sgi = 0; sgi < sgGlyphs.length; ++sgi) {
            var gg = sgGlyphs[sgi];
            glyphs.push(new PaddedGlyph(gg, sgMin, sgMax));
        }
    }
    for (var g in groupGlyphs) {
        var gg = groupGlyphs[g];
        if (gg) {
            glyphs.push(gg);
        }
    }

    // Bumping

    var unbumpedST = new SubTier();
    var bumpedSTs = [];
    var hasBumpedFeatures = false;
    var subtierMax = tier.subtierMax || tier.dasSource.subtierMax || tier.browser.defaultSubtierMax;
    var subtiersExceeded = false;

  GLYPH_LOOP:
    for (var i = 0; i < glyphs.length; ++i) {
        var g = glyphs[i];
        if (g.bump) {
            hasBumpedFeatures = true;
        }
        if (g.bump && (tier.bumped || tier.dasSource.collapseSuperGroups)) {       // kind-of nasty.  supergroup collapsing is different from "normal" unbumping
            for (var sti = 0; sti < bumpedSTs.length;  ++sti) {
                var st = bumpedSTs[sti];
                if (st.hasSpaceFor(g)) {
                    st.add(g);
                    continue GLYPH_LOOP;
                }
            }
            if (bumpedSTs.length >= subtierMax) {
                subtiersExceeded = true;
            } else {
                var st = new SubTier();
                st.add(g);
                bumpedSTs.push(st);
            }
        } else {
            unbumpedST.add(g);
        }
    }

    if (unbumpedST.glyphs.length > 0) {
        bumpedSTs = [unbumpedST].concat(bumpedSTs);
    }

    for (var sti = 0; sti < bumpedSTs.length; ++sti) {
        var st = bumpedSTs[sti];
        if (st.quant) {
            st.glyphs.unshift(new GridGlyph(st.height));
        }
    }

    for (var sti = 0; sti < bumpedSTs.length; ++sti) {
        var st = bumpedSTs[sti];
        st.glyphs.sort(function (g1, g2) {
            var z1 = g1.zindex || 0;
            var z2 = g2.zindex || 0;
            return z1 - z2;
        });
    }

    tier.subtiers = bumpedSTs;
    tier.glyphCacheOrigin = tier.browser.viewStart;

    if (subtiersExceeded)
        tier.updateStatus('Bumping limit exceeded, use the track editor to see more features');
    else
        tier.updateStatus();
}

function prePaint(tier, canvas, retina, clear=true) {
    let subtiers = tier.subtiers;
    console.log(subtiers);
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
