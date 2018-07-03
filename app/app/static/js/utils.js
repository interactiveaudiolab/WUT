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

function truncateFloat(val, trunc) { return Number(val.toFixed(trunc)); }

function getLastObject(obj) {
    // Fancy little one liner to get the LAST object in a JS obj
    // from https://stackoverflow.com/a/16590272/5768001
    return obj[Object.keys(obj)[Object.keys(obj).length - 1]];
}

function getLastItemInArray(arr) { return arr[arr.length - 1]; }

// Fancy little one liner to get the FIRST object in a JS obj
function getFirstObject(obj) { return obj[Object.keys(obj)[0]]; }

function numberOfRegions() { return objectLength(mixture_waveform.regions.list); }

function objectLength(obj) { return Object.keys(obj).length; }

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

function findClosestIndexInSortedArray(sortedArray, target) {
    if (!(sortedArray) || sortedArray.length === 0) return null;
    if (sortedArray.length === 1) return arr[0];

    var i = 1;
    for (; i < sortedArray.length; i++) {
        if (sortedArray[i] > target) {
            var p = sortedArray[i-1];
            var c = sortedArray[i];
            return Math.abs( p-target ) < Math.abs( c-target ) ? i-1 : i;
        }
    }

    return i;
}

function generateTicks(xaxisRange, duration) {
    // choose ~200px as spacing between ticks
    let prelimNumTicks = Math.floor(xaxisRange / 100);
    let timeSpacing = Math.floor(duration / prelimNumTicks);

    // number of whole number spacings in time domain that fit
    let actualNumTicks = Math.floor(duration / timeSpacing);

    let tickVals = [...new Array(actualNumTicks)].map((_, i) => i*timeSpacing);
    let tickLocs = tickVals.map(val => Math.floor(xaxisRange * (val/duration)));
    let tickText = tickVals.map(val => val.toString());

    return [tickLocs, tickText];
}

// converts matrix of index lists to matrix of density values for plotting
pcaMatrixToHistogram = (pca) => pca.map(row => row.map(inds => Math.log(inds.length + 1)));

resizeToContainer = (plot) => Plotly.relayout(plot.divID, { width: plot.DOMObject.width() });