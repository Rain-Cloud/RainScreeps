let util = require("util");
let brainPath = require("brain.pathing");

function Building(pos, type, typeStruct, devLevel){
    this.id = util.GenerateUID();       // Building reference
    this.type = type;                   // Type of building
    this.assocType = typeStruct;        // Type of structure associated with the building's center (pos)
    this.status = STATUS_NONE;          // Current status of the building
    this.idStruct = null;               // Id of the associated structure, that presumably exists
    this.pos = pos;                     // The main position, center, of the building
    this.connections = [];              // List of connections the building has available for roads to connect to
    this.reserved = [];                 // Miscellaneous reserved positions for this building
    this.roadRegion = [];               // Array of positions that are meant to be paved into roads
    this.devLevel = devLevel;           // The room's development level at which to build/the building should exist with the associated structure of the building
    this.paths = [];                    // Paths within the building itself, such as how to move from each connection internally
    this.highways = [];                 // Paths that lead to and from any of the building's connections
    this.roadRegionBuilt = false;       // Whether the road region has been built or not
}

function getOpenPositions(room, pos){
    let slots = [];
    let potentialSlots = room.lookAtArea(pos.y - 1, pos.x - 1, pos.y + 1, pos.x + 1);
    
    for(let y in potentialSlots){
        for(let x in potentialSlots[y]){
            if(pos.x == x && pos.y == y)
                continue;
            
            let at = potentialSlots[y][x];
            let ok = true;
            for(let i = 0, len = at.length; i < len; i++){
                let objAt = at[i];
                if((objAt.type === LOOK_TERRAIN && objAt[LOOK_TERRAIN] === "wall") ||
                    (objAt.type === LOOK_STRUCTURES && ((objAt[LOOK_STRUCTURES].type !== STRUCTURE_ROAD && objAt[LOOK_STRUCTURES].type !== STRUCTURE_RAMPART) || !objAt[LOOK_STRUCTURES].my))
                ){
                    ok = false;
                    break;
                }
            }
            
            // slot is ok to mine
            if(ok)
                slots.push(new RoomPosition(x, y, room.name));
        }
    }
    
    return slots;
}

function getOrthogonal(arrPossible, pos){
    let orthogonals = [];
  
    for(let x = -1; x <= 1; x++){
        for(let y = -1; y <= 1; y++){
            if(Math.abs(x) === Math.abs(y))
                continue;
            
            let pos_match = new RoomPosition(pos.x + x, pos.y + y, pos.roomName);
            let ortho = arrPossible.find(function(p){ 
                return p.x === pos_match.x && p.y === pos_match.y; 
            });
            
            if(ortho){
                orthogonals.push(ortho);
            }
        }
    }
    return orthogonals;
}

function getDiagonals(arrPossible, pos){
    let diagonals = [];
    for(let x = -1; x <= 1; x+= 2){
        for(let y = -1; y <= 1; y+= 2){
            let pos_match = {x: pos.x + x, y: pos.y + y};
            let diagonal = arrPossible.find(function(p){ return p.x === pos_match.x && p.y === pos_match.y; });
            if(diagonal)
                diagonals.push(diagonal);
        }
    }
    return diagonals;
}

function BuildSpawn(pos, devLevel = -1){
    Building.call(this, pos, BUILDING_SPAWN, STRUCTURE_SPAWN, devLevel);
    let room = Game.rooms[pos.roomName];
    this.roadRegion = getOpenPositions(room, pos);
    this.reserved = _.cloneDeep(this.roadRegion).concat([pos]);
    this.connections = getOrthogonal(this.roadRegion, pos);
}

function BuildUpgradeCenter(pos, connectionPos, slots, devLevel = -1){
    Building.call(this, pos, BUILDING_UCENTER, STRUCTURE_CONTAINER, devLevel);
    let room = Game.rooms[pos.roomName];
    this.slots = slots;
    this.roadRegion = _.cloneDeep(slots).concat([pos, connectionPos]);
    this.connections = [connectionPos];
    this.reserved = _.cloneDeep(this.roadRegion);
}

function BuildStorage(pos, slots, devLevel = -1){
    let room = Game.rooms[pos.roomName];
    Building.call(this, pos, BUILDING_STORAGE, STRUCTURE_STORAGE, devLevel);
    this.roadRegion = slots;
    this.connections = getOrthogonal(this.roadRegion, pos);
    this.reserved = _.cloneDeep(slots).concat([pos]);
}

function BuildMine(room, sourceId, slots, dedSlot, conn, devLevel = -1){
    Building.call(this, dedSlot, BUILDING_MINE, STRUCTURE_CONTAINER, devLevel);
    this.slots = slots;
    this.sourceId = sourceId;
    this.connections.push(conn);
    
    // Make internal paths leading to the connection from the different work slots
    for(let i = 0; i < this.slots.length; i++){
        // avoid all other slots because they are technically reserved
        let avoid = _.cloneDeep(this.slots);
        avoid.splice(i, 1); 
        
        let pth = brainPath.raw(conn, this.slots[i], 0, false, {
            avoid: avoid, 
            maxRooms: 1,
        });
        
        if(pth === null){
            // remove the slot because it cant be connected internally
            this.slots.splice(i, 1); i--;
            continue;
        }
        
        pth = pth.path;
        
        // add to building's reserved and road region
        for(let j = 0, jlen = pth.length; j < jlen; j++){
            this.roadRegion.push(pth[j]);
            this.reserved.push(pth[j]);
        }
        
        pth.unshift(conn);
        
        // Store path in room paths
        let pathid = util.GenerateUID();
        room.memory.paths[pathid] = brainPath.bidirectional(pth);
        this.paths.push(pathid);
    }
    
    this.roadRegion = this.roadRegion.concat([conn, this.pos]);
    this.reserved = this.reserved.concat([conn, this.pos]); // reserve all
}

function BuildExtractor(room, sourceId, slots, dedSlot, conn, devLevel = -1){
    Building.call(this, dedSlot, BUILDING_EXTRACTOR, STRUCTURE_EXTRACTOR, devLevel);
    this.slots = slots;
    this.sourceId = sourceId;
    this.connections.push(conn);
    
    // Make internal paths leading to the connection
    for(let i = 0; i < this.slots.length; i++){
        // ignore the dedicated slot, because it will always be next to the connection
        if(this.slots[i].x === this.pos.x && this.slots[i].y === this.pos.y)
            continue;
        
        // avoid all other slots because they are technically reserved
        let avoid = _.cloneDeep(this.slots);
        avoid.splice(i, 1); 
        
        let pth = brainPath.raw(conn, this.slots[i], 0, false, {
            avoid: avoid, 
            maxRooms: 1,
        });
        
        if(pth === null){
            // remove the slot because it cant be connected internally
            this.slots.splice(i, 1); i--;
            continue;
        }
        
        pth = pth.path;
        
        // add to building's reserved and road region
        for(let j = 0, jlen = pth.length; j < jlen; j++){
            this.roadRegion.push(pth[j]);
            this.reserved.push(pth[j]);
        }
        
        pth.unshift(conn);
        
        // Store path in room paths
        let pathid = util.GenerateUID();
        room.memory.paths[pathid] = brainPath.bidirectional(pth);
        this.paths.push(pathid);
    }
    
    this.roadRegion = this.roadRegion.concat([conn, this.pos]);
    this.reserved = this.reserved.concat([conn, this.pos]); // reserve all
}

module.exports = {
    spawn: BuildSpawn,
    mine: BuildMine,
    extractor: BuildExtractor,
    storage: BuildStorage,
    ucenter: BuildUpgradeCenter,
};