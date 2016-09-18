let util = require("util");
let brainPlan = require("brain.plan");
let brainPath = require("brain.pathing");
let brainPlace = require("brain.placement");
let brainDbg = require("brain.dbg");
let brainBuild = require("brain.building");

/*
    The brain module handles all the decisions for each room in an effort to maximize the economy, build armies, defend, build things when they're needed.
    
    
*/

/*  The brain will scan the room as often as it can to get an accurate view of the room's current state so that the next decision it makes, makes sense.
    Adjusting the frequency of scans means less accurate decisions but saves CPU in the long run. This function is essentially the brain's eyes;
    the more often it gets to look, the better its decisions will be. 
    However, whenever creeps try to perform actions on a stored object that can't be found, it's removed manually from the room's memory.
    Conversely, when creeps are created or structures are built, they are manually added.
    This allows for normal colony functions to continue between scans, but no new decisions will be made and some may even be discarded(!)
    But a scan of the room will always get the most accurate information.
    
    A decision is defined as placing new structures (roads and walls included), room expansion, changes in room creep demands, what type of bodies the different creep roles should spawn with, 
    whether to defend, attack or do nothing about enemies. There are two types of decisions: active and passive. The former are all active decisions. 
    Passive decisions are things like spawning creeps to match the demands of the room which are done every tick, or a creep delivering resources or upgrading a controller etc.
*/
function ScanRoom(room){
    if(_.isString(room))
        room = Game.rooms[room];
    
    let scanResults = {
        my: {
            structures: {},
            sites: {},
            creeps: {}
        },
        enemy: {
            structures: {},
            sites: {},
            creeps: []
        }
    };
    
    let costStart = Game.cpu.getUsed();
    
    // Scan structures in the room hashed by structure type
    let foundStructures = room.find(FIND_STRUCTURES);
    for(let i = 0, len = foundStructures.length; i < len; i++){
        let struct = foundStructures[i];
        let fof = (struct.my ? "my" : "enemy");
        if(!scanResults[fof].structures.hasOwnProperty(struct.structureType))
            scanResults[fof].structures[struct.structureType] = [];
        scanResults[fof].structures[struct.structureType].push(struct.id);
    }
    
    // Scan construction sites in the room hashed by structure type
    let foundSites = room.find(FIND_CONSTRUCTION_SITES);
    for(let i = 0, len = foundSites.length; i < len; i++){
        let site = foundSites[i];
        let fof = (site.my ? "my" : "enemy");
        if(!scanResults[fof].sites.hasOwnProperty(site.structureType))
            scanResults[fof].sites[site.structureType] = [];
        scanResults[fof].sites[site.structureType].push(site.id);
    }
    
    // Scan creeps in the room, hash them by role if they're owned by the colony
    let foundCreeps = room.find(FIND_CREEPS);
    for(let i = 0, len = foundCreeps.length; i < len; i++){
        let creep = foundCreeps[i];
        if(creep.my){
            if(!scanResults.my.creeps.hasOwnProperty(creep.memory.role))
                scanResults.my.creeps[creep.memory.role] = [];
            scanResults.my.creeps[creep.memory.role].push(creep.id);
        }else{
            scanResults.enemy.creeps.push(creep.id);
        }
    }
    
    room.memory.scan = scanResults;
    room.memory.lastScan = Game.time;
    room.memory.lastCost = Game.cpu.getUsed() - costStart;
    room.memory.nextDecision = Game.time + 2; // Postpone for two ticks, just to be safe. Consequently, scans can't be performed with a higher frequency than this time frame + 1 (minimum 3 ticks between scans when postponed for 2 ticks)
    return scanResults;
}

function ResetPlan(room, code = 0){
    room.memory.planning.status = code;
    room.memory.planning.counter = 0;
    room.memory.planning.stage = 0;
}

function BuildingLookup(buildingType, room){
    let buildings = [];
    for(let buildId in room.memory.buildings){
        let building = room.memory.buildings[buildId];
        
        if(building.type === buildingType)
            buildings.push(building);
    }
    return buildings;
}

/* Sets a room's memory so that the brain can remember where things are and what decisions to make. Performs an initial scan of the room as well. */
function MemSet(room, plan = false){
    if(_.isString(room))
        room = Game.rooms[room];
    
    if(!Memory.settings)
        Settings();
    
    room.memory = {
        devLevel: 0,
        lastScan: -1,
        scan: null,
        lastCost: null,
        buildings: {},
        buildQueue: [],     // Buildings being constructed/waiting to be constructed
        spawnQueue: [],     // Creeps waiting to be spawned (by role)
        creeps: {},         // List of creeps by role that belong to the room
        
        sources: room.find(FIND_SOURCES).map(function(e){return {id: e.id, pos: e.pos};}),            // A list of the room's sources
        minerals: room.find(FIND_MINERALS).map(function(e){return {id: e.id, pos: e.pos};}),          // A list of the room's minerals
        paths: {},                                   // An object that stores previously calculated paths (including roads)
        
        demands: {},
        
        deferred: {}        // List of tick times to execute some deferred functions for the room
    };
    
    ScanRoom(room);
    
    if(plan)
        room.memory.planning = brainPlan.settings();
}

function Settings(extra = {}){
    Memory.settings = {
        frequencies: {
            assessDevelopmentLevel: 75,     // Roughly 5 minutes between room assessment of current development level; also updates the room's demands and build queues
            assessDemands: 20,               // How often to check for any change in the room's current demands (while things are being built, the demands may change), also updates the room's queues
            assessQueue: 10,                 // How often to alter the room's queues for creeps and buildings
            siteProcess: 10,                 // How often to process the room's current build site needs
        },
        
        showPlanning: true,             // Displays planning changes as decided by the brain
        ShowPlacement: false,           // Displays placement decisions made during planning phase
        showActivity: true,             // Shows brain activity (not including building and creep ai which happens every tick)
    }
    _.extend(Memory.settings, extra);
}

module.exports = {
    scan: ScanRoom,
    memset: MemSet,
    settings: Settings,
    dbg: brainDbg
};