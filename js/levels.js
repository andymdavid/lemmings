// Level configuration with logical structure
export const LEVEL_1 = {
    metadata: {
        name: "Learning the Ropes",
        width: 1200,
        height: 700,
        description: "Tutorial level introducing all four basic skills",
        requiredSkills: {
            digger: 1,    // Need to dig through vertical wall
            builder: 1,   // Need to bridge gap
            blocker: 1,   // Need to redirect lemmings
            bomber: 1     // Need to blast through obstacle
        },
        optionalSkills: {
            // Additional skills make it easier but aren't strictly required
        }
    },

    entrance: { x: 110, y: 120 },

    exit: {
        position: { x: 1060, y: 600 },
        dimensions: { width: 40, height: 60 }
    },

    sections: [
        {
            name: "entrance_platform",
            type: "safe_zone",
            description: "Starting platform where lemmings spawn and begin their journey",
            terrain: [
                { x: 80, y: 110, width: 90, height: 18 },
                { x: 160, y: 125, width: 140, height: 18 }
            ]
        },

        {
            name: "first_drop",
            type: "navigation",
            description: "Safe 65px drop to lower level - introduces falling mechanics",
            terrain: [
                { x: 310, y: 190, width: 130, height: 20 },
                { x: 300, y: 210, width: 160, height: 20 }
            ]
        },

        {
            name: "digger_challenge",
            type: "challenge",
            requiredSkills: ["digger"],
            description: "Vertical wall requiring digger to pass through",
            terrain: [
                { x: 420, y: 150, width: 40, height: 120 },
                { x: 460, y: 230, width: 100, height: 20 }
            ]
        },

        {
            name: "approach_to_gap",
            type: "navigation",
            description: "Walkway leading toward the builder challenge",
            terrain: [
                { x: 560, y: 245, width: 90, height: 20 }
            ]
        },

        {
            name: "builder_challenge",
            type: "challenge",
            requiredSkills: ["builder"],
            description: "30px gap requiring builder to create bridge",
            terrain: [
                { x: 675, y: 255, width: 130, height: 20 }
            ]
        },

        {
            name: "blocker_area",
            type: "challenge",
            requiredSkills: ["blocker"],
            description: "Lower basin where blocker is needed to redirect lemmings away from pit",
            terrain: [
                { x: 630, y: 360, width: 240, height: 25 },
                { x: 580, y: 385, width: 70, height: 25 },
                { x: 540, y: 410, width: 80, height: 20 }
            ]
        },

        {
            name: "bomber_challenge",
            type: "challenge",
            requiredSkills: ["bomber"],
            description: "Thick wall obstruction near exit requiring bomber to blast through",
            terrain: [
                { x: 870, y: 360, width: 60, height: 90 }
            ]
        },

        {
            name: "exit_corridor",
            type: "safe_zone",
            description: "Final path leading to the exit",
            terrain: [
                { x: 930, y: 400, width: 130, height: 25 },
                { x: 960, y: 520, width: 140, height: 25 }
            ]
        }
    ],

    decoration: [
        // Visual interest - hills and platforms that don't affect gameplay
        { x: 200, y: 320, width: 120, height: 30 },
        { x: 480, y: 430, width: 140, height: 25 },
        { x: 740, y: 500, width: 160, height: 30 }
    ],

    ground: { x: 0, y: 640, width: 1200, height: 60 }
};

export default LEVEL_1;
