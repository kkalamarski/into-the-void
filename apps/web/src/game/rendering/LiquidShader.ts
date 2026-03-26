import Phaser from 'phaser';

const FRAG_SHADER = `
precision mediump float;

uniform sampler2D uMainSampler;
uniform float uTime;

varying vec2 outTexCoord;

void main() {
  // Subtle wave distortion
  float waveX = sin(outTexCoord.y * 12.0 + uTime * 1.5) * 0.006;
  float waveY = cos(outTexCoord.x * 10.0 + uTime * 1.2) * 0.004;
  vec2 uv = outTexCoord + vec2(waveX, waveY);

  vec4 color = texture2D(uMainSampler, uv);

  // Shimmering highlights — bright caustic-like ripples
  float caustic = sin(outTexCoord.x * 20.0 + uTime * 2.0)
                * cos(outTexCoord.y * 18.0 + uTime * 1.7);
  caustic = smoothstep(0.6, 1.0, caustic) * 0.15;

  // Gentle alpha breathing
  float alphaPulse = sin(uTime * 0.8 + outTexCoord.x * 3.0) * 0.05;

  color.rgb += caustic;
  color.a += alphaPulse;
  color.a = clamp(color.a, 0.0, 1.0);

  gl_FragColor = color;
}
`;

/**
 * Animated water PostFX pipeline.
 * Apply to liquid Graphics objects for subtle wave + caustic animation.
 */
export class LiquidFXPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game: Phaser.Game) {
    super({
      game,
      name: 'LiquidFX',
      fragShader: FRAG_SHADER,
    });
  }

  onPreRender(): void {
    this.set1f('uTime', this.game.loop.time / 1000);
  }
}

/**
 * Register the LiquidFX pipeline on the game renderer.
 * Call once during scene creation.
 */
export function registerLiquidPipeline(game: Phaser.Game): boolean {
  const renderer = game.renderer;
  if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) {
    return false; // Canvas fallback — no shaders
  }

  if (!renderer.pipelines.has('LiquidFX')) {
    renderer.pipelines.addPostPipeline('LiquidFX', LiquidFXPipeline);
  }
  return true;
}

/**
 * Apply the liquid shader to a Graphics object.
 */
export function applyLiquidFX(gfx: Phaser.GameObjects.Graphics): void {
  gfx.setPostPipeline('LiquidFX');
}
