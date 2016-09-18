let util = require("util");
let brainPath = require("brain.pathing");
let brainBuild = require("brain.building");
let brainPlace = require("brain.placement");
let brainDbg = require("brain.dbg");

function PlanningError(room, code){
    room.memory.planning.status = code;
    room.memory.planning.counter = 0;
    room.memory.planning.stage = 0;
    return code;
}

function Segment(idNum, cb){
    this.id = idNum;
    this.func = cb;
}

function PlanSpawnAndUpgradeCenter(room, id){
    // Make the first spawn into a building
    let scanSpawn = room.memory.scan.my.structures[STRUCTURE_SPAWN][0];
    let spawnObj = Game.getObjectById(scanSpawn);
    let buildSpawn = new brainBuild.spawn(spawnObj.pos, 0);
    buildSpawn.idStruct = scanSpawn;
    buildSpawn.status = STATUS_NONE;
    room.memory.buildings[buildSpawn.id] = buildSpawn;
    
    brainDbg.placement("spawn", buildSpawn.id, spawnObj.pos);
    
    // Find a position and slots to place the upgrade center at, considering an optimal amount of worker slots and distance to the spawn building
    let uPlacement = brainPlace.ucenter(buildSpawn.id, room);
    if(uPlacement === null)
        return PlanningError(room, id);
    
    // Plot out the room's upgrading center
    let bp = new brainBuild.ucenter(uPlacement.loc, uPlacement.path[0], uPlacement.slots, 2);
    room.memory.buildings[bp.id] = bp;
    // Store data for future planning stages
    room.memory.planning.data[id] = {
        spawnId: buildSpawn.id,
        ucenterId: bp.id
    };
    
    brainDbg.placement("upgrade center", bp.id, bp.pos);
    return 0;
}

function PlanStorage(room, id){
    let spawnId = room.memory.planning.data[1].spawnId;
    let ucenterId = room.memory.planning.data[1].ucenterId;
    
    let sPlacement = brainPlace.storage(spawnId, ucenterId, room);
    if(sPlacement === null)
        return PlanningError(room, id);
        
    let bp = new brainBuild.storage(sPlacement.loc, sPlacement.slots, 4);
    room.memory.planning.data[id] = { storageId: bp.id };
    room.memory.buildings[bp.id] = bp;
    room.memory.devLevel = 1; // The room's development level is set to 1, indicating that it's ready to begin running AI operations
    brainDbg.placement("storage", bp.id, bp.pos);
    return 0;
}

function PlanMines(room, id){
    if(!room.memory.planning.data[id]){
        room.memory.planning.data[id] = {
            current: 0,
            total: room.memory.sources.length,
            mineIds: [],
        };
    }
    
    let planData = room.memory.planning.data[id];
    if(planData.total){
        let src = room.memory.sources[room.memory.planning.data[3].current];
        let sourcePos = src.pos;
        let locMine = brainPlace.mine(room.memory.planning.data[2].storageId, sourcePos, room, true)
        
        if(locMine === null)
            return PlanningError(room, id);
        
        if(locMine !== null){
            let bp = new brainBuild.mine(room, src.id, locMine.slots, locMine.loc, locMine.conn, 1);
            room.memory.buildings[bp.id] = bp;
            planData.mineIds.push(bp.id);
            brainDbg.placement("mine", bp.id, bp.pos);
        }
        
        if((++planData.current) < planData.total)
            return -1;    
    }
    
    return 0;
}

function PlanExtractor(room, id){
    if(!room.memory.planning.data[id]){
        room.memory.planning.data[id] = { extractorId: null };
    }
    
    let planData = room.memory.planning.data[id];
    if(room.memory.minerals.length){
        let mineral = room.memory.minerals[0];
        let mineralPos = mineral.pos;
        let locExtractor = brainPlace.extractor(room.memory.planning.data[2].storageId, mineralPos, room, true);
        if(locExtractor !== null){
            let bp = new brainBuild.extractor(room, mineral.id, locExtractor.slots, mineralPos, locExtractor.conn, 6);
            room.memory.buildings[bp.id] = bp;
            planData.extractorId = bp.id;
            brainDbg.placement("extractor", bp.id, bp.pos);
        }
    }
    return 0;
}

function PlanHighwaysEssential(room, id){
    // plot out primary highways for base operation routes
    if(!room.memory.planning.data[id]){
        room.memory.planning.data[id] = {
            ucenter: false,     // highway from upgrading center
            spawn: false,       // highway from spawn to upgrading center
            extractor: room.memory.planning.data[4].extractorId === null,
            currentMine: 0,
            minesTotal: room.memory.planning.data[3].mineIds.length
        };
    }
    
    let planData = room.memory.planning.data[id];
    
    let storageId = room.memory.planning.data[2].storageId;
    let targId;
    if(!planData.extractor){
        targId = room.memory.planning.data[4].extractorId;
        planData.extractor = true;
    }
    else if(!planData.ucenter){
        targId = room.memory.planning.data[1].ucenterId;
        planData.ucenter = true;
    }else if(!planData.spawn){
        targId = room.memory.planning.data[1].spawnId;
        planData.spawn = true;
    }
    else{
        targId = room.memory.planning.data[3].mineIds[planData.currentMine];
        planData.currentMine++;
    }
    
    let closestBuild = brainPlace.GetClosestBuilding(targId, room);
    
    if(closestBuild === null){
        return PlanningError(room, id);
    }
    
    let highwayId = util.GenerateUID();
    room.memory.paths[highwayId] = closestBuild.path;
    
    let memHighway = {
        from: targId,
        to: closestBuild.buildingId,
        path: highwayId,
        status: STATUS_NONE,
    };
    
    room.memory.buildings[targId].highways.push(memHighway);
    room.memory.buildings[closestBuild.buildingId].highways.push(memHighway);
    
    if((planData.minesTotal && planData.currentMine < planData.minesTotal) || !planData.extractor || !planData.ucenter || !planData.spawn)
        return -1;
    
    return 0;
}

/* TODO: 
    plop spawn for ctl7 and 8
    plop extension centers (small and big) for each major devlevel (ctl2-8, CONTROLLER_STRUCTURES["extension"]) until reaching maximum extensions for ctl8 (60)
    plop links
    plop towers
    plop a terminal
    plop an observer
    plop lab centers
    plop defenses: walls/ramparts/guard posts/patrols
    plop roads/intersections/highways/exits
    create optimal routes for static worker operation (if not already created)
*/

/*  
    List of functions, or stages, the AI will go through as it plans the layout for a new room
    They will be executed in order. NB: don't change the order of these unless you've checked all the dependent segments first.
*/
let _planSegments = [
    new Segment(1, PlanSpawnAndUpgradeCenter),          // Layout existing spawn and plop an upgrade center
    new Segment(2, PlanStorage, 1),                     // Plop a storage
    new Segment(3, PlanMines, 2),                       // Plop mines
    new Segment(4, PlanExtractor, 2),                   // Plop extractor (if there's a mineral deposit)
    new Segment(5, PlanHighwaysEssential, 1,2,3,4)     // Plop highways to the previously plopped buildings to the main storage building. This creates the most efficient highways to boost economy within the room.
];

function RunPlanSegments(room){
    if(!room.memory.planning)
        room.memory.planning = CreateSettings();
    
    if(room.memory.planning.error){
        if(Memory.settings.showPlanning)
            console.log("Planning: layout planning error for \"" + room.name + "\" at stage " + room.memory.planning.stage);
        return 1;
    }
    
    if(Memory.settings.showPlanning && room.memory.planning.stage === 0 && room.memory.planning.counter === 0){
        console.log("Planning: scheduled \"" + room.name + "\" for layout planning (" + Game.time + room.memory.planning.cpuDistro + ")");
        
        room.memory.planning.start = Game.time;
    }
    
    if((++room.memory.planning.counter) < room.memory.planning.cpuDistro)
        return -1;
    
    let res = _planSegments[room.memory.planning.stage].func.call(this, room, _planSegments[room.memory.planning.stage].id);
    
    // A return of 0 means continue to the next planned segment
    if(!res){
        room.memory.planning.stage++;
    } else if(res > 0){
        // An error has occurred
        if(Memory.settings.showPlanning)
            console.log("Planning: layout planning error for \"" + room.name + "\" at stage " + room.memory.planning.stage);
        room.memory.planning.error = true;
        return 1;
    }
    
    room.memory.planning.counter = 0;
    
    if(room.memory.planning.stage >= _planSegments.length){
        if(Memory.settings.showPlanning)
            console.log("Planning: layout finished for \"" + room.name + "\" (in " + (Game.time - room.memory.planning.start) + " ticks)");
        delete room.memory.planning;
        return 0;
    }
    
    return -1;
}

function CreateSettings(){
    return {
        counter: 0,         // Internal counter for the next execution of a subroutine
        start: 0,           // Time when brain submitted room into planning mode. Planning subroutines will be performed over time where possible
        stage: 0,           // Current planning stage
        cpuDistro: 3,       // CPU load distribution over time; how often it will pause before running the next segment. A distro of 2 means once every 2 ticks, 1 means once every tick
        data: {},           // Data used within the planning stage
    };
}

function CheckStatus(roomName){
    let room = Game.rooms[roomName];
    if(room.memory.planning){
        console.log("Planning: room \"" + roomName + "\" in stage " + (room.memory.planning.stage + 1) + " (" + _planSegments[room.memory.planning.stage].func.name + "). Started at " + room.memory.planning.start + " (" +  (Game.time - room.memory.planning.start) + ")");
        return false;
    }else{
        console.log("Planning: room \"" + roomName +"\" not in planning mode.");
        return true;
    }
}

module.exports = {
    settings: CreateSettings,
    run: RunPlanSegments,
    status: CheckStatus
};