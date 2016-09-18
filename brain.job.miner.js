let help = require("brain.activity.helpers");

/*
    Miners are mindless, and will only be assigned a task once, then mine ad infinitum
*/

function AssignMiner(room, creep){
    let memTask = creep.memory.task;
    
    // Go harvest from a mine with an open slot
    let mineSlot = help.findDedicatedMineSlot(room, creep.name);
    if(mineSlot !== null){
        help.taskCreep(creep, TASK_HARVEST, mineSlot.building.sourceId, mineSlot.building.id, mineSlot.connection);
        creep.memory.task.slotIndex = mineSlot.slotIndex;
        creep.memory.task.mining = false;
        return true;
    }
    
    return false;
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
    
    if(memTask.mining){
        creep.harvest(Game.getObjectById(memTask.target));
        return false;
    }
    
    let slot = room.memory.buildings[memTask.targetBuild].slots[memTask.slotIndex];
    if(creep.pos.x === slot.x && creep.pos.y === slot.y){
        memTask.mining = true;
        return RunMiner(room, creep);
    }
    
    let last = memTask.route[memTask.route.length - 1];
    if(last && creep.pos.x === last.x && creep.pos.y === last.y){
        let mine = room.memory.buildings[memTask.targetBuild];
        let slotPos = mine.slots[memTask.slotIndex];
        memTask.route = room.memory.paths[mine.paths[memTask.slotIndex]].forward; // change route to slot
    }
    
    creep.moveByPath(memTask.route);
    return false;
}

module.exports = {
    run: RunMiner,
    assign: AssignMiner,
};