let util = require("util");
let brainPath = require("brain.pathing");

function IsSquareReserved(room, x, y){
    let buildings = room.memory.buildings;
    
    for(let buildId in buildings){
        let reserved = buildings[buildId].reserved;
        for(let i = 0, len = reserved.length; i < len; i++){
            if(reserved[i].x === x && reserved[i].y === y)
                return true;
        }
    }
    return false;
}

function IsSquareClear(room, x, y){
    let looking = room.lookAt(x, y);
    for(let i = 0, len = looking.length; i < len; i++){
        let obj = looking[i];
        if((obj.type === LOOK_TERRAIN && obj[LOOK_TERRAIN] === "wall") || 
            ((obj.type === LOOK_STRUCTURES || obj.type === LOOK_CONSTRUCTION_SITES) && (!obj[obj.type].my || (obj[obj.type].structureType !== STRUCTURE_RAMPART && obj[obj.type].structureType !== STRUCTURE_ROAD)))
        ){
            return false;
        }
    }
    return true;
}

function IsSurroundingClear(pX, pY, roomName, range = 1, checkReserved = true, checkClear = true){
    let top = pY - range, left = pX - range, bottom = pY + range, right = pX + range;
    let room = Game.rooms[roomName];
    for(let y = top; y <= bottom; y++){
        if(y < 0 || y >= 50)
            continue;
        
        for(let x = left; x <= right; x++){
            if(pX === x && pY === y || (x < 0 || x >= 50))
                continue;
            
            if((checkReserved && IsSquareReserved(room, x, y)) || (checkClear && !IsSquareClear(room, x, y)))
                return false;
        }
    }
    return true;
}

// Gets open squares (with valid terrain and no structures or construction sites, and isn't reserved) in a square around the given position and range (x5y5 range 2 means x3-7 y3-7)
function GetSquaresFromCenter(pos, roomName, range = 1, checkReserved = true, checkClear = true){
    let area = [];
    let top = pos.y - range, left = pos.x - range, bottom = pos.y + range, right = pos.x + range;
    let room = Game.rooms[roomName];
    
    for(let y = top; y <= bottom; y++){
        if(y < 0 || y >= 50)
            continue;
        
        for(let x = left; x <= right; x++){
            if(x < 0 || x >= 50)
                continue;
            
            if((y !== top && y !== bottom && x !== left && x !== right) || 
                (checkReserved && IsSquareReserved(room, x, y)) || 
                (checkClear && !IsSquareClear(room, x, y))
            ) continue;
            area.push(new RoomPosition(x, y, roomName));
        }
    }
    return area;
}

function _sortByLinearDistance(a, b){
    return util.GetLinearDistance(a, posController) - util.GetLinearDistance(b, posController);
}

function _sortByRangeAndSlots(a,  b){
    return a.slots.length - b.slots.length || a.dist - b.dist;
}

// Yeah.. it's a long name but... how the fuck else am I supposed to name it lol >_<
function GetLocationRelativeToPositionAndRangeWithSlots(buildId, posTarget, room, initRange = 3, acceptSlots = 4, checkReserved = true){
    // Get surrounding squares in a square around the controller
    let possibleLocations;
    let connectionsByOrder = room.memory.buildings[buildId].connections.sort(function(a, b){
        return util.GetLinearDistance(a, posTarget) - util.GetLinearDistance(b, posTarget);
    });
    
    let currentCandidate = {
        loc: null,
        path: null,
        slots: null
    };
    
    let tryRange = initRange;
    do{
        possibleLocations = GetSquaresFromCenter(room.controller.pos, room.name, tryRange, checkReserved, true);
        
        // Go through all possible locations
        for(let i = 0, len = possibleLocations.length; i < len; i++){
            let location = possibleLocations[i];
            let prepPath = null;
            
            // Check each connection from the base spawn and see if there's a valid path to it, starting with the closest
            for(let j = 0, jlen = connectionsByOrder.length; j < jlen; j++){
                let tmpPath = brainPath.raw(location, connectionsByOrder[j], 0, true, {
                    maxRooms: 1
                }); // Can it reach the building's connection?
                if(tmpPath !== null){
                    prepPath = tmpPath;
                    break;
                }
            }
            
            if(prepPath === null)
                continue; // bad location, couldn't find a path back to spawn
            
            // Check all squares that are within range 3 of the controller, around the location. Best is 4 upgrading slots
            let nearbySquares = GetSquaresFromCenter(location, room.name, 1, checkReserved, true);
            for(let j = 0; j < nearbySquares.length; j++){
                let nearbySquare = nearbySquares[j];
                
                // Remove it if it's farther than 3 squares away, or is in the way of entry to the center
                if((tryRange >= 3 && !nearbySquare.inRangeTo(room.controller, 3)) || (nearbySquare.x === prepPath.path[0].x && nearbySquare.y === prepPath.path[0].y)){
                    nearbySquares.splice(j, 1); j--;
                }
            }
            
            // Add the location to the candidates if it has at least 1 slot to work in
            if(nearbySquares.length && (currentCandidate.loc === null || 
                    nearbySquares.length > currentCandidate.slots.length || 
                    (nearbySquares.length >= currentCandidate.slots.length && prepPath.path.length < currentCandidate.path.length))
            ){
                currentCandidate.loc = location;
                currentCandidate.path = prepPath.path;
                currentCandidate.slots = nearbySquares;
            }
        }
        
        tryRange--;
    } while(tryRange > 0 && (currentCandidate.loc !== null && currentCandidate.slots.length < acceptSlots));
    
    // If there are no candidates, we should report back
    if(currentCandidate.loc === null)
        return null;
        
    // Trim the work slots to match the acceptSlots
    if(currentCandidate.slots.length > acceptSlots){
        let diff = (currentCandidate.slots.length - acceptSlots);
        // Sort by farthest away from controller
        currentCandidate.slots.sort(function(a, b){
            return util.GetLinearDistance(b, posTarget) - util.GetLinearDistance(a, posTarget);
        }).splice((-1 * diff), diff);
    }

    return currentCandidate;
}

function GetClosestToConnection(buildA, pos, room){
    let connsA = buildA.connections;
    
    let ret = {
        dist: null,
        pos: null,
        index: null,
    }
    
    for(let i = 0, aLen = connsA.length; i < aLen; i++){
        let dist = util.GetLinearDistance(connsA[i], pos);
        
        if(ret.dist === null || dist < ret.dist){
            ret.dist = dist;
            ret.pos = connsA[i];
            ret.index = i;
        }
    }
    
    return (ret.dist !== null ? ret : null);
}

function GetClosestConnections(buildA, buildB, room){
    let connsA = buildA.connections,
        connsB = buildB.connections;
    
    let ret = {
        dist: null,
        posA: null,
        posB: null,
        indexA: null,
        indexB: null
    };
    
    for(let i = 0, aLen = connsA.length; i < aLen; i++){
        for(let j = 0, bLen = connsB.length; j < bLen; j++){
            let dist = util.GetLinearDistance(connsA[i], connsB[j]);
            
            if(ret.dist === null || dist < ret.dist){
                ret.dist = dist;
                ret.posA = connsA[i];
                ret.posB = connsB[j];
                ret.indexA = i;
                ret.indexB = j;
            }
        }
    }
    
    return (ret.dist !== null ? ret : null);
}

function GetClosestBuilding(buildStartId, room){
    let buildings = room.memory.buildings;
    let buildStart = buildings[buildStartId];
    
    // Find the closest building (by path) in the room
    let closestBuilding = {
        path: null,
        buildingId: null,
        dist: null
    };
    
    for(let buildId in buildings){
        if(buildId === buildStartId)
            continue;
        
        let building = buildings[buildId];
        let connInfo = GetClosestConnections(buildStart, building, room);
        let pth = brainPath.raw(connInfo.posA, connInfo.posB, 0, false, {
            ignoreLast: true,
            maxRooms: 1
        });
        
        if(!pth)
            continue;
            
        pth = pth.path;
        pth.unshift(connInfo.posA);
        
        if(closestBuilding.dist === null || (pth.length < closestBuilding.dist && pth.length >= 2)){
            closestBuilding.path = pth;
            closestBuilding.buildingId = buildId;
            closestBuilding.dist = pth.length;
        }
    }
    
    if(closestBuilding.path === null)
        return null;
    
    closestBuilding.path = brainPath.bidirectional(closestBuilding.path);
    return closestBuilding;
}

function _rangePathsOk(pos, refPoints, checkReserved = true){
    let paths = [];
    for(let i = 0, len = refPoints.length; i < len; i++){
        let tryPath = brainPath.raw(pos, refPoints[i], 0, checkReserved, {maxRooms: 1});
        
        if(tryPath === null){
            break;
        }else{
            paths.push(tryPath);
        }
    }
    return paths;
}

function _surroundOk(pos, refPoints, checkReserved = true){
    let squares = GetSquaresFromCenter(pos, pos.roomName, 1, checkReserved, true);
    let squareClear = IsSquareClear(Game.rooms[pos.roomName], pos.x, pos.y);
    let paths = _rangePathsOk(pos, refPoints, checkReserved);
    
    if(squares.length < 8 || !squareClear || paths.length < refPoints.length)
        return null;
        
    return {
        loc: pos,
        slots: squares,
        paths: paths,
    };
}

// Again.. yeah... long fuckin name. HALP. MAKE ME STAHP.
// ..buuut, short explanation of searchLimit is that it's the radius of tiles to search from the midpoint
// and it only searches the nearest tiles of the midpoint, giving an area of 3x3
function GetLocationRelativeBetweenBuildingsAndRange(buildAId, buildBId, room, searchLimit = 8, checkReserved = true){
    let buildA = room.memory.buildings[buildAId],
        buildB = room.memory.buildings[buildBId];
    
    // Find two connections from both buildings that are the closest to each other
    let conns = GetClosestConnections(buildA, buildB, room);
    let midPoint = util.GetMidpoint(conns.posA, conns.posB);
    let refPoints = [conns.posA, conns.posB];
    
    // Check midpoint
    let check = _surroundOk(midPoint, refPoints, checkReserved);
    
    if(check !== null){
        return check;
    }else{
        for(let i = 2; i <= searchLimit; i += 2){
            let squares = GetSquaresFromCenter(midPoint, room.name, i, checkReserved, true);
            let results = [];
            let closest = null;
            let dist = null;
            
            for(let j = 0, len = squares.length; j < len; j++){
                check = _surroundOk(squares[j], refPoints, checkReserved);
                
                if(check !== null){
                    let thisDist = util.GetLinearDistance(check.loc, midPoint);
                    if(dist === null || thisDist < dist){
                        dist = thisDist;
                        closest = check;
                    }
                }
            }
            
            if(closest !== null)
                return closest;
        }
    }
    
    return null;
}

function GetLocationForMine(buildAId, sourcePos, room, checkReserved = true){
    let buildA = room.memory.buildings[buildAId];
    
    // Try to make a path to one of the building's connections, starting with the closest
    let connectionsByOrder = buildA.connections.sort(function(a, b){
        return util.GetLinearDistance(a, sourcePos) - util.GetLinearDistance(b, sourcePos);
    });
    
    let prepPath;
    for(let j = 0, jlen = connectionsByOrder.length; j < jlen; j++){
        let tmpPath = brainPath.raw(sourcePos, connectionsByOrder[j], 0, !checkReserved, {
            ignoreLast: true,
            maxRooms: 1
        }); // Can it reach the building's connection?
        if(tmpPath !== null){
            prepPath = tmpPath;
            break;
        }
    }
    
    // Couldn't make a path
    if(!prepPath)
        return null;
    
    // Make the 0th position a dedicated slot, and the center of the mine's building
    let slots = GetSquaresFromCenter(sourcePos, room.name, 1, checkReserved, true);
    let dedicatedSlot = _.cloneDeep(slots.find(function(e){ return e.x === prepPath.path[0].x && e.y === prepPath.path[0].y}));
    let connection = _.cloneDeep(prepPath.path[1]); // Make the 1th position a connection to the mine
    let path = prepPath.path.slice(1); // Store the path to storage, it's going to be stored automatically
    
    return {
        loc: dedicatedSlot,     // dedicated work slot for a miner (not harvester)
        slots: slots,     // work slots for the mine
        conn: connection, // connection to mine building
    };
}

global.t = GetLocationForMine;

// find a spot for an upgrade center near a controller and in relation to a building in the room, previously defined by the AI
function GetUpgradeCenterLocation(buildId, room, checkReserved = true){
    return GetLocationRelativeToPositionAndRangeWithSlots(buildId, room.controller.pos, room, 3, 4, checkReserved);
}

// Preferably placed between the room's base spawn and upgrading center
function GetStorageLocation(buildAId, buildBId, room, limit = 8, checkReserved = true){
    return GetLocationRelativeBetweenBuildingsAndRange(buildAId, buildBId, room, limit, checkReserved);
}

function GetHighway(room, buildAId, buildBId, checkReserved = true){
    let buildA = room.memory.buildings[buildAId],
        buildB = room.memory.buildings[buildBId];
    
    let connInfo = GetClosestConnections(buildA, buildB, room);
    let pth = brainPath.raw(connInfo.posA, connInfo.posB, 0, !checkReserved, {
        ignoreLast: true,
        maxRooms: 1
    });
    
    if(!pth)
        return null;
        
    pth = pth.path;
    pth.unshift(connInfo.posA)
    
    return {
        id: util.GenerateUID(),
        from: buildAId,
        to: buildBId,
        path: brainPath.bidirectional(pth)
    };
}

global.test = GetHighway;

module.exports = {
    IsReserved: IsSquareReserved,
    IsClear: IsSquareClear,
    IsClearSurround: IsSurroundingClear,
    GetRing: GetSquaresFromCenter,
    GetCloseConnections: GetClosestConnections,
    GetClosestBuilding: GetClosestBuilding,
    
    highway: GetHighway,
    ucenter: GetUpgradeCenterLocation,
    storage: GetStorageLocation,
    mine: GetLocationForMine,
    extractor: GetLocationForMine,
};