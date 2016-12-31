// TODO LIST:
// 1 - Implement candle lighting algorithm so the ushers actually light the other candles
// 2 - Implement Grid Assessment mode for smarter usher navigation

class Candle {
    constructor() {
        this.isLit = false;
    }
}
Candle.candleSecondsMin = {
    parameter_name: "Minimum",
    description: "Minimum time in seconds that it should take to light a candle.",
    default: 3,
};
Candle.candleSecondsMax = {
    parameter_name: "Maximum",
    description: "Maximum time in seconds that it should take to light a candle.",
    default: 5,
};

class AbstractGridLocation {
    constructor(i, j, center) {
        this.repr = "fa fa-fw" + AbstractGridLocation.getRotationForPosition(i, j, center);
        this.i = i;
        this.j = j;
        this.isEmptySpace = false;
        this.isMobile = false;
    }

    static getRotationForPosition(i, j, center) {
        if (_.isUndefined(center)) {
            return "";
        }
        let iDelta = Math.abs(i - center);
        let jDelta = Math.abs(j - center);
        if (i < center && jDelta < iDelta) {
            return "";
        }
        else if (j > center && iDelta < jDelta) {
            return " fa-rotate-90";
        }
        else if (i > center && jDelta < iDelta) {
            return " fa-rotate-180";
        }
        else if (j < center && iDelta < jDelta) {
            return " fa-rotate-270";
        }
        else {
            return "";
        }
    }
}

class Person extends AbstractGridLocation {
    constructor(i, j, center) {
        super(i, j, center);
        this.repr += " fa-fire candle";
        this.candle = new Candle();
        this.orientation = Person.getOrientationForPosition(i, j, center);
    }

    passFlame(runnerFunction) {
        if (this.orientation === "vertical") {
            let iValues = [this.i + 1, this.i - 1];
            iValues.forEach((i) => {
                runnerFunction(i, this.j);
            });
        }
        else if (this.orientation === "horizontal") {
            let jValues = [this.j + 1, this.j - 1];
            jValues.forEach((j) => {
                runnerFunction(this.i, j);
            });
        }
        else {
            throw new Error(`Unknown orientation ${this.orientation} for Person ${this.i}-${this.j}`);
        }
    }

    // Ractive did *not* like when the AbstractGridLocation static method returned an object
    // with both orientation and roation class
    static getOrientationForPosition(i, j, center) {
        if (_.isUndefined(center)) {
            return "";
        }
        let iDelta = Math.abs(i - center);
        let jDelta = Math.abs(j - center);
        if (i < center && jDelta < iDelta) {
            return "horizontal";
        }
        else if (j > center && iDelta < jDelta) {
            return "vertical";
        }
        else if (i > center && jDelta < iDelta) {
            return "horizontal";
        }
        else if (j < center && iDelta < jDelta) {
            return "vertical";
        }
        else {
            return "none";
        }
    }
}

class EmptySpace extends AbstractGridLocation {
    constructor(i, j) {
        super(i, j);
        this.isEmptySpace = true;
    }
}

class Usher extends AbstractGridLocation {
    constructor(i, j, id, runner) {
        super(i, j);
        this.repr += " fa-user candle";
        this.id = id;
        this.runner = runner;
        this.candle = new Candle();
        this.origin = {i: i, j: j};
        this.isMobile = true;
        this.patience = 0;
        this.movementMinSeconds = Usher.usherSecondsMin.default;
        this.movementMaxSeconds = Usher.usherSecondsMax.default;
    }

    mainLoop() {
        main_loop:
        try {
            if (this.getMe().candle.isLit) {
                this.lightCandlesOnAisle();
            }
            else {
                this.lightCandle();
            }
        }
        catch (e) {
            break main_loop;
        }
    }

    getMe() {
        if (_.isUndefined(this.runner)) {
            throw new Error(`Usher ${this.id} accessed undefined runner in getMe`);
        }
        else {
            return this.runner.ractive.get(`ushers.${this.id}`);
        }
    }

    getAttr(attr) {
        if (_.isUndefined(this.runner)) {
            throw new Error(`Usher ${this.id} accessed undefined runner in getAttr (${attr})`);
        }
        else {
            return this.runner.ractive.get(attr);
        }
    }

    getAisleStartLocation() {
        let center = this.runner.ractive.get("center");
        let origin = this.origin;
        let iDelta = center - origin.i;
        let jDelta = center - origin.j;
        let i = Math.abs(iDelta - Math.ceil(SeatingGrid.frontRowLength / 2));
        let j = Math.abs(jDelta - Math.ceil(SeatingGrid.frontRowLength / 2));

        if (iDelta === 0) {
            return {i: origin.i, j: j}
        }
        else if (jDelta === 0) {
            return {i: i, j: origin.j}
        }
        else {
            return {i: i, j: j};
        }
    }

    lightCandle() {
        if (this.getMe().isUsherAtCenterCandle()){
            // runner assumed to exist if getMe() worked
            this.runner.lightUsherCandle(`ushers.${this.id}`, this.id);
        }
        else {
            let center = this.getAttr("center");
            this.goToDestination(center + 1, center, () => {
                this.lightCandle();
            });
        }
    }

    isUsherAtCenterCandle() {
        // Ushers must light candle at point (center + 1, center), e.g. right below it on the grid
        let center = this.getAttr("center");
        let absValI = Math.abs(center + 1 - this.i);
        let absValJ = Math.abs(center - this.j);
        return absValI === 0 && absValJ === 0;
    }

    goToDestination(iDestination, jDestination, actionAtTarget) {
        // iDestination and jDestination refer to the i and j values of the ultimate target destination
        // iTarget and jTarget refer to the i and j values of the immediate/next target grid location
        if (this.i === iDestination && this.j === jDestination) {
            actionAtTarget();
        }
        else {
            let mode = this.getAttr("selectedMode.id");
            switch(mode) {
                case "oneBlindMove":
                    this.doOneBlindMove(iDestination, jDestination);
                    break;
                case "gridAssessment":
                    this.assessGrid(iDestination, jDestination);
                    break;
                default:
                    this.assessGrid(iDestination, jDestination);
            }
        }
    }

    assessGrid(iDestination, jDestination) {
        let grid = this.getAttr("grid");
        console.log(`Usher ${this.id} is now in Grid Assessment mode`);
        throw new Error("Mode not implemented");
    }

    getMoveVector(iDestination, jDestination) {
        // iVector and jVector will always evaluate to -1, 0, or 1
        // Ushers can only move 1 unit at a time, so this tells us
        // if the usher would ideally prefer to move vertically,
        // horizontally, or on a diagonal
        let iVector = 0;
        let jVector = 0;
        if (iDestination - this.i !== 0) {
            iVector = (iDestination - this.i) / Math.abs(iDestination - this.i);
        }
        if (jDestination - this.j !== 0) {
            jVector = (jDestination - this.j) / Math.abs(jDestination - this.j);
        }
        return {i: iVector, j: jVector};
    }

    getEuclideanVectorToTarget(iTarget, jTarget) {
        // iTarget/jTarget here have nothing to do with immediately accessible moves as in other contexts
        let center = this.runner.ractive.get("center");
        let x = this.j - center;
        let y = center - this.i;
        let xDestination = jTarget - center;
        let yDestination = center - iTarget;
        return {x: xDestination - x, y: yDestination - y};
    }

    doOneBlindMove(iDestination, jDestination) {
        let grid = this.getAttr("grid");

        let moveVector = this.getMoveVector(iDestination, jDestination);
        let iVector = moveVector.i;
        let jVector = moveVector.j;
        let iMagnitude = Math.abs(iVector);
        let jMagnitude = Math.abs(jVector);

        let iTarget = this.i + iVector;
        let jTarget = this.j + jVector;

        // Ideal move in the direction of the destination
        if (grid[iTarget][jTarget].isEmptySpace) {
            this.move(iTarget, jTarget);
        }
        // If blocked by another usher, wait a few rounds to keep retrying ideal move
        else if (grid[iTarget][jTarget].isMobile && this.patience < 10) {
            // just queue up another attempt later b/c the Usher may move
            this.patience += 1;
            setTimeout(() => {
                this.mainLoop();
            });
        }
        // Then proceed to try non-ideal moves
        // If ideal move was diagonal:
        else if (iMagnitude === 1 && jMagnitude === 1) {
            // Attempt vertical/horizontal moves in the intended direction
            if (grid[iTarget][this.j].isEmptySpace) {
                this.move(iTarget, this.j);
            }
            else if (grid[this.i][jTarget].isEmptySpace) {
                this.move(this.i, jTarget);
            }
            // Attempt lateral diagonal moves by going the wrong way in 1 direction
            else if (grid[iTarget][this.j - jVector]) {
                this.move(iTarget, this.j - jVector);
            }
            else if (grid[this.i - iVector][jTarget].isEmptySpace) {
                this.move(this.i - iVector, jTarget);
            }
            // Attempt vertical/horizontal moves in the wrong direction
            else if (grid[this.i][this.j - jVector].isEmptySpace) {
                this.move(this.i, this.j - jVector);
            }
            else if (grid[this.i - iVector][this.j].isEmptySpace) {
                this.move(this.i - iVector, this.j);
            }
            // Go in the exact opposite direction
            else if (grid[this.i - iVector][this.j - jVector].isEmptySpace) {
                this.move(this.i - iVector, this.j - jVector);
            }
            // Or just sit still
            else {
                this.move(this.i, this.j);
            }
        }
        // If ideal move was horizontal:
        else if (iMagnitude === 0 && jMagnitude === 1) {
            // Attempt diagonal moves in the intended direction
            if (grid[this.i - 1][jTarget].isEmptySpace) {
                this.move(this.i - 1, jTarget);
            }
            else if (grid[this.i + 1][jTarget].isEmptySpace) {
                this.move(this.i + 1, jTarget);
            }
            // Attempt vertical moves
            else if (grid[this.i - 1][this.j].isEmptySpace) {
                this.move(this.i - 1, this.j);
            }
            else if (grid[this.i + 1][this.j].isEmptySpace) {
                this.move(this.i + 1, this.j);
            }
            // Attempt diagonal moves in the wrong direction
            else if (grid[this.i - 1][this.j - jVector].isEmptySpace) {
                this.move(this.i - 1, this.j - jVector);
            }
            else if (grid[this.i + 1][this.j - jVector].isEmptySpace) {
                this.move(this.i + 1, this.j - jVector);
            }
            // Go in the exact opposite direction
            else if (grid[this.i][this.j - jVector].isEmptySpace) {
                this.move(this.i, this.j - jVector);
            }
            // Or just sit still
            else {
                this.move(this.i, this.j);
            }
        }
        // If ideal move was vertical:
        else if (iMagnitude === 1 && jMagnitude === 0) {
            // Attempt diagonal moves in intended direction
            if (grid[iTarget][this.j + 1].isEmptySpace) {
                this.move(iTarget, this.j + 1);
            }
            else if (grid[iTarget][this.j - 1].isEmptySpace) {
                this.move(iTarget, this.j - 1);
            }
            // Attempt horizontal moves
            else if (grid[this.i][this.j + 1].isEmptySpace) {
                this.move(this.i, this.j + 1);
            }
            else if (grid[this.i][this.j - 1].isEmptySpace) {
                this.move(this.i, this.j - 1);
            }
            // Attempt diagonal moves in the wrong direction
            else if (grid[this.i - iVector][this.j + 1].isEmptySpace) {
                this.move(this.i - iVector, this.j + 1);
            }
            else if (grid[this.i - iVector][this.j - 1].isEmptySpace) {
                this.move(this.i - iVector, this.j - 1);
            }
            // Go in the exact opposite direction
            else if (grid[this.i - iVector][this.j].isEmptySpace) {
                this.move(this.i - iVector, this.j);
            }
            // Or just sit still
            else {
                this.move(this.i, this.j);
            }
        }
        else if (iMagnitude === 0 && jMagnitude === 0) {
            this.move(iTarget, jTarget);
        }
        else {
            throw new Error(`Invalid magnitude calculation for movement of Usher ${this.id}`);
        }
    }

    move(iTarget, jTarget) {
        if (_.isUndefined(this.runner)) {
            throw new Error(`Usher ${this.id} accessed undefined runner during move attempt`);
        }
        else {
            this.runner.moveUsher(this.id, iTarget, jTarget);
            this.patience = 0;
        }
    }


    lightCandlesOnAisle() {
        let center = this.runner.ractive.get("center");
        let grid = this.runner.ractive.get("grid");

        // so this might be overkill for this project, but it was fun to figure out the matrix-to-Euclidean conversion
        let vectorToOrigin = this.getEuclideanVectorToTarget(this.origin.i, this.origin.j);
        let vectorToCenter = this.getEuclideanVectorToTarget(center, center);
        let angleToOrigin = (Math.atan2(vectorToOrigin.y, vectorToOrigin.x) * 180) / Math.PI;
        let angleToCenter = (Math.atan2(vectorToCenter.y, vectorToCenter.x) * 180) / Math.PI;
        let distanceToCenter = Math.sqrt(Math.pow(vectorToCenter.x, 2) + Math.pow(vectorToCenter.y, 2));

        let isUsherOnAisle = Math.abs(angleToCenter - angleToOrigin) === 180;
        let isUsherInCenterSection = distanceToCenter < Math.ceil(SeatingGrid.frontRowLength / 2);
        let isUsherOnOrigin = this.i === this.origin.i && this.j === this.origin.j;

        if ((!isUsherOnAisle || isUsherInCenterSection) && !isUsherOnOrigin) {
            this.goToDestination(this.getAisleStartLocation().i, this.getAisleStartLocation().j, () => {
            this.lightCandlesOnAisle();
        });
        }
        else if (this.i === center) {
            this.lightCandlesUpDown(grid);
        }
        else if (this.j === center) {
            this.lightCandlesLeftRight(grid);
        }
        else {
            this.lightCandlesDiagonal(grid, center);
        }
    }

    lightCandlesUpDown(grid) {
        if (_.isObject(grid[this.i + 1][this.j].candle) && !grid[this.i + 1][this.j].candle.isLit) {
            this.runner.lightPersonCandle(this.i+1, this.j, this.id);
        }
        else if (_.isObject(grid[this.i - 1][this.j].candle) && !grid[this.i - 1][this.j].candle.isLit) {
            this.runner.lightPersonCandle(this.i-1, this.j, this.id);
        }
        else if (this.i === this.origin.i && this.j === this.origin.j) {
            console.log(`Usher ${this.id} is done!`);
        }
        else {
            let iVector = this.getMoveVector(this.origin.i, this.origin.j).i;
            let jVector = this.getMoveVector(this.origin.i, this.origin.j).j;
            this.move(this.i + iVector, this.j + jVector);
        }
    }

    lightCandlesLeftRight(grid) {
        if (_.isObject(grid[this.i][this.j + 1].candle) && !grid[this.i][this.j + 1].candle.isLit) {
            this.runner.lightPersonCandle(this.i, this.j+1, this.id);
        }
        else if (_.isObject(grid[this.i][this.j - 1].candle) && !grid[this.i][this.j - 1].candle.isLit) {
            this.runner.lightPersonCandle(this.i, this.j-1, this.id);
        }
        else if (this.i === this.origin.i && this.j === this.origin.j) {
            console.log(`Usher ${this.id} is done!`);
        }
        else {
            let iVector = this.getMoveVector(this.origin.i, this.origin.j).i;
            let jVector = this.getMoveVector(this.origin.i, this.origin.j).j;
            this.move(this.i + iVector, this.j + jVector);
        }
    }

    lightCandlesDiagonal(grid, center) {
        let iVectorToCenter = this.getMoveVector(center, center).i;
        let jVectorToCenter = this.getMoveVector(center, center).j;

        let i1 = this.i + iVectorToCenter;
        let j1 = this.j;
        let i2 = this.i;
        let j2 = this.j + jVectorToCenter;

        if ((_.isObject(grid[i1][j1].candle) && !grid[i1][j1].candle.isLit)) {
            this.runner.lightPersonCandle(i1, j1, this.id);
        }
        else if ((_.isObject(grid[i2][j2].candle) && !grid[i2][j2].candle.isLit)) {
            this.runner.lightPersonCandle(i2, j2, this.id);
        }
        else if ((this.i === this.origin.i && this.j === this.origin.j)) {
            console.log(`Usher ${this.id} is done!`);
        }
        else {
            let iVectorToOrigin = this.getMoveVector(this.origin.i, this.origin.j).i;
            let jVectorToOrigin = this.getMoveVector(this.origin.i, this.origin.j).j;
            this.move(this.i + iVectorToOrigin, this.j + jVectorToOrigin);
        }
    }
}
Usher.usherSecondsMin = {
    parameter_name: "Minimum",
    description: "Global minimum value for interval between an usher's movements.",
    default: 0.5,
};
Usher.usherSecondsMax = {
    parameter_name: "Maximum",
    description: "Global maximum value for interval between an usher's movements.",
    default: 1.5,
};


class SeatingGrid {
    constructor(size) {
        this.size = size;
        if (this.size < SeatingGrid.minimumSize || this.size % 2 === 0) {
            throw new Error(`Size must be greater than ${SeatingGrid.minimumSize}`);
        }
        if (this.size % 2 == 0) {
            this.size += 1;
        }
        this.center = Math.floor(size/2);
        this.grid = [];
        this.numOfCandlesToLight = 0;

        // Configure starting grid
        for (let i = 0; i < size; i++) {
            this.grid.push([]);
            for (let j = 0; j < size; j++) {
                if (i === this.center && j === this.center) {
                    this.grid[i].push(new Person(i,j,this.center));
                    this.grid[i][j].candle.isLit = true;
                }
                else if (this.isOpenSpace(i, j)) {
                    this.grid[i].push(new EmptySpace(i,j));
                }
                else {
                    this.grid[i].push(new Person(i,j,this.center));
                    this.numOfCandlesToLight += 1;
                }
            }
        }
    }

    isOpenSpace(i, j) {
        return this.isNearCenter(i, j) || this.isWalkway(i, j);
    }

    isNearCenter(i, j) {
        let absValI = Math.abs(i - this.center);
        let absValJ = Math.abs(j - this.center);
        let qLimit = Math.floor(SeatingGrid.frontRowLength / 2); // quadrant distance limit
        if (absValI <= qLimit && absValJ <= qLimit) {
            return true;
        }
        else {
            return false;
        }
    }

    isWalkway(i, j) {
        let absValI = Math.abs(i - this.center);
        let absValJ = Math.abs(j - this.center);
        if (i === this.center || j === this.center || absValI === absValJ) {
            return true;
        }
        else {
            return false;
        }
    }
}
SeatingGrid.frontRowLength = 7;
SeatingGrid.minimumSize = SeatingGrid.frontRowLength + 2;
SeatingGrid.maximumSize = 101;
SeatingGrid.size = {
    parameter_name: "Seating Grid Size",
    description: "Sets the size N of the N x N square layout.  "+
        "9 <= N <= 101",
    default: 25,
};


class SimulationRunner {
    constructor() {
        this.runId = 0;

        // Ractive configuration
        this.ractive = new Ractive({
            el: "#candles-simulation",
            template: "#candles-template",
            data: {
                size: SeatingGrid.size.default,
                selectedMode: SimulationRunner.mode.default,
                globalSpeed: SimulationRunner.globalSpeed.default,
                candleSecondsMin: Candle.candleSecondsMin.default,
                candleSecondsMax: Candle.candleSecondsMax.default,
                usherSecondsMin: Usher.usherSecondsMin.default,
                usherSecondsMax: Usher.usherSecondsMax.default,
            },
            computed: {
                center: 'Math.floor(${size}/2)',
            }
        })

        this.ractive.on('resetSimulation', (event) => {
            _.keys(this.ractive.get("ushers")).forEach((usherId) => {
                // detach old ushers from SimulationRunner
                this.ractive.set(`ushers.${usherId}.candle`, undefined);
                this.ractive.set(`ushers.${usherId}.runner`, undefined);
                this.ractive.set(`ushers.${usherId}`, undefined);

            });
            this.newSimulation();
        });

        this.ractive.on('resetGlobalUsherTiming', (event) => {
            this.ractive.set("usherSecondsMin", Usher.usherSecondsMin.default);
            this.ractive.set("usherSecondsMax", Usher.usherSecondsMax.default);
            _.keys(this.ractive.get("ushers")).forEach((usherId) => {
                this.ractive.set(`ushers.${usherId}.movementMinSeconds`, Usher.usherSecondsMin.default);
                this.ractive.set(`ushers.${usherId}.movementMaxSeconds`, Usher.usherSecondsMax.default);
            });
        });

        this.ractive.on('setGlobalUsherMin', (event) => {
            let min = this.ractive.get("usherSecondsMin");
            _.keys(this.ractive.get("ushers")).forEach((usherId) => {
                this.ractive.set(`ushers.${usherId}.movementMinSeconds`, min);
            });
        });

        this.ractive.on('setGlobalUsherMax', (event) => {
            let max = this.ractive.get("usherSecondsMax");
            _.keys(this.ractive.get("ushers")).forEach((usherId) => {
                this.ractive.set(`ushers.${usherId}.movementMaxSeconds`, max);
            });
        });

        this.ractive.on('resetCandleTiming', (event) => {
            this.ractive.set("candleSecondsMin", Candle.candleSecondsMin.default);
            this.ractive.set("candleSecondsMax", Candle.candleSecondsMax.default);
        });

        this.newSimulation();
    }

    newSimulation() {
        this.runId += 1;

        let modes = {
            "oneBlindMove": {id: "oneBlindMove", display: "One Blind Move"},
            "gridAssessment": {id: "gridAssessment", display: "Grid Assessment (Not Implemented)"},
        }
        let mode = this.ractive.get("selectedMode.id");

        let globalSpeeds = {
            1: {value: 1, display: "1x"},
            2: {value: 2, display: "2x"},
            4: {value: 4, display: "4x"},
            8: {value: 8, display: "8x"},
        }
        let globalSpeed = parseInt(this.ractive.get("globalSpeed"));
        let candleSecondsMin = Number(this.ractive.get("candleSecondsMin"));
        let candleSecondsMax = Number(this.ractive.get("candleSecondsMax"));
        let usherSecondsMin = Number(this.ractive.get("usherSecondsMin"));
        let usherSecondsMax = Number(this.ractive.get("usherSecondsMax"));


        let requestedSize = Number(this.ractive.get("size"));
        // size must be odd
        // an odd number has % 2 == 1; add !(1) which is 0 to leave it alone
        // an even number has % 2 == 0; add !(0) which is 1 to make it odd
        let size = requestedSize + !(requestedSize % 2);
        if (size < SeatingGrid.minimumSize) {
            size = SeatingGrid.minimumSize;
        }
        else if (size > SeatingGrid.maximumSize) {
            size = SeatingGrid.maximumSize;
        }
        let seatingGrid = new SeatingGrid(size);

        this.ractive.reset({
            size: seatingGrid.size,
            grid: seatingGrid.grid,
            numOfCandlesToLight: seatingGrid.numOfCandlesToLight,
            ushers: {},
            modes: modes,
            selectedMode: modes[mode],
            globalSpeeds: globalSpeeds,
            globalSpeed: globalSpeed,
            candleSecondsMin: candleSecondsMin,
            candleSecondsMax: candleSecondsMax,
            usherSecondsMin: usherSecondsMin,
            usherSecondsMax: usherSecondsMax,
            parameters: {
                // These are the *default* objects from class definitions
                // used to create the popovers on the control panel.
                // Top level attributes set the actual values being used.
                size: SeatingGrid.size,
                globalSpeed: SimulationRunner.globalSpeed,
                mode: SimulationRunner.mode,
                candleSecondsMin: Candle.candleSecondsMin,
                candleSecondsMax: Candle.candleSecondsMax,
                candleSecondsDefaults: `Min: ${Candle.candleSecondsMin.default} | Max: ${Candle.candleSecondsMax.default}`,
                usherSecondsMin: Usher.usherSecondsMin,
                usherSecondsMax: Usher.usherSecondsMax,
                usherSecondsDefaults: `Min: ${Usher.usherSecondsMin.default} | Max: ${Usher.usherSecondsMax.default}`,
            }
        })
        let center = this.ractive.get("center");
        for (let i = 0; i < size; i += center) {
            for (let j = 0; j < size; j += center) {
                if (!(i === center && j === center)) {
                    let id = 10 * this.runId + _.keys(this.ractive.get("ushers")).length;
                    let usher = new Usher(i, j, id, this);
                    this.ractive.set(`ushers.${id}`, usher);
                    this.ractive.set(`grid.${i}.${j}`, usher);
                }
            }
        }

        this.ractive.fire("setGlobalUsherMin");
        this.ractive.fire("setGlobalUsherMax");

        this.run();
    }

    run() {
        _.shuffle(_.keys(this.ractive.get("ushers"))).forEach((usherId) => {
            let usher = this.ractive.get(`ushers.${usherId}`);
            setTimeout(() => {
                usher.mainLoop();
            }, this.getMillisecondsForUsherMovement(usher.id));
        });
    }

    doNextStep(usherId) {
        setTimeout(() => {
            let usher = this.ractive.get(`ushers.${usherId}`);
            if (_.isObject(usher) && _.isFunction(usher.mainLoop)) {
                try {
                    usher.mainLoop();
                }
                catch (e) {
                    // This should never execute but the 2 checks are
                    // needed as there seems to be some delay/mistiming
                    // in the un-defining and garbage collection of the
                    // usher objects.  Without the _.isFunction(usher.mainLoop))
                    // check the following console.log(usher) will sometimes
                    // log an object with only the remnants of a candle.
                    console.error(e);
                    console.log(usher);
                }
            }
        }, this.getMillisecondsForUsherMovement(usherId));
    }

    moveUsher(usherId, iTarget, jTarget, attempts) {
        // move usher to location (i,j)
        let usher = this.ractive.get(`ushers.${usherId}`);
        let isEmptySpace = this.ractive.get(`grid.${iTarget}.${jTarget}.isEmptySpace`);
        if (usher.i === iTarget && usher.j === jTarget) {
            console.debug(`Usher ${usherId} has decided to not move`);
            setTimeout(() => {
                usher.mainLoop();
            }, this.getMillisecondsForUsherMovement(usherId));
        }
        else if (iTarget - usher.i > 1 || jTarget - usher.j > 1) {
            throw new Error(`Usher ${usherId} has submitted an invalid move`);
        }
        else if (isEmptySpace) {
            let i = usher.i;
            let j = usher.j;
            this.ractive.set(`ushers.${usherId}.i`, iTarget);
            this.ractive.set(`ushers.${usherId}.j`, jTarget);
            this.ractive.set(`grid.${iTarget}.${jTarget}`, usher);
            this.ractive.set(`grid.${i}.${j}`, new EmptySpace());
            setTimeout(() => {
                usher.mainLoop();
            }, this.getMillisecondsForUsherMovement(usherId));
        }
        else if (!isEmptySpace && attempts < 10) {
            setTimeout(() => {
                this.moveUsher(usherId, iTarget, jTarget, attempts + 1);
            });
        }
        else {
            console.debug(`Usher ${usherId} cannot move to ${iTarget}-${jTarget} from ${usher.i}-${usher.j}`);
            setTimeout(() => {
                usher.mainLoop();
            }, this.getMillisecondsForUsherMovement(usherId));
        }
    }

    lightUsherCandle(keypathToPerson, usherId) {
        let keypathToCandle = keypathToPerson + ".candle.isLit";
        setTimeout(() => {
            this.ractive.set(keypathToCandle, true);
            this.ractive.update();  // Ractive doesn't seem to pick up on deep updates
            this.doNextStep(usherId);
        }, this.getMillisecondsToLightCandle());
    }

    lightPersonCandle(i, j, usherId) {
        let person = this.ractive.get(`grid.${i}.${j}`);
        if (_.isObject(person) && !person.isEmptySpace && !person.isMobile && _.isFunction(person.passFlame)) {
            let isCandleLit = this.ractive.get(`grid.${i}.${j}.candle.isLit`);
            if (!isCandleLit) {
                setTimeout(() => {
                    this.ractive.set(`grid.${i}.${j}.candle.isLit`, true);
                    this.ractive.get(`grid.${i}.${j}`).passFlame((i, j) => {
                        this.lightPersonCandle(i, j);
                    });
                    this.ractive.update();  // Ractive doesn't seem to pick up on deep updates
                }, this.getMillisecondsToLightCandle());
            }
        }
        if (!_.isUndefined(usherId)) {
            this.doNextStep(usherId);
        }
    }

    getMillisecondsForUsherMovement(usherId) {
        let globalSpeed = this.ractive.get("globalSpeed");
        let movementMillisecondsMin = Number(this.ractive.get(`ushers.${usherId}.movementMinSeconds`)) * 1000;
        let movementMillisecondsMax = Number(this.ractive.get(`ushers.${usherId}.movementMaxSeconds`)) * 1000;
        let interval = _.random(movementMillisecondsMin, movementMillisecondsMax);
        return interval / globalSpeed;
    }

    getMillisecondsToLightCandle() {
        let globalSpeed = this.ractive.get("globalSpeed");
        let candleMillisecondsMin = Number(this.ractive.get("candleSecondsMin")) * 1000;
        let candleMillisecondsMax = Number(this.ractive.get("candleSecondsMax")) * 1000;
        let interval = _.random(candleMillisecondsMin, candleMillisecondsMax);
        return interval / globalSpeed;
    }
}
SimulationRunner.mode = {
    parameter_name: "Simulation Mode",
    description: "Sets the algorithm used to drive the simulation.",
    default: "oneBlindMove",
};
SimulationRunner.globalSpeed = {
    parameter_name: "Global Speed",
    description: "Increase this to make the entire simulation run faster.",
    default: 1,
};

new SimulationRunner();


$("[name='control-panel-parameter']").popover({
    placement: "auto",
    trigger: "hover focus",
});

