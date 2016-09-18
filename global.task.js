let util = require("util");

// Give creep a task to perform on the given target. Optionally provide a path that it will follow (assumes it is already on the path)
// If override is set to true, it will override the current task with the new one
function TaskCreep(creepName, task_type = "idle", target = null, extra = {}, path = null, override = false){
    let memCreep;
    
    if(creepName !== null && _.isObject(creepName)){
        if(!creepName.hasOwnProperty("creep"))
            return false;
            
        memCreep = Memory.creeps[creepName.creep];
        
        if(creepName.hasOwnProperty("override") && creepName.override === false && memCreep.task.target !== null)
            return false;
        
        memCreep.task.type = (creepName.hasOwnProperty("type") ? creepName.type : TASK_IDLE);
        memCreep.task.target = (creepName.hasOwnProperty("target") ? creepName.target : null);
        memCreep.task.extra = (creepName.hasOwnProperty("extra") ? creepName.extra : {});
        memCreep.task.path = (creepName.hasOwnProperty("path") ? creepName.path : null);
        
        if(_.isNumber(memCreep.task.target)){
            memCreep.task.target = GetTargetByArgument(creepName, memCreep.task.target);
        }
        
    }else{
        memCreep = Memory.creeps[creepName];
        if(memCreep.task.target !== null && override === false)
            return false;
        
        if(_.isNumber(target)){
            target = GetTargetByArgument(creepName, target).id;
        }
        
        memCreep.task.type = task_type;
        memCreep.task.target = target;
        memCreep.task.extra = extra;
        memCreep.task.path = path;
    }
    
    if(_.isArray(memCreep.task.target)){
        memCreep.task.target = new RoomPosition(memCreep.task.target[0], memCreep.task.target[1], (memCreep.task.target.length > 2 ? memCreep.task.target[2] : Game.creeps[creepName].room.name));
    }else if(_.isObject(memCreep.task.target)){
        memCreep.task.target = new RoomPosition(memCreep.task.target.x, memCreep.task.target.y, 
            (memCreep.task.target.hasOwnProperty("room") ? memCreep.task.target.room : 
                (memCreep.task.target.hasOwnProperty("roomName") ? memCreep.task.target.roomName : Game.creeps[creepName].room.name)));
    }
    
    return true;
};

// Signal that the creep has finished its task, and resets the task object
function TaskComplete(creepName){
    let memCreep = Memory.creeps[creepName];
    memCreep.task.target = null;
    memCreep.task.type = TASK_IDLE;
    memCreep.task.extra = {};
    memCreep.task.path = null;
}

// Algorithm for how to reach the task
function MoveCreepToTask(creepName, objTarget, opt){
    let creep = Game.creeps[creepName];
    let memCreep = Memory.creeps[creepName];
    let memRoom = Memory.rooms[creep.room.name];
    
    if(memCreep.task.path !== null){
        return creep.moveByPath(memCreep.task.path);
    }else{
        let opts = {};
        opts.costCallback = util.CostCBReserved;
        if(!_.isObject(memCreep.task.target)){
            return creep.moveTo(objTarget, opts);
        }else{
            let pos = new RoomPosition(objTarget.x, objTarget.y, objTarget.roomName);
            return creep.moveTo(pos, opts);
        }
    }
}

// Manages resource tasking (when resource amounts are involved) and keeps track of when the resource task is considered complete
function UpdateResourceTask(creepName, bTake = false){
    let memCreep = Memory.creeps[creepName];
    let creep = Game.creeps[creepName];
    
    if(!memCreep.task.extra.hasOwnProperty("resource"))
        memCreep.task.extra.resource = RESOURCE_ENERGY;
    
    if(!memCreep.task.extra.hasOwnProperty("amount"))
        // if no amount was specified, try to fill remaining available carry space or get rid of available carry depending on bTake
        memCreep.task.extra.amount = (!bTake ? creep.carryCapacity - _.sum(creep.carry) : creep.carry[memCreep.task.extra.resource]); 
    
    if(!memCreep.task.extra.hasOwnProperty("filled"))
        memCreep.task.extra.filled = 0; // 0 of memCreep.task.extra.amount filled
    
    if(!memCreep.task.extra.hasOwnProperty("lastCarry"))
        memCreep.task.extra.lastCarry = creep.carry[memCreep.task.extra.resource]; // set it to our resource if there isn't one already
    
    // Calculate delta value
    memCreep.task.extra.delta = Math.abs(creep.carry[memCreep.task.extra.resource] - memCreep.task.extra.lastCarry);
    
    // Update the filled value if there's a change
    if(memCreep.task.extra.delta > 0)
        memCreep.task.extra.filled += memCreep.task.extra.delta; // Add it to the fill total
    
    // Set the remaining amount of resources to manage
    let remaining = memCreep.task.extra.amount - memCreep.task.extra.filled;
    memCreep.task.extra.remaining = (remaining < 0 ? 0 : remaining);
    
    // Are we done?
    if(memCreep.task.extra.filled >= memCreep.task.extra.amount)
        memCreep.task.extra.done = true;
    else
        memCreep.task.extra.done = false;
    
    // Update the last carry value
    memCreep.task.extra.lastCarry = creep.carry[memCreep.task.extra.resource];
}

// Make a creep perform its current task, if it has one
function TaskRun(creepName){
    let memCreep = Memory.creeps[creepName];
    if(memCreep.task.target === null || memCreep.task.type === TASK_IDLE)
        return true;
    
    let objTarget = null;
    let taskFinished = false;
    
    if(_.isString(memCreep.task.target)){
        objTarget = Game.getObjectById(memCreep.task.target);
    }else{
        objTarget = memCreep.task.target;
    }
    
    if(objTarget === null){
        TaskComplete(creepName);
        return true;
    }
    
    let creep = Game.creeps[creepName];
    let cType = memCreep.task.type;
    
    // Try to move in range first, if needed
    if(cType === TASK_MINE){
        if(creep.harvest(objTarget) === ERR_NOT_IN_RANGE){
            MoveCreepToTask(creepName, objTarget);
        }
    }else if(cType === TASK_HARVEST || cType === TASK_PICKUP){
        UpdateResourceTask(creepName);
        if(!memCreep.task.extra.done){
            if(creep[cType](objTarget) === ERR_NOT_IN_RANGE){
                if(MoveCreepToTask(creepName, objTarget) === ERR_NO_PATH)
                    taskFinished = true;
            }
        } else taskFinished = true;
    }else if(cType === TASK_TRANSFER){
        UpdateResourceTask(creepName, true); // Transfer subtracts instead of adds
        if(!memCreep.task.extra.done){
            let res = creep.transfer(objTarget, memCreep.task.extra.resource, memCreep.task.extra.remaining);
            if(res === ERR_NOT_IN_RANGE){
                MoveCreepToTask(creepName, objTarget);
            }else if(res === OK){
                taskFinished = true;
            }else if(res === ERR_NOT_ENOUGH_RESOURCES){
                assert(res !== ERR_NOT_ENOUGH_RESOURCES, "Resource management error in task \"TRANSFER\" (ai.role)");
            }else if(res === ERR_FULL){
                // Try to transfer any amount for every tick until it's carried out the task successfully
                if(creep.transfer(objTarget, memCreep.task.extra.resource) !== OK){
                    taskFinished = true;
                }
            }
        } else taskFinished = true;
    }else if(cType === TASK_WITHDRAW){
        UpdateResourceTask(creepName);
        if(!memCreep.task.extra.done){
            let res = creep.withdraw(objTarget, memCreep.task.extra.resource, memCreep.task.extra.remaining);
            if(res === ERR_NOT_IN_RANGE){
                MoveCreepToTask(creepName, objTarget);
            }else if(res === OK){
                taskFinished = true;
            }else if(res === ERR_NOT_ENOUGH_RESOURCES){
                // Try to transfer any amount for every tick until it's carried out the task successfully
                if(creep.withdraw(objTarget, memCreep.task.extra.resource) === ERR_NOT_ENOUGH_RESOURCES){
                    taskFinished = true;
                }
            }
        } else taskFinished = true;
    }else if(cType === TASK_UPGRADE){
        UpdateResourceTask(creepName, true); // Upgrading subtracts
        if(!memCreep.task.extra.done){
            let res = creep.upgradeController(objTarget);
            if(res === ERR_NOT_IN_RANGE){
                MoveCreepToTask(creepName, objTarget);
            }
        } else taskFinished = true;
    }else if(cType === TASK_MOVE){
        if(creep.pos.x !== objTarget.x || creep.pos.y !== objTarget.y){
            let res = MoveCreepToTask(creepName, objTarget);
            if(res === ERR_INVALID_TARGET || res === ERR_NO_PATH || res === ERR_NO_BODYPART){
                taskFinished = true;
            }else if(res === OK){
                if(memCreep.task.extra.hasOwnProperty("lastPos") && (!memCreep.task.extra.hasOwnProperty("force") || memCreep.task.extra.force === false)){
                    if(memCreep.task.extra.lastPos.x === creep.pos.x && memCreep.task.extra.lastPos.y === creep.pos.y)
                        memCreep.task.extra.lastRes++;
                    else
                        memCreep.task.extra.lastRes = 0;
                        
                    if(memCreep.task.extra.lastRes >= 5)
                        taskFinished = true;
                }else{
                    memCreep.task.extra.lastRes = 0;
                }
                
                memCreep.task.extra.lastPos = creep.pos;
            }
        }else taskFinished = true;
    }else if(cType === TASK_BUILD){
        if(_.sum(creep.carry) > 0 && objTarget.progress < objTarget.progressTotal){
            let res = creep.build(objTarget);
            if(res === ERR_NOT_IN_RANGE){
                MoveCreepToTask(creepName, objTarget);
            }else if(res === ERR_NOT_ENOUGH_RESOURCES){
                taskFinished = true;
            }
        } else{
            taskFinished = true;
        }
    }
    
    if(taskFinished){
        TaskComplete(creepName);
    }
    
    return taskFinished;
}

global.Task = {
    Creep: TaskCreep,
    Run: TaskRun,
    Complete: TaskComplete,
};

module.exports = {};