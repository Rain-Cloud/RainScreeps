// Colony role definitions
if(!global.hasOwnProperty("JOB_TYPES")){
    // Role definitions
    global.JOB_TYPES = {
        // City-specific roles
        PEON: "city_peon",                              // Basic peon worker meant for low-level dirty work
        MINER: "city_miner",                            // Colony energy worker
        
        SETTLER: "colony_settler",                      // Colony settler, performs all basic early colony duties depending on need
        SETTLER_HARVESTER: "colony_settlerHarvest",     // A converted settler that assists harvesting in the early stages of a colony
        SETTLER_CARRIER: "colony_settlerCarrier",       // A converted settler that assists carrying energy around the colony during the early development stages
        SETTLER_REPAIRMAN: "colony_settlerRepairman",   // A converted settler that assists in repairing structures in the colony during the early stages
        
        MINER_CARRIER: "colony_miner_carrier",          // Carrier used for transporting harvested energy to storage for redistribution
        CARRIER : "colony_carrier",                     // Carrier used for transporting energy from storage throughout the colony room for towers, extensions etc
        UPGRADER : "colony_upgrader",                   // Upgrader that upgrades the room' controller sparingly (less equipped)
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

// Buildings a city can create/manage
if(!global.hasOwnProperty("DESTRUCTABLES")){
    global.DESTRUCTABLES = [
        STRUCTURE_SPAWN, 
        STRUCTURE_EXTENSION, 
        STRUCTURE_ROAD, 
        STRUCTURE_WALL, 
        STRUCTURE_RAMPART,
        STRUCTURE_LINK, 
        STRUCTURE_STORAGE, 
        STRUCTURE_TOWER, 
        STRUCTURE_OBSERVER, 
        STRUCTURE_EXTRACTOR, 
        STRUCTURE_LAB, 
        STRUCTURE_TERMINAL, 
        STRUCTURE_CONTAINER, 
        STRUCTURE_NUKER
    ];
}

if(!global.hasOwnProperty("ASSOC_TYPES")){
    // Task type definitions
    global.ASSOC_TYPES = {
        CLEAR: "clear",               // Clears out a blueprint's assoc property
        MINE: "mine_container",       // A container with a source for mining purposes. Pickup point for transporters, drop-off for miners and harvesters. Similar to ASSOC_SOURCE
        STORE: "store_container",     // Imitates a storage structure until reaching controller level 4
        DISTRO: "distro_container",   // A container for distribution purposes. Pickup point for citizens when storage is empty or as a pickup point for specific purposes
        JOB: "job",                             // Associates one or more jobs with a blueprint, which limits which jobs can interact with the blueprinted structure
        
        /*  A commute path from one blueprint structure to another. A commute path consists of an array of road networks that lead 
            from point a to point b and serves as a cached method for a citizen to reach its destination without consuming any CPU doing repetitive tasks */
        COMMUTE: "commute",
        /*  A source pickup associates a source with both a position where a dedicated miner will stand and optionally 
            a blueprinted container in the same location. Automatically also associates container as ASSOC_CONTAINER_MINE */
        SOURCE: "source_pickup",                
    };
    
    for(let prop in ASSOC_TYPES)
        global["ASSOC_" + prop] = ASSOC_TYPES[prop];
}

if(!global.hasOwnProperty("BUILDING_TYPES")){
    // Task type definitions
    global.BUILDING_TYPES = {
        MINE: "mine",                  // Mine (energy)
        STORAGE: "storage",            // Main storage facility for the city, surrounded by walls with optional ramparts at key locations. If none are provided, 4 are placed out evenly
        UCENTER: "ucenter",            // Upgrade center. Protected by a surrounding wall and strategically placed ramparts to enter the complex
        OUTPOST: "outpost",            // A single guard can be positioned at the given location
        GUARDPOST: "guardpost",        // Basic guard post where several guards can be placed to defend the area
        ADVGUARDPOST: "adv_guardpost", // An advanced guard post consists of a tower, and a dedicated arsenal of guards, protected by walls
        GATE: "gate",                  // A gate consists of at least 6 layered ramparts (3x2, 2x3) which gives room for 4 guards (preferably 2 melee and 2 archers)
        WALL: "wall",                  // A wall spanning from one point to another
        TOWER: "tower",                // A tower has a STRUCTURE_TOWER and at least 2 ramparts protecting it at the given location; 1 for the tower itself, and one spot for a repairer/guard
        STATION: "station",            // A station
        CASTLE: "castle",              // A castle contains all 3 spawns (at 8) enclosed within walls and 8 rampart exits (2 layers)
        
    };
    
    for(let prop in BUILDING_TYPES)
        global["BUILD_" + prop] = BUILDING_TYPES[prop];
}
