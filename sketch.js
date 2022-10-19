
const DIM = 100;
const CSIZE = 500;
const DSIZE = CSIZE / DIM;
const TSUITE = "rotpart";
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
    // function for rotation faces
    let fshift = (r, faces) => {
        let f2 = {};
        for(f in faces) {
            let shift = String.fromCharCode((f.charCodeAt(0) + r.charCodeAt(0) - 130)%4 + 65);
            f2[shift] = faces[f];
        }
        return f2;
    }

    // function for face flips
    let frot = (r, faces) => {
        let f2 = {};
        for(f in faces) {
            let shift = f;
            if(r == "V" || r == "<") {
                shift = {
                    "A": "C",
                    "C": "A",
                    "B": "B",
                    "D": "D"
                }[shift];
            }
            else if(r == "H" || r == "I") {
                shift = {
                    "A": "A",
                    "C": "C",
                    "B": "D",
                    "D": "B"
                }[shift];
            }
            if(r == "<" || r == "I") {
                shift = String.fromCharCode((shift.charCodeAt(0) - 64)%4 + 65);
            }
            f2[shift] = faces[f];
            f2[shift] = {
                connectionType: faces[f].connectionType,
                reflection: {"*": "*", "N": "F", "F": "N"}[faces[f].reflection]
            };
        }
        return f2;
    }

    for(t in TILES) {
        let tile = TILES[t];
        // Expand fields that don't exist
        if(tile.reflections == undefined) {
            tile.reflections = "";
        }
        // Generate image file names from prefix and suffix
        if(tile.imageFiles == undefined) {
            tile.imageFiles = [];
            for(r of "ABCDVHKI") {
                tile.imageFiles.push(tile.imagePrefix+r+tile.imageSuffix);
            }
        }
        // Expand imageRoot to file references
        let root = tile.imageRoot;
        if(root != undefined) {
            for(let i = 0; i < tile.imageFiles.length; i++) {
                tile.imageFiles[i] = `${root}/${tile.imageFiles[i]}`;
            }
        }
        // Expand reflection for symmetric faces
        for(fn in tile.faces) {
            face = tile.faces[fn];
            if(face.reflection == undefined) {
                face.reflection = "*";
            }
        }
        // Expand symmetrix ("*") faces
        let faceObject = tile.faces["*"];
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
    // and reflections
    // and load images
    let t2 = {};
    for(t in TILES) {
        let tile = TILES[t];
        let name = t;
        let faces = tile.faces;
        let rotlen = tile.rotations.length;
        for(let i = 0; i < rotlen; i++) {
            let r = tile.rotations[i];
            let obj = {
                image: loadImage(`tiles/${TSUITE}/images/${tile.imageFiles[i]}`),
                weight: tile.weight,
                faces: fshift(r, faces),
            };
            t2[`${name}.${r}`] = obj;
        }
        for(let i = 0; i < tile.reflections.length; i++) {
            let r = tile.reflections[i];
            let obj = {
                image: loadImage(`tiles/${TSUITE}/images/${tile.imageFiles[i+rotlen]}`),
                weight: tile.weight,
                faces: frot(r, faces),
            };
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
    let facesEqual = (f1, f2) => {
        return f1.connectionType == f2.connectionType && (
            (f2.reflection == f1.reflection && f2.reflection == "*")
            || (f2.reflection == "N" && f1.reflection == "F")
            || (f2.reflection == "F" && f1.reflection == "N")
        );
    }
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
        let allowed = TILES[tileObject.viable].faces[oren];
        let possible = tObj.viable.filter((v)=>{return facesEqual(TILES[v].faces[flip[oren]], allowed)});
        if(possible.length == 0) {
            console.error("No viable for neighbor");
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

