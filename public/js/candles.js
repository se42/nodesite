console.log("Candles js ready");
// can do new Ractive here b/c scripts-foot comes after Ractive CDN

class Candle {
    constructor(isLit) {
        this.isLit = false;
    }

    light() {this.isLit = true;}
};


class SeatingGrid {
    constructor(size) {
        this.size = size;
        this.grid = [];
        for (let i = 0; i < size; i++) {
            this.grid.push([]);
            for (let j = 0; j < size; j++) {
                this.grid[i].push(new Candle());
            }
        }
    }
}

seatingGrid = new SeatingGrid(5);

let ractive = new Ractive({
    el: "#candles-visualization",
    template: "#candles-template",
    data: {
        name: "Ractive",
        grid: seatingGrid.grid,
    }
});

let myLighter;
let i = 0;
let j = 0;

myLighter = setInterval(function() {
    console.log(`Lighting candle ${i}${j}`);
    seatingGrid.grid[i][j].light();
    j += 1;
    if (j === seatingGrid.size) {
        j = 0;
        i +=1
    }
    if (i === seatingGrid.size) {
        console.log("All candles are lit!");
        clearInterval(myLighter);
    }
    ractive.update();
}, 1000);

