let brainPlace = require("brain.placement");

function isPartOfHighwayRoad(room, pathId, pos){
    let path = room.memory.paths[pathId].forward;
    // Check the road
    for(let k = 0, klen = path.length; k < klen; k++){
        let pathPos = path[k];
        if(pathPos.x === pos.x && pathPos.y === pos.y)
            return true;
    }
    
    return false;
}

function isPartOfAnyHighway(room, highwaysArr, pos){
    for(let j = 0, hlen = highwaysArr.length; j < hlen; j++){
        let bhighId = highwaysArr[j].path;
        if(isPartOfHighwayRoad(room, bhighId, pos)){
            return true;
        }
    }
    return false;
}

function findWorkSlots(room, pos, amount = 3){
    let slots = [];
    let buildings = room.memory.buildings;
    
    for(let range = 1; range <= 3; range++){
        let possibleSlots = brainPlace.GetRing(pos, room.name, range);
        
        // Also check if any of the slots are on a highway set to be built/have been built for the room's development level
        for(let i = 0; i < possibleSlots.length; i++){
            let pslot = possibleSlots[i];
            
            for(let buildId in buildings){
                let building = buildings[buildId];
                if(building.devLevel <= room.memory.devLevel){
                    // Check the building's highways
                    if(isPartOfAnyHighway(room, building.highways, pslot)){
                        possibleSlots.splice(i, 1); i--;
                        break;
                    }
                }
            }
        }
        
        if(possibleSlots.length){
            // Try and add as many work slots as requested
            while(slots.length < amount && possibleSlots.length){
                slots.push(_.cloneDeep(possibleSlots[0]));
                possibleSlots.splice(0, 1);
            }
        }
        
        // Did it get as many as was requested?
        if(slots.length >= amount)
            break;
    }
    
    return slots;
}

function hasStruct(arrLook, look, structType){
    for(let i = 0, len = arrLook.length; i < len; i++){
        if(arrLook[i].type === look && arrLook[i][look].structureType === structType){
            return arrLook[i][look];
        }
    }
    return null;
}

function ProcessBuildSites(room){
    let queue = room.memory.buildQueue;
    
    if(!queue)
        return;
    
    for(let i = 0; i < queue.length; i++){
        let site = queue[i];
        let building = room.memory.buildings[site.buildId];
        
        if(site.status === STATUS_BUILDING)
            site.status = STATUS_BUILDING_HIGHWAYS;
        
        if(site.status === STATUS_BUILDING_HIGHWAYS){
            let highwayPath = room.memory.paths[building.highways[site.highwayIndex].path].forward;
            let pos = highwayPath[site.highwayPathIndex];
            
            // Check to see if there's a built structure with that type there
            let found = room.lookAt(pos.x, pos.y);
            let potStruct = hasStruct(found, LOOK_STRUCTURES, STRUCTURE_ROAD);
            
            // Was it built?
            if(potStruct !== null){
                site.id = null;
                site.slots = [];
                site.highwayPathIndex++;
                
                // Is the entire highway complete?
                if(site.highwayPathIndex >= highwayPath.length){
                    site.highwayIndex++;
                    
                    // Are all highways complete?
                    if(site.highwayIndex >= building.highways.length){
                        // Building is complete, remove from queue
                        site.status = STATUS_BUILDING_MAIN;
                    }else{
                        site.highwayPathIndex = 0;
                    }
                    
                    // Create a construction site at the next highway
                    if(building.highways[site.highwayIndex]){
                        highwayPath = room.memory.paths[building.highways[site.highwayIndex].path].forward;
                        pos = highwayPath[site.highwayPathIndex];
                    } else continue;
                }
                
                room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD); // create a new one
                continue;
            }else if(site.id === null || !Game.constructionSites[site.id]){
                // Is there a construction site?
                potStruct = hasStruct(found, LOOK_CONSTRUCTION_SITES, STRUCTURE_ROAD);
                if(potStruct !== null){
                    site.id = potStruct.id; // Assign it to this one
                }else{
                    room.createConstructionSite(pos.x, pos.y, STRUCTURE_ROAD); // create a new one
                    continue;
                }
                
            }
        }
        
        if(site.status === STATUS_BUILDING_MAIN){
            let pos = building.pos;
            let found = room.lookAt(pos.x, pos.y);
            let potStruct = hasStruct(found, LOOK_STRUCTURES, building.assocType);
            
            if(building.assocType === null || potStruct !== null){
                // It's done
                site.status = STATUS_BUILDING_REGION;
                building.idStruct = potStruct.id;
            }else if(site.id === null || !Game.constructionSites[site.id]){
                // Is there a construction site there
                potStruct = hasStruct(found, LOOK_CONSTRUCTION_SITES, building.assocType);
                if(potStruct !== null){
                    site.id = potStruct.id; // Assign it to this one
                    continue; // and dont try to build a new site
                }else{
                    room.createConstructionSite(pos.x, pos.y, building.assocType); // create a new one
                    continue;
                }
            }
        }
        
        if(site.status === STATUS_BUILDING_REGION){
            let roadRegionPos = building.roadRegion[site.regionIndex];
            // Check to see if there's a built structure with that type there
            let found = room.lookAt(roadRegionPos.x, roadRegionPos.y);
            let potStruct = hasStruct(found, LOOK_STRUCTURES, STRUCTURE_ROAD);
            
            // Was it built?
            if(potStruct !== null){
                site.id = null;
                site.slots = [];
                site.regionIndex++;
                
                // Is the whole region complete?
                if(site.regionIndex >= building.roadRegion.length){
                    building.roadRegionBuilt = true;        // Indicate that it's been built
                    building.status = STATUS_OPERATIONAL;
                    queue.splice(i, 1); i--;
                    continue;
                }else{
                    roadRegionPos = building.roadRegion[site.regionIndex]; // create a new site at the new location
                    room.createConstructionSite(roadRegionPos.x, roadRegionPos.y, STRUCTURE_ROAD);
                    continue;
                }
            }else if(site.id === null || !Game.constructionSites[site.id]){
                // Is there a construction site there
                potStruct = hasStruct(found, LOOK_CONSTRUCTION_SITES, STRUCTURE_ROAD);
                if(potStruct !== null){
                    site.id = potStruct.id; // Assign it to this one
                }else{
                    room.createConstructionSite(roadRegionPos.x, roadRegionPos.y, STRUCTURE_ROAD); // create a new one
                    continue;
                }
            }
        }
        
        if(site.id !== null && !site.slots.length){
            // Give the site some work slots
            site.slots = findWorkSlots(room, Game.constructionSites[site.id].pos);
        }
    }
}

module.exports = {
    run: ProcessBuildSites
};