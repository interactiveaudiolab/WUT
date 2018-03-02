
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

function truncateFloat(val, trunc) {
    return Number(val.toFixed(trunc));
}

function getLastObject(obj) {
    // Fancy little one liner to get the LAST object in a JS obj
    // from https://stackoverflow.com/a/16590272/5768001
    return obj[Object.keys(obj)[Object.keys(obj).length - 1]];
}

function getLastItemInArray(arr) {
    return arr[arr.length - 1];
}

function getFirstObject(obj) {
    // Fancy little one liner to get the FIRST object in a JS obj
    return obj[Object.keys(obj)[0]];
}

function numberOfRegions() {
    return objectLength(mixture_waveform.regions.list);
}

function objectLength(obj) {
    return Object.keys(obj).length;
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

function findClosestIndexInSortedArray(sortedArray, target) {
    if (!(sortedArray) || sortedArray.length === 0)
        return null;
    if (sortedArray.length === 1)
        return arr[0];

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

// Add "{0} is dead, but {1} is alive! {0} {2}".format("ASP", "ASP.NET") formatting
// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) {
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}