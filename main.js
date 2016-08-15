var _globals = require("globals");
var spawnAI = require("ai.spawn");
var spawn1AI = spawnAI.create("Spawn1");
var roleMiner = require("role.miner");
var gameSpawnAi = require("game.spawn.ai");

var gameInit = require("game.init");
var gameRoom = require("game.room");

gameInit.preset();

module.exports.loop = function () {
    spawn1AI.tick();
    
    for(var name in Game.creeps) {
        var creep = Game.creeps[name];
    
        if(creep.memory.role == ROLE_MINER){
            roleMiner.miner.run(creep);
        }
    }
    
    for(var name in Game.rooms){
        gameInit.roomAnalysis(Game.rooms[name]);
        gameInit.roomPathing(Game.rooms[name]);
        gameRoom.update(Game.rooms[name]);
        
        if(Game.rooms[name].memory.owned){
            // Run spawn AI
            for(var i = 0; i < Game.rooms[name].memory.spawns.length; i++){
                gameSpawnAi.run(Game.rooms[name].memory.spawns[i])
            }
        }
    }
}