global.ROLE_MINER = "miner";
global.ROLE_HARVESTER = "harvester";
global.ROLE_CARRIER = "carrier";
global.ROLE_UPGRADER = "upgrader";
global.ROLE_BUILDER = "builder";
global.ROLE_SOLDIER = "soldier";
global.ROLE_ASSISTANT = "assistant";
global.ROLE_UNASSIGNED = "unassigned";

global.ROLES = [
    ROLE_MINER,
    ROLE_HARVESTER,
    ROLE_CARRIER,
    ROLE_UPGRADER,
    ROLE_BUILDER,
    ROLE_SOLDIER,
    ROLE_ASSISTANT,
    ROLE_UNASSIGNED
];

global.DBGT_CONSOLE = "console";
global.DBGT_SAY = "creepSay";
global.DBGLVL_NONE = 0;
global.DBGLVL_SIMPLE = 50;
global.DBGLVL_VERBOSE = 100;

global.TASK_IDLE = "idle";
global.TASK_MINE = "mine";
global.TASK_DEPOSIT = "deposit";
global.TASK_UPGRADE = "upgrade";

global.BEFORE_DEATH_RESPAWN = "respawn";

global.AI_DEFENSIVE = "defensive";
global.AI_AGGRESSIVE = "aggressive";
global.AI_NAIVE = "naive";
global.AI_PASSIVE = "passive";
global.AI_ADAPTIVE = "adpative";

global.spawnQueue = [];

// A tick function used to determine how more (or less) CPU expensive tasks should be leveraged/levelled
// This is to avoid clogging up a single game tick's CPU over the alloted amount at any time. 
// An "every" value of 0 means "execute this function every game tick". TODO: make CPU leveraging automatic based on early performance tests
global.gTickFunction = function(every, mod, name, func, exec_now){
    // Create a memory block if it doesn't exist
    if(!("tickTrack" in Memory)){
        Memory.tickTrack = {};
    }
        
    if(!(mod in Memory.tickTrack)){
        Memory.tickTrack[mod] = {};
    }
    
    if(!(name in Memory.tickTrack[mod])){
        Memory.tickTrack[mod][name] = {
            every: every,
            current: 0,
            last: Game.time
        };
        
        if(exec_now === true){
            Memory.tickTrack[mod][name].last = 0;
            Memory.tickTrack[mod][name].current = every + 1;
        }
    }
    
    var tfunc = function(){
        var current = Memory.tickTrack[mod][name].current++,
            last = Memory.tickTrack[mod][name].last,
            every = Memory.tickTrack[mod][name].every;
        
        if(Game.time - last >= every || current >= every){
            Memory.tickTrack[mod][name].current = 0;
            Memory.tickTrack[mod][name].last = Game.time;
            return func.apply(this, arguments);
        }
        return false;
    };
    
    return tfunc;
}

global.Talk = function(val){
    if(typeof val === "undefined")
        Memory.talk = !Memory.talk;
    else
        Memory.talk = val;
}

global.DbgLevel = function(level){
    Memory.dbgLevel = level;
}

global.DbgReport = function(message, type, level, creep){
    if(Memory.dbgLevel < level)
        return;
    
    if(!type || type == DBGT_CONSOLE){
        console.log(message);
    }else if(type == DBGT_SAY){
        creep.say(message);
    }
}

module.exports = {

};