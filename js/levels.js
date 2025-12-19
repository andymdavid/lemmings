// Multi-level system with intentionally designed puzzles
// All levels share the same entrance and exit positions
const STANDARD_ENTRANCE = { x: 150, y: 140 };
const STANDARD_EXIT = { x: 1050, y: 580 };
const STANDARD_SKILLS = {
    blocker: 2,
    digger: 2,
    builder: 2,
    basher: 2,
    bomber: 2,
    climber: 2
};

const LEVEL_1 = {
    name: "Gathering Storm",
    designIntent: "Classic three-act cave: a crowded staging chamber, a lethal generator shaft, and a high exit buttress that demands deliberate builder, digger, and blocker play.",
    width: 1200,
    height: 700,
    totalLemmings: 20,
    saveTarget: 18,
    entrance: STANDARD_ENTRANCE,
    exit: { x: 1020, y: 170 },
    skills: {
        blocker: 2,
        digger: 2,
        builder: 2,
        basher: 2,
        bomber: 2,
        climber: 2
    },
    sections: [
        {
            name: "entrance_platform",
            terrain: [
                { x: 80, y: 200, width: 200, height: 40, label: 'A' },
                { x: 780, y: 200, width: 400, height: 40, label: 'B' },
                { x: 855, y: 300, width: 150, height: 40, label: 'I' },
                { x: 900, y: 400, width: 200, height: 40, label: 'J' },
                { x: 350, y: 250, width: 400, height: 40, label: 'C' },
                { x: 260, y: 320, width: 120, height: 40, label: 'D' },
                { x: 260, y: 420, width: 500, height: 40, label: 'E' },
                { x: 260, y: 500, width: 100, height: 40, label: 'K' },
                { x: 260, y: 560, width: 500, height: 40, label: 'F' },
                { x: 880, y: 540, width: 50, height: 100, label: 'L' },
                { x: 185, y: 430, width: 75, height: 40, label: 'G' },
                { x: 110, y: 440, width: 75, height: 40, label: 'H' }
            ]
        },
        {
            name: "boundary_walls",
            terrain: [
                { x: 0, y: 0, width: 60, height: 700 },
                { x: 1140, y: 0, width: 60, height: 700 },
                { x: 0, y: 0, width: 1200, height: 60 },
                { x: 570, y: 0, width: 60, height: 700 }
            ]
        },
        {
            name: "floor_segments",
            terrain: [
                { x: 260, y: 640, width: 500, height: 60 },
                { x: 880, y: 640, width: 320, height: 60 }
            ]
        }
    ],
    water: [
        { x: 60, y: 650, width: 200, height: 50 },
        { x: 760, y: 650, width: 120, height: 50 }
    ],
    ground: null
};

export const LEVELS = [LEVEL_1];

// Export individual levels for backwards compatibility
export { LEVEL_1 };

export default LEVELS;
