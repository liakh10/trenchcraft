// Voxel block definitions for TrenchCraft.
// Block id 0 = air. Each block maps its faces to atlas tile indices.

export const AIR = 0;

// Atlas tile indices (see textures.ts)
export const TILE = {
  GRASS_TOP: 0,
  GRASS_SIDE: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  LOG_TOP: 5,
  LOG_SIDE: 6,
  LEAVES: 7,
  PLANK: 8,
  GOLD: 9,
  WATER: 10,
  COBBLE: 11,
};

export interface BlockDef {
  name: string;
  top: number;
  side: number;
  bottom: number;
  solid: boolean;       // participates in collision
  transparent: boolean; // rendered in the see-through pass (water)
}

// Block ids
export const BLOCK = {
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  LOG: 5,
  LEAVES: 6,
  PLANK: 7,
  GOLD: 8,
  WATER: 9,
  COBBLE: 10,
};

export const BLOCK_DEFS: Record<number, BlockDef> = {
  [BLOCK.GRASS]:  { name: "Grass",  top: TILE.GRASS_TOP, side: TILE.GRASS_SIDE, bottom: TILE.DIRT,    solid: true,  transparent: false },
  [BLOCK.DIRT]:   { name: "Dirt",   top: TILE.DIRT,      side: TILE.DIRT,       bottom: TILE.DIRT,    solid: true,  transparent: false },
  [BLOCK.STONE]:  { name: "Stone",  top: TILE.STONE,     side: TILE.STONE,      bottom: TILE.STONE,   solid: true,  transparent: false },
  [BLOCK.SAND]:   { name: "Sand",   top: TILE.SAND,      side: TILE.SAND,       bottom: TILE.SAND,    solid: true,  transparent: false },
  [BLOCK.LOG]:    { name: "Log",    top: TILE.LOG_TOP,   side: TILE.LOG_SIDE,   bottom: TILE.LOG_TOP, solid: true,  transparent: false },
  [BLOCK.LEAVES]: { name: "Leaves", top: TILE.LEAVES,    side: TILE.LEAVES,     bottom: TILE.LEAVES,  solid: true,  transparent: false },
  [BLOCK.PLANK]:  { name: "Plank",  top: TILE.PLANK,     side: TILE.PLANK,      bottom: TILE.PLANK,   solid: true,  transparent: false },
  [BLOCK.GOLD]:   { name: "Trench Gold", top: TILE.GOLD, side: TILE.GOLD,       bottom: TILE.GOLD,    solid: true,  transparent: false },
  [BLOCK.WATER]:  { name: "Water",  top: TILE.WATER,     side: TILE.WATER,      bottom: TILE.WATER,   solid: false, transparent: true },
  [BLOCK.COBBLE]: { name: "Cobble", top: TILE.COBBLE,    side: TILE.COBBLE,     bottom: TILE.COBBLE,  solid: true,  transparent: false },
};

// Hotbar order — keys 1..8
export const HOTBAR: number[] = [
  BLOCK.GRASS, BLOCK.DIRT, BLOCK.STONE, BLOCK.SAND,
  BLOCK.LOG, BLOCK.LEAVES, BLOCK.PLANK, BLOCK.GOLD,
];

export function isSolid(id: number): boolean {
  return id !== AIR && BLOCK_DEFS[id]?.solid === true;
}

export function isTransparent(id: number): boolean {
  return id === AIR || BLOCK_DEFS[id]?.transparent === true;
}
