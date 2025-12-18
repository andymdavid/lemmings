import { MAX_LEMMINGS } from './constants.js';

export const SKILL_BUTTON_ORDER = ['blocker', 'digger', 'builder', 'bomber'];
const SKILL_BUTTON_WIDTH = 150;
const SKILL_BUTTON_HEIGHT = 40;
const SKILL_BUTTON_SPACING = 20;
const SKILL_BUTTON_BOTTOM_MARGIN = 10;

export function getSkillButtonLayout(canvasWidth, canvasHeight) {
    const totalWidth = (SKILL_BUTTON_ORDER.length * SKILL_BUTTON_WIDTH) +
        ((SKILL_BUTTON_ORDER.length - 1) * SKILL_BUTTON_SPACING);
    const startX = (canvasWidth - totalWidth) / 2;
    const buttonY = canvasHeight - SKILL_BUTTON_HEIGHT - SKILL_BUTTON_BOTTOM_MARGIN;

    return SKILL_BUTTON_ORDER.map((skill, index) => ({
        skill,
        rect: {
            x: startX + index * (SKILL_BUTTON_WIDTH + SKILL_BUTTON_SPACING),
            y: buttonY,
            width: SKILL_BUTTON_WIDTH,
            height: SKILL_BUTTON_HEIGHT
        }
    }));
}

export function getSkillButtonBounds(canvasWidth, canvasHeight) {
    const layout = getSkillButtonLayout(canvasWidth, canvasHeight);
    const bounds = {};
    layout.forEach(({ skill, rect }) => {
        bounds[skill] = rect;
    });
    return bounds;
}

export default class UIManager {
    constructor(canvas) {
        this.canvas = canvas;
    }

    render(ctx, gameState) {
        const { lemmingsSpawned, lemmingsDead, lemmingsSaved, skills, selectedSkill, fps, deltaTime, gameState: currentGameState } = gameState;

        // Draw UI - Lemming counter (now pinned to top-right)
        ctx.fillStyle = '#f1f5f9';
        ctx.font = '24px "Fredoka", sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        const statsX = this.canvas.width - 20;
        ctx.fillText(`Out: ${lemmingsSpawned} / ${MAX_LEMMINGS}`, statsX, 20);

        // Draw saved counter beneath stats
        ctx.fillStyle = '#22c55e';
        ctx.fillText(`Saved: ${lemmingsSaved}`, statsX, 50);

        // Draw dead counter beneath saved
        ctx.fillStyle = '#ef4444';
        ctx.fillText(`Dead: ${lemmingsDead}`, statsX, 80);

        // Draw FPS counter (debug) in top-left
        ctx.fillStyle = '#f1f5f9';
        ctx.font = '14px "Space Mono", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`FPS: ${fps}`, 10, 10);
        ctx.fillText(`Delta: ${(deltaTime * 1000).toFixed(2)}ms`, 10, 28);

        // Draw skills label above bottom buttons
        const layout = getSkillButtonLayout(this.canvas.width, this.canvas.height);
        const buttonY = layout[0]?.rect.y || (this.canvas.height - SKILL_BUTTON_HEIGHT - SKILL_BUTTON_BOTTOM_MARGIN);
        ctx.font = '18px "Fredoka", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = '#f1f5f9';
        ctx.fillText('Skills', this.canvas.width / 2, buttonY - 10);

        // Draw skills row at bottom
        ctx.font = '16px "Fredoka", sans-serif';
        ctx.textBaseline = 'middle';
        const isGameLost = currentGameState === 'lost';

        layout.forEach(({ skill, rect }) => {
            const { x, y, width, height } = rect;
            const isSelected = selectedSkill === skill;
            const skillCount = skills[skill] ?? 0;
            const hasSkill = skillCount > 0;

            // Grey out buttons if game is lost
            if (isGameLost) {
                ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
                ctx.strokeStyle = '#4b5563';
            } else {
                ctx.fillStyle = isSelected ? 'rgba(139, 92, 246, 0.35)' : 'rgba(15, 23, 42, 0.75)';
                ctx.strokeStyle = isSelected ? '#c4b5fd' : '#8b5cf6';
            }

            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(x, y, width, height, 8);
            ctx.fill();
            ctx.stroke();

            // Grey out text if game is lost
            if (isGameLost) {
                ctx.fillStyle = '#4b5563';
            } else {
                ctx.fillStyle = hasSkill ? '#f8fafc' : '#6b7280';
            }

            ctx.textAlign = 'center';
            const label = `${skill.charAt(0).toUpperCase() + skill.slice(1)}: ${skillCount}`;
            ctx.fillText(label, x + width / 2, y + height / 2);
        });
    }
}
