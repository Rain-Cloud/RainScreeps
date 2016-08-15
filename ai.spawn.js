var _globals = require("globals");
var roleMiner = require("role.miner");

/*
    This module handles the AI for a spawn
    It has the following behaviors:
        - AI_DEFENSIVE  
        - AI_AGGRESSIVE
        - AI_NAIVE
        - AI_PASSIVE
        - AI_ADAPTIVE
    and determines what parts the corresponding roles will be built with 
*/

var availableRoles = {};

availableRoles[ROLE_MINER] = roleMiner.miner;

function calculatePartsCost(parts){
    var cost = 0;
    for(var i = 0; i < parts.length; i++){
        cost += BODYPART_COST[parts[i]];
    }
    return cost;
}

function makeCreepParts(roleDef, spawn){
    var room = spawn.room;
    var roomEnergy = room.energyAvailable;
    
    if(roomEnergy < roleDef.partsMinimumCost){
        return [];
    }
    
    var parts = roleDef.partsMinimum.slice();
    
    // Try to add more parts until there's no more energy available; distributed equally - based on the addon count/max ratio
    var currentCost = roleDef.partsMinimumCost;
    var counts = {};
    
    // Keep track of how many of each part there is
    for(var i = 0; i < roleDef.partsAddon.length; i++){
        var type = roleDef.partsAddon[i].type;
        counts[type] = 0;
        
        // Count the parts for this type
        for(var j = 0; j < parts.length; j++){
            if(parts[j] == type){
                counts[type]++;
            }
        }
    }
    
    while(true){
        // find the part addon with the lowest count/max ratio
        var ratio = 1;
        var chosenPart = null;
        
        for(var i = 0; i < roleDef.partsAddon.length; i++){
            var thisRatio = counts[roleDef.partsAddon[i].type] / parseFloat(roleDef.partsAddon[i].max);
            if(thisRatio < ratio){
                ratio = thisRatio;
                chosenPart = roleDef.partsAddon[i].type;
            }
        }
        
        if(chosenPart != null && (BODYPART_COST[chosenPart] + currentCost) <= roomEnergy){
            currentCost += BODYPART_COST[chosenPart];
            counts[chosenPart]++;
            parts.push(chosenPart);
        }else{
            break;
        }
        
    }
    
    return parts;
}

function makeDefinitions(){
    var defs = [];
    // Miner
    defs.push({
        role: ROLE_MINER,
        priority: 100,
        minLimit: 4,
        maxCost: 600,
        partsMinimum: [WORK, CARRY, MOVE],
        partsMinimumCost: BODYPART_COST[WORK] + BODYPART_COST[CARRY] + BODYPART_COST[MOVE],
        partsAddon: [
            { type: WORK, max: 4 },
            { type: CARRY, max: 6 },
            { type: MOVE, max: 5 }
        ]
    });
    
    // Upgrader
    defs.push({
        role: ROLE_UPGRADER,
        priority: 200,
        minLimit: 10,
        maxCost: 600,
        partsMinimum: [WORK, CARRY, MOVE],
        partsMinimumCost: BODYPART_COST[WORK] + BODYPART_COST[CARRY] + BODYPART_COST[MOVE],
        partsAddon: [
            { type: WORK, max: 4 },
            { type: CARRY, max: 6 },
            { type: MOVE, max: 5 }
        ]
    });
    
    // Soldier
    defs.push({
        role: ROLE_SOLDIER,
        priority: 1500,
        minLimit: 0,
        maxCost: 600,
        partsMinimum: [ATTACK, MOVE],
        partsMinimumCost: BODYPART_COST[ATTACK] + BODYPART_COST[MOVE],
        partsAddon: [
            { type: ATTACK, max: 5 },
            { type: TOUGH, max: 25 },
            { type: MOVE, max: 5 }
        ]
    });
    
    // Builder
    defs.push({
        role: ROLE_BUILDER,
        priority: 1000,
        minLimit: 3,
        maxCost: 600,
        partsMinimum: [WORK, CARRY, MOVE],
        partsMinimumCost: BODYPART_COST[WORK] + BODYPART_COST[CARRY] + BODYPART_COST[MOVE],
        partsAddon: [
            { type: WORK, max: 4 },
            { type: CARRY, max: 8 },
            { type: MOVE,  max: 5 }
        ]
    });
    
    return defs;
};

function defPriorityFilter(a, b){
    return a.priority - b.priority;
}

var spawnAI = function(spawn, spawnRoles = [ROLE_MINER, ROLE_UPGRADER, ROLE_BUILDER, ROLE_SOLDIER], behavior = AI_DEFENSIVE){
    var _self = this; // Self reference
    
    this.behavior = behavior;                   // Spawn point behavior
    this.spawn = Game.spawns[spawn];            // Spawn object reference
    this.creeps = [];                           // Array that keeps track of which creeps has this spawn as a dropoff location
    this.spawnRoles = spawnRoles;               // Array that defines what roles creeps can be spawned with at this spawn
    this.roleDefinitions = makeDefinitions();   // Array that keeps track of what parts should be built with what role
    
    // Add the spawn to memory and initialize some variables associated with it
    this.spawn.memory.creepCounts = {};
    this.spawn.memory.creepCounts[ROLE_MINER] = 0;
    this.spawn.memory.creepCounts[ROLE_UPGRADER] = 0;
    this.spawn.memory.creepCounts[ROLE_SOLDIER] = 0;
    this.spawn.memory.creepCounts[ROLE_BUILDER] = 0;
    
    var thisRoom = this.spawn.room;
    var thisCreeps = thisRoom.find(FIND_MY_CREEPS);
    
    for(var name in thisCreeps){
        var creep = thisCreeps[name];
        if(creep.memory.origin == _self.spawn.id){
            this.spawn.memory.creepCounts[creep.memory.role]++;
        }
    }
    
    // TODO: Make some adjustments based on the suggested behavior
    
    // Sort definitions by priority
    this.roleDefinitions.sort(defPriorityFilter);
    
    this.tick = function(){
        for(var i = 0; i < _self.roleDefinitions.length; i++){
            var roleDef = _self.roleDefinitions[i];
            var room = _self.spawn.room;
            
            // Check if this is one of the roles that can spawn here and that the creep count for this role is less than the minimum that should be alive
            if(_self.spawnRoles.indexOf(roleDef.role) >= 0 && _self.spawn.memory.creepCounts[roleDef.role] < roleDef.minLimit){
                // Make parts out of available energy
                var parts = makeCreepParts(roleDef, _self.spawn);
                if(_self.spawn.spawning == null && parts.length > 0 && roleDef.role in availableRoles && _.isString(_self.spawn.createCreep(parts, null, availableRoles[roleDef.role].assign(_self.spawn.id)))){
                    _self.spawn.memory.creepCounts[roleDef.role]++;
                    break; // we're done
                }
            }
        }
    }
    
    return this;
};

module.exports = {
    create: spawnAI
};