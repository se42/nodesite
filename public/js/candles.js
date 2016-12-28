function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// these will be used for setTimeouts, which aren't perfect for timing
// but it's a simulation so that's OK, just more randomness
TIME_SCALE = 0.25;
MIN_MS_TO_LIGHT_CANDLE = 1.0;
MAX_MS_TO_LIGHT_CANDLE = 1.0;
MIN_MS_FOR_USHER_MOVEMENT = 0.5;
MAX_MS_FOR_USHER_MOVEMENT = 5;

function getMillisecondsToLightCandle() {
    return 1000 * getRandomIntInclusive(MIN_MS_TO_LIGHT_CANDLE, MAX_MS_TO_LIGHT_CANDLE) * TIME_SCALE;
}

function getMillisecondsForUsherMovement() {
    return 1000 * getRandomIntInclusive(MIN_MS_FOR_USHER_MOVEMENT, MAX_MS_FOR_USHER_MOVEMENT) * TIME_SCALE;
}


class Candle {
    constructor() {
        this.isLit = false;
    }
}

class AbstractGridLocation {
    constructor(i, j) {
        this.repr = "fa fa-fw";
        this.i = i;
        this.j = j;
        this.isEmptySpace = false;
        this.isMobile = false;
    }
}

class Person extends AbstractGridLocation {
    constructor(i, j) {
        super(i, j);
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
    }

    doStep() {
        let grid = this.runner.ractive.get("grid");
        if (grid[this.i][this.j].candle.isLit) {
            // perform job per specified algorithm (can eventually come through Ractive)
            this.goToTarget(this.origin.i, this.origin.j, () => {
                console.log(`Usher ${this.id} is done!`);
            });
        }
        else {
            this.lightCandle();
        }
    }

    lightCandle() {
        if (this.isUsherAtCenterCandle()){
            this.runner.lightCandle(`ushers.${this.id}`);
            this.runner.doNextStep(this.id);
        }
        else {
            let center = this.runner.ractive.get("center");
            this.goToTarget(center + 1, center, () => {
                this.lightCandle();
            });
        }
    }

    isUsherAtCenterCandle() {
        // Ushers must light candle at point (center + 1, center), e.g. right below it on the grid
        let absValI = Math.abs(this.runner.ractive.get("center") + 1 - this.i);
        let absValJ = Math.abs(this.runner.ractive.get("center") - this.j);
        return absValI === 0 && absValJ === 0;
    }

    goToTarget(iTarget, jTarget, actionAtTarget) {
        if (this.i === iTarget && this.j === jTarget) {
            actionAtTarget();
        }
        else {
            this.doNextMove(iTarget, jTarget, 0);
        }
    }

    doNextMove(iTarget, jTarget, attempts) {
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
        let grid = this.runner.ractive.get("grid");
        if (grid[iNext][jNext].isEmptySpace) {
            this.move(iNext, jNext);
        }
        else if (attempts < 20 && grid[iNext][jNext].isMobile) {
            // just queue up another attempt later b/c the Usher may move
            setTimeout(() => {
                this.doNextMove(iTarget, jTarget, attempts + 1);
            }, getMillisecondsForUsherMovement());
        }
        else if (attempts === 20) {
            this.move(this.i - iMove, this.j - jMove);
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
            // else {
            //     throw new Error(`Usher ${this.id} is stuck at ${this.i}-${this.j}!!`);
            // }
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
            // else {
            //     throw new Error(`Usher ${this.id} is stuck at ${this.i}-${this.j}!!`);
            // }
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
        this.runner.moveUsher(this.id, iNext, jNext);
    }
}


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
                    this.grid[i].push(new Person(i,j));
                    this.grid[i][j].candle.isLit = true;
                }
                else if (this.isOpenSpace(i, j)) {
                    this.grid[i].push(new EmptySpace(i,j));
                }
                else {
                    this.grid[i].push(new Person(i,j));
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


class SimulationRunner {
    constructor(seatingGrid) {
        this.ractive = new Ractive({
            el: "#candles-visualization",
            template: "#candles-template",
            data: {
                size: seatingGrid.size,
                center: seatingGrid.center,
                grid: seatingGrid.grid,
                numOfCandlesToLight: seatingGrid.numOfCandlesToLight,
                ushers: [],
                leadingEdgePersons: [],
            }
        });

        let size = seatingGrid.size;
        let center = seatingGrid.center;

        for (let i = 0; i < size; i += center) {
            for (let j = 0; j < size; j += center) {
                if (!(i === center && j === center)) {
                    let id = this.ractive.get("ushers").length;
                    let usher = new Usher(i, j, id, this);
                    this.ractive.push("ushers", usher);
                    this.ractive.set(`grid.${i}.${j}`, usher);
                }
            }
        }
    }

    run() {
        this.ractive.get("ushers").forEach((usher) => {
            if (usher.id < 16) {
                setTimeout(() => {
                usher.doStep();
            }, getMillisecondsForUsherMovement());
            }
        });
    }

    doNextStep(usherId) {
        setTimeout(() => {
            this.ractive.get(`ushers.${usherId}`).doStep();
        }, getMillisecondsForUsherMovement());
    }

    moveUsher(id, iNext, jNext, attempts) {
        // move usher id to location (i,j)
        let usher = this.ractive.get(`ushers.${id}`);
        let isEmptySpace = this.ractive.get(`grid.${iNext}.${jNext}.isEmptySpace`);
        if (usher.i === iNext && usher.j === jNext) {
            console.log(`Usher ${id} has decided to not move`);
            setTimeout(() => {
                usher.doStep();
            }, getMillisecondsForUsherMovement());
        }
        else if (iNext - usher.i > 1 || jNext - usher.j > 1) {
            throw new Error(`Usher ${id} has submitted an invalid move`);
        }
        else if (isEmptySpace) {
            let i = usher.i;
            let j = usher.j;
            this.ractive.set(`ushers.${id}.i`, iNext);
            this.ractive.set(`ushers.${id}.j`, jNext);
            this.ractive.set(`grid.${iNext}.${jNext}`, usher);
            this.ractive.set(`grid.${i}.${j}`, new EmptySpace());
            setTimeout(() => {
                usher.doStep();
            }, getMillisecondsForUsherMovement());
        }
        else if (!isEmptySpace && attempts < 3) {
            setTimeout(() => {
                this.moveUsher(id, iNext, jNext, attempts + 1);
            });
        }
        else {
            console.error(`Failed to move Usher ${id} to ${iNext}-${jNext} from ${usher.i}-${usher.j}`);
            setTimeout(() => {
                usher.doStep();
            }, getMillisecondsForUsherMovement());
        }
    }

    lightCandle(keypathToPerson) {
        let keypathToCandle = keypathToPerson + ".candle.isLit";
        this.ractive.set(keypathToCandle, true);
    }
}


let seatingGrid = new SeatingGrid(35);
let simulation = new SimulationRunner(seatingGrid);
simulation.run()
