import Phaser from 'phaser';
import type { TimingChallenge } from '@into-the-void/shared-types';

const BAR_WIDTH = 400;
const BAR_HEIGHT = 40;
const INDICATOR_WIDTH = 4;

/**
 * Gathering mini-game UI component.
 * Displays a timing bar with moving indicator and success zone.
 * Player must click when indicator is within success zone for best yield.
 */
export class GatheringMiniGame extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Graphics;
  private successZone: Phaser.GameObjects.Graphics;
  private indicator: Phaser.GameObjects.Graphics;
  private tween: Phaser.Tweens.Tween | null = null;
  private challenge: TimingChallenge;
  private onComplete: (offset: number) => void;
  private startTime: number;
  private isActive: boolean = true;
  private instructionText: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    challenge: TimingChallenge,
    onComplete: (offset: number) => void
  ) {
    super(scene, x, y);
    this.challenge = challenge;
    this.onComplete = onComplete;
    this.startTime = Date.now();

    // Create background bar
    this.background = this.createBackground();
    this.add(this.background);

    // Create success zone (green area)
    this.successZone = this.createSuccessZone();
    this.add(this.successZone);

    // Create moving indicator
    this.indicator = this.createIndicator();
    this.add(this.indicator);

    // Create instruction text
    this.instructionText = scene.add.text(0, BAR_HEIGHT + 10, 'Click when the marker is in the green zone!', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 2,
    });
    this.instructionText.setOrigin(0.5, 0);
    this.instructionText.setX(BAR_WIDTH / 2);
    this.add(this.instructionText);

    // Center the container
    this.setPosition(x - BAR_WIDTH / 2, y - BAR_HEIGHT / 2);

    // Set depth above world objects
    this.setDepth(2000);

    // Make interactive to capture clicks
    const hitArea = new Phaser.Geom.Rectangle(0, -50, BAR_WIDTH, BAR_HEIGHT + 100);
    this.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    // Handle click
    this.on('pointerdown', this.handleClick, this);

    // Also listen for any click on the scene (for reliability)
    scene.input.once('pointerdown', this.handleSceneClick, this);

    // Start indicator animation
    this.startAnimation();

    // Add to scene
    scene.add.existing(this);
  }

  private createBackground(): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics();

    // Dark background
    graphics.fillStyle(0x1a1a2e, 0.95);
    graphics.fillRoundedRect(0, 0, BAR_WIDTH, BAR_HEIGHT, 4);

    // Border
    graphics.lineStyle(2, 0x4a4a6a, 1);
    graphics.strokeRoundedRect(0, 0, BAR_WIDTH, BAR_HEIGHT, 4);

    // Inner track
    graphics.fillStyle(0x2a2a4e, 1);
    graphics.fillRect(4, 4, BAR_WIDTH - 8, BAR_HEIGHT - 8);

    return graphics;
  }

  private createSuccessZone(): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics();
    const { start, end } = this.challenge.successWindow;
    const startX = (start / this.challenge.duration) * BAR_WIDTH;
    const width = ((end - start) / this.challenge.duration) * BAR_WIDTH;

    // Green success zone with gradient effect
    graphics.fillStyle(0x00ff00, 0.3);
    graphics.fillRect(startX, 4, width, BAR_HEIGHT - 8);

    // Brighter center line
    graphics.fillStyle(0x00ff00, 0.5);
    const centerX = startX + width / 2;
    graphics.fillRect(centerX - 1, 4, 2, BAR_HEIGHT - 8);

    // Zone borders
    graphics.lineStyle(1, 0x00ff00, 0.8);
    graphics.strokeRect(startX, 4, width, BAR_HEIGHT - 8);

    return graphics;
  }

  private createIndicator(): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics();

    // Yellow indicator line
    graphics.fillStyle(0xffff00, 1);
    graphics.fillRect(0, 2, INDICATOR_WIDTH, BAR_HEIGHT - 4);

    // Glow effect
    graphics.fillStyle(0xffff00, 0.3);
    graphics.fillRect(-2, 0, INDICATOR_WIDTH + 4, BAR_HEIGHT);

    return graphics;
  }

  private startAnimation(): void {
    this.tween = this.scene.tweens.add({
      targets: this.indicator,
      x: BAR_WIDTH - INDICATOR_WIDTH,
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
    // Auto-fail: report offset beyond duration
    this.isActive = false;
    this.onComplete(this.challenge.duration + 100);
    this.destroy();
  }

  private complete(): void {
    this.isActive = false;

    // Stop tween
    if (this.tween) {
      this.tween.stop();
    }

    // Calculate elapsed time
    const elapsed = Date.now() - this.startTime;

    // Remove scene input listener
    this.scene.input.off('pointerdown', this.handleSceneClick, this);

    // Report timing
    this.onComplete(elapsed);

    // Cleanup
    this.destroy();
  }

  destroy(fromScene?: boolean): void {
    if (this.tween) {
      this.tween.stop();
      this.tween = null;
    }
    this.scene.input.off('pointerdown', this.handleSceneClick, this);
    super.destroy(fromScene);
  }
}
