function clearTask(creep){
    let memTask = creep.memory.task;
    memTask.type = TASK_IDLE;
    memTask.targetBuild = null;
    memTask.target = null;
    memTask.route = null;
    memTask.reserved = null;
    
    if(memTask.siteIndex)
        delete memTask.siteIndex;
        
    if(memTask.slotIndex)
        delete memTask.slotIndex;
        
    if(memTask._prev)
        delete memTask._prev;
}

function sumReserved(id){
    let sum = 0;
    for(let creepName in Memory.creeps){
        let memCreep = Memory.creeps[creepName];
        if(memCreep.task.reserved && memCreep.task.reserved.id === id)
            sum += memCreep.task.reserved.amount;
    }
    return sum;
}

function taskCreep(creep, type, target, targetbuild = null, route = null, reserved = null, ignoreCreeps = true){
    let memTask = creep.memory.task;
    memTask.type = type;
    memTask.target = target;
    memTask.targetBuild = targetbuild;
    
    if(_.isArray(route))
        memTask.route = route;
    else
        memTask.route = creep.pos.findPathTo(route, {ignoreCreeps: ignoreCreeps});
        
    memTask.reserved = (reserved === null ? null : {
        id: target,
        amount: reserved
    });
}

function findMinesWithEnergy(room, creep, energy){
    let mines = { structs: [], map: {} };
    
    for(let buildId in room.memory.buildings){
        let building = room.memory.buildings[buildId];
        
        if(building.type !== BUILDING_MINE || building.idStruct === null)
            continue;
        
        let struct = Game.getObjectById(building.idStruct);
        let reservedAmount = sumReserved(building.idStruct);
        if(struct && (struct.store.energy - reservedAmount) >= energy){
            mines.structs.push(struct);
            mines.map[struct.id] = buildId;
        }
    }
    
    let closest = creep.pos.findClosestByRange(mines.structs)
    if(closest !== null){
        return {
            buildId: mines.map[closest.id],
            struct: closest
        };
    }
    return null;
}

function findMineSlot(room, reserveName = null){
    for(let buildId in room.memory.buildings){
        let building = room.memory.buildings[buildId];
        
        if(building.type !== BUILDING_MINE)
            continue;
            
        for(let i = 0, len = building.slots.length; i < len; i++){
            let slot = building.slots[i];
            if(!slot.hasOwnProperty("reservedFor") || slot.reservedFor === null){
                if(reserveName !== null)
                    slot.reservedFor = reserveName;
                
                let conn = building.connections[0];
                return {
                    building: building,
                    slotIndex: i,
                    connection: new RoomPosition(conn.x, conn.y, conn.roomName)
                };
            }
        }
    }
    return null;
}

function findDedicatedMineSlot(room, reserveName = null){
    for(let buildId in room.memory.buildings){
        let building = room.memory.buildings[buildId];
        
        if(building.type !== BUILDING_MINE)
            continue;
            
        for(let i = 0, len = building.slots.length; i < len; i++){
            let slot = building.slots[i];
            if((!slot.hasOwnProperty("reservedFor") || slot.reservedFor === null) && slot.x === building.pos.x && slot.y === building.pos.y){
                if(reserveName !== null)
                    slot.reservedFor = reserveName;
                
                let conn = building.connections[0];
                return {
                    building: building,
                    slotIndex: i,
                    connection: new RoomPosition(conn.x, conn.y, conn.roomName)
                };
            }
        }
    }
    return null;
}

function findDropped(room, creep, reserve){
    let dropped_energy = room.find(FIND_DROPPED_ENERGY);
    let filtered_energy = dropped_energy.filter(function(obj){ return (obj.amount - sumReserved(obj.id)) >= reserve / 2.0; });
    if(filtered_energy.length){
        // Find the closest one
        return creep.pos.findClosestByRange(filtered_energy);
    }
    return null;
}

function findSpawnFill(room, creep, fillAmount){
    let spawns = [];
    let spawnmap = {};
    
    for(let buildId in room.memory.buildings){
        let building = room.memory.buildings[buildId];
        
        if(building.type !== BUILDING_SPAWN || building.idStruct === null)
            continue;
            
        let struct = Game.getObjectById(building.idStruct);
        let reservedAmount = sumReserved(building.idStruct);
        
        if((struct.energy + reservedAmount + 20 + (fillAmount * 0.4)) < struct.energyCapacity){
            spawns.push(struct);
            spawnmap[struct.id] = building.id;
        }
    }
    
    let closest = creep.pos.findClosestByRange(spawns)
    if(closest !== null){
        return {
            buildId: spawnmap[closest.id],
            struct: closest
        };
    }
    return null;
}

function findSpawnTake(room, creep, takeAmount){
    let spawns = [];
    let spawnmap = {};
    
    for(let buildId in room.memory.buildings){
        let building = room.memory.buildings[buildId];
        
        if(building.type !== BUILDING_SPAWN || building.idStruct === null)
            continue;
            
        let struct = Game.getObjectById(building.idStruct);
        let reservedAmount = sumReserved(building.idStruct);
        
        if((struct.energy + reservedAmount) >= (struct.energyCapacity - 20)){
            spawns.push(struct);
            spawnmap[struct.id] = building.id;
        }
    }
    
    let closest = creep.pos.findClosestByRange(spawns)
    if(closest !== null){
        return {
            buildId: spawnmap[closest.id],
            struct: closest
        };
    }
    return null;
}

function findNearbySite(room, creep, reserveName = null){
    let sites = room.memory.buildQueue;
    let possibleSlots = [],
        cSites = [],
        map = {};
    
    for(let i = 0, len = sites.length; i < len; i++){
        let site = sites[i];
        
        if(site.id === null)
            continue;
        
        for(let j = 0, jlen = site.slots.length; j < jlen; j++){
            let slot = site.slots[j];
            if(!slot.hasOwnProperty("reservedFor") || slot.reservedFor === null){
                cSites.push(Game.constructionSites[site.id]);
                map[site.id] = {
                    slotIndex: j,
                    siteIndex: i
                };
            }
        }
    }
    
    let closest = creep.pos.findClosestByRange(cSites);
    if(closest !== null){
        let site = sites[map[closest.id].siteIndex];
        let slot = site.slots[map[closest.id].slotIndex];
        if(reserveName !== null)
            slot.reservedFor = reserveName;
        
        return {
            site: closest,
            slotPos: new RoomPosition(slot.x, slot.y, slot.roomName),
            siteIndex: map[closest.id].siteIndex,
            slotIndex: map[closest.id].slotIndex
        };
    }
    return null;
}

function hasRoomMetDemands(room){
    let demands = room.memory.demands;
    let creeps = room.memory.creeps;
    
    for(let demandJob in demands){
        for(let creepJob in creeps){
            if(creepJob !== demandJob)
                continue;
            
            if(creeps[creepJob].length < demands[demandJob]){
                return false;
            }
        }
    }
    
    return true;
}

module.exports = {
    clearTask: clearTask,
    sumReserved: sumReserved,
    taskCreep: taskCreep,
    findMinesWithEnergy: findMinesWithEnergy,
    findMineSlot: findMineSlot,
    findDedicatedMineSlot: findDedicatedMineSlot,
    findDropped: findDropped,
    findSpawnFill: findSpawnFill,
    findSpawnTake: findSpawnTake,
    findNearbySite: findNearbySite,
    hasRoomMetDemands: hasRoomMetDemands,
};