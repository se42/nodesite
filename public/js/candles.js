class AbstractCandle {
    constructor() {
        this.isLit = false;
    }

    light() {
        this.isLit = true;
    }
};

class Usher extends AbstractCandle {
    constructor() {
        super()
        this.repr = "fa fa-fw fa-user candle";
    }
}

class Candle extends AbstractCandle {
    constructor() {
        super();
        this.repr = "fa fa-fw fa-fire candle";
    }
}

class EmptySpace extends AbstractCandle {
    constructor() {
        super();
        this.repr = "fa fa-fw";
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
        this.numberOfCandles = 0
        for (let i = 0; i < size; i++) {
            this.grid.push([]);
            for (let j = 0; j < size; j++) {
                if (i === this.center && j === this.center) {
                    this.grid[i].push(new Candle());
                    this.grid[i][j].light();
                }
                else if (SeatingGrid.isOpenSpace(i, j, this.center)) {
                    this.grid[i].push(new EmptySpace());
                }
                else {
                    this.grid[i].push(new Candle());
                    this.numberOfCandles += 1;
                }
            }
        }
    }

    static isOpenSpace(i, j, center) {
        return SeatingGrid.isNearCenter(i,j,center) || SeatingGrid.isWalkway(i,j,center);
    }

    static isNearCenter(i, j, center) {
        let absValI = Math.abs(i - center);
        let absValJ = Math.abs(j - center);
        let qLimit = Math.floor(SeatingGrid.frontRowLength / 2); // quadrant distance limit
        if (absValI <= qLimit && absValJ <= qLimit) {
            return true;
        }
        else {
            return false;
        }
    }

    static isWalkway(i, j, center) {
        let absValI = Math.abs(i - center);
        let absValJ = Math.abs(j - center);
        if (i === center || j === center || absValI === absValJ) {
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
        this.seatingGrid = seatingGrid;
        this.currentStep = 0;
        this.ushers = [];
        this.leadingEdgeCandles = []

        let center = this.seatingGrid.center
        for (let i = center - 1; i <= center + 1; i++) {
            for (let j = center - 1; j <= center + 1; j++) {
                if (!(i === center && j === center)) {
                    let usher = new Usher();
                    this.ushers.push(usher);
                    this.seatingGrid.grid[i][j] = usher;
                }
            }
        }
    }

    fire() {
        // this.currentStep += 1;
        // FIXME - THERE IS SOMETHING WEIRD GOING ON BETWEEN DIRECT UPDATES
        //          AND ractive.add() STYLE UPDATES -- NOT GETTING EXPECTED
        //          BEHAVIOR, PROBABLY DOING IT WRONG
        this.seatingGrid.grid[3][7].light();
    }

    static run(simulationRunner, ractive) {
        let drumbeat = setInterval(function() {
            if (simulationRunner.currentStep === 4) { // terminating condition here
                console.log("All candles are lit!");
                clearInterval(drumbeat);
            }
            else {
                ractive.add('currentStep');
                simulationRunner.fire();
                ractive.update();
            }
            // ractive.update();
        }, 500);
    }
}


let seatingGrid = new SeatingGrid(35);
let simulationRunner = new SimulationRunner(seatingGrid);

let ractive = new Ractive({
    el: "#candles-visualization",
    template: "#candles-template",
    data: {
        size: seatingGrid.size,
        grid: seatingGrid.grid,
        numberOfCandles: seatingGrid.numberOfCandles,
        currentStep: simulationRunner.currentStep,
    }
});

SimulationRunner.run(simulationRunner, ractive);
