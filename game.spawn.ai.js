/*
    controllerLevel define what the AI should focus on spawning at any particular controller level.
    
    Property explanations:
    "role":     the role that will spawn while in the particular controller level
    "target":   the target number of creeps with this role to reach. By default, this is 0, which means the AI will heuristically determine
                how many of any given role there will be at any given time. Overriding this with a set number will disable most 
                spawn AI behaviors for that role.
    "base":     the body it must spawn with (minimum requirement to be able to spawn)
    "maxCost":  a fixed amount of energy a particular role is allowed to cost. If "costPerc" is set to true, 
                this value indicates a percentage of the current total available energy in the room it's allowed to use for spawning
    "costPerc": a boolean value indicating whether the "maxCost" value should be considered an absolute number (1 - n) or a relative (0.0 - 1.0) number.
    "upgrade":  a set of parts that define the target template parts for that role. The AI will gradually upgrade parts until reaching the
                template's target values while maintaining an AI behavior based sub-ratio. All part ratios in the set must add up to a total of 50.
                Adding a "priority" property with a number, the AI will switch to matching that number of parts first before then considering 
                normal sub-ratio based AI behavior.
*/
var controllerLevel = {};

controllerLevel[1] = [
    { role: ROLE_HARVESTER, base: [MOVE, MOVE, WORK, CARRY, CARRY] },     // Basic harvester
    { role: ROLE_UPGRADER, base: [MOVE, MOVE, WORK, CARRY, CARRY] }       // Basic upgrader
];

controllerLevel[2] = [
    { // Stationary miner that drops off energy to a nearby container
        role: ROLE_MINER,
        base: [MOVE, WORK, CARRY], 
        upgrade: [
            {part: MOVE, ratio: 10},
            {part: WORK, ratio: 10}, 
            {part: CARRY, ratio: 30}
        ]
    },
    { // Carrier creep ferrying energy around the room to various locations
        role: ROLE_CARRIER,
        base: [MOVE, MOVE, CARRY, CARRY],
        upgrade: [
            {part: MOVE, ratio: 25},
            {part: CARRY, ratio: 25}
        ]
    },
    { // Upgrader creep focused on upgrading the controller. Focused on delivering as much spare energy from containers as possible
        role: ROLE_UPGRADER, 
        base: [MOVE, WORK, CARRY],
        upgrade: [
            {part: MOVE, ratio: 10},
            {part: WORK, ratio: 15},
            {part: CARRY, ratio: 25}
        ]
    },
    { // Creep focused on going around to construction sites, building and repairing things
        role: ROLE_BUILDER, 
        base: [MOVE, WORK, CARRY, CARRY],
        upgrade: [
            {part: MOVE, ratio: 17},
            {part: CARRY, ratio: 25},
            {part: WORK, ratio: 8}
        ]
        
    },
    { 
        role: ROLE_SOLDIER, 
        base: [MOVE, MOVE, ATTACK, TOUGH, TOUGH],
        upgrade: [
            {part: MOVE, ratio: 10},
            {part: ATTACK, ratio: 14},
            {part: TOUGH, ratio: 25},
            {part: HEAL, ratio: 1}
        ]
    }
];
controllerLevel[3] = controllerLevel[2].slice();
controllerLevel[4] = controllerLevel[2].slice();
controllerLevel[5] = controllerLevel[2].slice();
controllerLevel[6] = controllerLevel[2].slice();
controllerLevel[7] = controllerLevel[2].slice();
controllerLevel[8] = controllerLevel[2].slice();
controllerLevel[9] = controllerLevel[2].slice();


function canCreateCreepStat(spawn, body){
    return Game.spawns[spawn.name].canCreateCreep(body);
}

function bodyCostCount(body){
    var sum = 0;
    for(var i = 0; i < body.length; i++){
        sum += BODYPART_COST[body[i]];
    }
    return sum;
}

function bodyPartCount(body, part){
    var sum = 0;
    for(var i = 0; i < body.length; i++){
        if(body[i] == part)
            sum++;
    }
    return sum;
}

function buildCreepStatBody(spawn, stat){
    if(typeof stat.upgrade === "undefined")
        return stat.base;
    
    var roomEnergyCap = Game.rooms[spawn.room.name].energyCapacityAvailable;
    var currentCost = bodyCostCount(stat.base);
    var body = stat.base.slice();
    var upgrade = true;
    
    while(upgrade){
        // Determine which part SHOULD be added next
        var ratios = [];
        for(var i = 0; i < stat.upgrade.length; i++){
            var c = bodyPartCount(body, stat.upgrade[i].part);
            var cRatio = parseFloat(c) / parseFloat(stat.upgrade[i].ratio);
            var rlen = ratios.length - 1;
            ratios.push({value: cRatio, part: stat.upgrade[i].part, count: c, max: stat.upgrade[i].ratio});
        }
        
        ratios.sort(function(a, b){
            return a.value - b.value;
        });
        
        // Try and add the one with lowest ratio or the one that doesn't make it go over the cap
        var added = false;
        for(var i = 0; i < ratios.length; i++){
            var newCost = currentCost + BODYPART_COST[ratios[i].part];
            // If it's below cap and doesn't go above template max ratio, add it
            if(newCost <= roomEnergyCap && ratios[i].count < ratios[i].max){
                currentCost = newCost;
                body.push(ratios[i].part);
                added = true;
                break;
            }
        }
        
        // If nothing was added, we're done upgrading the parts
        if(!added)
            upgrade = false;
    }
    
    return body;
}

function spawnCreepStat(spawn, stat){
    var body = buildCreepStatBody(spawn, stat);
    
    Memory.thenewbody = body;
    Memory.thenewbodycost = bodyCostCount(body);
}

function spawnAi(spawn){
    if(spawn.spawning)
        return;
    
    var level = Game.rooms[spawn.room.name].controller.level;
    
    if(level == 1){
        var numHarvesters = 0;
        var numUpgraders = 6;
        var sources = Memory.rooms[spawn.room.name].sources;
        for(var i = 0; i < sources.length; i++){
            numHarvesters += sources[i].openSlots;
        }
        
        controllerLevel[1][0]._hNum = numHarvesters;
        controllerLevel[1][1]._hNum = numUpgraders;
        
        // Find the one with the lowest ratio
        var val = 2.0;
        var index = -1;
        for(var i = 0; i < controllerLevel[1].length; i++){
            var ratio = parseFloat(Memory.rooms[spawn.room.name].creeps[controllerLevel[1][i].role].length) / parseFloat(controllerLevel[1][i]._hNum);
            if(ratio < val && canCreateCreepStat(spawn, controllerLevel[1][i].base)){
                val = ratio;
                index = i;
            }
        }
        
        // Make it if it's below the 100% ratio
        if(index >= 0 && val < 1.0){
            spawnCreepStat(spawn, controllerLevel[1][index]);
        }
    }else if(level == 2){
        var numMiners = 0;
        var numUpgraders = 6;
        var sources = Memory.rooms[spawn.room.name].sources;
        for(var i = 0; i < sources.length; i++){
            numMiners += sources[i].openSlots;
        }
        
        controllerLevel[2][0]._hNum = numMiners;
        controllerLevel[2][1]._hNum = numUpgraders;
        
        // Find the one with the lowest ratio
        var val = 2.0;
        var index = -1;
        for(var i = 0; i < controllerLevel[2].length; i++){
            var ratio = parseFloat(Memory.rooms[spawn.room.name].creeps[controllerLevel[2][i].role].length) / parseFloat(controllerLevel[2][i]._hNum);
            if(ratio < val && canCreateCreepStat(spawn, controllerLevel[2][i].base)){
                val = ratio;
                index = i;
            }
        }
        
        // Make it if it's below the 100% ratio
        if(index >= 0 && val < 1.0){
            spawnCreepStat(spawn, controllerLevel[2][index]);
        }
    }
}

module.exports = {
    run: spawnAi
};