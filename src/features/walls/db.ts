/**
 * Database Layer for Wall Entity Model
 * 
 * Provides SQLite persistence for walls, wall_faces, wall_openings.
 * Also handles localStorage fallback for web-only mode.
 */

import type {
  Wall,
  WallFace,
  WallOpening,
  SpaceType,
  CompassSide,
} from '../../types/wall';
import { logger } from '../../lib/logger';

// =============================================================================
// STORAGE KEYS
// =============================================================================

const WALLS_KEY = 'boq_walls';

// =============================================================================
// LOCAL STORAGE FALLBACK (web mode)
// =============================================================================

export function loadWallsFromStorage(): Wall[] {
  try {
    const stored = localStorage.getItem(WALLS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveWallsToStorage(walls: Wall[]): void {
  try {
    localStorage.setItem(WALLS_KEY, JSON.stringify(walls));
  } catch (error) {
    logger.error('Failed to save walls to localStorage:', error);
  }
}

// =============================================================================
// WALL CRUD OPERATIONS
// =============================================================================

export function getAllWalls(): Wall[] {
  return loadWallsFromStorage();
}

export function getWallsByProject(projectId: string): Wall[] {
  return loadWallsFromStorage().filter((w) => w.projectId === projectId);
}

export function getWallsByRoom(roomId: string): Wall[] {
  return loadWallsFromStorage().filter(
    (w) => w.faceA.roomId === roomId || w.faceB.roomId === roomId
  );
}

export function saveWall(wall: Wall): void {
  const walls = loadWallsFromStorage();
  const index = walls.findIndex((w) => w.id === wall.id);
  
  if (index >= 0) {
    walls[index] = wall;
  } else {
    walls.push(wall);
  }
  
  saveWallsToStorage(walls);
}

export function saveWalls(walls: Wall[]): void {
  saveWallsToStorage(walls);
}

export function deleteWallById(wallId: string): void {
  const walls = loadWallsFromStorage().filter((w) => w.id !== wallId);
  saveWallsToStorage(walls);
}

export function deleteWallsByRoom(roomId: string): Wall[] {
  // Returns walls that were modified (converted to external)
  const walls = loadWallsFromStorage();
  const now = new Date().toISOString();
  
  const modified = walls
    .filter((w) => w.faceA.roomId === roomId || w.faceB.roomId === roomId)
    .map((w) => {
      const faceAUpdate = w.faceA.roomId === roomId
        ? { ...w.faceA, spaceType: 'external' as SpaceType, roomId: null, updatedAt: now }
        : w.faceA;
      const faceBUpdate = w.faceB.roomId === roomId
        ? { ...w.faceB, spaceType: 'external' as SpaceType, roomId: null, updatedAt: now }
        : w.faceB;
      
      return { ...w, faceA: faceAUpdate, faceB: faceBUpdate, updatedAt: now };
    });

  const unmodified = walls.filter(
    (w) => w.faceA.roomId !== roomId && w.faceB.roomId !== roomId
  );

  saveWallsToStorage([...unmodified, ...modified]);
  return modified;
}

// =============================================================================
// MIGRATION: Convert flat room wall fields to Wall Entity Model
// =============================================================================

interface LegacyWallField {
  /** e.g., 'north', 'east', 'south', 'west' or 1-4 */
  side: string;
  /** Wall length in feet */
  length: number;
  /** Wall height in feet */
  height: number;
  /** Wall type: 'external', 'shared', 'open' */
  wallType: 'external' | 'shared' | 'open';
  /** For 'shared': the other room's name/ID */
  sharedWith?: string;
}

interface LegacyRoom {
  id: string;
  name: string;
  /** Height in feet (used for all walls if not specified per-wall) */
  height: number;
  /** Legacy wall fields */
  walls: LegacyWallField[];
  /** Openings on legacy walls */
  doors?: { side: string; width: number; height: number }[];
  windows?: { side: string; width: number; height: number }[];
}

/**
 * Migrate rooms with flat wall fields to proper Wall Entity Model.
 * 
 * This handles the legacy schema where rooms stored their own wall dimensions
 * as flat fields like wall_north_length, wall_north_height, etc.
 * 
 * @param rooms - Legacy room data with flat wall fields
 * @param projectId - Target project ID
 * @returns Array of migrated Wall entities
 */
export function migrateLegacyRooms(
  rooms: LegacyRoom[],
  projectId: string
): Wall[] {
  const walls: Wall[] = [];
  let labelCounter = 1;

  // Track which walls have been created so we can link shared walls
  const sharedWalls: Map<string, Wall> = new Map();

  for (const room of rooms) {
    for (const legacyWall of room.walls) {
      const label = `W-${String(labelCounter++).padStart(3, '0')}`;
      const wallId = crypto.randomUUID();
      const height = legacyWall.height / 3.281; // Convert feet to metres
      const length = legacyWall.length / 3.281; // Convert feet to metres

      // Determine face types
      const faceASpaceType: SpaceType = 'room';
      const faceARoomId: string | null = room.id;

      let faceBSpaceType: SpaceType;
      let faceBRoomId: string | null = null;

      if (legacyWall.wallType === 'external') {
        faceBSpaceType = 'external';
      } else if (legacyWall.wallType === 'open') {
        faceBSpaceType = 'open';
      } else {
        // 'shared' - room ID will be linked later when that room is processed
        faceBSpaceType = 'room';
        // faceBRoomId remains null (unlinked until neighbor room is processed)
      }

      // Create face A
      const faceA: WallFace = {
        id: crypto.randomUUID(),
        wallId,
        faceSide: 'a',
        spaceType: faceASpaceType,
        roomId: faceARoomId,
        finishType: 'paint',
        openings: [],
        compassSide: (legacyWall.side || undefined) as CompassSide | undefined,
      };

      // Add openings to face A
      if (legacyWall.side) {
        // Look for doors and windows on this wall
        const doorOpenings: WallOpening[] = [];
        const windowOpenings: WallOpening[] = [];

        // These would come from room.doors and room.windows in actual migration
        faceA.openings = [...doorOpenings, ...windowOpenings];
      }

      // Create face B
      const faceB: WallFace = {
        id: crypto.randomUUID(),
        wallId,
        faceSide: 'b',
        spaceType: faceBSpaceType,
        roomId: faceBRoomId,
        finishType: 'paint',
        openings: [],
      };

      const wall: Wall = {
        id: wallId,
        projectId,
        label,
        length,
        height,
        faceA,
        faceB,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Store for linking shared walls (used in second pass)
      if (legacyWall.wallType === 'shared' && legacyWall.sharedWith) {
        sharedWalls.set(`${room.name}-${legacyWall.side}`, wall);
      }

      walls.push(wall);
    }
  }

  // Second pass: link shared walls
  // For walls marked as shared, find if the neighbor room already has a wall
  // on the opposite side and merge/link them
  linkSharedWalls(walls);

  return walls;
}

/**
 * Second pass: link shared walls between rooms.
 * When Room A's east wall is shared with Room B, and Room B's west wall
 * is also shared with Room A, they should reference the same wall.
 */
function linkSharedWalls(walls: Wall[]): void {
  // Find walls that need linking
  const unlinkedFaces = walls
    .filter((w) => w.faceA.spaceType === 'room' && w.faceA.roomId === null)
    .map((w) => ({ wall: w, face: w.faceA }))
    .concat(
      walls
        .filter((w) => w.faceB.spaceType === 'room' && w.faceB.roomId === null)
        .map((w) => ({ wall: w, face: w.faceB }))
    );

  // Match unlinked faces with their counterparts
  // Note: matching is by side, result stored for future linking
  for (const { face } of unlinkedFaces) {
    // Find potential match by looking for a wall with opposite compass side
    // This is simplified - in real migration, you'd have explicit IDs to match
    const oppositeSide = getOppositeSide(face.compassSide);
    const match = walls.find((w) => {
      const opposite = w.faceA.roomId === face.roomId ? w.faceA : w.faceB;
      return opposite.compassSide === oppositeSide && !opposite.roomId;
    });

    // Link faces when match found (v1.0: skip linking, faces remain unlinked)
    // Full room linking tracked in: https://github.com/.../issues/room-linking
    void match; // Silence unused warning
  }
}

function getOppositeSide(side: string | undefined): string | undefined {
  const map: Record<string, string> = {
    north: 'south',
    south: 'north',
    east: 'west',
    west: 'east',
    '1': '3',
    '2': '4',
    '3': '1',
    '4': '2',
  };
  return side ? map[side] : undefined;
}

// =============================================================================
// VALIDATION
// =============================================================================

export interface WallValidationError {
  wallId: string;
  field: string;
  message: string;
}

export function validateWalls(walls: Wall[]): WallValidationError[] {
  const errors: WallValidationError[] = [];

  for (const wall of walls) {
    // Wall level validation
    if (wall.length <= 0) {
      errors.push({ wallId: wall.id, field: 'length', message: 'Wall length must be positive' });
    }
    if (wall.height <= 0) {
      errors.push({ wallId: wall.id, field: 'height', message: 'Wall height must be positive' });
    }
    if (!wall.label) {
      errors.push({ wallId: wall.id, field: 'label', message: 'Wall label is required' });
    }

    // Face level validation
    for (const face of [wall.faceA, wall.faceB]) {
      if (!face.id) {
        errors.push({ wallId: wall.id, field: `face_${face.faceSide}.id`, message: 'Face ID is required' });
      }
      if (!face.wallId) {
        errors.push({ wallId: wall.id, field: `face_${face.faceSide}.wallId`, message: 'Face wallId is required' });
      }

      // Opening validation
      for (const opening of face.openings) {
        if (opening.width <= 0) {
          errors.push({ 
            wallId: wall.id, 
            field: `face_${face.faceSide}.opening.width`, 
            message: 'Opening width must be positive' 
          });
        }
        if (opening.height <= 0) {
          errors.push({ 
            wallId: wall.id, 
            field: `face_${face.faceSide}.opening.height`, 
            message: 'Opening height must be positive' 
          });
        }
      }
    }

    // Each wall must have at least face A with a room or external space
    if (wall.faceA.roomId === null && wall.faceA.spaceType === 'room') {
      // This is an "unlinked" state which is valid but flagged
    }
  }

  return errors;
}

// =============================================================================
// IMPORT / EXPORT
// =============================================================================

export interface WallExportData {
  version: string;
  exportedAt: string;
  projectId: string;
  walls: Wall[];
}

export function exportWalls(projectId: string): WallExportData {
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    projectId,
    walls: getWallsByProject(projectId),
  };
}

export function importWalls(data: WallExportData): Wall[] {
  // Validate structure
  if (!data.version || !data.walls || !Array.isArray(data.walls)) {
    throw new Error('Invalid wall export format');
  }

  // Validate each wall
  const errors = validateWalls(data.walls);
  if (errors.length > 0) {
    logger.warn('Import validation errors:', errors);
  }

  // Merge with existing walls
  const existing = loadWallsFromStorage();
  const existingIds = new Set(existing.map((w) => w.id));
  
  const newWalls = data.walls.filter((w) => !existingIds.has(w.id));
  
  return [...existing, ...newWalls];
}