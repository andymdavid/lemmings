// Physics constants
export const WALK_SPEED = 0.5;
export const GRAVITY = 0.4;
export const TERMINAL_VELOCITY = 8;
export const MAX_SAFE_FALL = 80;
export const DIG_SPEED = 0.3; // pixels per frame downward while digging

// Game configuration
export const MAX_LEMMINGS = 20;
export const SPAWN_INTERVAL = 2.0; // seconds

// Lemming states
export const STATES = {
    WALKING: 'walking',
    FALLING: 'falling',
    BLOCKING: 'blocking',
    DIGGING: 'digging',
    BUILDING: 'building',
    BOMBER: 'bomber',
    EXPLODING: 'exploding',
    DEAD: 'dead',
    SAVED: 'saved'
};

// Visual constants
export const LEMMING_WIDTH = 10;
export const LEMMING_HEIGHT = 20;
export const LEMMING_BODY_HEIGHT = 14;
export const LEMMING_HEAD_RADIUS = 3;

// Colors
export const COLORS = {
    LEMMING_NORMAL: '#22d3ee',
    LEMMING_NORMAL_OUTLINE: '#0e7490',
    LEMMING_BLOCKER: '#fb923c',
    LEMMING_BLOCKER_OUTLINE: '#c2410c',
    LEMMING_DIGGER: '#d97706',
    LEMMING_DIGGER_OUTLINE: '#92400e',
    LEMMING_BUILDER: '#eab308',
    LEMMING_BUILDER_OUTLINE: '#a16207',
    TERRAIN_BASE_R: 139,
    TERRAIN_BASE_G: 69,
    TERRAIN_BASE_B: 19
};
