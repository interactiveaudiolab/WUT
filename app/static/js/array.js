Array.matrix = function(numrows, numcols, initial){
   var arr = [];
   for (var i = 0; i < numrows; ++i){
      var columns = [];
      for (var j = 0; j < numcols; ++j){
         columns[j] = initial;
      }
      arr[i] = columns;
    }
    return arr;
};

function zeros_like(array) {
	return Array.matrix(array.length, array[0].length, 0.0);
}

function zeros(numrows, numcols){
	return Array.matrix(numrows, numcols, 0.0);
}

function abs_matrix(mat) {
    var magnitude = zeros_like(mat);
    
    for (var row = 0; row < mat.length; ++row){
        for (var col = 0; col < mat[row].length; ++col){
            magnitude[row][col] = Math.abs(mat[row][col]);
        }
    }
    
    return magnitude;
}

var reverse_range = function(a, b) {
	return range(a,b).reverse();
};

var range = function(a, b) {
  var d = [];
  var c = b - a + 1;
  while (c--) {
    d[c] = b--
  }
  return d;
};

function add_matrix(mat1, mat2) {
	var row_small = mat1.length < mat2.length ? mat1.length : mat2.length;
	var col_small = mat1[0].length < mat2[0].length ? mat1[0].length : mat2[0].length;
    var result = zeros_like(mat1);
    
    for (var row = 0; row < row_small; ++row){
        for (var col = 0; col < col_small; ++col){
            result[row][col] = mat1[row][col] + mat2[row][col];
        }
    }
    
    return result;
}

function transpose(a)
{
  return a[0].map(function (_, c) { return a.map(function (r) { return r[c]; }); });
}


function minMax2D(a) {
    var min, max;
    a.forEach(function(itm) {
        itm.forEach(function(itmInner) {
            min = (min === undefined || itmInner < min) ? itmInner : min;
            max = (max === undefined || itmInner > max) ? itmInner : max;
        });
    });

    return {min: min, max: max};
}

function squareTypedArray(array) {
    array.forEach(function (elt, idx, arr) {
        arr[idx] = elt * elt;
    });
    return array;
}

function add_arrays(arr1, arr2) {
    return arr1.map(function(a, i) {
        return a + arr2[i];
    });
}

function mvg_avg_derivative(array, n) {
    var mvg_avg = [];
    for (var i = 0; i < array.length - n; ++i) {
        var sum = 0;
        for (var j = 0; j < n; ++ j) {
            sum += array[i + j];
        }
        mvg_avg.push(sum)
    }

    var result = [];
    for (i = 1; i < array.length; ++i) {
        result.push(mvg_avg[i] - mvg_avg[i - 1]);
    }

    return result.filter(function (value) {
        return !Number.isNaN(value);
    });
}