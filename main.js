let _constants = require("brain.constants");
let brain = require("brain");
let brainPathing = require("brain.pathing");
let brainPlan = require("brain.plan");
let brainActivity = require("brain.activity");

global.brain = brain;
global.activity = brainActivity;

if(!Memory.settings){
    brain.memset(Game.rooms[Object.keys(Game.rooms)[0]], true);
}

module.exports.loop = function () {
    PathFinder.use(true);
 
    for(let roomName in Game.rooms){
        let room = Game.rooms[roomName];
        
        if(room.memory){
            if(!room.memory.planning){
                brainActivity.assessDevelopmentLevel(room); // Assesses the room's current development level (can only increase over time)
                brainActivity.assessDemands(room);          // Perform a demands assessment
                brainActivity.assessQueue(room);            // Prepares the build and spawn queue for dequeueing
                brainActivity.siteProcessing(room);         // Processes current build sites
                
                brainActivity.creepAI(room);                // Process creep AI for the tick
                brainActivity.buildingAI(room);             // Process building AI for the tick
            }else{
                // Attempt to progress to the next plan segment
                let res = brainPlan.run(room);
                if(res === 0){
                    // Perform an assessment of the room's needs immediately after it's finished
                    room.memory.deferred.assessDemands = Game.time + Memory.settings.frequencies.assessDemands;
                    brainActivity.assessDemands(room);
                }else if(res > 0){
                    // Error
                }
            }
        }
    }
}