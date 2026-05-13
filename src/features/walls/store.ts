/**
 * Wall Entity Store
 * 
 * Manages wall state with proper normalization:
 * - Walls are stored once, referenced by rooms
 * - Each wall has two faces (face_a, face_b)
 * - Room-wall junction enables multi-directional wall access
 * 
 * Based on the Wall Entity Model (src/types/wall.ts)
 */

import { create } from 'zustand';
import type {
  Wall,
  WallFace,
  SpaceType,
  FinishType,
  CompassSide,
  RoomBOQSummary,
  WallStatus,
} from '../../types/wall';
import {
  createWall,
  createWallFace,
  createWallOpening,
  generateWallLabel,
  calculateWallFaceArea,
  calculateSkirtingLength,
  getNeighborLabel,
  getWallStatus,
  grossWallArea,
} from '../../types/wall';

// =============================================================================
// TYPES
// =============================================================================

export interface RoomInfo {
  id: string;
  name: string;
  /** Height in metres (for wall creation defaults) */
  height: number;
}

export interface WallWithFaces {
  wall: Wall;
  /** Face belonging to the specified room (if any) */
  roomFace: WallFace | null;
  /** The other face */
  oppositeFace: WallFace | null;
}

// State
export interface WallState {
  /** All walls for the current project */
  walls: Wall[];
  
  /** Room metadata for neighbor lookups */
  rooms: Map<string, RoomInfo>;
  
  /** Loading state */
  isLoading: boolean;
  
  /** Error state */
  error: string | null;
}

// Actions
export interface WallActions {
  // Initialization
  initWalls: (walls: Wall[], rooms: RoomInfo[]) => void;
  
  // Wall CRUD
  createWallForRoom: (
    roomId: string,
    compassSide: CompassSide,
    length: number,
    faceBSpaceType: SpaceType,
    faceBRoomId: string | null,
    faceBFinishType: FinishType,
    existingWallId?: string  // for merge scenario
  ) => Wall;
  
  updateWall: (wallId: string, updates: Partial<Pick<Wall, 'length' | 'height'>>) => void;
  
  deleteWall: (wallId: string) => void;
  
  // Face operations
  updateFaceFinish: (wallId: string, faceSide: 'a' | 'b', finishType: FinishType) => void;
  updateFaceSpaceType: (wallId: string, faceSide: 'a' | 'b', spaceType: SpaceType) => void;
  
  addOpening: (
    wallId: string,
    faceSide: 'a' | 'b',
    openingType: 'door' | 'window' | 'archway',
    width: number,
    height: number,
    quantity?: number
  ) => void;
  
  removeOpening: (wallId: string, faceSide: 'a' | 'b', openingId: string) => void;
  
  // Room operations
  deleteRoom: (roomId: string) => void;
  
  linkUnlinkedWall: (wallId: string, faceSide: 'a' | 'b', roomId: string) => void;
  
  // Queries
  getWallsForRoom: (roomId: string) => WallWithFaces[];
  
  getRoomBOQ: (roomId: string) => RoomBOQSummary;
  
  checkDuplicateWall: (roomId: string, compassSide: CompassSide) => Wall | null;
  
  getAllWallLabels: () => string[];
  
  // Persistence helpers
  exportWalls: () => Wall[];
}

export type WallStore = WallState & WallActions;

// =============================================================================
// HELPERS
// =============================================================================

function getRoomFace(wall: Wall, roomId: string): WallFace | null {
  if (wall.faceA.roomId === roomId) return wall.faceA;
  if (wall.faceB.roomId === roomId) return wall.faceB;
  return null;
}

function getOppositeFace(wall: Wall, roomId: string): WallFace | null {
  if (wall.faceA.roomId === roomId) return wall.faceB;
  if (wall.faceB.roomId === roomId) return wall.faceB;
  return null;
}

function getFaceBySide(wall: Wall, side: 'a' | 'b'): WallFace {
  return side === 'a' ? wall.faceA : wall.faceB;
}

function updateFaceInWall(wall: Wall, side: 'a' | 'b', updates: Partial<WallFace>): Wall {
  return {
    ...wall,
    faceA: side === 'a' ? { ...wall.faceA, ...updates } : wall.faceA,
    faceB: side === 'b' ? { ...wall.faceB, ...updates } : wall.faceB,
    updatedAt: new Date().toISOString(),
  };
}

// =============================================================================
// STORE
// =============================================================================

export const useWallStore = create<WallStore>()((set, get) => ({
  walls: [],
  rooms: new Map(),
  isLoading: false,
  error: null,

  // ── Initialization ──────────────────────────────────────────────────────────

  initWalls: (walls, rooms) => {
    const roomMap = new Map<string, RoomInfo>();
    rooms.forEach((r) => roomMap.set(r.id, r));
    set({ walls, rooms: roomMap });
  },

  // ── Create Wall ─────────────────────────────────────────────────────────────

  createWallForRoom: (
    roomId,
    compassSide,
    length,
    faceBSpaceType,
    faceBRoomId,
    faceBFinishType,
    existingWallId
  ) => {
    const { walls, rooms } = get();
    const room = rooms.get(roomId);
    const height = room?.height ?? 3.0; // Default 3m ceiling

    // Check for existing wall on this side
    const existing = get().checkDuplicateWall(roomId, compassSide);
    if (existing && !existingWallId) {
      throw new Error(`Room already has a wall on ${compassSide} side`);
    }

    // If existing wall ID provided (merge scenario), update it
    if (existingWallId) {
      const wallToUpdate = walls.find((w) => w.id === existingWallId);
      if (!wallToUpdate) throw new Error('Wall not found');

      // Find which face is unlinked and update it
      const faceSide: 'a' | 'b' = wallToUpdate.faceA.roomId === null && wallToUpdate.faceA.spaceType === 'room'
        ? 'a'
        : 'b';

      const updatedWall = updateFaceInWall(wallToUpdate, faceSide, {
        spaceType: faceBSpaceType,
        roomId: faceBRoomId,
        finishType: faceBFinishType,
        compassSide,
      });

      set({ walls: walls.map((w) => (w.id === existingWallId ? updatedWall : w)) });
      return updatedWall;
    }

    // Create new wall
    const labels = get().getAllWallLabels();
    const label = generateWallLabel(labels);

    const faceA = createWallFace(crypto.randomUUID(), 'a', 'room', roomId, 'paint', compassSide);
    const faceB = createWallFace(crypto.randomUUID(), 'b', faceBSpaceType, faceBRoomId, faceBFinishType);

    const wall = createWall('project-id', label, length, height, faceA, faceB);

    set({ walls: [...walls, wall] });
    return wall;
  },

  // ── Update Wall ─────────────────────────────────────────────────────────────

  updateWall: (wallId, updates) => {
    set((state) => ({
      walls: state.walls.map((w) =>
        w.id === wallId
          ? { ...w, ...updates, updatedAt: new Date().toISOString() }
          : w
      ),
    }));
  },

  deleteWall: (wallId) => {
    set((state) => ({
      walls: state.walls.filter((w) => w.id !== wallId),
    }));
  },

  // ── Face Operations ─────────────────────────────────────────────────────────

  updateFaceFinish: (wallId, faceSide, finishType) => {
    set((state) => ({
      walls: state.walls.map((w) =>
        w.id === wallId ? updateFaceInWall(w, faceSide, { finishType }) : w
      ),
    }));
  },

  updateFaceSpaceType: (wallId, faceSide, spaceType) => {
    set((state) => ({
      walls: state.walls.map((w) =>
        w.id === wallId ? updateFaceInWall(w, faceSide, { spaceType, roomId: null }) : w
      ),
    }));
  },

  addOpening: (wallId, faceSide, openingType, width, height, quantity = 1) => {
    set((state) => ({
      walls: state.walls.map((w) => {
        if (w.id !== wallId) return w;
        
        const face = getFaceBySide(w, faceSide);
        const opening = createWallOpening(face.id, openingType, width, height, quantity);
        
        return updateFaceInWall(w, faceSide, {
          openings: [...face.openings, opening],
        });
      }),
    }));
  },

  removeOpening: (wallId, faceSide, openingId) => {
    set((state) => ({
      walls: state.walls.map((w) => {
        if (w.id !== wallId) return w;
        
        const face = getFaceBySide(w, faceSide);
        return updateFaceInWall(w, faceSide, {
          openings: face.openings.filter((o) => o.id !== openingId),
        });
      }),
    }));
  },

  // ── Room Operations ──────────────────────────────────────────────────────────

  /**
   * When a room is deleted, convert its wall faces to 'external'.
   * This prevents orphaned walls and marks them as unlinked.
   */
  deleteRoom: (roomId) => {
    set((state) => ({
      walls: state.walls.map((w) => {
        const faceAUpdate = w.faceA.roomId === roomId
          ? { ...w.faceA, spaceType: 'external' as SpaceType, roomId: null }
          : w.faceA;
        const faceBUpdate = w.faceB.roomId === roomId
          ? { ...w.faceB, spaceType: 'external' as SpaceType, roomId: null }
          : w.faceB;

        if (faceAUpdate === w.faceA && faceBUpdate === w.faceB) return w;

        return {
          ...w,
          faceA: faceAUpdate,
          faceB: faceBUpdate,
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  },

  /**
   * Link a wall's face to a room. Also finds the opposite-side wall in the target
   * room via compass matching and links it back, so both sides recognize sharing.
   */
  linkUnlinkedWall: (wallId, faceSide, roomId) => {
    set((state) => {
      const wall = state.walls.find((w) => w.id === wallId);
      if (!wall) return state;

      const ownerFace = faceSide === 'a' ? wall.faceB : wall.faceA;
      const ownerRoomId = ownerFace.roomId;
      const compassSide = ownerFace.compassSide;

      let updatedWalls = state.walls.map((w) =>
        w.id === wallId
          ? updateFaceInWall(w, faceSide, { spaceType: 'room', roomId })
          : w
      );

      if (compassSide && ownerRoomId) {
        const oppositeMap: Record<string, string> = {
          north: 'south', south: 'north',
          east: 'west', west: 'east',
        };
        const oppositeSide = oppositeMap[compassSide];

        const counterpartWall = state.walls.find(
          (w) =>
            w.id !== wallId &&
            ((w.faceA.roomId === roomId && w.faceA.compassSide === oppositeSide) ||
             (w.faceB.roomId === roomId && w.faceB.compassSide === oppositeSide))
        );

        if (counterpartWall) {
          const targetOwnFace = counterpartWall.faceA.roomId === roomId
            ? counterpartWall.faceA
            : counterpartWall.faceB;
          const neighborSide = targetOwnFace.faceSide === 'a' ? 'b' : 'a';
          const neighborFace = neighborSide === 'a'
            ? counterpartWall.faceA
            : counterpartWall.faceB;

          if (neighborFace.spaceType !== 'room' || !neighborFace.roomId) {
            updatedWalls = updatedWalls.map((w) =>
              w.id === counterpartWall.id
                ? updateFaceInWall(w, neighborSide, {
                    spaceType: 'room',
                    roomId: ownerRoomId,
                  })
                : w
            );
          }
        }
      }

      return { walls: updatedWalls };
    });
  },

  // ── Queries ──────────────────────────────────────────────────────────────────

  getWallsForRoom: (roomId) => {
    const { walls } = get();
    return walls
      .filter((w) => w.faceA.roomId === roomId || w.faceB.roomId === roomId)
      .map((wall) => ({
        wall,
        roomFace: getRoomFace(wall, roomId),
        oppositeFace: getOppositeFace(wall, roomId),
      }));
  },

  getRoomBOQ: (roomId) => {
    const { rooms } = get();
    const wallBreakdown = get().getWallsForRoom(roomId);

    let paintAreaSqm = 0;
    let plasterOnlyAreaSqm = 0;
    let tilesAreaSqm = 0;
    let skirtingLengthM = 0;

    for (const { wall, roomFace } of wallBreakdown) {
      if (!roomFace) continue;

      const netArea = calculateWallFaceArea(roomFace, wall);
      const skirting = calculateSkirtingLength(roomFace, wall);

      switch (roomFace.finishType) {
        case 'paint':
          paintAreaSqm += netArea;
          break;
        case 'plaster_only':
          plasterOnlyAreaSqm += netArea;
          break;
        case 'tiles':
          tilesAreaSqm += netArea;
          break;
      }

      skirtingLengthM += skirting;
    }

    return {
      roomId,
      paintAreaSqm: Math.round(paintAreaSqm * 100) / 100,
      plasterOnlyAreaSqm: Math.round(plasterOnlyAreaSqm * 100) / 100,
      tilesAreaSqm: Math.round(tilesAreaSqm * 100) / 100,
      skirtingLengthM: Math.round(skirtingLengthM * 100) / 100,
      wallBreakdown: wallBreakdown.map(({ wall, roomFace, oppositeFace }) => {
        const neighborLabel = oppositeFace
          ? getNeighborLabel(oppositeFace, rooms)
          : 'Unknown';
        const neighborStatus = oppositeFace
          ? getWallStatus(oppositeFace)
          : 'unlinked' as WallStatus;

        return {
          wallId: wall.id,
          wallLabel: wall.label,
          length: wall.length,
          height: wall.height,
          face: roomFace!,
          neighborLabel,
          neighborStatus,
          grossArea: grossWallArea(wall),
          netFinishArea: calculateWallFaceArea(roomFace!, wall),
          skirtingLength: calculateSkirtingLength(roomFace!, wall),
          hasUnlinkedNeighbor: neighborStatus === 'unlinked',
        };
      }),
    };
  },

  checkDuplicateWall: (roomId, compassSide) => {
    const { walls } = get();
    for (const wall of walls) {
      if (wall.faceA.roomId === roomId && wall.faceA.compassSide === compassSide) {
        return wall;
      }
      if (wall.faceB.roomId === roomId && wall.faceB.compassSide === compassSide) {
        return wall;
      }
    }
    return null;
  },

  getAllWallLabels: () => get().walls.map((w) => w.label),

  exportWalls: () => get().walls,
}));

// =============================================================================
// SELECTORS
// =============================================================================

export const selectWalls = (state: WallStore) => state.walls;
export const selectWallCount = (state: WallStore) => state.walls.length;

// =============================================================================
// MOCK DATA GENERATOR (for testing)
// =============================================================================

export function generateMockWalls(roomInfos: RoomInfo[]): Wall[] {
  const walls: Wall[] = [];
  let labelCounter = 1;

  // Create a simple rectangular room with 4 walls
  for (const room of roomInfos) {
    const roomWalls = [
      { side: 'north' as CompassSide, length: 4, neighborType: 'external' as SpaceType, neighborId: null },
      { side: 'east' as CompassSide, length: 5, neighborType: 'room' as SpaceType, neighborId: null },
      { side: 'south' as CompassSide, length: 4, neighborType: 'external' as SpaceType, neighborId: null },
      { side: 'west' as CompassSide, length: 5, neighborType: 'corridor' as SpaceType, neighborId: null },
    ];

    for (const wallDef of roomWalls) {
      const label = `W-${String(labelCounter++).padStart(3, '0')}`;
      const wallId = crypto.randomUUID();
      const height = room.height ?? 3.0;

      const faceA = createWallFace(wallId, 'a', 'room', room.id, 'paint', wallDef.side);
      const faceB = createWallFace(wallId, 'b', wallDef.neighborType, wallDef.neighborId, 'paint');

      walls.push(createWall('project-id', label, wallDef.length, height, faceA, faceB));
    }
  }

  return walls;
}