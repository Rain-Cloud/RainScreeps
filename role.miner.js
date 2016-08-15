var _globals = require("globals");
var helpers = require("helpers");

var miner = {
    role: ROLE_MINER,
    parts: [WORK, CARRY, CARRY, MOVE, MOVE],
    cost: 300,
    run: function(creep){
        if(creep.memory.task.type == TASK_IDLE){
            var cratio = 0;
            var chosen = null;

            creep.memory.task.type = TASK_MINE;
            creep.memory.task.target = creep.room.find(FIND_SOURCES)[0].id;
            
        }
        
        if(creep.memory.task.type == TASK_MINE){
            if(creep.carry.energy < creep.carryCapacity){
                var t = Game.getObjectById(creep.memory.task.target);
                if(creep.harvest(t) == ERR_NOT_IN_RANGE){
                    creep.moveTo(t)
                }
            }else{
                creep.memory.task.type = TASK_DEPOSIT;
                creep.memory.task.target = Game.spawns.Spawn1.id;
            }
        }else if(creep.memory.task.type == TASK_DEPOSIT){
            var t = Game.getObjectById(creep.memory.task.target);
            var res = creep.transfer(t, RESOURCE_ENERGY);
            if(res == ERR_NOT_IN_RANGE){
                creep.moveTo(t)
            }else if(res == OK){
                creep.memory.task.type = TASK_IDLE;
                creep.memory.task.target = null;
            }else if(res == ERR_FULL){
                creep.memory.task.type = TASK_UPGRADE;
                creep.memory.task.target = creep.room.controller.id;
            }
            
        }else if(creep.memory.task.type == TASK_UPGRADE){
            var t = Game.getObjectById(creep.memory.task.target);
            
            if(creep.carry.energy > 0){
                var res = creep.upgradeController(t);
                if(res == ERR_NOT_IN_RANGE){
                    creep.moveTo(t);
                }
            }else{
                creep.memory.task.type = TASK_IDLE;
                creep.memory.task.target = null;
            }
        }
    },
    assign: function(creep){
        if(_.isString(creep)){
            return {
                role: ROLE_MINER,
                origin: creep,
                task: {
                    type: TASK_IDLE,
                    target: null
                }
            };
        }else{
            creep.memory.role = ROLE_MINER;
            creep.memory.task = {
                type: TASK_IDLE,
                target: null
            };
        }
    }
}

global.assignCreep = function(creep, role){
    if(role == ROLE_MINER){
        miner.assign(Game.creeps[creep]);
    }
}

module.exports = {
    miner: miner
};