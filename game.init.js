// This module handles initial one-off memory loading before hooking into the main game loop

/* Analyzes all rooms for: 
    next optimal spawn placement
    optimal paths for mining from each spawn point
*/

var MOD_NAME = "game.init";

function preset(){
    DbgReport("Presetting...", DBGT_CONSOLE, DBGLVL_VERBOSE);
    
    if(!("talk" in Memory))
        Talk(false);
    if(!("dbgLevel" in Memory))
        DbgLevel(DBGLVL_VERBOSE);
}

var roomAnalysis = gTickFunction(25, MOD_NAME, "roomAnalysis", function(room){
    DbgReport("Analyzing room \"" + room.name + "\"...", DBGT_CONSOLE, DBGLVL_VERBOSE);
    
    // Check if room contains any structures that belong to us
    var structLen = room.find(FIND_MY_STRUCTURES).length;
    
    if(structLen > 0){
        room.memory.owned = true;
    }
    else
        room.memory.owned = false;
        
    // Store available sources
    var sources = room.find(FIND_SOURCES);
    room.memory.sources = sources;
    for(var i = 0; i < sources.length; i++){
        var openSlots = 0;
        for(var x = -1; x <= 1; x++){
            for(var y = -1; y <= 1; y++){
                var terrain = room.lookForAt(LOOK_TERRAIN, sources[i].pos.x + x, sources[i].pos.y + y);
                if(terrain == "plain" || terrain == "swamp"){
                    openSlots++;
                }
            }
        }
        room.memory.sources[i].openSlots = openSlots;
    }
    
    // Store spawns
    var spawns = room.find(FIND_MY_SPAWNS)
    room.memory.spawns = spawns;
}, true);

var pathAnalysis = gTickFunction(100, MOD_NAME, "roomPathing", function(room){
    if(!room.memory.owned)
        return;
    
    var spawns = room.memory.spawns;
    var sources = room.memory.sources;
    
    // Create highway paths to sources from spawns
    
    /*
    for(var i = 0; i < spawns.length; i++){
        for(var j = 0; j < sources.length; j++){
            var goal = { pos: spawns[i], range: 1 };
            var path = PathFinder.search(sources[j].pos, goal, {
                plainCost: 2,
                swampCost: 10,
                roomCallback: function(roomName){
                    var cbRoom = Game.rooms[roomName];
                    if(!cbRoom) return;
                    
                    var costs = new PathFinder.CostMatrix;
                    cbRoom.find(FIND_STRUCTURES).forEach(function(struct){
                        if(struct.structureType !== STRUCTURE_CONTAINER && 
                            (struct.structureType !== STRUCTURE_RAMPART || !struct.my)){
                                costs.set(struct.pos.x, struct.pos.y, 0xff);
                            }
                    });
                    
                    return costs;
                }
            });
            
            if(!("returnPaths" in room.memory.sources[j])){
                room.memory.sources[j].returnPaths = [];
            }
            
            var rev_path = _.clone(path, true);
            rev_path.path.reverse();
            room.memory.sources[j].returnPaths.push({
                to: path,
                from: rev_path
            });
        }
    }
    */
}, true);

module.exports = {
    preset: preset,
    roomAnalysis: roomAnalysis,
    roomPathing: pathAnalysis
};