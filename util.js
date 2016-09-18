function GetPathPosDirs(previous, current){
    this.x = current.x;
    this.y = current.y;
    this.roomName = current.roomName;
    this.dx = current.x - previous.x;
    this.dy = current.y - previous.y;
    this.direction = (new RoomPosition(previous.x, previous.y, previous.roomName)).getDirectionTo(current.x, current.y);
}

// Convert pathfinder path to valid path that creep.moveByPath can use
function MakeValidPath(path){
    if(!path.length)
        return [];
    let vPath = _.cloneDeep(path);
    
    for(let i = 1; i < vPath.length; i++){
        let prevPos = vPath[i - 1];
        vPath[i] = new GetPathPosDirs(prevPos, vPath[i]);
    }
    return vPath;
}

// The default pathfinding function is lacking when wanting to find the true path without terrain costs
// This function gets the path to the goal by equalizing swamps, plains and roads to simply find the shortest path while avoiding colissionable things...
function GetOptimalPath(origin, goal, range = 1, ignoreReserved = false){
    let path = PathFinder.search(origin.pos, { pos: goal.pos, range: range}, {
        plainCost: 1,
        swampCost: 1,
        roomCallback: function(roomName) {
            let room = Game.rooms[roomName];
            if (!room) return;
            
            let costs = new PathFinder.CostMatrix;
            let memRoom = Memory.rooms[roomName];
            (room.find(FIND_STRUCTURES).concat(room.find(FIND_CONSTRUCTION_SITES))).forEach(function(structure) {
                if (structure.structureType === STRUCTURE_ROAD){
                    costs.set(structure.pos.x, structure.pos.y, 1);
                } else if (
                    structure.structureType !== STRUCTURE_CONTAINER && 
                    (structure.structureType !== STRUCTURE_RAMPART || !structure.my))
                {
                    costs.set(structure.pos.x, structure.pos.y, 0xff); // Mark as an obstruction
                }
            });
            
            if(!ignoreReserved){
                memRoom.reserved.forEach(function(obj){
                    costs.set(obj.pos.x, obj.pos.y, 0xff);
                });
            }
            
            return costs;
        },
    });
    
    if(path.path === null || !path.path.length)
        return null;
    
    // Convert the pathfinders path so that it can be used in conjunction with creep.moveByPath's structure
    let to = MakeValidPath(path.path);
    let from = MakeValidPath(_.cloneDeep(path.path).reverse());
    return { to: to, from: from };
}

function GetOptimalPathRaw(origin, goal, range = 1, ignoreReserved = false){
    let path = PathFinder.search(origin.pos, { pos: goal.pos, range: range}, {
        plainCost: 1,
        swampCost: 1,
        roomCallback: function(roomName) {
            let room = Game.rooms[roomName];
            if (!room) return;
            
            let costs = new PathFinder.CostMatrix;
            let memRoom = Memory.rooms[roomName];
            (room.find(FIND_STRUCTURES).concat(room.find(FIND_CONSTRUCTION_SITES))).forEach(function(structure) {
                if (structure.structureType === STRUCTURE_ROAD){
                    costs.set(structure.pos.x, structure.pos.y, 1);
                } else if (
                    structure.structureType !== STRUCTURE_CONTAINER && 
                    (structure.structureType !== STRUCTURE_RAMPART || !structure.my))
                {
                    costs.set(structure.pos.x, structure.pos.y, 0xff); // Mark as an obstruction
                }
            });
            
            if(!ignoreReserved){
                memRoom.reserved.forEach(function(obj){
                    costs.set(obj.pos.x, obj.pos.y, 0xff);
                });
            }
            
            return costs;
        },
    });
    
    return path;
}

// Generate a unique id for memory lookup purposes
var GenerateUID = function () {
    return '_' + Math.random().toString(36).substr(2, 9);
};

function GetLinearDistance(p1, p2){
    return Math.abs(Math.hypot(p2.x-p1.x, p2.y-p1.y));
}

// Create an array of positions as planned roads around the spawn such that other keypoints can connect to it seamlessly
function CoordCheck(coord){
    return (coord < 0 ? 0 : (coord >= 50 ? 49 : coord));
}

function GetMidpoint(p1, p2){
    return new RoomPosition(
        Math.floor((p1.x + p2.x) / 2.0),
        Math.floor((p1.y + p2.y) / 2.0), 
        p1.roomName
    );
}

function Rect(top, left, bottom, right){
    let rect = {
        top: CoordCheck(top),
        left: CoordCheck(left),
        bottom: CoordCheck(bottom),
        right: CoordCheck(right),
    };
    
    if(rect.bottom < rect.top){
        let t = rect.top;
        rect.top = rect.bottom;
        rect.bottom = t;
    }
    
    if(rect.right < rect.left){
        let t = rect.left;
        rect.left = rect.right;
        rect.right = t;
    }
    
    rect.width = Math.abs(rect.right - rect.left);
    rect.height = Math.abs(rect.top - rect.bottom);
    
    return rect;
}

function GetSurroundingPathAtRange(pos, roomName, range = 1, excludeCorners = false){
    let area = [];
    let top = CoordCheck(pos.y - range),
        left = CoordCheck(pos.x - range),
        bottom = CoordCheck(pos.y + range),
        right = CoordCheck(pos.x + range);
    
    for(let y = top; y <= bottom; y++){
        for(let x = left; x <= right; x++){
            if(excludeCorners && (
                (y === top && x === left) ||
                (y === top && x === right) ||
                (y === bottom && x === left) ||
                (y === bottom && x === right))
            ) continue;
            
            let terrain = Game.rooms[roomName].lookForAt(LOOK_TERRAIN, x, y);
            if(((y === top || y === bottom) || (x === left || x === right)) && terrain[0] !== "wall"){
                area.push(new RoomPosition(x, y, roomName));
            }
        }
    }
    return area;
}

function GetSurroundingRoadPath(pos, roomName, excludeCorners = false){
    let road = [];
    let top = pos.y - 1,
        left = pos.x - 1,
        bottom = pos.y + 1,
        right = pos.x + 1;
    let lookRes = Game.rooms[roomName].lookForAtArea(LOOK_TERRAIN, top, left, bottom, right, true);
    
    for(let i = 0; i < lookRes.length; i++){
        let obj = lookRes[i];
        
        if((obj.x === pos.x && obj.y === pos.y) || obj.terrain === "wall" || (excludeCorners && (
            (obj.y === top && obj.x === left) ||
            (obj.y === top && obj.x === right) ||
            (obj.y === bottom && obj.x === left) ||
            (obj.y === bottom && obj.x === right)))
        ) continue;
        
        road.push(new RoomPosition(obj.x, obj.y, pos.roomName));
    }
    return road;
}

function GetBuildSlots(pos, roomName){
    let surrounding = [];
    let slots = [];
    
    for(let i = 1; i <= 3; i++){
        let area = GetSurroundingPathAtRange(pos, roomName, i);
        for(let j = 0; j < area.length; j++){
            let find = Game.rooms[roomName].lookForAt(LOOK_STRUCTURES, area[j].x, area[j].y, true);
            let findConstruction = Game.rooms[roomName].lookForAt(LOOK_CONSTRUCTION_SITES, area[j].x, area[j].y, true);
            if((find.length + findConstruction.length) === 0 ){
                // Viable site to stand on
                slots.push(area[j]);
            }
        }
    }
    
    return slots;
}

function FindBuildIndexInQueue(id, roomName){
    let memRoom = Memory.rooms[roomName];
    for(let i = 0; i < memRoom.buildQueue.length; i++){
        if(memRoom.buildQueue[i].id === id)
            return i;
    }
    return null;
}

function StorePath(roomName, path, id = null){
    if(id === null)
        id = GenerateUID();
    
    Memory.rooms[roomName].paths[id] = {
        to: path.to,
        from: path.from
    };
    
    return id;
}

function CostCBReserved(roomName, cm){
    let memRoom = Memory.rooms[roomName];
    if(memRoom.memSet){
        memRoom.reserved.forEach(function(obj){
            cm.set(obj.pos.x, obj.pos.y, 0xff);
        });
    }
    return cm;
}

module.exports = {
    GetOptimalPath: GetOptimalPath,
    GenerateUID: GenerateUID,
    MakeValidPath: MakeValidPath,
    GetDirObj: GetPathPosDirs,
    GetLinearDistance: GetLinearDistance,
    GetMidpoint: GetMidpoint,
    Rect: Rect,
    GetSurroundingRoadPath: GetSurroundingRoadPath,
    GetSurroundingPathAtRange: GetSurroundingPathAtRange,
    CoordCheck: CoordCheck,
    GetBuildSlots: GetBuildSlots,
    FindBuildIndexInQueue: FindBuildIndexInQueue,
    
    GetOptimalPathRaw: GetOptimalPathRaw,
    StorePath: StorePath,
    
    CostCBReserved: CostCBReserved,
};