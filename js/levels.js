// Multi-level system with intentionally designed puzzles
// All levels share the same entrance and exit positions
const STANDARD_ENTRANCE = { x: 150, y: 140 };
const STANDARD_EXIT = { x: 1050, y: 580 };
const STANDARD_SKILLS = {
    blocker: 5,
    digger: 5,
    builder: 8,
    basher: 3,
    bomber: 3,
    climber: 5
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
        builder: 4,
        blocker: 1,
        digger: 1,
        basher: 3
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
                { x: 880, y: 500, width: 50, height: 200, label: 'L' },
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

const LEVEL_2 = {
    name: "Split Decision",
    designIntent: "Two diverging paths - left requires diggers, right requires builders. Not enough skills for both, forcing strategic blocker use to route lemmings.",
    width: 1200,
    height: 700,
    totalLemmings: 20,
    saveTarget: 16,
    entrance: STANDARD_ENTRANCE,
    exit: STANDARD_EXIT,
    skills: STANDARD_SKILLS,
    sections: [
        {
            name: "boundary_walls",
            terrain: [
                { x: 0, y: 0, width: 60, height: 700 },
                { x: 1140, y: 0, width: 60, height: 700 },
                { x: 0, y: 0, width: 1200, height: 60 }
            ]
        },
        {
            name: "entrance_platform",
            terrain: [
                { x: 120, y: 90, width: 100, height: 20 },
                { x: 220, y: 140, width: 100, height: 20 }
            ]
        },
        {
            name: "left_path",
            terrain: [
                { x: 280, y: 220, width: 120, height: 20 },
                { x: 330, y: 240, width: 40, height: 80 },
                { x: 280, y: 320, width: 140, height: 20 }
            ]
        },
        {
            name: "right_path",
            terrain: [
                { x: 450, y: 200, width: 100, height: 20 },
                { x: 600, y: 260, width: 100, height: 20 },
                { x: 750, y: 320, width: 100, height: 20 }
            ]
        },
        {
            name: "convergence",
            terrain: [
                { x: 480, y: 420, width: 180, height: 20 },
                { x: 700, y: 480, width: 180, height: 20 }
            ]
        },
        {
            name: "exit_platform",
            terrain: [
                { x: 920, y: 540, width: 160, height: 20 }
            ]
        }
    ],
    ground: { x: 0, y: 640, width: 1200, height: 60 }
};

const LEVEL_3 = {
    name: "The Tower",
    designIntent: "Vertical climbing puzzle - climbers must scale a tall tower, builders bridge gaps at different heights, bomber creates descent route.",
    width: 1200,
    height: 700,
    totalLemmings: 20,
    saveTarget: 16,
    entrance: STANDARD_ENTRANCE,
    exit: STANDARD_EXIT,
    skills: STANDARD_SKILLS,
    sections: [
        {
            name: "boundary_walls",
            terrain: [
                { x: 0, y: 0, width: 60, height: 700 },
                { x: 1140, y: 0, width: 60, height: 700 },
                { x: 0, y: 0, width: 1200, height: 60 }
            ]
        },
        {
            name: "entrance_platform",
            terrain: [
                { x: 120, y: 90, width: 100, height: 20 }
            ]
        },
        {
            name: "tower_base",
            terrain: [
                { x: 300, y: 160, width: 30, height: 180 },
                { x: 370, y: 160, width: 30, height: 180 },
                { x: 330, y: 320, width: 40, height: 20 }
            ]
        },
        {
            name: "mid_level_gaps",
            terrain: [
                { x: 480, y: 280, width: 100, height: 20 },
                { x: 640, y: 340, width: 100, height: 20 }
            ]
        },
        {
            name: "upper_platforms",
            terrain: [
                { x: 790, y: 400, width: 100, height: 20 },
                { x: 870, y: 460, width: 100, height: 20 }
            ]
        },
        {
            name: "exit_platform",
            terrain: [
                { x: 1000, y: 530, width: 100, height: 20 }
            ]
        }
    ],
    ground: { x: 0, y: 640, width: 1200, height: 60 }
};

const LEVEL_4 = {
    name: "Resource Management",
    designIntent: "Complex winding path with barely enough skills if used optimally. Tests careful planning and execution.",
    width: 1200,
    height: 700,
    totalLemmings: 20,
    saveTarget: 17,
    entrance: STANDARD_ENTRANCE,
    exit: STANDARD_EXIT,
    skills: STANDARD_SKILLS,
    sections: [
        {
            name: "boundary_walls",
            terrain: [
                { x: 0, y: 0, width: 60, height: 700 },
                { x: 1140, y: 0, width: 60, height: 700 },
                { x: 0, y: 0, width: 1200, height: 60 }
            ]
        },
        {
            name: "entrance_platform",
            terrain: [
                { x: 120, y: 90, width: 100, height: 20 }
            ]
        },
        {
            name: "winding_path_1",
            terrain: [
                { x: 280, y: 140, width: 100, height: 20 },
                { x: 340, y: 160, width: 40, height: 60 },
                { x: 380, y: 220, width: 120, height: 20 }
            ]
        },
        {
            name: "winding_path_2",
            terrain: [
                { x: 550, y: 280, width: 100, height: 20 },
                { x: 700, y: 340, width: 100, height: 20 }
            ]
        },
        {
            name: "winding_path_3",
            terrain: [
                { x: 820, y: 400, width: 100, height: 20 },
                { x: 870, y: 420, width: 40, height: 70 }
            ]
        },
        {
            name: "exit_platform",
            terrain: [
                { x: 910, y: 490, width: 160, height: 20 },
                { x: 1000, y: 540, width: 80, height: 20 }
            ]
        }
    ],
    ground: { x: 0, y: 640, width: 1200, height: 60 }
};

const LEVEL_5 = {
    name: "Perfect Timing",
    designIntent: "Complex maze requiring precise sequencing. Must sacrifice some lemmings as blockers/bombers. Tests timing and coordination.",
    width: 1200,
    height: 700,
    totalLemmings: 20,
    saveTarget: 15,
    entrance: STANDARD_ENTRANCE,
    exit: STANDARD_EXIT,
    skills: STANDARD_SKILLS,
    sections: [
        {
            name: "boundary_walls",
            terrain: [
                { x: 0, y: 0, width: 60, height: 700 },
                { x: 1140, y: 0, width: 60, height: 700 },
                { x: 0, y: 0, width: 1200, height: 60 }
            ]
        },
        {
            name: "entrance_platform",
            terrain: [
                { x: 120, y: 90, width: 100, height: 20 }
            ]
        },
        {
            name: "maze_upper",
            terrain: [
                { x: 250, y: 150, width: 200, height: 20 },
                { x: 200, y: 170, width: 60, height: 50 },
                { x: 480, y: 190, width: 150, height: 20 }
            ]
        },
        {
            name: "maze_middle",
            terrain: [
                { x: 350, y: 260, width: 180, height: 20 },
                { x: 420, y: 280, width: 50, height: 80 },
                { x: 560, y: 320, width: 200, height: 20 }
            ]
        },
        {
            name: "maze_lower",
            terrain: [
                { x: 680, y: 390, width: 100, height: 20 },
                { x: 830, y: 450, width: 100, height: 20 }
            ]
        },
        {
            name: "exit_platform",
            terrain: [
                { x: 980, y: 520, width: 120, height: 20 }
            ]
        }
    ],
    ground: { x: 0, y: 640, width: 1200, height: 60 }
};

// Export all levels as an array
export const LEVELS = [LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5];

// Export individual levels for backwards compatibility
export { LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5 };

export default LEVELS;
