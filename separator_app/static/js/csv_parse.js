
var baseConfigCSV = {
    download: true,
    worker: true,
    dynamicTyping: true,
    header: true,
    error: logError

};

function logError(err, file) {
    console.log("ERROR:", err, file);
}

function papaParseSpecCsv(data) {
    var result = [];
    $.each(data, function(i, val) { result.push(Object.values(val)); });
    return result;
}

// function convertNumbers(row) {
//   var r = {};
//   for (var k in row) {
//     r[k] = +row[k];
//     if (isNaN(r[k])) {
//       r[k] = row[k];
//     }
//   }
//   return r;
// }

function d3ParseCsv(data) {
    var result = [];
    $.each(data, function(i, arr) {
        let row = [];
        $.each(Object.values(arr), function(j, val) {
            row.push(+val);
        });
        result.push(row);
    });
    return result;
}