
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

function parseSpecCsv(data) {
    var result = [];
    $.each(data, function(i, val) { result.push(Object.values(val)); });
    return result;
}