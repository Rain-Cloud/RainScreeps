module.exports = {
    CountOpenSquares: function(source){
        var spos = source.pos;
        var squares = source.room.lookForAtArea(LOOK_TERRAIN, spos.y - 1, spos.x - 1, spos.y + 1, spos.x + 1, true);
        var freeSquares = 0;
        
        for(var i = 0; i < squares.length; i++){
            if(squares[i].terrain == "plain" || squares[i].terrain == "swamp"){
                freeSquares++;
            }
        }
        
        return freeSquares;
    },
    CountFreeSquares: function(source){
        var free = Memory.rooms[source.room.name].sources[source.id].free;
        
        for(var name in Game.creeps){
            var creep = Game.creeps[name];
            if(creep.memory.task.type == TASK_MINE && source.id == creep.memory.task.target){
                free--;
            }
        }
        return free;
    }
};