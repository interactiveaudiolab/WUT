// 'use strict';

let SelectionType = {
    // Enum
    Box: 1,
    Lasso: 2
};

class Selection {

    constructor(type) {
        this.type = type;
        this.dataType = this.constructor.name;
        // this.xTicks = xTicks;
        // this.yTicks = yTicks;

    }

    // isValid() {
    //     throw Exception;
    // };


}

class BoxSelection extends Selection {

    constructor(xTicks, yTicks, range) {
        super(SelectionType.Box);
        this.dataType = this.constructor.name;
        this.actionId = ''; // TODO: make IDs for actions

        this.xStart = range.x[0];
        this.xStartIdx = null;

        this.xEnd = range.x[1];
        this.xEndIdx = null;

        this.yStart = range.y[0];
        this.yStartIdx = null;

        this.yEnd = range.y[1];
        this.yEndIdx = null;

        this.timeConvertedToIndices = false;
        // this._convertTimesToIndices(xTicks, yTicks);
    }

    get isEmpty() {
        return this.xStart !== null && this.xEnd !== null && this.yStart !== null && this.yEnd !== null;
    }

    // get isValid() {
    //     return this.isEmpty();
    // }

    _convertTimesToIndices (xTicks, yTicks) {
        // Potentially have xTicks and yTicks passed in here to save storing them for every selection?
        this.xStartIdx = findClosestIndexInSortedArray(xTicks, this.xStart);
        this.xEndIdx = findClosestIndexInSortedArray(xTicks, this.xEnd);
        this.yStartIdx = findClosestIndexInSortedArray(yTicks, this.yStart);
        this.yEndIdx = findClosestIndexInSortedArray(yTicks, this.yEnd);
        this.timeConvertedToIndices = true;
    }

    data() {
        return {
            dataType: this.dataType,
            data: {
                xStart: this.xStart,
                xEnd: this.xEnd,
                yStart: this.yStart,
                yEnd: this.yEnd
            }
        }
    }
    // TODO: Figure out generator syntax

    // valuesInSelection[Symbol.Iterator] = function() {
    //     // Loop through
    //     let xIdx = 0; // x-axis index
    //     let yIdx = 0; // y-axis index
    //     let finished = false;
    //
    //     if (!this.timeConvertedToIndices) {
    //         this.convertTimesToIndices();
    //     }
    //
    //     return {
    //         next: function() {
    //             finished = yIdx >= this.yEndIdx;
    //             xIdx = xIdx >= this.xEndIdx ? 0 : xIdx;
    //
    //             return {
    //                 value: {x: xIdx++, y: yIdx++},
    //                 done: finished
    //             }; // inner return
    //         } // next
    //
    //     } // outer return
    //
    // } // valuesInSelection

    // function *valuesInSelection() {
    //     if (this.isEmpty()) {
    //         throw Exception;
    //     }
    //
    //     if (!this.timeConvertedToIndices) {
    //         this.convertTimesToIndices();
    //     }
    //
    //     for (let yIdx = this.yStartIdx; yIdx <= this.yEndIdx; yIdx++) {
    //         for (let xIdx = this.xStartIdx; xIdx <= this.xEndIdx; xIdx++) {
    //             yield {y: yIdx, x: xIdx};
    //         }
    //     }
    //
    // }

} // BoxSelection class

class LassoSelection extends Selection {

    constructor(xTicks, yTicks) {
        super(SelectionType.Lasso, xTicks, yTicks);


    }

    get isEmpty() {
        return true;
    }
}