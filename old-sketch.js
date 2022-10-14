
let DIM = 50;
let TSIZE = 500 / DIM;
let TMAXV = 1 << 5;

let DK = {
    UP: 0,
    RIGHT: 1,
    DOWN: 2,
    LEFT: 3,
}

let TK = {
    blank: 0b1,
    up: 0b10,
    right: 0b100,
    down: 0b1000,
    left: 0b10000,
}

let TILES = {
    0b1: {
        imagefile: "tiles/blank.png",
        neighbors: [
            TK.blank | TK.up,
            TK.blank | TK.right,
            TK.blank | TK.down,
            TK.blank | TK.left,
        ],
    },
    0b10: {
        imagefile: "tiles/up.png",
        neighbors: [
            TK.down | TK.right | TK.left,
            TK.down | TK.left | TK.up,
            TK.blank | TK.down,
            TK.up | TK.down | TK.right,
        ],
    },
    0b100: {
        imagefile: "tiles/right.png",
        neighbors: [
            TK.down | TK.right | TK.left,
            TK.down | TK.up | TK.left,
            TK.up | TK.left | TK.right,
            TK.left | TK.blank,
        ],
    },
    0b1000: {
        imagefile: "tiles/down.png",
        neighbors: [
            TK.blank | TK.up,
            TK.down | TK.up | TK.left,
            TK.up | TK.right | TK.left,
            TK.right | TK.down | TK.up,
        ],
    },
    0b1_0000: {
        imagefile: "tiles/left.png",
        neighbors: [
            TK.down | TK.left | TK.right,
            TK.blank | TK.right,
            TK.up | TK.left | TK.right,
            TK.right | TK.up | TK.down,
        ],
    },
};

let writes = {};

let board = []

function preload() {
    for(let tile in TILES) {
        TILES[tile].image = loadImage(TILES[tile].imagefile);
    }
}

function placeOneTile(ind) {
    let tileObject = JSON.parse(JSON.stringify(board[ind])); // DEBUG - hold for check
    if(tileObject.placed) {
        print('Yikes on re-place!')
        return;
    }
    let i = Math.floor(ind/DIM);
    let j = ind % DIM;
    let psl = [];
    let p = 1;
    while(p < TMAXV) {
        if(tileObject.viable & p) {
            psl.push(p)
        }
        p = p << 1;
    }
    if(psl.length == 0) {
        print('Yikes psl 0!');
        return;
    }
    tileObject.placed = true;
    tileObject.viable = psl[Math.floor(Math.random()*psl.length)];
    tileObject.nvia = TMAXV;
    let calnvia = ((a) => {
        let sum = 0;
        for(p = 1; p < TMAXV; p = p << 1) {
            sum += !!(a & p);
        }
        return sum;
    });
    let check = ((a, b) => {
        if(a.placed) {
            return;
        }
        if((a.viable & TILES[tileObject.viable].neighbors[b]) == 0) {
            print('Yikes Non-viable Tile!');
            // return;
        }
        a.viable &= TILES[tileObject.viable].neighbors[b];
        if(a.viable == 0) {
            print('Yikes Non-viable Tile! 2check');
            a.viable = 1;
            // return;
        }
        a.nvia = calnvia(a.viable);
        let wtmp = JSON.parse(JSON.stringify(a));
        wtmp.from = tileObject.position;
        writes[a.position].push(wtmp);
    })
    if(i > 0) {
        check(board[(i-1)*DIM + j], DK.UP);
    }
    if(i < DIM - 1) {
        check(board[(i+1)*DIM + j], DK.DOWN);
    }
    if(j > 0) {
        check(board[i*DIM + j-1], DK.LEFT);
    }
    if(j < DIM - 1) {
        check(board[i*DIM + j+1], DK.RIGHT)
    }
    board[ind] = tileObject; // DEBUG - from 79
    writes[ind].push(JSON.parse(JSON.stringify(tileObject)));
}

function placeBoardTile() {
    let sb = board.slice().sort((a, b) => {
        return a.nvia - b.nvia;
    });
    let low = sb[0].nvia;
    sb = sb.filter((a) => {return a.nvia <= low;});
    let choice = sb[Math.floor(Math.random()*sb.length)];
    let dc = JSON.parse(JSON.stringify(choice)); // DEBUG - hold for check
    placeOneTile(choice.position);
}

function setup() {
    createCanvas(500, 500);
    background(200);

    for(let i = 0; i < DIM*DIM; i++) {
        board.push({
            placed: false,
            viable: TMAXV-1,
            position: i,
            nvia: 8,
        });
        writes[i] = [];
    }
}

function draw() {
    for(let i = 0; i < DIM; i++) {
        for(let j = 0; j < DIM; j++) {
            tileObject = board[i * DIM + j];
            if(tileObject.viable == 0) {
                print("Serious Problem");
            }
            if(tileObject.placed == false) {
                continue;
            }
            image(TILES[tileObject.viable].image, TSIZE*j, TSIZE*i, TSIZE, TSIZE);
        }
    }
    placeBoardTile();
}
