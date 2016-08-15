var MOD_NAME = "game.room";

var update = gTickFunction(10, MOD_NAME, "update", function(room){
    if(!room.memory.owned)
        return;
    
    var creeps = room.find(FIND_MY_CREEPS);
    room.memory.creeps = {};
    
    for(var i = 0; i < ROLES.length; i++){
        room.memory.creeps[ROLES[i]] = [];
    }
    
    // Update room creep role memory
    for(var i = 0; i < creeps.length; i++){
        var creep = creeps[i];
        if(creep.memory.role in room.memory.creeps)
            room.memory.creeps[creep.memory.role].push(creep);
        else
            room.memory.creeps[ROLE_UNASSIGNED].push(creep);
    }
    
    // Update room game spawns
    var room_spawns = room.find(FIND_MY_SPAWNS);
    room.memory.spawns = room_spawns;
    
    DbgReport("Room \"" + room.name + "\" updated.", DBGT_CONSOLE, DBGLVL_VERBOSE);
}, true);

module.exports = {
    update: update
};