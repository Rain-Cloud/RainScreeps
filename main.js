var _globals = require("globals");
var roleMiner = require('role.miner');
var helpers = require("helpers");

for(var name in Game.rooms){
    var room = Game.rooms[name];
    var sources = room.find(FIND_SOURCES);
    room.memory.sources = {};
    
    for(var i = 0; i < sources.length; i++){
        room.memory.sources[sources[i].id] = {};
        room.memory.sources[sources[i].id].free = helpers.CountOpenSquares(sources[i]);
        room.memory.sources[sources[i].id].avail = helpers.CountFreeSquares(sources[i]);
    }
}

module.exports.loop = function () {
    
    for(var name in Game.creeps) {
        var creep = Game.creeps[name];
        if(creep.memory.role == ROLE_MINER){
            roleMiner.miner.run(creep);
        }
    }
}