import Lemming from './Lemming.js';
import TerrainManager from './TerrainManager.js';
import ParticleSystem from './ParticleSystem.js';
import UIManager, { getSkillButtonBounds, getDebugLevelMenuLayout, SKILL_BUTTON_ORDER } from './UIManager.js';
import LevelValidator from './LevelValidator.js';
import LEVELS from './levels.js';
import { SPAWN_INTERVAL, STATES } from './constants.js';

const SHOW_TERRAIN_DIMENSIONS = true;

// Initialize canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Level management
let currentLevelIndex = 0;
let currentLevel = null;
let MAX_LEMMINGS = 20;
let saveTarget = 16;

// Game state
let lastTime = 0;
let deltaTime = 0;

// FPS tracking
let fps = 0;
let frameCount = 0;
let fpsUpdateTime = 0;

// Terrain
const terrain = new TerrainManager(canvas.width, canvas.height);

// Water zones
let waterZones = [];
let waterTime = 0;

// Level-specific objects (will be initialized in loadLevel)
let exitConfig = null;
let entrance = null;
let exitPortal = null;

// UI Manager
const uiManager = new UIManager(canvas);
let skillButtonBounds = getSkillButtonBounds(canvas.width, canvas.height);
const skillHotkeyMap = {};
SKILL_BUTTON_ORDER.forEach((skill, index) => {
    skillHotkeyMap[(index + 1).toString()] = skill;
});

// Lemmings array
let lemmings = [];
let spawnTimer = 0;
let lemmingsSpawned = 0;
let lemmingsDead = 0;
let lemmingsSaved = 0;

// Game state and timer
let gameState = 'playing'; // 'playing', 'won', 'lost'
let gameTimer = 0; // Time elapsed in seconds
let finalTime = 0; // Time when game ended

// Skill inventory
let skills = {};
let selectedSkill = 'blocker';

// Load level function
function loadLevel(levelIndex) {
    console.log(`Loading Level ${levelIndex + 1}...`);

    // Get level data
    currentLevel = LEVELS[levelIndex];
    currentLevelIndex = levelIndex;
    MAX_LEMMINGS = currentLevel.totalLemmings;
    saveTarget = currentLevel.saveTarget;

    // Reset game state
    lemmings = [];
    spawnTimer = 0;
    lemmingsSpawned = 0;
    lemmingsDead = 0;
    lemmingsSaved = 0;
    gameState = 'playing';
    gameTimer = 0;
    finalTime = 0;

    // Initialize terrain
    terrain.initializeFromLevel(currentLevel);

    // Set up entrance
    entrance = new ParticleSystem(currentLevel.entrance.x, currentLevel.entrance.y, { theme: 'entrance' });

    // Set up exit
    if (currentLevel.exit) {
        const floorY = currentLevel.ground ? currentLevel.ground.y : 640;
        exitConfig = {
            position: { x: currentLevel.exit.x, y: currentLevel.exit.y },
            dimensions: { width: 40, height: 60 }
        };

        const exitCenterX = exitConfig.position.x + exitConfig.dimensions.width / 2;
        const exitBottomY = floorY;
        exitPortal = new ParticleSystem(exitCenterX, exitBottomY, {
            theme: 'exit',
            width: exitConfig.dimensions.width,
            height: exitConfig.dimensions.height
        });
    }

    waterZones = currentLevel.water || [];
    waterTime = 0;

    // Initialize skills from level data
    skills = { ...currentLevel.skills };
    selectedSkill = Object.keys(skills).find(skill => skills[skill] > 0) || 'blocker';

    console.log(`Level ${levelIndex + 1}: ${currentLevel.name}`);
    console.log(`Design Intent: ${currentLevel.designIntent}`);
    console.log(`Skills:`, skills);
    console.log(`Target: ${saveTarget}/${MAX_LEMMINGS}`);
}

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

function getClickedDebugLevelButton(x, y) {
    const debugLayout = getDebugLevelMenuLayout(LEVELS.length);
    for (const { levelIndex, rect } of debugLayout) {
        if (isPointInBounds(x, y, rect)) {
            return levelIndex;
        }
    }
    return null;
}

// Mouse move handler
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    // Check if hovering over restart button when game is won or lost
    if (gameState === 'won' || gameState === 'lost') {
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

    // Check if hovering over debug level menu
    const hoveredDebugLevel = getClickedDebugLevelButton(mouseX, mouseY);
    if (hoveredDebugLevel !== null) {
        canvas.style.cursor = 'pointer';
        hoveredLemming = null;
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

    // Check for button clicks if game is won or lost
    if (gameState === 'won' || gameState === 'lost') {
        const boxWidth = 400;
        const boxHeight = 300;
        const boxX = (canvas.width - boxWidth) / 2;
        const boxY = (canvas.height - boxHeight) / 2;
        const buttonWidth = 180;
        const buttonHeight = 50;
        const buttonSpacing = 20;
        const buttonY = boxY + boxHeight - 80;

        if (gameState === 'won') {
            const hasNextLevel = currentLevelIndex < LEVELS.length - 1;

            if (hasNextLevel) {
                // Check Next Level button (left)
                const nextButtonX = canvas.width / 2 - buttonWidth - buttonSpacing / 2;
                if (clickX >= nextButtonX && clickX <= nextButtonX + buttonWidth &&
                    clickY >= buttonY && clickY <= buttonY + buttonHeight) {
                    loadLevel(currentLevelIndex + 1);
                    return;
                }

                // Check Restart button (right)
                const restartButtonX = canvas.width / 2 + buttonSpacing / 2;
                if (clickX >= restartButtonX && clickX <= restartButtonX + buttonWidth &&
                    clickY >= buttonY && clickY <= buttonY + buttonHeight) {
                    loadLevel(currentLevelIndex);
                    return;
                }
            } else {
                // Check Restart button (centered) - last level
                const buttonX = (canvas.width - buttonWidth) / 2;
                if (clickX >= buttonX && clickX <= buttonX + buttonWidth &&
                    clickY >= buttonY && clickY <= buttonY + buttonHeight) {
                    loadLevel(currentLevelIndex);
                    return;
                }
            }
        } else if (gameState === 'lost') {
            // Check Restart button (centered)
            const buttonWidth = 200;
            const buttonX = (canvas.width - buttonWidth) / 2;
            if (clickX >= buttonX && clickX <= buttonX + buttonWidth &&
                clickY >= buttonY && clickY <= buttonY + buttonHeight) {
                loadLevel(currentLevelIndex);
                return;
            }
        }
    }

    // Check if debug level menu was clicked (always active)
    const clickedDebugLevel = getClickedDebugLevelButton(clickX, clickY);
    if (clickedDebugLevel !== null) {
        console.log(`Switching to Level ${clickedDebugLevel + 1}`);
        loadLevel(clickedDebugLevel);
        return;
    }

    // Don't allow skill selection or lemming clicks if game is over
    if (gameState !== 'playing') {
        return;
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
            } else if (selectedSkill === 'basher' && skills.basher > 0) {
                // Can only assign basher if lemming is walking
                if (lemming.state === STATES.WALKING) {
                    // Always set ready to bash - lemming will walk until it physically hits a wall
                    lemming.readyToBash = true;
                    skills.basher--;
                    console.log(`Assigned basher to lemming. Remaining: ${skills.basher}`);
                }
            } else if (selectedSkill === 'bomber' && skills.bomber > 0) {
                // Can assign bomber to any lemming that's not already a bomber or dead
                if (lemming.bomberCountdown === -1 && lemming.state !== STATES.DEAD) {
                    lemming.bomberCountdown = 300; // 5 seconds at 60fps
                    skills.bomber--;
                    console.log(`Assigned bomber to lemming. Remaining: ${skills.bomber}`);
                }
            } else if (selectedSkill === 'climber' && skills.climber > 0) {
                // Can assign climber to any lemming that's not dead and not already a climber
                if (!lemming.isClimber && lemming.state !== STATES.DEAD) {
                    lemming.isClimber = true; // Permanent ability
                    skills.climber--;
                    console.log(`Assigned climber to lemming. Remaining: ${skills.climber}`);
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

    // Don't allow skill selection if game is over
    if (gameState !== 'playing') return;

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

        if (isLemmingInWater(lemming)) {
            if (lemming.state !== STATES.DEAD) {
                lemming.state = STATES.DEAD;
                lemming.vx = 0;
                lemming.vy = 0;
            }
        }

        // Check for explosion and trigger screen shake
        if (lemming.justExploded) {
            screenShake = SCREEN_SHAKE_FRAMES;
            lemming.justExploded = false; // Reset flag
        }

    // Prevent lemmings from wrapping around the screen (respect solid walls)
    if (lemming.x > canvas.width - 5) {
        lemming.x = canvas.width - 5;
        lemming.direction = -1;
    }
    if (lemming.x < 5) {
        lemming.x = 5;
        lemming.direction = 1;
    }
    });

    waterTime += dt;

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

    // Check lose condition (continuously)
    if (gameState === 'playing') {
        const activeLemmings = lemmings.filter(l => l.state !== STATES.DEAD).length;
        const unspawnedLemmings = MAX_LEMMINGS - lemmingsSpawned;
        const maxPossibleSaves = lemmingsSaved + activeLemmings + unspawnedLemmings;

        if (maxPossibleSaves < saveTarget) {
            // Impossible to win - not enough lemmings can be saved
            gameState = 'lost';
            finalTime = gameTimer;
            console.log(`Level Failed! Only ${maxPossibleSaves} can be saved (need ${saveTarget})`);
        }
    }

    // Check win condition
    if (gameState === 'playing' && lemmingsSpawned >= MAX_LEMMINGS && lemmings.length === 0) {
        // All lemmings have been spawned and all are either saved or dead
        const winPercentage = (lemmingsSaved / MAX_LEMMINGS) * 100;
        if (lemmingsSaved >= saveTarget) {
            gameState = 'won';
            finalTime = gameTimer;
            console.log(`Level Complete! ${lemmingsSaved}/${MAX_LEMMINGS} saved (${winPercentage.toFixed(1)}%) in ${finalTime.toFixed(1)}s`);
        } else {
            // All lemmings processed but didn't meet win condition
            gameState = 'lost';
            finalTime = gameTimer;
            console.log(`Level Failed! ${lemmingsSaved}/${MAX_LEMMINGS} saved (${winPercentage.toFixed(1)}%)`);
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

    renderWater(ctx);

    if (SHOW_TERRAIN_DIMENSIONS) {
        renderTerrainDimensions(ctx);
    }

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
        deltaTime,
        gameState,
        levelName: currentLevel ? currentLevel.name : '',
        levelIndex: currentLevelIndex,
        totalLevels: LEVELS.length
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

        // Buttons
        const buttonWidth = 180;
        const buttonHeight = 50;
        const buttonSpacing = 20;
        const buttonY = boxY + boxHeight - 80;

        // Check if there's a next level
        const hasNextLevel = currentLevelIndex < LEVELS.length - 1;

        if (hasNextLevel) {
            // Next Level button (left)
            const nextButtonX = canvas.width / 2 - buttonWidth - buttonSpacing / 2;
            ctx.fillStyle = '#22c55e';
            ctx.strokeStyle = '#16a34a';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(nextButtonX, buttonY, buttonWidth, buttonHeight, 8);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 20px "Fredoka", sans-serif';
            ctx.fillText('Next Level', nextButtonX + buttonWidth / 2, buttonY + buttonHeight / 2);

            // Restart button (right)
            const restartButtonX = canvas.width / 2 + buttonSpacing / 2;
            ctx.fillStyle = '#8b5cf6';
            ctx.strokeStyle = '#c4b5fd';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(restartButtonX, buttonY, buttonWidth, buttonHeight, 8);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 20px "Fredoka", sans-serif';
            ctx.fillText('Restart', restartButtonX + buttonWidth / 2, buttonY + buttonHeight / 2);
        } else {
            // Only Restart button (centered) - last level
            const buttonX = (canvas.width - buttonWidth) / 2;
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
    }

    // Draw failure overlay if lost
    if (gameState === 'lost') {
        // Semi-transparent dark background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Failure message box
        const boxWidth = 400;
        const boxHeight = 300;
        const boxX = (canvas.width - boxWidth) / 2;
        const boxY = (canvas.height - boxHeight) / 2;

        // Box background with red/orange border
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 12);
        ctx.fill();
        ctx.stroke();

        // Level Failed title
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 36px "Fredoka", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Level Failed!', canvas.width / 2, boxY + 60);

        // Failure percentage
        const failPercentage = (lemmingsSaved / MAX_LEMMINGS) * 100;
        ctx.fillStyle = '#fb923c';
        ctx.font = 'bold 28px "Fredoka", sans-serif';
        ctx.fillText(`${lemmingsSaved}/${MAX_LEMMINGS} Saved`, canvas.width / 2, boxY + 120);
        ctx.font = '24px "Fredoka", sans-serif';
        ctx.fillText(`(${failPercentage.toFixed(1)}%)`, canvas.width / 2, boxY + 155);

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

function renderTerrainDimensions(ctx) {
    if (!currentLevel?.sections) return;

    ctx.save();
    ctx.font = '12px "Space Mono", monospace';
    ctx.fillStyle = 'rgba(241, 245, 249, 0.95)';
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.lineWidth = 2;

    currentLevel.sections.forEach(section => {
        (section.terrain || []).forEach((rect, rectIndex) => {
            const explicitLabel = rect?.label;
            const labelChar = explicitLabel || getTerrainLabel(section, rectIndex, rect);
            const widthLabel = `${rect.width}px`;
            const heightLabel = `${rect.height}px`;

            if (rect.height < currentLevel.height - 10) {
                // Draw width label centered above the rectangle
                const widthX = rect.x + rect.width / 2;
                const widthY = Math.max(10, rect.y - 10);
                drawLabel(ctx, widthLabel, widthX, widthY);

                // Draw height label rotated along the left side of the rectangle
                ctx.save();
                ctx.translate(Math.max(10, rect.x - 8), rect.y + rect.height / 2);
                ctx.rotate(-Math.PI / 2);
                drawLabel(ctx, heightLabel, 0, 0);
                ctx.restore();
            }

            // Optional guide lines to emphasize measurements
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
            ctx.beginPath();
            ctx.moveTo(rect.x, rect.y - 2);
            ctx.lineTo(rect.x + rect.width, rect.y - 2);
            ctx.moveTo(rect.x - 2, rect.y);
            ctx.lineTo(rect.x - 2, rect.y + rect.height);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';

            // Draw central label identifier (A, B, C, ...)
            if (labelChar) {
                drawLabel(ctx, labelChar, rect.x + rect.width / 2, rect.y + rect.height / 2);
            }
        });
    });

    ctx.restore();
}

function renderWater(ctx) {
    if (!waterZones.length) return;

    waterZones.forEach(zone => {
        const gradient = ctx.createLinearGradient(0, zone.y, 0, zone.y + zone.height);
        gradient.addColorStop(0, 'rgba(125, 211, 252, 0.9)');
        gradient.addColorStop(1, 'rgba(14, 165, 233, 0.9)');
        ctx.fillStyle = gradient;
        ctx.fillRect(zone.x, zone.y, zone.width, zone.height);

        const waveAmplitude = 4;
        const waveLength = 40;
        const speed = 2;
        const surfaceY = zone.y + 6;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(zone.x, surfaceY);
        for (let x = 0; x <= zone.width; x += 4) {
            const y = surfaceY + Math.sin((x / waveLength) + waterTime * speed) * waveAmplitude;
            ctx.lineTo(zone.x + x, y);
        }
        ctx.lineTo(zone.x + zone.width, zone.y + zone.height);
        ctx.lineTo(zone.x, zone.y + zone.height);
        ctx.closePath();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 0; x <= zone.width; x += 20) {
            const y = surfaceY + Math.sin(((x + 10) / waveLength) + waterTime * (speed * 1.2)) * (waveAmplitude * 0.8);
            ctx.moveTo(zone.x + x, y);
            ctx.lineTo(zone.x + x + 10, y);
        }
        ctx.stroke();
        ctx.restore();
    });
}

function isLemmingInWater(lemming) {
    if (!waterZones.length) return false;
    return waterZones.some(zone =>
        lemming.x >= zone.x && lemming.x <= zone.x + zone.width &&
        lemming.y >= zone.y
    );
}

function drawLabel(ctx, text, x, y) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const metrics = ctx.measureText(text);
    const paddingX = 4;
    const paddingY = 2;
    const width = metrics.width + paddingX * 2;
    const height = 12 + paddingY * 2;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.beginPath();
    ctx.roundRect(x - width / 2, y - height / 2, width, height, 4);
    ctx.fill();

    ctx.fillStyle = 'rgba(241, 245, 249, 0.95)';
    ctx.fillText(text, x, y);
    ctx.restore();
}

function getTerrainLabel(section, rectIndex, rect) {
    if (!section || !currentLevel) return null;
    if (rect?.label) return rect.label;
    if (rect?.height && rect.height >= currentLevel.height - 10) {
        return null;
    }
    if (section.label) return section.label;
    const sections = currentLevel.sections;
    const sectionIndex = Math.max(0, sections.indexOf(section));
    const code = 65 + sectionIndex + rectIndex;
    if (code > 90) return null;
    return String.fromCharCode(code);
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

// Initialize first level and start the game loop
console.log('Canvas initialized:', canvas.width, 'x', canvas.height);
loadLevel(0);
console.log('Starting game loop...');
requestAnimationFrame(gameLoop);
