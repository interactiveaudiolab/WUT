function namespace(namespaceString) {
    let parts = namespaceString.split('.'),
        parent = window,
        currentPart = '';

    for(let i = 0, length = parts.length; i < length; i++) {
        currentPart = parts[i];
        parent[currentPart] = parent[currentPart] || {};
        parent = parent[currentPart];
    }

    return parent;
}

function arange(start, stop, num_steps) {
    var result = [];
    var i = 0;
    var step = (stop - start) / num_steps;

    while (result.length < num_steps) {
        result[i++] = start;
        start += step;
    }

    return result;
}

/**
 * Generate tick labels associated with points along graph axis
 *
 * @param {Object} spectrogram - the spectrogram to redraw with the new
 *     background
 * @param {number} axisMax - max real x-axis value (a time axis might have 50
 *     (this value) points over a duration of 2 seconds for instance)
 * @param {number} tickMax - max value for tick labels (currently labels must be
 *     numbers)
 * @param {number} divDimension - length or width of div to generate ticks for
 * @param {number} [pixelSpacing=200] - spacing between labels, in px
 * @returns {[number[], string[]]} corresponding arrays of tick locations and
 *     labels
 *
 * TODO: make responsive? redraw ticks when redrawing rest of div?
 * TODO: confirm that behavior has not been recreated in plotly.js library
 * TODO: make maxAxis a range instead for potentially non-zero starting values?
 */
function generateTicks(axisMax, tickMax, divDimension, pixelSpacing=200) {
    if (pixelSpacing > divDimension) {
        return [
            [0, axisMax],
            ['0', tickMax.toFixed(2)] // assumes labels start at 0
        ]
    }

    // calculate number of ticks ($x$ internal ticks + 2 endpoint ticks)
    const numTicks = Math.floor(divDimension / pixelSpacing) + 2;

    // calculate number of ticks to have spacing align with endpoints
    const numTicksForSpacing = numTicks - 1;

    // calculate distance between ticks in label units (e.g. .66 for 2 internal
    // ticks w/ graph of signal of duration 2 seconds along time axis)
    const labelSpacing = tickMax / numTicksForSpacing;

    // calculate distance between ticks in axis units (e.g. 40 for 2 internal
    // ticks w/ graph of 120 points along given axis)
    const tickSpacing = Math.floor(axisMax / numTicksForSpacing);

    const tickLocs = [...new Array(numTicks)].map((_, i) => i*tickSpacing);
    const tickLabels = tickLocs
        .map((_, i) => i*labelSpacing)
        .map(l => l.toFixed(3));

    return [tickLocs, tickLabels];
}

/**
 * Generate a density measure given a list of indices
 *
 * @name histogramConversion
 * @function
 * @param {number[]} indices - TF indices corresponding to spectrogram points
 * @returns {number} histogram density measure
 */

/**
 * Map a conversion function over a 2D PCA matrix
 *
 * @param {number[][][]} - a 2D matrix where each coordinate holds a list of
 *     numbers corresponding to the TF indices of the spectrogram which belong
 *     to that PCA bin
 * @param {histogramConversion} [converter] - generates a density measure for each
 *     coordinate
 * @returns {number[][]} generated histogram
 */
function convertMatrixToHistogram(
    pca,
    converter = (inds) => Math.log(inds.length + 1)
) {
    return pca.map(row => row.map(converter));
}

resizeToContainer = (plot) =>
    Plotly.relayout(plot.divID, { width: plot.DOMObject.width() });


function addPoundToId(id) {
    return id[0] === '#' ? id : `#${id}`;
}


/**
 * Prepend DOM element/class/etc. w/ prefix (if it does not already start w/
 * that prefix)
 *
 * TODO: make prefix an enum
 *
 * @param {string} name - name of DOM element/class/etc. to prepend with prefix
 * @param {string} [prefix='#'] - prefix to prepend
 * @returns {string} given string guaranteed to start with prefix
 */
function makeSelector(name, prefix='#') {
    return name[0] === prefix ? name : `${prefix}${name}`;
}

/**
 * Remove prefix from front of string if it starts with prefix
 *
 * @param {string} id - id to remove prefix from
 * @returns {string} given string w/o leading prefix
 */
function removeSelector(id, prefix='#') {
    return id[0] === prefix ? id.slice(1) : id;
}
