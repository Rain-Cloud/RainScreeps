function ClearDebugFlags(roomName){
    for(let flag in Game.flags){
        if(Game.flags[flag].room.name === roomName && _.startsWith(Game.flags[flag].name, "dg"))
            Game.flags[flag].remove();
    }
}

function BuildFlags(roomName){
    //ClearDebugFlags(roomName);
    let room = Game.rooms[roomName];
    let memRoom = room.memory;
    let count = 0;
    
    for(let buildId in memRoom.buildings){
        let building = memRoom.buildings[buildId];
        let flagName = "dg_"+ building.type + count++;
        
        if(Game.flags[flagName])
            Game.flags[flagName].setPosition(building.pos.x, building.pos.y);
        else
            room.createFlag(building.pos.x, building.pos.y, flagName, COLOR_RED);
    }
}

function FlagPath(roomName, pathId){
    let room = Game.rooms[roomName];
    let memRoom = room.memory;
    
    let path = memRoom.paths[pathId].forward;
    for(let i = 0; i < path.length; i++){
        let pos = path[i];
        let flagName = "dg_H"+i;
        if(Game.flags[flagName])
            Game.flags[flagName].setPosition(pos.x, pos.y);
        else
            room.createFlag(pos.x, pos.y, "dg_H"+i, COLOR_YELLOW);
    }
}

function DebugPlacement(type, id, pos){
    if(Memory.settings.showPlacement)
        console.log("Place: " + type + "\"" + id + "\" placed at " + new RoomPosition(pos.x, pos.y, pos.roomName) + " (" + Game.time + ")");
}

function DebugPlan(){
    if(Memory.showPlanning)
        console.log();
}

global.flaggit = BuildFlags;
global.clearit = ClearDebugFlags

module.exports = {
    clear: ClearDebugFlags,
    survey: BuildFlags,
    path: FlagPath,
    
    placement: DebugPlacement,
    
};