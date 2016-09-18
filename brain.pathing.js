let util = require("util");

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

function CreateBiDirectional(path){
    return { 
        start: path[0],
        end: path[path.length - 1],
        forward: MakeValidPath(path),
        reverse: MakeValidPath(_.cloneDeep(path).reverse())
    };
}

// The default pathfinding function is lacking when wanting to find the true path without terrain costs
// This function gets the path to the goal by equalizing swamps, plains and roads to simply find the shortest path while avoiding colissionable things...
function GetOptimalPath(origin, goal, range = 1, ignoreReserved = false, opts = {}){
    let path = GetOptimalPathRaw(origin, goal, range, ignoreReserved, opts);
    
    if(path.path === null || !path.path.length)
        return null;
    
    // Convert the pathfinders path so that it can be used in conjunction with creep.moveByPath's structure
    let to = MakeValidPath(path.path);
    let from = MakeValidPath(_.cloneDeep(path.path).reverse());
    return { to: to, from: from };
}

function GetOptimalPathRaw(origin, goal, range = 1, ignoreReserved = false, opts = {}, roadCost = 1, plainCost = 1, swampCost = 1){
    origin = new RoomPosition(origin.x, origin.y, origin.roomName);
    goal = new RoomPosition(goal.x, goal.y, goal.roomName);
    
    let settings = {
        plainCost: plainCost,
        swampCost: swampCost,
        roomCallback: function(roomName) {
            let room = Game.rooms[roomName];
            if (!room) return;
            
            let costs = new PathFinder.CostMatrix;
            let memRoom = Memory.rooms[roomName];
            (room.find(FIND_STRUCTURES).concat(room.find(FIND_CONSTRUCTION_SITES))).forEach(function(structure) {
                if (structure.structureType === STRUCTURE_ROAD){
                    costs.set(structure.pos.x, structure.pos.y, roadCost);
                } else if (
                    structure.structureType !== STRUCTURE_CONTAINER && 
                    (structure.structureType !== STRUCTURE_RAMPART || !structure.my))
                {
                    costs.set(structure.pos.x, structure.pos.y, 0xff); // Mark as an obstruction
                }
            });
            
            if(!ignoreReserved){
                for(let buildId in memRoom.buildings){
                    memRoom.buildings[buildId].reserved.forEach(function(res){ 
                        if(!opts.ignoreLast || !(res.x === goal.x && res.y === goal.y))
                            costs.set(res.x, res.y, 0xff); 
                    });
                }
            }
            
            if(opts.avoid){
                opts.avoid.forEach(function(r){ costs.set(r.x, r.y, 0xff); });
            }
            
            return costs;
        }
    };
    
    _.extend(settings, opts);
    
    let path = PathFinder.search(origin, { pos: goal, range: range}, settings);
    if(path.incomplete)
        path = null;
    return path;
}

let currentRoom = "";
function actPos(pos){
    if(_.isArray(pos)){
        if(pos.length > 2)
            currentRoom = pos[2];
        pos = new RoomPosition(pos[0], pos[1], currentRoom);
    }
    return pos;
}

// function GetOptimalPathArray(origin, goal, range = 1, ignoreReserved = false){
function LinePath(points, ignoreReserved = false){
    if(!_.isArray(points)){
        console.log("A line path must be described as an array of roomPosition objects, an array of arrays formatted as [[x,y,room]...] or a combination of the two");
        return false;
    }
    
    let path = []; // The final path
    path.push(actPos(points[0]));
    for(let i = 0, len = points.length; i < len; i++){
        let point = points[i];
        let next = i + 1;
        point = actPos(point);
        
        if(next < len){
            let res = GetOptimalPathRaw({pos: point}, {pos: actPos(points[next])}, 0, ignoreReserved);
            if(res.incomplete === true){
                console.log("The line could not be completed; stopped at " + point);
                return null;
            }
            
            path = path.concat(res.path);
        }
    }
    
    let to = util.MakeValidPath(path);
    let from = util.MakeValidPath(_.cloneDeep(path).reverse());
    return { to: to, from: from };
}

function _reconstruct(btrack, current){
    let path = [];
    while(btrack.hasOwnProperty(current)){
        path.push(btrack[current]);
        current = btrack[current].buildingId;
    }
    return path.reverse();
}

// Custom a* search for routes between buildings; returns an array of buildings, associated path and direction to use for that path to reach the destination building
function GetRouteBetweenBuildings(buildAId, buildBId, room){
    let closed = [];
    let open = [buildAId];
    let btrack = {};
    let score = {};
    
    score[buildAId] = 0;
    
    while(open.length){
        let current = open[0];
        
        if(current === buildBId)
            return _reconstruct(btrack, current);
        
        closed.push(current);
        open.splice(0, 1);
        
        // Neighbours are the "highways" that connect buildings
        let highways = room.memory.buildings[current].highways;
        for(let i = 0; i < highways.length; i++){
            let highway = highways[i];
            let neighborId, highwayDirection;
            
            // Find the neighbor highway
            if(highway.from === current){
                neighborId = highway.to;
                highwayDirection = "forward";
            }else if(highway.to === current){
                neighborId = highway.from;
                highwayDirection = "reverse";
            }else{
                // Highway isn't connected to this building.. uuhh this shouldnt happen <_<'
                console.log("GetRouteBetweenBuildings (brain.pathing): u wot m8?");
                continue;
            }
            
            // Already evaluated?
            if(closed.indexOf(neighborId) >= 0)
                continue;
            
            // Get the distance of the highway and the potential score
            let dist = room.memory.paths[highway.path][highwayDirection].length;
            let thisScore = (!score[current] ? 0 : score[current]) + dist;
            
            // New node? evaluate l8er bby
            if(!open.indexOf(neighborId) >= 0)
                open.push(neighborId);
            // Is this node longer than the one we've got?
            else if(thisScore >= score[neighborId])
                continue; // fuck it
            
            
            // Store the data & score for this node
            btrack[neighborId] = {
                buildingId: current,
                path: highway.path,
                direction: highwayDirection
            };
            score[neighborId] = thisScore;
        }
    }
    
    return null; // Couldn't find a path to the building - shouldn't happen if planned correctly
}

function InvertRoute(route){
    let newRoute = [];
    for(let i = route.length - 1; i >= 0; i--){
        let reversedNode = _.cloneDeep(route[i]);
        reversedNode.direction = (reversedNode === "forward" ? "reverse" : "forward");
        newRoute.push(reversedNode);
    }
    return newRoute;
}

global.ATest = GetRouteBetweenBuildings;
global.MakePath = LinePath;

module.exports = {
    route: GetRouteBetweenBuildings,
    routeInvert: InvertRoute,
    bidirectional: CreateBiDirectional,
    find: GetOptimalPath,
    raw: GetOptimalPathRaw
};