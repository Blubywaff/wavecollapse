// Debug values
let changes = [];
let chftr = (a) => {
    return changes.filter((b) => {
        return a == b.position;
    });
}

const DIM = 25;
const CSIZE = 500;
const DSIZE = CSIZE / DIM;

let TILES = {
    blank: {
        imageFiles: ["tiles/blank.png"],
        rotations: "A",
        faces: {
            "*": {
                connectionType: "B",
            },
        },
    },
    t: {
        imageFiles: ["tiles/up.png", "tiles/right.png", "tiles/down.png", "tiles/left.png"],
        rotations: "ABCD",
        faces: {
            "A": {
                connectionType: "A",
            },
            "B": {
                connectionType: "A",
            },
            "C": {
                connectionType: "B",
            },
            "D": {
                connectionType: "A",
            },
        },
    },
}

let grid = [];

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
                image: loadImage(tile.imageFiles[imgshif[r]]),
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

    createCanvas(CSIZE, CSIZE);
    background(200);
}

function draw() {
    for(i = 0; i < DIM; i++) {
        for(j = 0; j < DIM; j++) {
            let tileObject = grid[i*DIM+j];
            if(!tileObject.placed) {
                continue;
            }
            image(TILES[tileObject.viable].image, DSIZE*j, DSIZE*i, DSIZE, DSIZE);
        }
    }
    loadBoardTile();
}

function loadOneTile(ind) {
    let tileObject = grid[ind];
    let i = Math.floor(ind / DIM);
    let j = ind % DIM;
    if(tileObject.placed) {
        console.warn('Tried to re-place!');
        return;
    }
    let vo = tileObject.viable[Math.floor(Math.random()*tileObject.viable.length)];
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
}

function loadBoardTile() {
    let sb = grid.slice().sort((a, b) => {
        return a.nvia - b.nvia;
    });
    let low = sb[0].nvia;
    sb = sb.filter((a) => {return a.nvia <= low;});
    let choice = sb[Math.floor(Math.random()*sb.length)];
    loadOneTile(choice.position);
}

