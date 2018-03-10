let SelectionType = {
    // Enum
    Box: 1,
    Lasso: 2
};

class Selection {
    constructor(type) {
        this.type = type;
        this.dataType = this.constructor.name;
    }
}

class BoxSelection extends Selection {
    constructor(range) {
        super(SelectionType.Box);
        this.dataType = this.constructor.name;
        this.actionId = ''; // TODO: make IDs for actions

        this.xStart = range.x[0];
        this.xEnd = range.x[1];

        this.yStart = range.y[0];
        this.yEnd = range.y[1];
    }

    get isEmpty() {
        return this.xStart !== null && this.xEnd !== null && this.yStart !== null && this.yEnd !== null;
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
}

class LassoSelection extends Selection {
    constructor(xTicks, yTicks) {
        super(SelectionType.Lasso, xTicks, yTicks);
    }

    get isEmpty() { return true; }
}