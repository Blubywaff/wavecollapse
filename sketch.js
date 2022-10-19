
const DIM = 100;
const CSIZE = 500;
const DSIZE = CSIZE / DIM;
const TSUITE = "weightpart";
const FRAMETICK = 50;
const PRERENDER = false;
const SAVEFRAMES = false;
const SAVENAME = "out";

let TILES;

let grid = [];
let ticks = [];
let lastTick = 0;
let frame = 0;

function preload() {
    TILES = loadJSON(`tiles/${TSUITE}/tiles.json`);
}

function setup() {
    // Expand symmetrix ("*") faces
    for(t in TILES) {
        let tile = TILES[t];
        faceObject = tile.faces["*"];
        if(!faceObject) {
            continue;
        }
        tile.faces["A"] = faceObject;
        tile.faces["B"] = faceObject;
        tile.faces["C"] = faceObject;
        tile.faces["D"] = faceObject;
        delete tile.faces["*"];
        let root = tile.imageRoot;
        if(root != undefined) {
            for(let i = 0; i < tile.imageFiles.length; i++) {
                tile.imageFiles[i] = `${root}/${tile.imageFiles[i]}`;
            }
        }
    }
    // Expand tile rotations
    // and load images
    let shifter = (face, rotation) => {
        return String.fromCharCode((face.charCodeAt(0) + rotation.charCodeAt(0) - 130)%4 + 65);
    }
    let fconv = (r, faces) => {
        let f2 = {};
        for(f in faces) {
            f2[shifter(f, r)] = faces[f];
        }
        return f2;
    }
    let t2 = {};
    for(t in TILES) {
        let name = t;
        let tile = TILES[t];
        let faces = tile.faces;
        for(let i = 0; i < tile.rotations.length; i++) {
            let r = tile.rotations[i];
            obj = {
                image: loadImage(`tiles/${TSUITE}/images/${tile.imageFiles[i]}`),
                weight: tile.weight,
                faces: fconv(r, faces),
            }
            t2[`${name}.${r}`] = obj;
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
    
    if(PRERENDER) {
        for(let i = 0; i < DIM*DIM; i++) {
            ticks.push(loadBoardTile().index);
        }
    }

    if(SAVEFRAMES) frameRate(5);
    createCanvas(CSIZE, CSIZE);
    background(200);
}

var download = function(){
    var link = document.createElement('a');
    link.download = `${SAVENAME}-${(""+frame).padStart(4, "0")}.png`;
    link.href = document.getElementById('defaultCanvas0').toDataURL()
    link.click();
}

function draw() {
    frame++;
    if(SAVEFRAMES) download();
    if(PRERENDER) {
        let curTick = lastTick + FRAMETICK;
        for(let i = lastTick; i < curTick; i++) {
            if(i >= ticks.length) {
                noLoop();
                break;
            }
            let x = ticks[i] % DIM;
            let y = Math.floor(ticks[i] / DIM);
            image(TILES[grid[ticks[i]].viable].image, x * DSIZE, y * DSIZE, DSIZE, DSIZE);
        }
        lastTick = curTick;
    } else {
        for(let i = 0; i < FRAMETICK; i++) {
            let status = loadBoardTile();
            if(status.success) {
                let ind = status.index;
                let x = ind % DIM;
                let y = Math.floor(ind / DIM);
                image(TILES[grid[status.index].viable].image, x * DSIZE, y * DSIZE, DSIZE, DSIZE);
                continue;
            }
            noLoop();
            break;
        }
    }
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

