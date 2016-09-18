

function MineAI(room, building){
    // Check if any of the creeps that are reserved for the mine's slots are missing
    for(let i = 0, len = building.slots.length; i < len; i++){
        if(building.slots[i].reservedFor && (!Game.creeps.hasOwnProperty(building.slots[i].reservedFor) || Game.creeps[building.slots[i].reservedFor].memory.task.target !== building.sourceId)){
            building.slots[i].reservedFor = null;
        }
    }
    
}

module.exports = {
    run: MineAI
};