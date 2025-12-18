import { MAX_LEMMINGS } from './constants.js';

export default class UIManager {
    constructor(canvas) {
        this.canvas = canvas;
    }

    render(ctx, gameState) {
        const { lemmingsSpawned, lemmingsDead, skills, selectedSkill, fps, deltaTime } = gameState;

        // Draw UI - Lemming counter
        ctx.fillStyle = '#f1f5f9';
        ctx.font = '24px "Fredoka", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Out: ${lemmingsSpawned} / ${MAX_LEMMINGS}`, 20, 20);

        // Draw dead counter
        ctx.fillStyle = '#ef4444';
        ctx.fillText(`Dead: ${lemmingsDead}`, 20, 50);

        // Draw skills UI
        ctx.font = '18px "Fredoka", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#f1f5f9';
        ctx.fillText('Skills:', 20, 90);

        // Blocker skill button
        const blockerY = 120;
        if (selectedSkill === 'blocker') {
            ctx.fillStyle = '#8b5cf6';
            ctx.fillRect(15, blockerY - 5, 150, 35);
        }
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2;
        ctx.strokeRect(15, blockerY - 5, 150, 35);

        ctx.fillStyle = skills.blocker > 0 ? '#f1f5f9' : '#6b7280';
        ctx.fillText(`🛑 Blocker: ${skills.blocker}`, 25, blockerY + 5);

        // Digger skill button
        const diggerY = 160;
        if (selectedSkill === 'digger') {
            ctx.fillStyle = '#8b5cf6';
            ctx.fillRect(15, diggerY - 5, 150, 35);
        }
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2;
        ctx.strokeRect(15, diggerY - 5, 150, 35);

        ctx.fillStyle = skills.digger > 0 ? '#f1f5f9' : '#6b7280';
        ctx.fillText(`⛏️ Digger: ${skills.digger}`, 25, diggerY + 5);

        // Builder skill button
        const builderY = 200;
        if (selectedSkill === 'builder') {
            ctx.fillStyle = '#8b5cf6';
            ctx.fillRect(15, builderY - 5, 150, 35);
        }
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2;
        ctx.strokeRect(15, builderY - 5, 150, 35);

        ctx.fillStyle = skills.builder > 0 ? '#f1f5f9' : '#6b7280';
        ctx.fillText(`🔨 Builder: ${skills.builder}`, 25, builderY + 5);

        // Bomber skill button
        const bomberY = 240;
        if (selectedSkill === 'bomber') {
            ctx.fillStyle = '#8b5cf6';
            ctx.fillRect(15, bomberY - 5, 150, 35);
        }
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2;
        ctx.strokeRect(15, bomberY - 5, 150, 35);

        ctx.fillStyle = skills.bomber > 0 ? '#f1f5f9' : '#6b7280';
        ctx.fillText(`💣 Bomber: ${skills.bomber}`, 25, bomberY + 5);

        // Draw FPS counter (debug)
        ctx.fillStyle = '#f1f5f9';
        ctx.font = '14px "Space Mono", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(`FPS: ${fps}`, this.canvas.width - 10, 10);
        ctx.fillText(`Delta: ${(deltaTime * 1000).toFixed(2)}ms`, this.canvas.width - 10, 28);
    }
}
