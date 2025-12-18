import {
    WALK_SPEED,
    GRAVITY,
    TERMINAL_VELOCITY,
    MAX_SAFE_FALL,
    DIG_SPEED,
    STATES,
    LEMMING_WIDTH,
    LEMMING_HEIGHT,
    LEMMING_BODY_HEIGHT,
    LEMMING_HEAD_RADIUS,
    COLORS
} from './constants.js';

const MAX_STEP_CLIMB = 4; // Pixels a walking lemming can climb when hitting a wall
const BUILDER_STEP_WIDTH = 10;
const BUILDER_STEP_HEIGHT = 2;

export default class Lemming {
    constructor(x, y) {
        // Position
        this.x = x;
        this.y = y;

        // Velocity
        this.vx = WALK_SPEED;
        this.vy = 0;

        // Direction: 1 = right, -1 = left
        this.direction = 1;

        // Current state
        this.state = STATES.WALKING;

        // Visual properties
        this.width = LEMMING_WIDTH;
        this.height = LEMMING_HEIGHT;

        // Animation
        this.animationFrame = 0;

        // Fall tracking
        this.fallDistance = 0;
        this.fallStartY = 0;

        // Death animation
        this.deathTimer = 0;
        this.deathMaxTime = 30; // frames
        this.splatRadius = 0;

        // Building state
        this.buildStepCount = 0; // Number of steps built
        this.buildFrameCounter = 0; // Frames since last step placed
        this.buildStepHeight = 0; // Current height of stairs built

        // Bomber state
        this.bomberCountdown = -1; // -1 = not a bomber, 0-300 = countdown frames
        this.justExploded = false; // Flag to trigger screen shake
    }

    update(dt, terrain, allLemmings = [], particleSystem = null) {
        // Update animation frame
        this.animationFrame++;

        // Handle death animation
        if (this.state === STATES.DEAD) {
            this.deathTimer++;
            // Expand splat radius
            if (this.deathTimer < 10) {
                this.splatRadius = (this.deathTimer / 10) * 15;
            }
            // Animation complete
            return;
        }

        // Handle bomber countdown
        if (this.bomberCountdown >= 0) {
            this.bomberCountdown--;

            // Trigger explosion when countdown reaches 0
            if (this.bomberCountdown < 0) {
                // Change state to exploding
                this.state = STATES.EXPLODING;

                // Set flag for screen shake trigger
                this.justExploded = true;

                // Remove terrain in circular area (25px radius)
                if (terrain) {
                    terrain.removeTerrainCircle(this.x, this.y, 25);
                }

                // Spawn explosion particles
                if (particleSystem) {
                    particleSystem.spawnExplosionParticles(this.x, this.y);
                }

                // Set to dead state (will be removed from game)
                this.state = STATES.DEAD;
                this.vx = 0;
                this.vy = 0;
                return;
            }
        }

        // Fade out fall distance indicator
        if (this.fallDistance > 0 && this.state === STATES.WALKING) {
            this.fallDistance -= 0.5;
            if (this.fallDistance < 0) this.fallDistance = 0;
        }

        // Apply gravity (not for blocking or building lemmings on ground)
        if (this.state === STATES.WALKING ||
            this.state === STATES.FALLING ||
            this.state === STATES.BLOCKING) {
            this.vy += GRAVITY;

            // Cap at terminal velocity
            if (this.vy > TERMINAL_VELOCITY) {
                this.vy = TERMINAL_VELOCITY;
            }
        }

        // Track falling state
        if (this.state === STATES.FALLING && this.fallStartY === 0) {
            this.fallStartY = this.y;
        }

        // Apply horizontal movement
        if (this.state === STATES.WALKING ||
            this.state === STATES.FALLING) {
            this.vx = WALK_SPEED * this.direction;

            const checkX = this.x + (this.direction * (this.width / 2 + 2));
            const hitWall = this.hasWallAhead(terrain);

            // Check for blocker collision
            let hitBlocker = false;
            for (const other of allLemmings) {
                if (other !== this && other.state === STATES.BLOCKING) {
                    const dx = checkX - other.x;
                    const dy = this.y - other.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < 12) {
                        hitBlocker = true;
                        break;
                    }
                }
            }

            if ((hitWall || hitBlocker) && this.state === STATES.WALKING) {
                if (hitBlocker) {
                    this.direction *= -1;
                } else if (hitWall && terrain && this.tryStepUp(terrain)) {
                    this.x += this.vx;
                } else {
                    // Reverse direction when hitting a wall or blocker
                    this.direction *= -1;
                }
            } else {
                // Move horizontally
                this.x += this.vx;
            }
        }

        // Handle digging behavior
        if (this.state === STATES.DIGGING && terrain) {
            // Move downward slowly
            this.y += DIG_SPEED;

            // Remove terrain below with rougher, wider pattern
            // Main dig area - wider tunnel (8px wide, 3px deep)
            terrain.removeTerrainRect(this.x, this.y, 8, 3);

            // Add roughness by removing random additional pixels around the edges
            for (let i = 0; i < 3; i++) {
                const offsetX = (Math.random() - 0.5) * 6; // Random offset within 3px left/right
                const offsetY = Math.random() * 2; // Random offset 0-2px down
                terrain.removeTerrainRect(this.x + offsetX, this.y + offsetY, 2, 2);
            }

            // Spawn dig particles every few frames
            if (this.animationFrame % 3 === 0 && particleSystem) {
                const particleCount = Math.floor(Math.random() * 4) + 5; // 5-8 particles
                particleSystem.spawnDigParticles(this.x, this.y, particleCount);
            }

            // Check if there's still terrain below to dig
            const checkBelow = terrain.isSolid(this.x, this.y + 4);
            const reachedBottom = this.y >= terrain.height - 10;

            if (!checkBelow || reachedBottom) {
                // Finished digging - transition to falling
                this.state = STATES.FALLING;
                this.fallStartY = this.y;
            }
        }

        // Handle building behavior
        if (this.state === STATES.BUILDING && terrain) {
            this.buildFrameCounter++;

            // Place a step every 8 frames
            if (this.buildFrameCounter >= 8) {
                this.buildFrameCounter = 0;

                // Each step is wider and shallower for smoother ramps
                const stepWidth = BUILDER_STEP_WIDTH;
                const stepHeight = BUILDER_STEP_HEIGHT;

                // Calculate step position (ahead of lemming in direction it's facing)
                const stepX = this.x + (this.direction * stepWidth / 2);
                const stepY = this.y - this.buildStepHeight - stepHeight;

                // Check for ceiling (terrain within 20px above)
                let hitCeiling = false;
                for (let checkY = stepY - 20; checkY < stepY; checkY++) {
                    for (let dx = 0; dx < stepWidth; dx++) {
                        if (terrain.isSolid(stepX + dx, checkY)) {
                            hitCeiling = true;
                            break;
                        }
                    }
                    if (hitCeiling) break;
                }

                // If ceiling detected, stop building
                if (hitCeiling) {
                    this.state = STATES.WALKING;
                    this.buildStepCount = 0;
                    this.buildFrameCounter = 0;
                    this.buildStepHeight = 0;
                    return;
                }

                // Check if there's space to build (not hitting wall or existing terrain)
                let canBuild = true;
                for (let dx = 0; dx < stepWidth; dx++) {
                    for (let dy = 0; dy < stepHeight; dy++) {
                        const checkX = stepX + dx;
                        const checkY = stepY + dy;
                        if (terrain.isSolid(checkX, checkY)) {
                            canBuild = false;
                            break;
                        }
                    }
                    if (!canBuild) break;
                }

                if (canBuild) {
                    // Place the step
                    terrain.addTerrainRect(stepX, stepY, stepWidth, stepHeight);
                    this.buildStepCount++;
                    this.buildStepHeight += stepHeight;

                    // Spawn build particles
                    if (particleSystem) {
                        particleSystem.spawnBuildParticles(stepX + stepWidth / 2, stepY);
                    }

                    // Move lemming up and forward onto the new step
                    this.x += this.direction * stepWidth;
                    this.y -= stepHeight;
                } else {
                    // Can't build anymore (hit obstacle) - return to walking
                    this.state = STATES.WALKING;
                    this.buildStepCount = 0;
                    this.buildFrameCounter = 0;
                    this.buildStepHeight = 0;
                }

                // Check if reached maximum steps
                if (this.buildStepCount >= 12) {
                    // Finished building - return to walking
                    this.state = STATES.WALKING;
                    this.buildStepCount = 0;
                    this.buildFrameCounter = 0;
                    this.buildStepHeight = 0;
                }
            }

            // Keep builder stationary while building (except when placing steps)
            this.vx = 0;
            this.vy = 0;
        }

        // Apply vertical movement
        this.y += this.vy;

        // Ground collision detection
        if (terrain) {
            // Check for ground within a small range below the lemming's feet (not just at exact position)
            // This allows lemmings to detect and land on builder steps
            let groundBelow = false;
            let groundDistance = 0;
            const maxGroundCheckDistance = 3; // Check up to 3 pixels below

            for (let checkDist = 0; checkDist <= maxGroundCheckDistance; checkDist++) {
                if (terrain.isSolid(this.x, this.y + checkDist)) {
                    groundBelow = true;
                    groundDistance = checkDist;
                    break;
                }
            }

            if (groundBelow) {
                // If ground is below us, move down close to it (or push up if inside it)
                if (groundDistance > 0) {
                    // Keep a 1px buffer above terrain so we don't snap into it
                    const snapDistance = Math.max(groundDistance - 1, 0);
                    if (snapDistance > 0) {
                        this.y += snapDistance;
                    }
                } else {
                    // We're inside terrain - push up until on surface
                    while (terrain.isSolid(this.x, this.y) && this.y > 0) {
                        this.y -= 1;
                    }
                }

                this.vy = 0;

                // Transition from falling to walking (unless blocking)
                if (this.state === STATES.FALLING) {
                    this.fallDistance = this.y - this.fallStartY;
                    this.fallStartY = 0;

                    // Apply fall damage if fall distance is too great
                    if (this.fallDistance > MAX_SAFE_FALL) {
                        this.state = STATES.DEAD;
                        this.vx = 0;
                        this.vy = 0;
                    } else {
                        this.state = STATES.WALKING;
                    }
                }

                // Keep blocker stationary on ground
                if (this.state === STATES.BLOCKING) {
                    this.vx = 0;
                    this.vy = 0;
                }
            } else if (this.state === STATES.WALKING) {
                // Check for ledge - look ahead for ground
                let hasGroundAhead = false;
                const lookAheadX = this.x + (this.direction * (this.width / 2 + 1));

                // Check within 5 pixels down
                for (let checkY = this.y; checkY < this.y + 5; checkY++) {
                    if (terrain.isSolid(lookAheadX, checkY)) {
                        hasGroundAhead = true;
                        break;
                    }
                }

                // If no ground ahead, continue walking (will fall off)
                if (!hasGroundAhead) {
                    this.state = STATES.FALLING;
                }
            }

            // Check if currently falling
            if (!groundBelow && this.state === STATES.WALKING) {
                this.state = STATES.FALLING;
            }
        }
    }

    render(ctx, isHovered = false) {
        // Hover glow effect
        if (isHovered && this.state !== STATES.DEAD) {
            ctx.save();
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }

        // Death animation
        if (this.state === STATES.DEAD) {
            if (isHovered) ctx.restore();

            ctx.save();

            // Calculate fade out
            const fadeProgress = Math.min(this.deathTimer / this.deathMaxTime, 1);
            const alpha = 1 - fadeProgress;

            // Draw expanding red splat
            const gradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, this.splatRadius
            );
            gradient.addColorStop(0, `rgba(220, 38, 38, ${alpha})`);
            gradient.addColorStop(0.5, `rgba(239, 68, 68, ${alpha * 0.6})`);
            gradient.addColorStop(1, `rgba(239, 68, 68, 0)`);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.splatRadius, 0, Math.PI * 2);
            ctx.fill();

            // Draw splat particles
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const dist = this.splatRadius * 0.8;
                const px = this.x + Math.cos(angle) * dist;
                const py = this.y + Math.sin(angle) * dist;

                ctx.fillStyle = `rgba(220, 38, 38, ${alpha * 0.8})`;
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
            return;
        }

        ctx.save();

        // Calculate animation bob
        let bobOffset = 0;
        if (this.state === STATES.WALKING) {
            bobOffset = Math.sin(this.animationFrame / 10) * 1;
        } else if (this.state === STATES.DIGGING) {
            bobOffset = Math.sin(this.animationFrame / 5) * 0.5; // Faster, smaller bob for digging
        } else if (this.state === STATES.BUILDING) {
            bobOffset = Math.sin(this.animationFrame / 4) * 0.8; // Medium bob for building
        }

        // Flip horizontally based on direction
        const flipX = this.direction === -1;
        if (flipX) {
            ctx.translate(this.x, this.y + bobOffset);
            ctx.scale(-1, 1);
            ctx.translate(-this.x, -(this.y + bobOffset));
        }

        // Body dimensions
        const bodyWidth = 10;
        const bodyHeight = LEMMING_BODY_HEIGHT;
        const headRadius = LEMMING_HEAD_RADIUS;
        const bodyX = this.x - bodyWidth / 2;
        const bodyY = this.y - bodyHeight + bobOffset;

        // Choose color based on state
        const isBlocking = this.state === STATES.BLOCKING;
        const isDigging = this.state === STATES.DIGGING;
        const isBuilding = this.state === STATES.BUILDING;

        let bodyColor, outlineColor;
        if (isBlocking) {
            bodyColor = COLORS.LEMMING_BLOCKER;
            outlineColor = COLORS.LEMMING_BLOCKER_OUTLINE;
        } else if (isDigging) {
            bodyColor = COLORS.LEMMING_DIGGER;
            outlineColor = COLORS.LEMMING_DIGGER_OUTLINE;
        } else if (isBuilding) {
            bodyColor = COLORS.LEMMING_BUILDER;
            outlineColor = COLORS.LEMMING_BUILDER_OUTLINE;
        } else {
            bodyColor = COLORS.LEMMING_NORMAL;
            outlineColor = COLORS.LEMMING_NORMAL_OUTLINE;
        }

        // Draw body (rounded rectangle)
        ctx.fillStyle = bodyColor;
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.roundRect(bodyX, bodyY, bodyWidth, bodyHeight, 3);
        ctx.fill();
        ctx.stroke();

        // Draw head (circle on top)
        const headX = this.x;
        const headY = bodyY - headRadius;

        ctx.fillStyle = bodyColor;
        ctx.strokeStyle = outlineColor;
        ctx.beginPath();
        ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw eyes (two small white circles)
        ctx.fillStyle = '#fff';

        // Left eye
        ctx.beginPath();
        ctx.arc(headX - 1.5, headY - 0.5, 1, 0, Math.PI * 2);
        ctx.fill();

        // Right eye
        ctx.beginPath();
        ctx.arc(headX + 1.5, headY - 0.5, 1, 0, Math.PI * 2);
        ctx.fill();

        // Draw blocker arms (if blocking)
        if (this.state === STATES.BLOCKING) {
            ctx.strokeStyle = outlineColor;
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';

            // Left arm (extended out)
            ctx.beginPath();
            ctx.moveTo(this.x - 3, this.y - 10);
            ctx.lineTo(this.x - 9, this.y - 8);
            ctx.stroke();

            // Right arm (extended out)
            ctx.beginPath();
            ctx.moveTo(this.x + 3, this.y - 10);
            ctx.lineTo(this.x + 9, this.y - 8);
            ctx.stroke();

            // Stop sign indicator - octagon shape
            ctx.fillStyle = '#ef4444';
            ctx.strokeStyle = '#991b1b';
            ctx.lineWidth = 1.5;

            // Draw octagon
            const signSize = 4;
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
                const px = this.x + Math.cos(angle) * signSize;
                const py = this.y - this.height / 2 + Math.sin(angle) * signSize;
                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // STOP text
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 3px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⛔', this.x, this.y - this.height / 2);

            // Draw collision radius indicator
            ctx.strokeStyle = 'rgba(251, 146, 60, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.beginPath();
            ctx.arc(this.x, this.y - this.height / 2, 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw digger animation (if digging)
        if (this.state === STATES.DIGGING) {
            ctx.strokeStyle = outlineColor;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';

            // Animated digging motion - arms moving up and down
            const digOffset = Math.sin(this.animationFrame / 5) * 2;

            // Left arm (digging down)
            ctx.beginPath();
            ctx.moveTo(this.x - 3, this.y - 10);
            ctx.lineTo(this.x - 4, this.y - 4 + digOffset);
            ctx.stroke();

            // Right arm (digging down)
            ctx.beginPath();
            ctx.moveTo(this.x + 3, this.y - 10);
            ctx.lineTo(this.x + 4, this.y - 4 + digOffset);
            ctx.stroke();

            // Pickaxe/shovel indicator
            ctx.strokeStyle = '#78716c';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x - 1, this.y - 2 + digOffset);
            ctx.lineTo(this.x + 1, this.y - 2 + digOffset);
            ctx.lineTo(this.x, this.y + digOffset);
            ctx.closePath();
            ctx.fillStyle = '#78716c';
            ctx.fill();
            ctx.stroke();
        }

        // Draw builder animation (if building)
        if (this.state === STATES.BUILDING) {
            ctx.strokeStyle = outlineColor;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';

            // Animated hammering motion - arms swinging up and down
            const hammerOffset = Math.sin(this.animationFrame / 4) * 3;

            // Right arm (hammering motion) - swings forward and down
            ctx.beginPath();
            ctx.moveTo(this.x + 3, this.y - 10);
            ctx.lineTo(this.x + 7 * this.direction, this.y - 7 + hammerOffset);
            ctx.stroke();

            // Left arm (supporting)
            ctx.beginPath();
            ctx.moveTo(this.x - 3, this.y - 10);
            ctx.lineTo(this.x - 2, this.y - 6);
            ctx.stroke();

            // Hammer tool
            ctx.fillStyle = '#71717a';
            ctx.strokeStyle = '#27272a';
            ctx.lineWidth = 1;

            // Hammer head
            ctx.beginPath();
            ctx.rect(
                this.x + (6 * this.direction) - 2,
                this.y - 6 + hammerOffset,
                4,
                2
            );
            ctx.fill();
            ctx.stroke();

            // Hammer handle
            ctx.strokeStyle = '#78716c';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(this.x + (6 * this.direction), this.y - 5 + hammerOffset);
            ctx.lineTo(this.x + (7 * this.direction), this.y - 7 + hammerOffset);
            ctx.stroke();
        }

        ctx.restore();

        // Clear hover glow shadow
        if (isHovered && this.state !== STATES.DEAD) {
            ctx.restore();
        }

        // Debug: Show fall distance if lemming recently fell
        if (this.fallDistance > 0) {
            ctx.save();
            // Red if dangerous fall, yellow if safe
            ctx.fillStyle = this.fallDistance > MAX_SAFE_FALL ? '#ef4444' : '#fbbf24';
            ctx.font = '10px "Space Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`-${Math.floor(this.fallDistance)}`, this.x, this.y - this.height - 5);
            ctx.restore();
        }

        // State indicator (debug)
        if (this.state === STATES.FALLING) {
            ctx.save();
            ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
            ctx.beginPath();
            ctx.arc(this.x, this.y - this.height - 8, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Bomber countdown display
        if (this.bomberCountdown >= 0) {
            ctx.save();

            // Calculate seconds remaining (round up)
            const secondsRemaining = Math.ceil((this.bomberCountdown + 1) / 60);

            // Draw countdown number above lemming's head
            ctx.font = 'bold 20px "Fredoka", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';

            // Add outline for readability
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText(secondsRemaining.toString(), this.x, this.y - this.height - 15);

            // Fill with red color
            ctx.fillStyle = '#ef4444';
            ctx.fillText(secondsRemaining.toString(), this.x, this.y - this.height - 15);

            ctx.restore();
        }
    }

    hasWallAhead(terrain) {
        if (!terrain) return false;

        const checkX = this.x + (this.direction * (this.width / 2 + 2));
        const checkY = this.y - this.height / 2;

        for (let i = 0; i < 3; i++) {
            if (terrain.isSolid(checkX, checkY + i * 5)) {
                return true;
            }
        }

        // Additional samples near the feet so shallow steps (e.g., builder ramps) count as obstacles
        for (let offset = 1; offset <= MAX_STEP_CLIMB; offset++) {
            if (terrain.isSolid(checkX, this.y - offset)) {
                return true;
            }
        }

        return false;
    }

    isSpaceClear(terrain, candidateFeetY) {
        return this.isSpaceClearAt(terrain, this.x, candidateFeetY);
    }

    isSpaceClearAt(terrain, centerX, candidateFeetY) {
        if (!terrain) return true;

        const halfWidth = this.width / 2 - 1;
        const sampleXs = [centerX - halfWidth, centerX, centerX + halfWidth];
        const topY = candidateFeetY - this.height + 1;

        for (const sampleX of sampleXs) {
            for (let sampleY = topY; sampleY <= candidateFeetY; sampleY += 2) {
                if (terrain.isSolid(sampleX, sampleY)) {
                    return false;
                }
            }
        }

        return true;
    }

    tryStepUp(terrain) {
        const originalY = this.y;

        for (let step = 1; step <= MAX_STEP_CLIMB; step++) {
            const candidateY = originalY - step;
            if (!this.isSpaceClear(terrain, candidateY)) {
                continue;
            }

            const forwardX = this.x + this.direction;
            if (!this.isSpaceClearAt(terrain, forwardX, candidateY)) {
                continue;
            }

            this.y = candidateY;
            return true;
        }

        this.y = originalY;
        return false;
    }
}
