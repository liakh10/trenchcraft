import * as THREE from "three";
import { World } from "./world";
import { AIR, BLOCK_DEFS, isTransparent } from "./blocks";
import { tileUV } from "./textures";

// Face definitions: corner offsets (CCW) + normal + which tile slot to use.
type Slot = "top" | "side" | "bottom";
interface Face {
  dir: [number, number, number];
  corners: [number, number, number][];
  slot: Slot;
}

const FACES: Face[] = [
  { dir: [0, 1, 0],  slot: "top",    corners: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
  { dir: [0, -1, 0], slot: "bottom", corners: [[0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1]] },
  { dir: [0, 0, 1],  slot: "side",   corners: [[1, 0, 1], [0, 0, 1], [0, 1, 1], [1, 1, 1]] },
  { dir: [0, 0, -1], slot: "side",   corners: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]] },
  { dir: [1, 0, 0],  slot: "side",   corners: [[1, 0, 0], [1, 0, 1], [1, 1, 1], [1, 1, 0]] },
  { dir: [-1, 0, 0], slot: "side",   corners: [[0, 0, 1], [0, 0, 0], [0, 1, 0], [0, 1, 1]] },
];

// Slight per-face shading so cubes read as 3D even under flat light.
const FACE_LIGHT = [1.0, 0.55, 0.8, 0.8, 0.7, 0.7];

function slotTile(id: number, slot: Slot): number {
  const def = BLOCK_DEFS[id];
  return slot === "top" ? def.top : slot === "bottom" ? def.bottom : def.side;
}

/**
 * Build geometry for all blocks matching `wantTransparent`.
 * A face is emitted when the neighbouring block is "see-through" for this pass.
 */
function buildGeometry(world: World, wantTransparent: boolean): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  for (let y = 0; y < world.SY; y++) {
    for (let z = 0; z < world.SZ; z++) {
      for (let x = 0; x < world.SX; x++) {
        const id = world.get(x, y, z);
        if (id === AIR) continue;
        const def = BLOCK_DEFS[id];
        if (!def) continue;
        if (def.transparent !== wantTransparent) continue;

        for (let fi = 0; fi < FACES.length; fi++) {
          const f = FACES[fi];
          const nx = x + f.dir[0], ny = y + f.dir[1], nz = z + f.dir[2];
          const neighbor = world.get(nx, ny, nz);

          // For the opaque pass: show face if neighbour is air or transparent.
          // For the water pass: only show against air (avoids inner water walls).
          const show = wantTransparent
            ? neighbor === AIR
            : isTransparent(neighbor) && neighbor !== id;
          if (!show) continue;

          const base = positions.length / 3;
          const { u0, v0, u1, v1 } = tileUV(slotTile(id, f.slot));
          const uvCorner = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
          const light = FACE_LIGHT[fi];

          for (let c = 0; c < 4; c++) {
            const corner = f.corners[c];
            positions.push(x + corner[0], y + corner[1], z + corner[2]);
            normals.push(f.dir[0], f.dir[1], f.dir[2]);
            uvs.push(uvCorner[c][0], uvCorner[c][1]);
            colors.push(light, light, light);
          }
          indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
        }
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  return geo;
}

export function buildOpaqueGeometry(world: World): THREE.BufferGeometry {
  return buildGeometry(world, false);
}

export function buildWaterGeometry(world: World): THREE.BufferGeometry {
  return buildGeometry(world, true);
}
