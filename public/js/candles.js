function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// these will be used for setTimeouts, which aren't perfect for timing
// but it's a simulation so that's OK, just more randomness
TIME_SCALE = 0.25;
MIN_MS_TO_LIGHT_CANDLE = 3.0;
MAX_MS_TO_LIGHT_CANDLE = 7.0;
MIN_MS_FOR_USHER_MOVEMENT = 0.5;
MAX_MS_FOR_USHER_MOVEMENT = 1.5;

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

    light(nextAction) {
        setTimeout(() => {
            this.isLit = true;
            nextAction();
        }, getMillisecondsToLightCandle());
    }
}

class AbstractGridLocation {
    constructor(i, j) {
        this.repr = "fa fa-fw";
        this.i = i;
        this.j = j;
        this.isEmptySpace = false;
    }
}

class Usher extends AbstractGridLocation {
    constructor(i, j, id, ractive) {
        super(i, j);
        this.repr += " fa-user candle";
        this.id = id;
        this.ractive = ractive;
        this.candle = new Candle();
    }

    startJob() {
        if (this.candle.isLit) {
            // perform job per specified algorithm (can eventually come through Ractive)
            console.log(`Usher ${this.id} is ready to work!`);
        }
        else {
            this.lightCandle();
        }
    }

    lightCandle() {
        if (this.isUsherAtCenterCandle()){
            this.candle.light(() => this.startJob());
        }
        else {
            let center = this.ractive.get("center");
            this.goToTarget(center + 1, center, (ractive) => {
                this.lightCandle();
            });
        }
    }

    isUsherAtCenterCandle() {
        // Ushers must light candle at point (center + 1, center), e.g. right below it on the grid
        let absValI = Math.abs(this.ractive.get("center") + 1 - this.i);
        let absValJ = Math.abs(this.ractive.get("center") - this.j);
        return absValI === 0 && absValJ === 0;
    }

    goToTarget(iTarget, jTarget, actionAtTarget) {
        if (this.i === iTarget && this.j === jTarget) {
            actionAtTarget();
        }
        else {
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
            setTimeout(() => {
                this.move(iNext, jNext);
                this.goToTarget(iTarget, jTarget, actionAtTarget);
            }, getMillisecondsForUsherMovement());
        }
    }

    assess(seatingGrid, mode) {
        // assess this.i, this.j and the given seatingGrid to determine next move
    }

    move(iNext, jNext) {
        // This is basically an Usher "trading places" with an EmptySpace
        // Person objects will not have this interface and cannot be moved
        let oldKeypath = `grid.${this.i}.${this.j}`;
        let newKeypath = `grid.${iNext}.${jNext}`;
        let emptySpace = this.ractive.get(newKeypath);
        if (emptySpace.isEmptySpace) {
            this.i = iNext;
            this.j = jNext;
            this.ractive.set(newKeypath, this);
            this.ractive.set(oldKeypath, emptySpace);
        }
        else {
            throw new Error(`Usher ${this.i}-${this.j} cannot move to ${iNext}-${jNext}`);
        }
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
            magic: true,
            data: {
                size: seatingGrid.size,
                center: seatingGrid.center,
                grid: seatingGrid.grid,
                numOfCandlesToLight: seatingGrid.numOfCandlesToLight,
                ushers: [],
                leadingEdgePersons: [],
            }
        });

        // let size = this.ractive.get("size");
        // let center = this.ractive.get("center");
        let size = seatingGrid.size;
        let center = seatingGrid.center;

        for (let i = 0; i < size; i += center) {
            for (let j = 0; j < size; j += center) {
                if (!(i === center && j === center)) {
                    let id = this.ractive.get("ushers").length;
                    let usher = new Usher(i, j, id, this.ractive);
                    this.ractive.push("ushers", usher);
                    let keypath = `grid.${i}.${j}`;
                    this.ractive.set(keypath, usher);
                }
            }
        }

        
    }

    run() {
        this.ractive.get("ushers").forEach((usher) => usher.startJob());
    }
}


let seatingGrid = new SeatingGrid(35);
let simulation = new SimulationRunner(seatingGrid);
simulation.run()
