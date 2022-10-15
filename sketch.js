// Debug values
let changes = [];
let chftr = (a) => {
    return changes.filter((b) => {
        return a == b.position;
    });
}

const DIM = 100;
const CSIZE = 500;
const DSIZE = CSIZE / DIM;
const TSUITE = "weightpart";
const FRAMETICK = 50;

let TILES;

let grid = [];
let frames = [];
let lastFrame = 0;
let unloaded = 0;

function preload() {
    TILES = loadJSON(`tiles/${TSUITE}/tiles.json`);
}

function setup() {
    // Expand symmetrix ("*") faces
    for(t in TILES) {
        tile = TILES[t];
        faceObject = tile.faces["*"];
        if(!faceObject) {
            continue;
        }
        tile.faces["A"] = faceObject;
        tile.faces["B"] = faceObject;
        tile.faces["C"] = faceObject;
        tile.faces["D"] = faceObject;
        delete tile.faces["*"];
    }
    // Expand tile rotations
    // and load images
    let shifter = {
        "A": "B",
        "B": "C",
        "C": "D",
        "D": "A",
    };
    let imgshif = {
        "A": 0,
        "B": 1,
        "C": 2,
        "D": 3,
    };
    let t2 = {};
    for(t in TILES) {
        let name = t;
        let tile = TILES[t];
        let faces = tile.faces;
        for(r of tile.rotations) {
            obj = {
                ...tile,
                image: loadImage(`tiles/${TSUITE}/images/${tile.imageFiles[imgshif[r]]}`),
                faces: faces,
            }
            t2[`${name}.${r}`] = obj;
            let faces2 = {};
            for(c of "ABCD") {
                faces2[shifter[c]] = faces[c];
            }
            faces = faces2;
        }
    }
    TILES = t2;

    // fill grid
    let all = [];
    for(let t in TILES) {
        all.push(t);
    }
    for(let i = 0; i < DIM*DIM; i++) {
        grid.push({
            position: i,
            viable: all,
            nvia: all.length,
        });
    }
    
    for(let i = 0; i < DIM*DIM; i++) {
        frames.push(loadBoardTile().index);
    }

    createCanvas(CSIZE, CSIZE);
    background(200);
}

function draw() {
    let curFrame = lastFrame + FRAMETICK;
    for(let i = lastFrame; i < curFrame; i++) {
        if(i >= frames.length) {
            noLoop();
            break;
        }
        let x = frames[i] % DIM;
        let y = Math.floor(frames[i] / DIM);
        image(TILES[grid[frames[i]].viable].image, x * DSIZE, y * DSIZE, DSIZE, DSIZE);
    }
    lastFrame = curFrame;
}

/*
 * Selects a viable option for the `grid` tile at `ind`
 * and places the tile there. Also updates the tile's
 * neighbors to reflect the new valid states.
 * Returns the success status of the operation.
 */
function loadOneTile(ind) {
    let tileObject = grid[ind];
    let i = Math.floor(ind / DIM);
    let j = ind % DIM;
    if(tileObject.placed) {
        console.warn('Tried to re-place!');
        return {success: false, error: "re-place"};
    }
    
    let vo = (() => {
        let totalweight = tileObject.viable.reduce((p, c) => {
            return TILES[c].weight + p;
        }, 0);
        // Math.random() in [0, 1) so
        // rand in [0, totalweight)
        // and sum in (0, totalweight]
        // (assuming no weights can be zero)
        // so sum >= rand will eventually be
        // satisfied for all valid configs.
        let rand = Math.random()*totalweight;
        let sum = 0;
        for(v of tileObject.viable) {
            sum += TILES[v].weight;
            if(sum >= rand) {
                return v;
            }
        }
        console.error("this is bad");
    })();
    tileObject.placed = true;
    tileObject.viable = vo;
    tileObject.nvia = Object.keys(TILES).length + 1; // So that it gets sorted out on replace
    changes.push(JSON.parse(JSON.stringify({from: ind, when: changes.length, ...tileObject})));
    // Checks for neighbors
    let check = (tObj, oren) => {
        if(tObj.placed) {
            return;
        }
        let flip = {
            "A": "C",
            "C": "A",
            "B": "D",
            "D": "B",
        }
        let allowed = TILES[tileObject.viable].faces[oren].connectionType;
        let possible = tObj.viable.filter((v)=>{return TILES[v].faces[flip[oren]].connectionType == allowed});
        if(possible.length == 0) {
            console.warn("No viable for neighbor");
            possible.push("blank.A"); // to ensure that it does not crash
        }
        tObj.viable = possible;
        tObj.nvia = possible.length;
        changes.push({from: ind, when: changes.length, ...tObj});
    };
    if(i > 0) {
        check(grid[ind - DIM], "A");
    }
    if(i < DIM - 1) {
        check(grid[ind + DIM], "C");
    }
    if(j > 0) {
        check(grid[ind - 1], "D");
    }
    if(j < DIM - 1) {
        check(grid[ind + 1], "B");
    }
    return {success: true};
}

/*
 * Selects a random tile with lowest number of viable states,
 * and then loads that tile with `loadOneTile`.
 * Returns the success status and the index attempted.
 */
function loadBoardTile() {
    let sb = grid.slice().sort((a, b) => {
        return a.nvia - b.nvia;
    });
    let low = sb[0].nvia;
    sb = sb.filter((a) => {return a.nvia <= low;});
    let choice = sb[Math.floor(Math.random()*sb.length)];
    return {...loadOneTile(choice.position), index: choice.position};
}

