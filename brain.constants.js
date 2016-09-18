if(!global.hasOwnProperty("BRAIN_BUILDINGS")){
    // Each building can have x amount of connections that paths can connect to.
    global.BRAIN_BUILDINGS = {
        /*
            A mine may have an associated container and a dedicated miner (the brain can place up to the limit of 5 containers), but may alternatively not. A dedicated miner will harvest a source indefinitely without moving,
            and is built to harvest all of the source's energy before its regeneration, thus eliminating the need for superfluous harvesters, but in the early stages when there is not enough energy to build a complete miner,
            it will be assisted by harvesters to reach 100% efficiency. A dedicated miner is assigned once the mine's built.
            Mine types are determined by how many containers it can place. An off-site mine will only use harvesters (combined work and carry parts) and may not always operate at 100% efficiency.
            Mines have 1 connection.
            Phase 0: no container, no roads, builders only
            Phase 1: roads to at least one storage (spawn, container, storage) built and completed, harvesters associated
            Phase 2: (optional) a container is built and a dedicated miner associated with it
        */
        MINE: "mine",
        /*
            The storage complex consists of several structures at different phases. Storage has 4 connections.
            Phase 0: there is no storage (but it is reserved so that future planning by the brain doesn't build paths on it).
            Phase 1: cl3, a tower is built to protect the future storage
            Phase 2: cl4, the storage structure is built
            Phase 3: cl5, a link is connected to the main storage so that it can distribute energy at key points in the room
            Phase 4: (conditional combination) enclose spawn together with storage in walls and ramparts one step out from connections (minimum distance for walls is 2, if possible)
        */
        STORAGE: "storage",
        UCENTER: "ucenter",            // Upgrade center. Protected by a surrounding wall and strategically placed ramparts to enter the complex
        
        SPAWN: "spawn",
        
        EXTRACTOR: "extractor",
        
    };
    
    for(let prop in BRAIN_BUILDINGS)
        global["BUILDING_" + prop] = BRAIN_BUILDINGS[prop];
}

if(!global.hasOwnProperty("BRAIN_ROLES")){
    // Role definitions
    global.BRAIN_ROLES = {
        
    };
    
    for(let prop in BRAIN_ROLES)
        global["JOB_" + prop] = BRAIN_ROLES[prop];
}

if(!global.hasOwnProperty("STRUCT_STATUS")){
    global.STRUCT_STATUS = {
        NONE: "none",                       // No route planned, creating or completed
        BUILDING: "building",               // Currently building the site (construction sites added etc)
        
        BUILDING_REGION: "build_region",    // Currently building the region around the building itself
        BUILDING_HIGHWAYS: "build_high",    // Currently building the highways associated with the building itself
        BUILDING_MAIN: "build_main",        // Currently building the main structure associated with the building
        
        REPAIRING: "repair",                // A building that needs to be repaired/is repairing
        REPAIR_REGION: "repair_region",     // Needs to repair the region
        REPAIR_MAIN: "repair_main",         // Needs to repair the main structure
        
        DISMANTLING: "dismantling", // A site that is scheduled to be dismantled / is dismantling
        
        OPERATIONAL: "operational", // Building operational without any current demands
    };
    
    for(let prop in STRUCT_STATUS)
        global["STATUS_" + prop] = STRUCT_STATUS[prop];
}

if(!global.hasOwnProperty("EVENT_TYPES")){
    global.EVENT_TYPES = {
        STRUCTURE_MISSING: 1,
        CREEP_MISSING: 2,
        SITE_MISSING: 3,
        
    };
    
    for(let prop in EVENT_TYPES)
        global["EVENT_" + prop] = EVENT_TYPES[prop];
}

if(!global.hasOwnProperty("JOB_TYPES")){
    // Role definitions
    global.JOB_TYPES = {
        // City-specific roles
        PEON: "city_peon",                              // Basic worker that performs multiple duties in early room development stages
        MINER: "city_miner",                            // Dedicated miner drone (reserves a mine's container slot)
        MINER_ASSIST: "city_minerAst",                  // Specialized energy worker that helps early mining efforts
        UPGRADER : "city_upgrader",                     // Upgrader that upgrades the room's controller
        
        SETTLER: "colony_settler",                      // Colony settler, performs all basic early colony duties depending on need
        SETTLER_HARVESTER: "colony_settlerHarvest",     // A converted settler that assists harvesting in the early stages of a colony
        SETTLER_CARRIER: "colony_settlerCarrier",       // A converted settler that assists carrying energy around the colony during the early development stages
        SETTLER_REPAIRMAN: "colony_settlerRepairman",   // A converted settler that assists in repairing structures in the colony during the early stages
        
        MINER_CARRIER: "colony_miner_carrier",          // Carrier used for transporting harvested energy to storage for redistribution
        CARRIER : "colony_carrier",                     // Carrier used for transporting energy from storage throughout the colony room for towers, extensions etc
        
        HEAVY_UPGRADER : "colony_heavy_upgrader",       // Upgrader designed to push as much energy into a controller as it can
        BUILDER : "colony_builder",                     // Builder that goes around to construction sites in the colony and repairs other structures if idle
        REPAIRMAN: "colony_repairman",                  // Designed to specifically repair structures within the colony
        
        // Colony army roles
        MILITIA: "army_militia",                        // Basic army unit used in the early development stages of the colony to defend the room
        FOOTMAN: "army_footman",                        // Army unit specialized in close range combat
        SCOUT: "army_scout",                            // Army unit used to scout rooms or gather information
        CLERIC: "army_cleric",                          // Army unit specialized in healing
        ARCHER: "army_archer",                          // Army unit specialized in long range combat
        MAGE: "army_mage",                              // Army unit that uses close and long range combat as well as healing
        TANK: "army_tank",                              // Army unit that is designed to take a beating and draw enemy fire
        SIEGE: "army_siege",                            // Army unit that is used to siege controllers
        GRUNT: "army_grunt",                            // Army unit specialized to harass spawns
        ROGUE: "army_rogue",                            // Army unit specialized to steal energy from other players or otherwise disrupt their operations
        
        // Colony trading
        DIPLOMAT: "trade_diplomat",                     // Trading unit designed to look for players to trade with and parlay
        TRADER: "trade_trader",                         // Trading unit meant to carry trade resources or tributes with another player's colony
    
        // Misc roles
        ASSISTANT: "misc_assistant",                    // Miscellaneous unit meant to perform custom, user interactive, tasks
    };
    
    for(let prop in JOB_TYPES)
        global["JOB_" + prop] = JOB_TYPES[prop];
}

if(!global.hasOwnProperty("TASK_TYPES")){
    // Task type definitions
    global.TASK_TYPES = {
        IDLE: "idle",   // Currently has no job
        
        // Citizen jobs (equivalent of creep method names)
        TRANSFER: "transfer",
        HARVEST: "harvest",
        PICKUP: "pickup",
        WITHDRAW: "withdraw",
        BUILD: "build",
        REPAIR: "repair",
        DISMANTLE: "dismantle",
        CLAIM: "claimController",
        RESERVE: "reserveController",
        DROP: "drop",
        HEAL: "heal",
        ATTACK: "attack",
        RANGED_ATTACK: "rangedAttack",
        RANGED_HEAL: "rangedHeal",
        RANGED_MASS_ATTACK: "rangedMassAttack",
        UPGRADE: "upgradeController",
        
        // Custom defined jobs
        MINE: "mine",   // Harvests a resource indefinitely
        FLEE: "flee",   // Flees from/to a position/creep
        MOVE: "move",   // Move to a position/target
        FERRY: "ferry", // Ferry resources between two objects
        SAY: "say_at",  // Say a sequence of lines at the specified location
    };
    
    for(let prop in TASK_TYPES)
        global["TASK_" + prop] = TASK_TYPES[prop];
}

module.exports = {

};