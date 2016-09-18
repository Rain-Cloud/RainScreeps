let help = require("brain.activity.helpers");

/*
    Miners are mindless, and will only be assigned a task once, then mine ad infinitum
*/

function AssignMiner(room, creep){
    let memTask = creep.memory.task;
    
    if(memTask.moving)
        return true;
    
    if(!memTask.hasOwnProperty("slotIndex")){
        // Attempt to reserve a mining slot indefinitely and go there
        let mineSlot = help.findMineSlot(room, creep.name);
        if(mineSlot !== null){
            help.taskCreep(creep, TASK_HARVEST, mineSlot.building.sourceId, mineSlot.building.id, mineSlot.connection, null, false);
            creep.memory.task.slotIndex = mineSlot.slotIndex;
            creep.memory.task.moving = true;
            return true;
        }
    }
    
    // Is the miner close to full?
    let building = room.memory.buildings[memTask.targetBuild];
    if(creep.carry.energy >= creep.carryCapacity * 0.8){
        // Drop it off at the building's container
        let path = room.memory.paths[building.paths[memTask.slotIndex]].reverse;
        help.taskCreep(creep, TASK_TRANSFER, building.idStruct, building.id, path, creep.carry.energy);
        return true;
    }
    
    // Go back to mine
    let path = room.memory.paths[building.paths[memTask.slotIndex]].forward;
    help.taskCreep(creep, TASK_HARVEST, building.sourceId, building.id, path, null);
    return true;
}

function RunMiner(room, creep){
    let memTask = creep.memory.task;
    if(memTask.type === TASK_IDLE || memTask.target === null)
        return false;
    
    if(creep.ticksToLive <= 1){
        let slot = room.memory.buildings[memTask.targetBuild].slots[memTask.slotIndex];
        slot.reservedFor = null; // free the mine's harvest slot
        creep.suicide();
        delete creep.memory;
        return true;
    }
    
    if(memTask.type === TASK_HARVEST){
        if(creep.carry.energy === creep.carryCapacity){
            AssignMiner(room, creep);
            return RunMiner(room, creep);
        }
        
        if(creep.harvest(Game.getObjectById(memTask.target)) === ERR_NOT_IN_RANGE){
            if(memTask.moving){
                let last = memTask.route[memTask.route.length - 1];
                if(last && creep.pos.x === last.x && creep.pos.y === last.y){
                    let building = room.memory.buildings[memTask.targetBuild];
                    let path = room.memory.paths[building.paths[memTask.slotIndex]].forward;
                    memTask.route = path;
                    memTask.moving = false;
                }
            }
            
            creep.moveByPath(memTask.route);
        }
        return false;
    }
    
    if(memTask.type === TASK_TRANSFER){
        let res = creep.transfer(Game.getObjectById(memTask.target), RESOURCE_ENERGY);
        if(res === ERR_NOT_IN_RANGE){
            creep.moveByPath(memTask.route);
        }else if(res === OK || res === ERR_FULL || ERR_NOT_ENOUGH_RESOURCES){
            AssignMiner(room, creep);
            if(creep.memory.task.type !== TASK_TRANSFER)
                return RunMiner(room, creep);
        }
    }
    return false;
}

module.exports = {
    run: RunMiner,
    assign: AssignMiner,
};