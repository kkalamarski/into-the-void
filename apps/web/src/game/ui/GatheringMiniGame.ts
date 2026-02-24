import Phaser from 'phaser';
import type { TimingChallenge } from '@into-the-void/shared-types';

const BAR_WIDTH = 400;
const BAR_HEIGHT = 40;
const INDICATOR_WIDTH = 6;

/**
 * Gathering mini-game UI component.
 * Displays a timing bar with moving indicator and success zone.
 * Player must click when indicator is within success zone for best yield.
 */
export class GatheringMiniGame {
  private scene: Phaser.Scene;
  private elements: Phaser.GameObjects.GameObject[] = [];
  private indicator: Phaser.GameObjects.Rectangle;
  private tween: Phaser.Tweens.Tween | null = null;
  private challenge: TimingChallenge;
  private onComplete: (offset: number) => void;
  private startTime: number;
  private isActive: boolean = true;
  private baseX: number;
  private baseY: number;
  private indicatorStartX: number = 0;
  private indicatorEndX: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    challenge: TimingChallenge,
    onComplete: (offset: number) => void
  ) {
    this.scene = scene;
    this.challenge = challenge;
    this.onComplete = onComplete;
    this.startTime = Date.now();

    // Position at screen center
    this.baseX = x - BAR_WIDTH / 2;
    this.baseY = y - BAR_HEIGHT / 2;

    // DEBUG: Test rectangle at same position as WorldScene test
    const debugRect = scene.add.rectangle(x, y + 60, 200, 50, 0x0000ff);
    debugRect.setScrollFactor(0);
    debugRect.setDepth(20001);
    this.elements.push(debugRect);
    console.log('[DEBUG] GatheringMiniGame blue test rect at', x, y + 60);

    // Background bar
    const bg = scene.add.rectangle(x, y, BAR_WIDTH, BAR_HEIGHT, 0x333355);
    bg.setStrokeStyle(3, 0xffffff);
    bg.setScrollFactor(0);
    bg.setDepth(10000);
    this.elements.push(bg);

    // Inner track
    const track = scene.add.rectangle(x, y, BAR_WIDTH - 8, BAR_HEIGHT - 8, 0x222244);
    track.setScrollFactor(0);
    track.setDepth(10001);
    this.elements.push(track);

    // Success zone (green area)
    const { start, end } = this.challenge.successWindow;
    const zoneStartPct = start / this.challenge.duration;
    const zoneEndPct = end / this.challenge.duration;
    const zoneWidth = (zoneEndPct - zoneStartPct) * BAR_WIDTH;
    const zoneCenterX = x - BAR_WIDTH / 2 + (zoneStartPct * BAR_WIDTH) + zoneWidth / 2;
    const zone = scene.add.rectangle(zoneCenterX, y, zoneWidth, BAR_HEIGHT - 8, 0x00ff00, 0.5);
    zone.setStrokeStyle(2, 0x00ff00);
    zone.setScrollFactor(0);
    zone.setDepth(10002);
    this.elements.push(zone);

    // Moving indicator (yellow line) - starts at left edge
    const indicatorStartX = x - BAR_WIDTH / 2 + INDICATOR_WIDTH / 2;
    this.indicator = scene.add.rectangle(indicatorStartX, y, INDICATOR_WIDTH, BAR_HEIGHT - 4, 0xffff00);
    this.indicator.setScrollFactor(0);
    this.indicator.setDepth(10003);
    this.elements.push(this.indicator);

    // Store start position for animation
    this.indicatorStartX = indicatorStartX;
    this.indicatorEndX = x + BAR_WIDTH / 2 - INDICATOR_WIDTH / 2;

    // Instruction text
    const text = scene.add.text(x, y + BAR_HEIGHT / 2 + 15, 'Click when the marker is in the green zone!', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 3,
    });
    text.setOrigin(0.5, 0);
    text.setScrollFactor(0);
    text.setDepth(10004);
    this.elements.push(text);

    // Make background clickable
    bg.setInteractive();
    bg.on('pointerdown', this.handleClick, this);

    // Also listen for any click on the scene (delay to avoid initial click)
    scene.time.delayedCall(150, () => {
      if (!this.isActive) return;
      scene.input.once('pointerdown', this.handleSceneClick, this);
    });

    // Start animation
    this.startAnimation();

    console.log('[DEBUG] GatheringMiniGame elements created at', { baseX: this.baseX, baseY: this.baseY });
  }

  private startAnimation(): void {
    this.tween = this.scene.tweens.add({
      targets: this.indicator,
      x: this.indicatorEndX,
      duration: this.challenge.duration,
      ease: 'Linear',
      onComplete: () => this.handleTimeout(),
    });
  }

  private handleClick = (): void => {
    if (!this.isActive) return;
    this.complete();
  };

  private handleSceneClick = (): void => {
    if (!this.isActive) return;
    this.complete();
  };

  private handleTimeout(): void {
    if (!this.isActive) return;
    this.isActive = false;
    this.onComplete(this.challenge.duration + 100);
    this.destroy();
  }

  private complete(): void {
    this.isActive = false;

    if (this.tween) {
      this.tween.stop();
    }

    const elapsed = Date.now() - this.startTime;
    this.scene.input.off('pointerdown', this.handleSceneClick, this);
    this.onComplete(elapsed);
    this.destroy();
  }

  destroy(): void {
    if (this.tween) {
      this.tween.stop();
      this.tween = null;
    }
    this.scene.input.off('pointerdown', this.handleSceneClick, this);

    // Destroy all elements
    for (const el of this.elements) {
      el.destroy();
    }
    this.elements = [];
  }
}
