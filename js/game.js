import Lemming from './Lemming.js';
import TerrainManager from './TerrainManager.js';
import ParticleSystem from './ParticleSystem.js';
import UIManager from './UIManager.js';
import LEVEL_1 from './levels.js';
import { MAX_LEMMINGS, SPAWN_INTERVAL, STATES } from './constants.js';

// Initialize canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game state
let lastTime = 0;
let deltaTime = 0;

// FPS tracking
let fps = 0;
let frameCount = 0;
let fpsUpdateTime = 0;

// Terrain
const terrain = new TerrainManager(canvas.width, canvas.height);
terrain.initializeFromLevel(LEVEL_1);

// Entrance
const entrance = new ParticleSystem(LEVEL_1.entrance.x, LEVEL_1.entrance.y);

// UI Manager
const uiManager = new UIManager(canvas);

// Lemmings array
const lemmings = [];
let spawnTimer = 0;
let lemmingsSpawned = 0;
let lemmingsDead = 0;

// Skill inventory
const skills = {
    blocker: 5,
    digger: 5,
    builder: 5,
    bomber: 5
};
let selectedSkill = 'blocker';

// Screen shake effect
let screenShake = 0; // Number of frames remaining for shake
const SCREEN_SHAKE_FRAMES = 10; // Duration of shake
const SCREEN_SHAKE_INTENSITY = 3; // Max pixels to shake

// Mouse interaction
let mouseX = 0;
let mouseY = 0;
let hoveredLemming = null;

// Helper function to check if point is within lemming bounds
function isPointInLemming(x, y, lemming) {
    if (lemming.state === STATES.DEAD) return false;

    const dx = x - lemming.x;
    const dy = y - (lemming.y - lemming.height / 2);
    const radius = Math.max(lemming.width, lemming.height) / 2;

    return dx * dx + dy * dy < radius * radius;
}

// Mouse move handler
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    // Check if hovering over skill buttons
    const blockerButtonBounds = { x: 15, y: 115, width: 150, height: 35 };
    const diggerButtonBounds = { x: 15, y: 155, width: 150, height: 35 };
    const builderButtonBounds = { x: 15, y: 195, width: 150, height: 35 };
    const bomberButtonBounds = { x: 15, y: 235, width: 150, height: 35 };

    const overButton =
        (mouseX >= blockerButtonBounds.x && mouseX <= blockerButtonBounds.x + blockerButtonBounds.width &&
         mouseY >= blockerButtonBounds.y && mouseY <= blockerButtonBounds.y + blockerButtonBounds.height) ||
        (mouseX >= diggerButtonBounds.x && mouseX <= diggerButtonBounds.x + diggerButtonBounds.width &&
         mouseY >= diggerButtonBounds.y && mouseY <= diggerButtonBounds.y + diggerButtonBounds.height) ||
        (mouseX >= builderButtonBounds.x && mouseX <= builderButtonBounds.x + builderButtonBounds.width &&
         mouseY >= builderButtonBounds.y && mouseY <= builderButtonBounds.y + builderButtonBounds.height) ||
        (mouseX >= bomberButtonBounds.x && mouseX <= bomberButtonBounds.x + bomberButtonBounds.width &&
         mouseY >= bomberButtonBounds.y && mouseY <= bomberButtonBounds.y + bomberButtonBounds.height);

    if (overButton) {
        canvas.style.cursor = 'pointer';
        hoveredLemming = null;
        return;
    }

    // Find hovered lemming
    hoveredLemming = null;
    for (let i = lemmings.length - 1; i >= 0; i--) {
        if (isPointInLemming(mouseX, mouseY, lemmings[i])) {
            hoveredLemming = lemmings[i];
            break;
        }
    }

    // Update cursor
    canvas.style.cursor = hoveredLemming ? 'pointer' : 'crosshair';
});

// Mouse click handler
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if skill buttons were clicked
    const blockerButtonBounds = { x: 15, y: 115, width: 150, height: 35 };
    const diggerButtonBounds = { x: 15, y: 155, width: 150, height: 35 };
    const builderButtonBounds = { x: 15, y: 195, width: 150, height: 35 };
    const bomberButtonBounds = { x: 15, y: 235, width: 150, height: 35 };

    if (clickX >= blockerButtonBounds.x && clickX <= blockerButtonBounds.x + blockerButtonBounds.width &&
        clickY >= blockerButtonBounds.y && clickY <= blockerButtonBounds.y + blockerButtonBounds.height) {
        selectedSkill = 'blocker';
        console.log('Selected skill: Blocker');
        return;
    }

    if (clickX >= diggerButtonBounds.x && clickX <= diggerButtonBounds.x + diggerButtonBounds.width &&
        clickY >= diggerButtonBounds.y && clickY <= diggerButtonBounds.y + diggerButtonBounds.height) {
        selectedSkill = 'digger';
        console.log('Selected skill: Digger');
        return;
    }

    if (clickX >= builderButtonBounds.x && clickX <= builderButtonBounds.x + builderButtonBounds.width &&
        clickY >= builderButtonBounds.y && clickY <= builderButtonBounds.y + builderButtonBounds.height) {
        selectedSkill = 'builder';
        console.log('Selected skill: Builder');
        return;
    }

    if (clickX >= bomberButtonBounds.x && clickX <= bomberButtonBounds.x + bomberButtonBounds.width &&
        clickY >= bomberButtonBounds.y && clickY <= bomberButtonBounds.y + bomberButtonBounds.height) {
        selectedSkill = 'bomber';
        console.log('Selected skill: Bomber');
        return;
    }

    // Find clicked lemming
    for (let i = lemmings.length - 1; i >= 0; i--) {
        const lemming = lemmings[i];
        if (isPointInLemming(clickX, clickY, lemming)) {
            // Try to assign selected skill
            if (selectedSkill === 'blocker' && skills.blocker > 0) {
                // Can only assign blocker if lemming is walking or falling
                if (lemming.state === STATES.WALKING ||
                    lemming.state === STATES.FALLING) {
                    lemming.state = STATES.BLOCKING;
                    lemming.vx = 0;
                    lemming.vy = 0;
                    skills.blocker--;
                    // NOTE: Blockers remain until level ends (can't be un-blocked in MVP)
                    console.log(`Assigned blocker to lemming. Remaining: ${skills.blocker}`);
                }
            } else if (selectedSkill === 'digger' && skills.digger > 0) {
                // Can only assign digger if lemming is walking and on ground
                if (lemming.state === STATES.WALKING) {
                    // Check if there's terrain below to dig
                    if (terrain.isSolid(lemming.x, lemming.y + 1)) {
                        lemming.state = STATES.DIGGING;
                        lemming.vx = 0;
                        lemming.vy = 0;
                        skills.digger--;
                        console.log(`Assigned digger to lemming. Remaining: ${skills.digger}`);
                    }
                }
            } else if (selectedSkill === 'builder' && skills.builder > 0) {
                // Can only assign builder if lemming is walking
                if (lemming.state === STATES.WALKING) {
                    lemming.state = STATES.BUILDING;
                    lemming.buildStepCount = 0;
                    lemming.buildFrameCounter = 0;
                    lemming.buildStepHeight = 0;
                    skills.builder--;
                    console.log(`Assigned builder to lemming. Remaining: ${skills.builder}`);
                }
            } else if (selectedSkill === 'bomber' && skills.bomber > 0) {
                // Can assign bomber to any lemming that's not already a bomber or dead
                if (lemming.bomberCountdown === -1 && lemming.state !== STATES.DEAD) {
                    lemming.bomberCountdown = 300; // 5 seconds at 60fps
                    skills.bomber--;
                    console.log(`Assigned bomber to lemming. Remaining: ${skills.bomber}`);
                }
            }
            break;
        }
    }
});

// Update game state
function update(dt) {
    // Update entrance
    entrance.update(dt);

    // Spawn lemmings
    if (lemmingsSpawned < MAX_LEMMINGS) {
        spawnTimer += dt;
        if (spawnTimer >= SPAWN_INTERVAL) {
            spawnTimer = 0;
            const newLemming = new Lemming(entrance.x, entrance.y);
            newLemming.state = STATES.FALLING;
            lemmings.push(newLemming);
            lemmingsSpawned++;
        }
    }

    // Update all lemmings
    lemmings.forEach(lemming => {
        lemming.update(dt, terrain, lemmings, entrance);

        // Check for explosion and trigger screen shake
        if (lemming.justExploded) {
            screenShake = SCREEN_SHAKE_FRAMES;
            lemming.justExploded = false; // Reset flag
        }

        // Wrap around screen edges
        if (lemming.x > canvas.width + 20) {
            lemming.x = -20;
        }
        if (lemming.x < -20) {
            lemming.x = canvas.width + 20;
        }
    });

    // Remove dead lemmings after animation completes
    for (let i = lemmings.length - 1; i >= 0; i--) {
        if (lemmings[i].state === STATES.DEAD &&
            lemmings[i].deathTimer >= lemmings[i].deathMaxTime) {
            lemmings.splice(i, 1);
            lemmingsDead++;
        }
    }

    // Update FPS counter
    frameCount++;
    fpsUpdateTime += dt;
    if (fpsUpdateTime >= 1.0) {
        fps = frameCount;
        frameCount = 0;
        fpsUpdateTime = 0;
    }
}

// Render game visuals
function render() {
    // Apply screen shake if active
    let shakeX = 0;
    let shakeY = 0;
    if (screenShake > 0) {
        shakeX = (Math.random() - 0.5) * 2 * SCREEN_SHAKE_INTENSITY;
        shakeY = (Math.random() - 0.5) * 2 * SCREEN_SHAKE_INTENSITY;
        ctx.save();
        ctx.translate(shakeX, shakeY);
        screenShake--;
    }

    // Clear canvas with background color
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw terrain
    terrain.render(ctx);

    // Draw entrance
    entrance.render(ctx);

    // Draw all lemmings
    lemmings.forEach(lemming => {
        const isHovered = lemming === hoveredLemming;
        lemming.render(ctx, isHovered);
    });

    // Draw UI
    const gameState = {
        lemmingsSpawned,
        lemmingsDead,
        skills,
        selectedSkill,
        fps,
        deltaTime
    };
    uiManager.render(ctx, gameState);

    // Restore canvas if screen shake was active
    if (shakeX !== 0 || shakeY !== 0) {
        ctx.restore();
    }
}

// Main game loop
function gameLoop(currentTime) {
    // Calculate delta time in seconds
    deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // Cap delta time to prevent spiral of death
    if (deltaTime > 0.1) {
        deltaTime = 0.1;
    }

    // Update and render
    update(deltaTime);
    render();

    // Request next frame
    requestAnimationFrame(gameLoop);
}

// Start the game loop
console.log('Canvas initialized:', canvas.width, 'x', canvas.height);
console.log('Starting game loop...');
requestAnimationFrame(gameLoop);
