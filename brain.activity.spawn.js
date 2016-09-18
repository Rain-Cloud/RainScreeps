// Creates a list of the roles corresponding body parts depending on the rooom's capabilities
// This should serve as a memory update for a room whenever an extension or an additional spawn is built/dismantled/destroyed
function GetRoleBodyList(roomName){
    let role_bodies = {};
    for(let role in module.exports.BodyFuncs){
        role_bodies[role] = module.exports.BodyFuncs[role].apply(this, [roomName]);
    }
    return role_bodies;
};

function BodyTemplate(parts_definition){
    if(_.isArray(parts_definition)){
        this.cost = arguments[1];
        this.parts = parts_definition;
    }else{
        this.cost = 0;
        this.parts = [];
        
        for(let i = 0, len = arguments.length; i < len; i+=2){
            let count = arguments[i], part = arguments[i + 1];
            this.cost += (count * BODYPART_COST[part]);
            this.parts = this.parts.concat(_.times(count, _.constant(part)));
        }
    }
}

function CreateMinerBody(room){
    // The ideal miner has 1 move and 5 worker parts, see if we can build it with the room's current energy grid
    if(room.energyCapacityAvailable >= (1 * BODYPART_COST[MOVE] + 5 * BODYPART_COST[WORK])){
        return new BodyTemplate(1, MOVE, 5, WORK);
    }else{
        let cost = 150, body = [MOVE, WORK];
        
        // Add work parts until reaching the room's energy limit
        do{
            if(cost + BODYPART_COST[WORK] <= room.energyCapacityAvailable){
                cost += BODYPART_COST[WORK];
                body.push(WORK);
            } else break;
        } while(true);
        return new BodyTemplate(body, cost);
    }
}

function CreatePeonBody(room){
    return new BodyTemplate(2, MOVE, 2, CARRY, 1, WORK);
}

function CreateMinerAssistBody(room){
    return new BodyTemplate(1, MOVE, 2, CARRY, 1, WORK);
}

function BodyList(room){
    this[JOB_MINER] = CreateMinerBody(room);
    this[JOB_PEON] = CreatePeonBody(room);
    this[JOB_MINER_ASSIST] = CreatePeonBody(room);
}

function SpawnAI(room, building){
    if(building.idStruct === null)
        return;
    
    let spawn = Game.structures[building.idStruct];
    
    // Ignore the spawn if it's already spawning, the room has no energy or the spawn queue is empty
    if(spawn.spawning || !room.energyAvailable || !room.memory.spawnQueue.length)
        return;

    let memSpawnQueue = room.memory.spawnQueue;
    let body = room.memory.bodyList[memSpawnQueue[0].job];
    if(room.energyAvailable < body.cost)
        return;
    
    let res = spawn.createCreep(body.parts, null, {
        id: null,
        belongs: memSpawnQueue[0].belongs,
        job: memSpawnQueue[0].job,
        task: {
            type: TASK_IDLE,
            target: null,
            targetBuild: null,
            route: null,
        }
    });

    if(_.isString(res)){
        let memCreeps = room.memory.creeps;
        memCreeps[memSpawnQueue[0].job].push(res);
        memSpawnQueue.splice(0, 1);
    }
}

module.exports = {
    run: SpawnAI,
    list: BodyList,
};