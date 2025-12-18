// Level configuration
export const LEVEL_1 = {
    entrance: { x: 100, y: 150 },
    exit: { x: 1100, y: 625 },
    terrain: [
        // Entrance platform (top-left)
        { x: 50, y: 150, width: 100, height: 20 },

        // Staircase down from entrance
        { x: 140, y: 170, width: 60, height: 20 },
        { x: 190, y: 190, width: 60, height: 20 },

        // Middle barriers and platforms
        { x: 280, y: 250, width: 80, height: 100 },
        { x: 400, y: 300, width: 60, height: 80 },
        { x: 520, y: 350, width: 80, height: 60 },

        // Gap crossing platforms
        { x: 650, y: 400, width: 100, height: 20 },
        { x: 800, y: 450, width: 120, height: 20 },

        // Exit platform (bottom-right)
        { x: 1050, y: 600, width: 140, height: 50 },

        // Ground level
        { x: 0, y: 650, width: 1200, height: 50 }
    ]
};

export default LEVEL_1;
