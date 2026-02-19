import { TileDefinition } from '../types';

export const PORTAL: TileDefinition = {
  id: 'portal',
  displayName: 'Portal',
  isBlocking: false,
  movementSpeed: 1.0,
  textureKey: 'tile_portal',
  defaultElevation: 0,
  color: 0x6a00ff, // Vibrant violet - visually distinct portal glow
  description: 'A shimmering portal structure. Step through to travel to your faction hub.',
};
