// TODO LIST:
// 1 - Clean up and refactor code to make it more readable and testable--this is a speed draft
//      --> Look through Underscore library for low hanging cleanup fruit
//      --> Get ractive (and other dependencies?) from npm
// 2 - Implement Grid Assessment mode for smarter usher navigation
// 3 - Implement candle lighting algorithm so the ushers actually light the other candles

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
        this.repr = "fa fa-fw" + AbstractGridLocation.getRotationForPosition(i,j,center);
        this.i = i;
        this.j = j;
        this.isEmptySpace = false;
        this.isMobile = false;
    }

    static getRotationForPosition(i, j, center) {
        if (!center) {
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
    }
}

class Person extends AbstractGridLocation {
    constructor(i, j, center) {
        super(i, j, center);
        this.repr += " fa-fire candle";
        this.candle = new Candle();
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

    doStep() {
        main_loop:
        try {
            if (this.getMe().candle.isLit) {
                this.goToTarget(this.origin.i, this.origin.j, () => {
                    console.debug(`Usher ${this.id} is done!`);
                });
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
        if (typeof this.runner !== "undefined") {
            return this.runner.ractive.get(`ushers.${this.id}`);
        }
        else {
            throw new Error(`Usher ${this.id} accessed undefined runner in getMe`);
        }
    }

    getAttr(attr) {
        if (typeof this.runner !== "undefined") {
            return this.runner.ractive.get(attr);
        }
        else {
            throw new Error(`Usher ${this.id} accessed undefined runner in getAttr (${attr})`);
        }
    }

    lightCandle() {
        if (this.getMe().isUsherAtCenterCandle()){
            // runner assumed not undefined if getMe() worked
            this.runner.lightCandle(`ushers.${this.id}`, this.id);
        }
        else {
            let center = this.getAttr("center");
            this.goToTarget(center + 1, center, () => {
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

    goToTarget(iTarget, jTarget, actionAtTarget) {
        if (this.i === iTarget && this.j === jTarget) {
            actionAtTarget();
        }
        else {
            let mode = this.getAttr("selectedMode.id");
            switch(mode) {
                case "oneBlindMove":
                    this.doNextMove(iTarget, jTarget, 0);
                    break;
                case "gridAssessment":
                    this.assessGrid(iTarget, jTarget);
                    break;
                default:
                    this.assessGrid(iTarget, jTarget);
            }
        }
    }

    assessGrid(iTarget, jTarget) {
        let grid = this.getAttr("grid");
        console.log(`Usher ${this.id} is now in Grid Assessment mode`);
        throw new Error("Mode not implemented");
    }

    doNextMove(iTarget, jTarget) {
        // FIXME - this will get stuck if an usher ever needs to move
        // AWAY from the target to eventually get there
        let iMove = 0;
        let jMove = 0;
        if (iTarget - this.i !== 0) {
            iMove = (iTarget - this.i) / Math.abs(iTarget - this.i);
        }
        if (jTarget - this.j !== 0) {
            jMove = (jTarget - this.j) / Math.abs(jTarget - this.j);
        }
        let iNext = this.i + iMove;
        let jNext = this.j + jMove;
        let grid = this.getAttr("grid");
        if (grid[iNext][jNext].isEmptySpace) {
            this.move(iNext, jNext);
        }
        else if (grid[iNext][jNext].isMobile && this.patience < 10) {
            // just queue up another attempt later b/c the Usher may move
            this.patience += 1;
            setTimeout(() => {
                this.doStep();
            });
        }
        // attempted diagonal move is blocked
        else if (Math.abs(iMove) === 1 && Math.abs(jMove) === 1) {
            // attempt lateral moves
            if (grid[this.i][jNext].isEmptySpace) {
                this.move(this.i, jNext);
            }
            else if (grid[iNext][this.j].isEmptySpace) {
                this.move(iNext, this.j);
            }
            else {
                // throw new Error(`Usher ${this.id} is stuck at ${this.i}-${this.j}!!`);
                this.move(this.i, this.j);
            }
        }
        // attempted horizontal move is blocked
        else if (iMove === 0 && Math.abs(jMove) === 1) {
            // attempt diagonal moves in same direction
            if (grid[this.i + 1][jNext].isEmptySpace) {
                this.move(this.i + 1, jNext);
            }
            else if (grid[this.i - 1][jNext].isEmptySpace) {
                this.move(this.i - 1, jNext);
            }
            else {
                // throw new Error(`Usher ${this.id} is stuck at ${this.i}-${this.j}!!`);
                this.move(this.i, this.j);
            }
        }
        // attempted vertical move is blocked
        else if (Math.abs(iMove) === 1 && jMove === 0) {
            // attempt diagonal moves in same direction
            if (grid[iNext][this.j + 1].isEmptySpace) {
                this.move(iNext, this.j + 1);
            }
            else if (grid[iNext][this.j - 1].isEmptySpace) {
                this.move(iNext, this.j - 1);
            }
            else {
                // throw new Error(`Usher ${this.id} is stuck at ${this.i}-${this.j}!!`);
                this.move(this.i, this.j);
            }
        }
        else {
            this.move(iNext, jNext); // this should be a choice of no movement if it gets here
        }
    }

    move(iNext, jNext) {
        if (typeof this.runner !== "undefined") {
            this.runner.moveUsher(this.id, iNext, jNext);
            this.patience = 0;
        }
        else {
            throw new Error(`Usher ${this.id} accessed undefined runner during move attempt`);
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
            Object.keys(this.ractive.get("ushers")).forEach((usherId) => {
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
            Object.keys(this.ractive.get("ushers")).forEach((usherId) => {
                this.ractive.set(`ushers.${usherId}.movementMinSeconds`, Usher.usherSecondsMin.default);
                this.ractive.set(`ushers.${usherId}.movementMaxSeconds`, Usher.usherSecondsMax.default);
            });
        });

        this.ractive.on('setGlobalUsherMin', (event) => {
            let min = this.ractive.get("usherSecondsMin");
            Object.keys(this.ractive.get("ushers")).forEach((usherId) => {
                this.ractive.set(`ushers.${usherId}.movementMinSeconds`, min);
            });
        });

        this.ractive.on('setGlobalUsherMax', (event) => {
            let max = this.ractive.get("usherSecondsMax");
            Object.keys(this.ractive.get("ushers")).forEach((usherId) => {
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
            leadingEdgePersons: [],
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
                    let id = 10 * this.runId + Object.keys(this.ractive.get("ushers")).length;
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
        Object.keys(this.ractive.get("ushers")).forEach((usherId) => {
            let usher = this.ractive.get(`ushers.${usherId}`);
            setTimeout(() => {
                usher.doStep();
            }, this.getMillisecondsForUsherMovement(usher.id));
        });
    }

    doNextStep(usherId) {
        setTimeout(() => {
            let usher = this.ractive.get(`ushers.${usherId}`);
            if (typeof usher !== "undefined" && typeof usher.doStep !== "undefined") {
                try {
                    usher.doStep();
                }
                catch (e) {
                    // This should never execute but the 2 undefined checks
                    // are needed as there seems to be some delay/mistiming
                    // in the undefining and garbage collection of the usher
                    // objects.  Without the doStep !== "undefined" check
                    // the following console.log(usher) will sometimes log
                    // an object with only the remnants of a candle.
                    console.error(e);
                    console.log(usher);
                }
            }
        }, this.getMillisecondsForUsherMovement(usherId));
    }

    moveUsher(usherId, iNext, jNext, attempts) {
        // move usher to location (i,j)
        let usher = this.ractive.get(`ushers.${usherId}`);
        let isEmptySpace = this.ractive.get(`grid.${iNext}.${jNext}.isEmptySpace`);
        if (usher.i === iNext && usher.j === jNext) {
            console.debug(`Usher ${usherId} has decided to not move`);
            setTimeout(() => {
                usher.doStep();
            }, this.getMillisecondsForUsherMovement(usherId));
        }
        else if (iNext - usher.i > 1 || jNext - usher.j > 1) {
            throw new Error(`Usher ${usherId} has submitted an invalid move`);
        }
        else if (isEmptySpace) {
            let i = usher.i;
            let j = usher.j;
            this.ractive.set(`ushers.${usherId}.i`, iNext);
            this.ractive.set(`ushers.${usherId}.j`, jNext);
            this.ractive.set(`grid.${iNext}.${jNext}`, usher);
            this.ractive.set(`grid.${i}.${j}`, new EmptySpace());
            setTimeout(() => {
                usher.doStep();
            }, this.getMillisecondsForUsherMovement(usherId));
        }
        else if (!isEmptySpace && attempts < 3) {
            setTimeout(() => {
                this.moveUsher(usherId, iNext, jNext, attempts + 1);
            });
        }
        else {
            console.error(`Failed to move Usher ${usherId} to ${iNext}-${jNext} from ${usher.i}-${usher.j}`);
            setTimeout(() => {
                usher.doStep();
            }, this.getMillisecondsForUsherMovement(usherId));
        }
    }

    lightCandle(keypathToPerson, usherId) {
        let keypathToCandle = keypathToPerson + ".candle.isLit";
        setTimeout(() => {
            this.ractive.set(keypathToCandle, true);
            this.ractive.update();  // Ractive doesn't seem to pick up on deep updates
            this.doNextStep(usherId);
        }, this.getMillisecondsToLightCandle());
    }

    getMillisecondsForUsherMovement(usherId) {
        let globalSpeed = this.ractive.get("globalSpeed");
        let movementMillisecondsMin = Number(this.ractive.get(`ushers.${usherId}.movementMinSeconds`)) * 1000;
        let movementMillisecondsMax = Number(this.ractive.get(`ushers.${usherId}.movementMaxSeconds`)) * 1000;
        let interval = SimulationRunner.getRandomIntInclusive(movementMillisecondsMin, movementMillisecondsMax);
        return interval / globalSpeed;
    }

    getMillisecondsToLightCandle() {
        let globalSpeed = this.ractive.get("globalSpeed");
        let candleMillisecondsMin = Number(this.ractive.get("candleSecondsMin")) * 1000;
        let candleMillisecondsMax = Number(this.ractive.get("candleSecondsMax")) * 1000;
        let interval = SimulationRunner.getRandomIntInclusive(candleMillisecondsMin, candleMillisecondsMax);
        return interval / globalSpeed;
    }

    static getRandomIntInclusive(min, max) {
        // copied this straight off the MDN page for Math.random
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
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

