let __globalConstants = require("global.constants");
let __globalPathing = require("global.pathing");
let __globalBuild = require("global.build");
let __globalTask = require("global.task");
let __globalBodyFactory = require("global.bodyFactory");
let __globalSpawnQueue = require("global.spawnQueue");

global.ROLE_MODULES = {};
    ROLE_MODULES[ROLE_MINER] = require("ai.role.miner");
    ROLE_MODULES[ROLE_SETTLER] = require("ai.role.settler");
    ROLE_MODULES[ROLE_ASSISTANT] = require("ai.role.assistant");
    ROLE_MODULES[ROLE_MINER_CARRIER] = require("ai.role.miner_carrier");
    ROLE_MODULES[ROLE_SETTLER_HARVESTER] = require("ai.role.settlerHarvester");

global.assert = function(value, description){
    if(value !== true){
        console.log("Assert failed! " + description);
        return false;
    }
    return true;
};

global.consoleRet = function(result){
    return "\t" + result;
}

global.PosCompare = function(posA, posB){
    if(posA.hasOwnProperty("roomName") && posB.hasOwnProperty("roomName") && posA.roomName !== posB.roomName)
        return false;
    return posA.x == posB.x && posA.y === posB.y;
}

global.DbgMessage = function(msg){
    if(Memory.debug){
        console.log("DBG: " + msg);
    }
}

global.cc = {};

module.exports = {};