/**
 * Wall Entity Model for BOQ Calculator
 * 
 * A wall is stored ONCE and referenced by both adjacent spaces.
 * Each wall has two independent faces (face_a and face_b).
 * Each face has its own finish type, openings, and BOQ contribution.
 * Shared walls never double-count in the total BOQ.
 * 
 * Key rules:
 * - Each face owns its finish independently (NO 50% split)
 * - External walls: face_b is 'external' space type
 * - Open/void: face_b is 'open' space type
 * - Unlinked rooms: face_b has space_type='room' but room_id=null
 */

// =============================================================================
// ENUMS & LITERALS
// =============================================================================

export type SpaceType = 
  | 'room' 
  | 'kitchen' 
  | 'bathroom' 
  | 'corridor' 
  | 'external' 
  | 'open';

export type FinishType = 
  | 'paint'        // Full plaster + paint
  | 'plaster_only' // Plaster only, no paint
  | 'tiles'        // Wall tiles (e.g., kitchen, toilet)
  | 'none';        // No finish (bare wall)

export type OpeningType = 'door' | 'window' | 'archway';

export type FaceSide = 'a' | 'b';

export type CompassSide = 'north' | 'south' | 'east' | 'west' | '1' | '2' | '3' | '4';

export const SPACE_TYPE_LABELS: Record<SpaceType, string> = {
  room: 'Room',
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  corridor: 'Corridor',
  external: 'External Wall',
  open: 'Open / Void',
};

export const FINISH_TYPE_LABELS: Record<FinishType, string> = {
  paint: 'Paint (Plaster + Paint)',
  plaster_only: 'Plaster Only',
  tiles: 'Wall Tiles',
  none: 'No Finish',
};

// =============================================================================
// INTERFACES
// =============================================================================

export interface WallOpening {
  id: string;
  faceId: string;
  openingType: OpeningType;
  width: number;     // metres
  height: number;    // metres
  quantity: number;  // default 1
}

export interface WallFace {
  id: string;
  wallId: string;
  faceSide: FaceSide;
  spaceType: SpaceType;
  /** The room this face belongs to. NULL for external/open spaces. */
  roomId: string | null;
  /** Finish specification for this face */
  finishType: FinishType;
  /** Optional: for tiles, the tile height in metres */
  tileHeight?: number;
  /** Openings on this face (doors, windows) */
  openings: WallOpening[];
  /** Which side of the room (for UI orientation) */
  compassSide?: CompassSide;
  /** Last update timestamp */
  updatedAt?: string;
}

export interface Wall {
  id: string;
  projectId: string;
  /** Auto-generated label, e.g., "W-001" */
  label: string;
  /** Shared dimension: length in metres */
  length: number;
  /** Floor to ceiling height in metres */
  height: number;
  /** Which room owns this side (face_a is defined first) */
  faceA: WallFace;
  /** The other side of the wall */
  faceB: WallFace;
  /** Timestamp */
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

export function createWallOpening(
  faceId: string,
  openingType: OpeningType,
  width: number,
  height: number,
  quantity: number = 1
): WallOpening {
  return {
    id: crypto.randomUUID(),
    faceId,
    openingType,
    width,
    height,
    quantity,
  };
}

export function createWallFace(
  wallId: string,
  faceSide: FaceSide,
  spaceType: SpaceType,
  roomId: string | null = null,
  finishType: FinishType = 'paint',
  compassSide?: CompassSide
): WallFace {
  return {
    id: crypto.randomUUID(),
    wallId,
    faceSide,
    spaceType,
    roomId,
    finishType,
    openings: [],
    compassSide,
  };
}

export function createWall(
  projectId: string,
  label: string,
  length: number,
  height: number,
  faceA: WallFace,
  faceB: WallFace
): Wall {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    projectId,
    label,
    length,
    height,
    faceA,
    faceB,
    createdAt: now,
    updatedAt: now,
  };
}

// =============================================================================
// CALCULATION HELPERS
// =============================================================================

/**
 * Gross wall area (before openings)
 */
export function grossWallArea(wall: Wall): number {
  return wall.length * wall.height;
}

/**
 * Calculate openings area for a face
 */
export function openingsArea(face: WallFace): number {
  return face.openings.reduce(
    (sum, o) => sum + o.width * o.height * o.quantity,
    0
  );
}

/**
 * Net finish area for one face of a wall.
 * 
 * Rules:
 * - Gross area minus openings
 * - If finishType === 'none' OR spaceType === 'open' → return 0
 * - Each face owns its finish independently (no 50% split)
 * 
 * @param face - The wall face to calculate
 * @param wall - The parent wall
 * @param effectiveHeight - Override height (e.g., for partial tiles)
 * @returns Net area in square metres
 */
export function calculateWallFaceArea(
  face: WallFace,
  wall: Wall,
  effectiveHeight?: number
): number {
  // No finish for void/open spaces
  if (face.spaceType === 'open' || face.finishType === 'none') {
    return 0;
  }

  const height = effectiveHeight ?? face.tileHeight ?? wall.height;
  const grossArea = wall.length * height;
  const openings = openingsArea(face);

  return Math.max(0, grossArea - openings);
}

/**
 * Calculate skirting length for a wall face.
 * Skirting = wall length minus door widths.
 * 
 * @param face - The wall face
 * @param wall - The parent wall
 * @returns Skirting length in metres
 */
export function calculateSkirtingLength(face: WallFace, wall: Wall): number {
  const doorWidth = face.openings
    .filter((o) => o.openingType === 'door')
    .reduce((sum, o) => sum + o.width * o.quantity, 0);

  return Math.max(0, wall.length - doorWidth);
}

/**
 * Get the neighbor room name for display purposes.
 */
export function getNeighborLabel(face: WallFace, roomsById: Map<string, { name: string }>): string {
  if (face.roomId) {
    const room = roomsById.get(face.roomId);
    return room?.name ?? 'Unknown Room';
  }

  return SPACE_TYPE_LABELS[face.spaceType] ?? face.spaceType;
}

/**
 * Determine the status of a wall face for UI badges.
 */
export type WallStatus = 'shared' | 'external' | 'open' | 'unlinked';

export function getWallStatus(face: WallFace): WallStatus {
  if (face.spaceType === 'open') return 'open';
  if (face.spaceType === 'external') return 'external';
  
  // It's a room
  if (face.roomId) {
    return 'shared';
  }
  
  return 'unlinked';
}

// =============================================================================
// WALL AGGREGATION BY ROOM
// =============================================================================

export interface RoomWallSummary {
  wallId: string;
  wallLabel: string;
  length: number;
  height: number;
  /** The face belonging to this room */
  face: WallFace;
  /** Neighbor info for display */
  neighborLabel: string;
  neighborStatus: WallStatus;
  /** Calculated areas */
  grossArea: number;
  netFinishArea: number;
  skirtingLength: number;
  /** Flag if neighbor room is not yet linked */
  hasUnlinkedNeighbor: boolean;
}

export interface RoomBOQSummary {
  roomId: string;
  /** Aggregated by finish type */
  paintAreaSqm: number;
  plasterOnlyAreaSqm: number;
  tilesAreaSqm: number;
  /** Skirting */
  skirtingLengthM: number;
  /** Wall breakdown for display */
  wallBreakdown: RoomWallSummary[];
}

/**
 * Get all walls for a room with calculated areas.
 * 
 * @param roomId - The room ID
 * @param walls - All walls in the project
 * @param roomsById - Map of room IDs to room objects (for neighbor names)
 * @returns RoomWallSummary[] and aggregated RoomBOQSummary
 */
export function getRoomWallSummary(
  roomId: string,
  walls: Wall[],
  roomsById: Map<string, { name: string }>
): RoomBOQSummary {
  const wallBreakdown: RoomWallSummary[] = [];
  let paintAreaSqm = 0;
  let plasterOnlyAreaSqm = 0;
  let tilesAreaSqm = 0;
  let skirtingLengthM = 0;

  for (const wall of walls) {
    // Find which face belongs to this room
    const face = wall.faceA.roomId === roomId 
      ? wall.faceA 
      : wall.faceB.roomId === roomId 
        ? wall.faceB 
        : null;

    if (!face) continue;

    // Determine neighbor face
    const neighborFace = face === wall.faceA ? wall.faceB : wall.faceA;
    const neighborLabel = getNeighborLabel(neighborFace, roomsById);
    const neighborStatus = getWallStatus(neighborFace);
    const hasUnlinkedNeighbor = neighborStatus === 'unlinked';

    // Calculate areas
    const netFinishArea = calculateWallFaceArea(face, wall);
    const skirting = calculateSkirtingLength(face, wall);

    // Aggregate by finish type
    switch (face.finishType) {
      case 'paint':
        paintAreaSqm += netFinishArea;
        break;
      case 'plaster_only':
        plasterOnlyAreaSqm += netFinishArea;
        break;
      case 'tiles':
        tilesAreaSqm += netFinishArea;
        break;
    }

    skirtingLengthM += skirting;

    wallBreakdown.push({
      wallId: wall.id,
      wallLabel: wall.label,
      length: wall.length,
      height: wall.height,
      face,
      neighborLabel,
      neighborStatus,
      grossArea: grossWallArea(wall),
      netFinishArea,
      skirtingLength: skirting,
      hasUnlinkedNeighbor,
    });
  }

  return {
    roomId,
    paintAreaSqm: Math.round(paintAreaSqm * 100) / 100,
    plasterOnlyAreaSqm: Math.round(plasterOnlyAreaSqm * 100) / 100,
    tilesAreaSqm: Math.round(tilesAreaSqm * 100) / 100,
    skirtingLengthM: Math.round(skirtingLengthM * 100) / 100,
    wallBreakdown,
  };
}

// =============================================================================
// EDGE CASES
// =============================================================================

/**
 * Check for height mismatch between two rooms sharing a wall.
 * Returns null if OK, or mismatch info if different.
 */
export function checkHeightMismatch(
  wall: Wall
): { roomA: string; heightA: number; roomB: string; heightB: number } | null {
  if (wall.faceA.roomId && wall.faceB.roomId) {
    // Both rooms exist - we would need room heights from context
    // For now, just check the wall height vs any per-face overrides
    // This is a placeholder - actual implementation needs room height data
    return null;
  }
  return null;
}

/**
 * When a room is deleted, convert its wall faces to external.
 * This prevents orphaned walls and marks them as 'unlinked'.
 */
export function orphanWallFaces(wall: Wall, deletedRoomId: string): Wall {
  const now = new Date().toISOString();
  
  const updateFace = (face: WallFace): WallFace => {
    if (face.roomId === deletedRoomId) {
      return {
        ...face,
        spaceType: 'external',
        roomId: null,
        updatedAt: now,
      };
    }
    return face;
  };

  return {
    ...wall,
    faceA: updateFace(wall.faceA),
    faceB: updateFace(wall.faceB),
    updatedAt: now,
  };
}

/**
 * Check if a room already has a wall on a given compass side.
 * Used to prevent duplicate walls.
 */
export function findExistingWall(
  roomId: string,
  compassSide: CompassSide,
  walls: Wall[]
): Wall | null {
  for (const wall of walls) {
    for (const face of [wall.faceA, wall.faceB]) {
      if (face.roomId === roomId && face.compassSide === compassSide) {
        return wall;
      }
    }
  }
  return null;
}

/**
 * Validate that two rooms don't already have conflicting walls
 * before creating a shared wall.
 */
export interface MergeSuggestion {
  existingWall: Wall;
  faceToUpdate: 'a' | 'b';
}

export function findMergeSuggestion(
  roomAId: string,
  roomBId: string,
  walls: Wall[]
): MergeSuggestion | null {
  for (const wall of walls) {
    // Check if room A is already linked via this wall
    const roomAInWall = wall.faceA.roomId === roomAId || wall.faceB.roomId === roomAId;
    const roomBInWall = wall.faceA.roomId === roomBId || wall.faceB.roomId === roomBId;

    if (roomAInWall && !roomBInWall) {
      // Found wall with room A, need to add room B to the other face
      const otherFace = wall.faceA.roomId === roomAId ? 'b' : 'a';
      return { existingWall: wall, faceToUpdate: otherFace };
    }

    if (roomBInWall && !roomAInWall) {
      const otherFace = wall.faceA.roomId === roomBId ? 'b' : 'a';
      return { existingWall: wall, faceToUpdate: otherFace };
    }
  }
  return null;
}

// =============================================================================
// LABELS
// =============================================================================

export function generateWallLabel(existingLabels: string[]): string {
  const nextNum = existingLabels.length + 1;
  return `W-${String(nextNum).padStart(3, '0')}`;
}

export function parseWallLabel(label: string): number | null {
  const match = label.match(/^W-(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}