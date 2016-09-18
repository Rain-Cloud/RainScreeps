let help = require("brain.activity.helpers");

/*
    Peons are one of the few jobs that don't use routes to perform tasks (also true for army jobs)
*/

function AssignPeon(room, creep){
    let memTask = creep.memory.task;
    if(memTask.type !== TASK_IDLE || memTask.target !== null)
        return false; // This peon is already performing a task
    
    // Load peon with energy from any source/container if it's carrying below minimum carry requirement
    if(creep.carryCapacity && creep.carry.energy < 49){
        let reserve = creep.carryCapacity - creep.carry.energy;
        
        // If there's a spawn with full energy, and currently meet the room's demands, go get energy from it
        if(help.hasRoomMetDemands(room)){
            let spawnTake = help.findSpawnTake(room, creep, -reserve);
            if(spawnTake !== null){
                help.taskCreep(creep, TASK_WITHDRAW, spawnTake.struct.id, spawnTake.buildId, spawnTake.struct, -reserve);
                return true;
            }
        }
        
        // Look for dropped energy in the room first
        let dropped = help.findDropped(room, creep, reserve);
        if(dropped !== null){
            help.taskCreep(creep, TASK_PICKUP, dropped.id, null, dropped, reserve, false);
            return true;
        }
        
        // If there's a mine with a container, check for some energy there
        let mine = help.findMinesWithEnergy(room, creep, reserve);
        if(mine !== null){
            help.taskCreep(creep, TASK_WITHDRAW, mine.struct.id, mine.buildId, mine.struct, -reserve);
            return true;
        }
        
        // Go harvest from a mine with an open slot
        let mineSlot = help.findMineSlot(room, creep.name);
        if(mineSlot !== null){
            help.taskCreep(creep, TASK_HARVEST, mineSlot.building.sourceId, mineSlot.building.id, mineSlot.connection, null, false);
            creep.memory.task.slotIndex = mineSlot.slotIndex;
            return true;
        }
    }else{
        // Check if a spawn needs energy if the room hasn't met the demands
        if(!help.hasRoomMetDemands(room)){
            let spawnFill = help.findSpawnFill(room, creep, creep.carry.energy);
            if(spawnFill !== null){
                help.taskCreep(creep, TASK_TRANSFER, spawnFill.struct.id, spawnFill.buildId, spawnFill.struct, creep.carry.energy);
                return true;
            }
        }
        
        // Check for a build slot to build on something to build
        let nearSite = help.findNearbySite(room, creep, creep.name);
        if(nearSite !== null){
            help.taskCreep(creep, TASK_BUILD, nearSite.site.id, null, nearSite.slotPos, null, false);
            creep.memory.task.slotIndex = nearSite.slotIndex;
            creep.memory.task.siteIndex = nearSite.siteIndex;
            return true;
        }
    }
    
    return false;
}

function RunPeon(room, creep){
    let memTask = creep.memory.task;
    if(memTask.type === TASK_IDLE || memTask.target === null)
        return false;
    
    let aboutToDie = creep.ticksToLive <= 1;
    
    if(memTask.type === TASK_HARVEST){
        let slot = room.memory.buildings[memTask.targetBuild].slots[memTask.slotIndex];
        
        if(creep.carry.energy === creep.carryCapacity || (memTask._prev && memTask._prev.count > 10) || aboutToDie){
            slot.reservedFor = null; // free the mine's harvest slot
            if(aboutToDie){
                creep.suicide();
                delete creep.memory;
                return true;
            }
            
            // Make creep go to the mine's connection again
            let building = room.memory.buildings[memTask.targetBuild];
            let connectPos = building.connections[0];
            help.taskCreep(creep, TASK_MOVE, memTask.target, memTask.targetBuild, room.memory.paths[building.paths[memTask.slotIndex]].reverse);
            return RunPeon(room, creep);
        }else{
            if(creep.pos.x === slot.x && creep.pos.y === slot.y){
                creep.harvest(Game.getObjectById(memTask.target));
            }else{
                let last = memTask.route[memTask.route.length - 1];
                if(last && creep.pos.x === last.x && creep.pos.y === last.y){
                    let mine = room.memory.buildings[memTask.targetBuild];
                    let slotPos = mine.slots[memTask.slotIndex];
                    // change path to slot index position
                    memTask.route = room.memory.paths[mine.paths[memTask.slotIndex]].forward;
                }
                
                if(!memTask["_prev"]){
                    memTask._prev = {
                        pos: creep.pos,
                        count: 0
                    };
                }
                
                creep.moveByPath(memTask.route);
                
                if(memTask._prev.pos.x === creep.pos.x && memTask._prev.pos.y === creep.pos.y){
                    memTask._prev.count++;
                }
            }
        }
        return false;
    }else if(memTask.type === TASK_TRANSFER){
        if(aboutToDie){
            help.clearTask(creep);
            creep.suicide();
            delete creep.memory;
        }
        
        let res = creep.transfer(Game.getObjectById(memTask.target), RESOURCE_ENERGY);
        if(res === ERR_NOT_IN_RANGE){
            creep.moveByPath(memTask.route);
        }else if(res === ERR_FULL || ERR_NOT_ENOUGH_RESOURCES){
            help.clearTask(creep);
            return true;
        }
    }else if(memTask.type === TASK_WITHDRAW){
        let res = creep.withdraw(Game.getObjectById(memTask.target), RESOURCE_ENERGY, (memTask.reserved ? -memTask.reserved.amount : undefined));
        if(res === ERR_NOT_IN_RANGE){
            creep.moveByPath(memTask.route);
        }else if(res === OK || res === ERR_FULL || res === ERR_NOT_ENOUGH_RESOURCES){
            help.clearTask(creep);
            return true;
        }
    }else if(memTask.type === TASK_BUILD){
        let site = room.memory.buildQueue[memTask.siteIndex];
        
        if(!site){
            help.clearTask(creep);
            return true;
        }
        
        let slot = site.slots[memTask.slotIndex];
        let gSite = Game.constructionSites[site.id];
        
        if(creep.carry.energy <= 0 || site.id === null || !gSite || gSite === null || gSite.progress >= gSite.progressTotal || (memTask._prev && memTask._prev.count > 10) || aboutToDie){
            if(slot)
                slot.reservedFor = null;
            help.clearTask(creep);
            
            if(aboutToDie){
                creep.suicide();
                delete creep.memory;
            }
            return true;
        }else{
            if(creep.pos.x === slot.x && creep.pos.y === slot.y){
                creep.build(gSite);
            }else{
                if(!memTask["_prev"]){
                    memTask._prev = {
                        pos: creep.pos,
                        count: 0
                    };
                }
                
                creep.moveByPath(memTask.route);
                
                if(memTask._prev.pos.x === creep.pos.x && memTask._prev.pos.y === creep.pos.y){
                    memTask._prev.count++;
                }
            }
        }
    }else if(memTask.type === TASK_PICKUP){
        let obj = Game.getObjectById(memTask.target);
        if(!obj || creep.carry.energy === creep.carryCapacity || memTask.target === null || aboutToDie){
            help.clearTask(creep);
            if(aboutToDie){
                creep.suicide();
                delete creep.memory;
            }
            return true;
        }else{
            let res = creep.pickup(obj);
            if(creep.pickup(obj) === ERR_NOT_IN_RANGE){
                creep.moveByPath(memTask.route);
            }else if(res === ERR_FULL){
                help.clearTask(creep);
                return true;
            }
        }
    }else if(memTask.type === TASK_MOVE){
        let last = memTask.route[memTask.route.length - 1];
        
        if((creep.pos.x === last.x && creep.pos.y === last.y) || (memTask._prev && memTask._prev.count > 10)){
            help.clearTask(creep);
        }else{
            if(!memTask["_prev"]){
                memTask._prev = {
                    pos: creep.pos,
                    count: 0
                };
            }
            
            creep.moveByPath(memTask.route);
            
            if(memTask._prev.pos.x === creep.pos.x && memTask._prev.pos.y === creep.pos.y){
                memTask._prev.count++;
            }
        }
    }
}

module.exports = {
    run: RunPeon,
    assign: AssignPeon,
};