let brainSpawn = require("brain.activity.spawn");
let brainMine = require("brain.activity.mine");
let brainPeon = require("brain.job.peon");
let brainMiner = require("brain.job.miner");
let brainMinerAssist = require("brain.job.minerAssist");
let brainSiteProcess = require("brain.activity.siteProcess");

function AssessRoomDemands(room){
    let mines = _.filter(room.memory.buildings, function(o){ return o.type === BUILDING_MINE; });
    let ucenter = _.filter(room.memory.buildings, function(o){ return o.type === BUILDING_UCENTER; });
    
    if(ucenter.length)
        ucenter = ucenter[0];
    
    // Count mines and set that as the number of miners we want for the room
    if(room.memory.devLevel >= 1){
        // While in development level 1, only peons should be created. Peons perform all the foundational work for the base's economy to get up and running
        room.memory.demands = {};
        
        // Set total number of dedicated miners to be 1 per mine
        let miners = mines.length;
        
        // Set number of peons equal to available mining slots with a given margin to build and mine in parallel
        let slotsOpen = _.sum(_.map(mines, function(v){ return v.slots.length; })) - miners;
        let targetNum = Math.floor(slotsOpen * 1.34) + 1;
        
        // Look up mining assistant requirements
        let miningAssistants = 0;
        mines.forEach(function(m){
            // Must have a container buult
            if(m.slots.length > 1 && m.idStruct !== null){
                let avail = m.slots.length - 1;
                if(avail > 3)
                    avail = 3
                miningAssistants += avail;
            }
        });
        
        room.memory.demands[JOB_PEON] = targetNum;
        room.memory.demands[JOB_MINER] = miners;
        room.memory.demands[JOB_MINER_ASSIST] = miningAssistants;
    }
    
    if(room.memory.devLevel >= 2){
        // Increase peon population by half
        room.memory.demands[JOB_PEON] += Math.floor(room.memory.demands[JOB_PEON] / 2.0);
        // Assign full-time upgraders
        room.memory.demands[JOB_UPGRADER] = ucenter.slots.length;
    }
}

function AssessRoomDevelopmentLevel(room){
    if(room.devLevel <= 1){
        
    }
}

function PrepareRoomQueues(room){
    let memCreeps = room.memory.creeps;
    let memDemands = room.memory.demands;
    
    room.memory.bodyList = new brainSpawn.list(room);
    
    let repeating = 2;
    let remaining = true;
    while(remaining){
        let added = 0;
        for(let job in memDemands){
            let jobDemand = memDemands[job];
            
            if(!memCreeps.hasOwnProperty(job))
                memCreeps[job] = [];
            
            if(memCreeps[job].length < jobDemand){
                let diff = jobDemand - memCreeps[job].length;
                // Check if the queue already has that many in queue
                let queueCount = _.filter(room.memory.spawnQueue, function(o){ return o.job === job}).length;
                
                if(diff > queueCount){
                    let queueDiff = diff - queueCount;
                    if(queueDiff > repeating)
                        queueDiff = repeating;
                    // Add that many to the diff
                    let toAdd = _.times(queueDiff, _.constant({ "job": job, "belongs": room.name }));
                    room.memory.spawnQueue = room.memory.spawnQueue.concat(toAdd);
                    added++;
                }
            }
        }
        
        if(!added)
            remaining = false;
    }
    
    let buildings = room.memory.buildings;
    for(let buildId in buildings){
        let building = buildings[buildId];
        if(building.status === STATUS_NONE && building.devLevel <= room.memory.devLevel){
            // Add to build queue
            building.status = STATUS_BUILDING;  // Indicates it is in the build queue and currently underway to be worked on
            room.memory.buildQueue.push({
                status: STATUS_BUILDING,        // Status for build site
                id: null,                       // Current construction site ID to work on
                buildId: building.id,           // Id of the building it's working on
                assocType: null,                // Main type of building (STRUCTURE_x)
                slots: [],                      // Work slots available for workers to stand on while they build (should not stand on highways or reserved positions)
                regionIndex: 0,                 // If the road region of the building is being worked on, this index represents the current road it's building
                highwayIndex: 0,                // If the building has a highway, and is working on it, this represents the current id of the path it's constructing
                highwayPathIndex: 0,            // Current index of the path of the highway
            });
        }
    }
}

let brainmap = {};
// Building AI modules
brainmap[BUILDING_SPAWN] = brainSpawn;
brainmap[BUILDING_MINE] = brainMine;

// Creep AI modules
brainmap[JOB_PEON] = brainPeon;
brainmap[JOB_MINER] = brainMiner;
brainmap[JOB_MINER_ASSIST] = brainMinerAssist;

function BuildingAI(room){
    let buildings = room.memory.buildings;
    for(let buildId in buildings){
        let building = buildings[buildId];
        
        // Make sure the building has an id, and that the type of structure has an ai module
        if(!brainmap.hasOwnProperty(building.type))
            continue;
        
        if(building.idStruct !== null && !Game.structures.hasOwnProperty(building.idStruct) && room.memory.scan.my.structures[building.assocType]){
            // Remove it from the most recent scan list, if it's there
            let index = room.memory.scan.my.structures[building.assocType].indexOf(building.idStruct);
            if(index >= 0)
                room.memory.scan.my.structures[building.assocType].splice(index, 1);
                
            // Reset it so that it can be built again, when possible
            building.idStruct = null;
            continue;
        }
        
        // Redirect to structure specific AI subroutine
        brainmap[building.type].run.call(this, room, building);
    }
}

function CreepAI(room){
    let creeps = room.memory.creeps;
    // All creeps belonging to this room
    for(let job in creeps){
        let jobCreeps = creeps[job];
        for(let i = 0; i < jobCreeps.length; i++){
            let creepName = jobCreeps[i];
            if(!brainmap.hasOwnProperty(job))
                continue;
            
            if(!Game.creeps.hasOwnProperty(creepName)){
                // Remove it from the most recent scan list, if it's there
                if(room.memory.scan.my.creeps[job]){
                    let index = room.memory.scan.my.creeps[job].indexOf(Memory.creeps[creepName].id);
                    if(index >= 0)
                        room.memory.scan.my.creeps[job].splice(index, 1);
                }
                delete Memory.creeps[creepName];
                jobCreeps.splice(i, 1); i--;
                continue;
            }
            
            let creep = Game.creeps[creepName];
            if(creep.spawning)
                continue;
            
            
            if(creep.memory.id === null)
                creep.memory.id = creep.id;
            
            // Attempt to assign the creep before running any creep behavior
            brainmap[job].assign.call(this, room, creep);
            brainmap[job].run.call(this, room, creep);    
        }
    }
}

module.exports = {
    buildingAI: BuildingAI,
    creepAI: CreepAI,
    assessDemands: function(room){
        if(!room.memory.deferred.assessDemands || (room.memory.deferred.assessDemands - Game.time) <= 0){
            if(Memory.settings.showActivity)
                console.log("Activity: demands of room \"" + room.name + "\" updated");
            AssessRoomDemands(room);
            room.memory.deferred.assessDemands = Game.time + Memory.settings.frequencies.assessDemands;
        }
    },
    assessQueue: function(room){
        if(!room.memory.deferred.assessQueue || (room.memory.deferred.assessQueue - Game.time) <= 0){
            if(Memory.settings.showActivity)
                console.log("Activity: demands of room \"" + room.name + "\" updated");
            let beforeBuild = room.memory.buildQueue.length,
                beforeSpawn = room.memory.spawnQueue.length;
            PrepareRoomQueues(room);
            room.memory.deferred.assessQueue = Game.time + Memory.settings.frequencies.assessQueue;
        }
    },
    siteProcessing: function(room){
        if(Memory.settings.frequencies.siteProcess === 1 || (!room.memory.deferred.siteProcess || (room.memory.deferred.siteProcess - Game.time) <= 0)){
            if(Memory.settings.showActivity)
                console.log("Activity: demands of room \"" + room.name + "\" updated");
            brainSiteProcess.run(room);
            room.memory.deferred.siteProcess = Game.time + Memory.settings.frequencies.siteProcess;
        }
    },
    assessDevelopmentLevel: function(room){
        if(Memory.settings.frequencies.assessDevelopmentLevel === 1 || (!room.memory.deferred.assessDevelopmentLevel || (room.memory.deferred.assessDevelopmentLevel - Game.time) <= 0)){
            let before = _.cloneDeep(room.memory.devLevel);
            AssessRoomDevelopmentLevel(room);
            if(Memory.settings.showActivity && room.memory.devLevel > before){
                console.log("Activity: development level of room \"" + room.name + "\" increased from " + before + " to " + room.memory.devLevel);
            }
            
            room.memory.deferred.assessDevelopmentLevel = Game.time + Memory.settings.frequencies.assessDevelopmentLevel;
        }
    }
};