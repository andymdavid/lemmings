import Lemming from './Lemming.js';
import TerrainManager from './TerrainManager.js';
import ParticleSystem from './ParticleSystem.js';
import UIManager, { getSkillButtonBounds, SKILL_BUTTON_ORDER } from './UIManager.js';
import LevelValidator from './LevelValidator.js';
import LEVEL_1 from './levels.js';
import { MAX_LEMMINGS, SPAWN_INTERVAL, STATES } from './constants.js';

// Initialize canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Validate level before starting
const validator = new LevelValidator(canvas.width, canvas.height);
const validation = validator.validate(LEVEL_1);

console.log('=== LEVEL VALIDATION ===');
console.log(`Level: ${LEVEL_1.metadata?.name || 'Unnamed'}`);
console.log(`Valid: ${validation.valid}`);

if (validation.errors.length > 0) {
    console.error('ERRORS:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
}

if (validation.warnings.length > 0) {
    console.warn('WARNINGS:');
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
}

if (LEVEL_1.metadata?.requiredSkills) {
    console.log('Required Skills:', LEVEL_1.metadata.requiredSkills);
}

console.log(`Sections: ${LEVEL_1.sections?.length || 0}`);
console.log('========================');

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

// Exit configuration
const exitConfig = LEVEL_1.exit;
// Position exit on the ground floor (y=640 from levels.js ground terrain)
const floorY = 640;

const SHOW_EXIT_PORTAL = true;

// Entrance and exit portals
const entrance = new ParticleSystem(LEVEL_1.entrance.x, LEVEL_1.entrance.y, { theme: 'entrance' });
let exitPortal = null;
if (SHOW_EXIT_PORTAL) {
    const exitCenterX = exitConfig.position.x + exitConfig.dimensions.width / 2;
    const exitBottomY = floorY;
    exitPortal = new ParticleSystem(exitCenterX, exitBottomY, {
        theme: 'exit',
        width: exitConfig.dimensions.width,
        height: exitConfig.dimensions.height
    });
}

// UI Manager
const uiManager = new UIManager(canvas);
const skillButtonBounds = getSkillButtonBounds(canvas.width, canvas.height);
const skillHotkeyMap = {};
SKILL_BUTTON_ORDER.forEach((skill, index) => {
    skillHotkeyMap[(index + 1).toString()] = skill;
});

// Lemmings array
const lemmings = [];
let spawnTimer = 0;
let lemmingsSpawned = 0;
let lemmingsDead = 0;
let lemmingsSaved = 0;

// Game state and timer
let gameState = 'playing'; // 'playing', 'won', 'lost'
let gameTimer = 0; // Time elapsed in seconds
let finalTime = 0; // Time when game ended

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

function isPointInBounds(x, y, bounds) {
    return x >= bounds.x && x <= bounds.x + bounds.width &&
        y >= bounds.y && y <= bounds.y + bounds.height;
}

function getHoveredSkillButton(x, y) {
    for (const [skill, bounds] of Object.entries(skillButtonBounds)) {
        if (isPointInBounds(x, y, bounds)) {
            return skill;
        }
    }
    return null;
}

// Mouse move handler
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    // Check if hovering over restart button when game is won
    if (gameState === 'won') {
        const boxWidth = 400;
        const boxHeight = 300;
        const boxX = (canvas.width - boxWidth) / 2;
        const boxY = (canvas.height - boxHeight) / 2;
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonX = (canvas.width - buttonWidth) / 2;
        const buttonY = boxY + boxHeight - 80;

        if (mouseX >= buttonX && mouseX <= buttonX + buttonWidth &&
            mouseY >= buttonY && mouseY <= buttonY + buttonHeight) {
            canvas.style.cursor = 'pointer';
            return;
        }
        canvas.style.cursor = 'default';
        return;
    }

    const hoveredSkill = getHoveredSkillButton(mouseX, mouseY);
    if (hoveredSkill) {
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

    // Check for restart button click if game is won
    if (gameState === 'won') {
        const boxWidth = 400;
        const boxHeight = 300;
        const boxX = (canvas.width - boxWidth) / 2;
        const boxY = (canvas.height - boxHeight) / 2;
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonX = (canvas.width - buttonWidth) / 2;
        const buttonY = boxY + boxHeight - 80;

        if (clickX >= buttonX && clickX <= buttonX + buttonWidth &&
            clickY >= buttonY && clickY <= buttonY + buttonHeight) {
            // Restart the game
            location.reload();
            return;
        }
    }

    const clickedSkill = getHoveredSkillButton(clickX, clickY);
    if (clickedSkill) {
        selectedSkill = clickedSkill;
        console.log(`Selected skill: ${clickedSkill.charAt(0).toUpperCase() + clickedSkill.slice(1)}`);
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
                    lemming.buildStartY = lemming.y;
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

document.addEventListener('keydown', (e) => {
    const pressedKey = e.key;
    const skill = skillHotkeyMap[pressedKey];
    if (!skill) return;

    selectedSkill = skill;
    console.log(`Selected skill via hotkey: ${skill.charAt(0).toUpperCase() + skill.slice(1)}`);
    e.preventDefault();
});

// Update game state
function update(dt) {
    // Update entrance/exit visuals
    entrance.update(dt);
    if (exitPortal) {
        exitPortal.update(dt);
    }

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

    // Check exit collision for lemmings
    if (exitPortal) {
        const exitBounds = {
            x: exitConfig.position.x,
            y: exitConfig.position.y,
            width: exitConfig.dimensions.width,
            height: exitConfig.dimensions.height
        };

        for (let i = lemmings.length - 1; i >= 0; i--) {
            const lemming = lemmings[i];
            // Only lemmings that are alive can exit
            if (lemming.state !== STATES.DEAD && lemming.state !== STATES.SAVED) {
                // Check if lemming's center point is inside exit bounds
                if (isPointInBounds(lemming.x, lemming.y, exitBounds)) {
                    lemming.state = STATES.SAVED;
                    // Spawn exit particles
                    exitPortal.spawnExitParticles(lemming.x, lemming.y);
                    lemmings.splice(i, 1);
                    lemmingsSaved++;
                }
            }
        }
    }

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

    // Update game timer
    if (gameState === 'playing') {
        gameTimer += dt;
    }

    // Check win condition
    if (gameState === 'playing' && lemmingsSpawned >= MAX_LEMMINGS && lemmings.length === 0) {
        // All lemmings have been spawned and all are either saved or dead
        const winPercentage = (lemmingsSaved / MAX_LEMMINGS) * 100;
        if (winPercentage >= 80) {
            gameState = 'won';
            finalTime = gameTimer;
            console.log(`Level Complete! ${lemmingsSaved}/${MAX_LEMMINGS} saved (${winPercentage.toFixed(1)}%) in ${finalTime.toFixed(1)}s`);
        }
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

    // Draw entrance/exit
    entrance.render(ctx);
    if (exitPortal) {
        exitPortal.render(ctx);
    }

    // Draw all lemmings
    lemmings.forEach(lemming => {
        const isHovered = lemming === hoveredLemming;
        lemming.render(ctx, isHovered);
    });

    // Draw UI
    const uiState = {
        lemmingsSpawned,
        lemmingsDead,
        lemmingsSaved,
        skills,
        selectedSkill,
        fps,
        deltaTime
    };
    uiManager.render(ctx, uiState);

    // Draw victory overlay if won
    if (gameState === 'won') {
        // Semi-transparent dark background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Victory message box
        const boxWidth = 400;
        const boxHeight = 300;
        const boxX = (canvas.width - boxWidth) / 2;
        const boxY = (canvas.height - boxHeight) / 2;

        // Box background with gold border
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 12);
        ctx.fill();
        ctx.stroke();

        // Level Complete title
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 36px "Fredoka", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Level Complete!', canvas.width / 2, boxY + 60);

        // Success percentage
        const winPercentage = (lemmingsSaved / MAX_LEMMINGS) * 100;
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 28px "Fredoka", sans-serif';
        ctx.fillText(`${lemmingsSaved}/${MAX_LEMMINGS} Saved`, canvas.width / 2, boxY + 120);
        ctx.font = '24px "Fredoka", sans-serif';
        ctx.fillText(`(${winPercentage.toFixed(1)}%)`, canvas.width / 2, boxY + 155);

        // Time taken
        ctx.fillStyle = '#f1f5f9';
        ctx.font = '20px "Fredoka", sans-serif';
        const minutes = Math.floor(finalTime / 60);
        const seconds = (finalTime % 60).toFixed(1);
        const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
        ctx.fillText(`Time: ${timeStr}`, canvas.width / 2, boxY + 195);

        // Restart button
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonX = (canvas.width - buttonWidth) / 2;
        const buttonY = boxY + boxHeight - 80;

        ctx.fillStyle = '#8b5cf6';
        ctx.strokeStyle = '#c4b5fd';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 20px "Fredoka", sans-serif';
        ctx.fillText('Restart', canvas.width / 2, buttonY + buttonHeight / 2);
    }

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
