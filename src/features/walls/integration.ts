/**
 * Wall Entity Integration for Spec System
 * 
 * Bridges the Wall Entity Model (src/types/wall.ts) with the existing
 * RoomSpec-based specification system (src/features/spec/).
 * 
 * This integration:
 * 1. Creates walls when rooms are added (auto-generate based on room dimensions)
 * 2. Syncs wall data with room openings for consistent calculations
 * 3. Provides BOQ summaries per room using wall entities
 * 4. Maintains backward compatibility with existing RoomSpec calculations
 */

import type { Wall, SpaceType, CompassSide } from '../../types/wall';
import { 
  createWall, 
  createWallFace, 
  createWallOpening,
  calculateWallFaceArea,
  generateWallLabel,
  grossWallArea,
  getWallStatus,
  SPACE_TYPE_LABELS,
  type WallStatus,
  type RoomBOQSummary,
} from '../../types/wall';
import type { RoomSpec } from '../../features/spec/types';

// =============================================================================
// CONVERSION HELPERS
// =============================================================================

/** Convert feet to metres */
const FT_TO_M = 0.3048;

/** Convert metres to feet */
const M_TO_FT = 3.28084;

/**
 * Convert room dimensions from feet to metres.
 */
export function feetToMetres(feet: number): number {
  return feet * FT_TO_M;
}

/**
 * Convert room dimensions from metres to feet.
 */
export function metresToFeet(metres: number): number {
  return metres * M_TO_FT;
}

// =============================================================================
// AUTO-GENERATE WALLS FOR A ROOM
// =============================================================================

/**
 * Generate wall entities for a room based on its dimensions.
 * 
 * This creates 4 walls (north, east, south, west) with default settings:
 * - All walls start as "external" on face B (will be linked to neighbors later)
 * - All walls start with "paint" finish type on both faces
 * - No openings (doors/windows are added separately)
 * 
 * @param room - The room spec
 * @param projectId - Project ID for wall creation
 * @param existingLabels - Existing wall labels to avoid duplicates
 * @returns Array of generated Wall entities
 */
export function generateWallsForRoom(
  room: RoomSpec,
  projectId: string,
  existingLabels: string[] = []
): Wall[] {
  const walls: Wall[] = [];
  const height = feetToMetres(room.h);
  
  // Define the 4 walls with their dimensions and neighbor types
  const wallDefs: Array<{
    side: CompassSide;
    length: number;
    neighborType: SpaceType;
  }> = [
    { side: 'north', length: feetToMetres(room.w), neighborType: 'external' },
    { side: 'east', length: feetToMetres(room.l), neighborType: 'external' },
    { side: 'south', length: feetToMetres(room.w), neighborType: 'external' },
    { side: 'west', length: feetToMetres(room.l), neighborType: 'external' },
  ];

  for (const def of wallDefs) {
    const label = generateWallLabel(existingLabels.map((l) => l));
    existingLabels.push(label);
    
    const wallId = crypto.randomUUID();
    
    // Face A: belongs to this room
    const faceA = createWallFace(
      wallId,
      'a',
      'room',
      room.id,
      'paint',
      def.side
    );

    // Face B: external by default (will be linked when neighbor rooms are added)
    const faceB = createWallFace(
      wallId,
      'b',
      def.neighborType,
      null,
      'paint'
    );

    const wall = createWall(
      projectId,
      label,
      def.length,
      height,
      faceA,
      faceB
    );

    walls.push(wall);
  }

  return walls;
}

/**
 * Convert room openings to wall openings.
 * 
 * This assumes:
 * - Doors are on walls (we distribute them across walls)
 * - Windows are also on walls (we distribute them)
 * 
 * For more precise placement, you'd want to specify which wall each opening is on.
 */
export function convertRoomOpeningsToWallOpenings(
  room: RoomSpec,
  walls: Wall[]
): Wall[] {
  if (!room.openings.length || !walls.length) return walls;

  // Get the face belonging to this room
  const wallsWithUpdates = [...walls];
  
  // Simple distribution: alternate doors/windows across walls
  // In a full implementation, you'd have opening-to-wall mapping
  let wallIndex = 0;
  void wallIndex; // Track current wall for future implementation

  for (const opening of room.openings) {
    const wall = wallsWithUpdates[wallIndex];
    if (!wall) break;

    // Find the face belonging to this room
    const roomFace = wall.faceA.roomId === room.id ? wall.faceA : wall.faceB;
    
    // Add opening to the room's face
    const wallOpening = createWallOpening(
      roomFace.id,
      opening.type as 'door' | 'window' | 'archway',
      feetToMetres(opening.width),
      feetToMetres(opening.height),
      opening.count
    );

    // Update the wall
    wallsWithUpdates[wallIndex] = {
      ...wall,
      faceA: wall.faceA.id === roomFace.id
        ? { ...wall.faceA, openings: [...wall.faceA.openings, wallOpening] }
        : wall.faceA,
      faceB: wall.faceB.id === roomFace.id
        ? { ...wall.faceB, openings: [...wall.faceB.openings, wallOpening] }
        : wall.faceB,
    };

    // Move to next wall
    wallIndex = (wallIndex + 1) % walls.length;
  }

  return wallsWithUpdates;
}

// =============================================================================
// BOQ CALCULATION FROM WALLS
// =============================================================================

/**
 * Calculate room BOQ summary from wall entities.
 */
export function calculateRoomBOQFromWalls(
  roomId: string,
  walls: Wall[]
): RoomBOQSummary {
  const roomWalls = walls.filter(
    (w) => w.faceA.roomId === roomId || w.faceB.roomId === roomId
  );

  let paintAreaSqm = 0;
  let plasterOnlyAreaSqm = 0;
  let tilesAreaSqm = 0;
  let skirtingLengthM = 0;

  for (const wall of roomWalls) {
    // Find the face belonging to this room
    const face = wall.faceA.roomId === roomId ? wall.faceA : wall.faceB;
    if (!face) continue;

    const netArea = calculateWallFaceArea(face, wall);
    const doorWidth = face.openings
      .filter((o) => o.openingType === 'door')
      .reduce((sum, o) => sum + o.width * o.quantity, 0);
    
    const skirting = Math.max(0, wall.length - doorWidth);

    switch (face.finishType) {
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

  // Build wall breakdown
  const wallBreakdown = roomWalls.map((wall) => {
    const face = wall.faceA.roomId === roomId ? wall.faceA : wall.faceB;
    const oppositeFace = face === wall.faceA ? wall.faceB : wall.faceA;
    
    return {
      wallId: wall.id,
      wallLabel: wall.label,
      length: wall.length,
      height: wall.height,
      face,
      neighborLabel: oppositeFace.roomId 
        ? `Room ${oppositeFace.roomId.slice(-4)}` 
        : (SPACE_TYPE_LABELS[oppositeFace.spaceType] ?? oppositeFace.spaceType),
      neighborStatus: getWallStatus(oppositeFace) as WallStatus,
      grossArea: grossWallArea(wall),
      netFinishArea: calculateWallFaceArea(face, wall),
      skirtingLength: Math.max(0, wall.length - face.openings
        .filter((o) => o.openingType === 'door')
        .reduce((sum, o) => sum + o.width * o.quantity, 0)),
      hasUnlinkedNeighbor: oppositeFace.spaceType === 'room' && !oppositeFace.roomId,
    };
  });

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
// AGGREGATE WALLS FOR FLOOR/SPEC
// =============================================================================

/**
 * Aggregate all walls from a spec's floors and rooms.
 */
export function aggregateWallsFromSpec(
  floors: Array<{ rooms: RoomSpec[] }>,
  projectId: string
): Wall[] {
  const allWalls: Wall[] = [];
  const usedLabels: string[] = [];

  for (const floor of floors) {
    for (const room of floor.rooms) {
      const roomWalls = generateWallsForRoom(room, projectId, usedLabels);
      usedLabels.push(...roomWalls.map((w) => w.label));
      
      // Add openings
      const roomWallsWithOpenings = convertRoomOpeningsToWallOpenings(room, roomWalls);
      allWalls.push(...roomWallsWithOpenings);
    }
  }

  return allWalls;
}

/**
 * Calculate total finishing quantities from walls.
 */
export function calculateFinishingFromWalls(
  walls: Wall[]
): {
  paintAreaSqm: number;
  plasterOnlyAreaSqm: number;
  tilesAreaSqm: number;
  skirtingLengthM: number;
} {
  let paintAreaSqm = 0;
  let plasterOnlyAreaSqm = 0;
  let tilesAreaSqm = 0;
  let skirtingLengthM = 0;

  for (const wall of walls) {
    for (const face of [wall.faceA, wall.faceB]) {
      const netArea = calculateWallFaceArea(face, wall);
      const doorWidth = face.openings
        .filter((o) => o.openingType === 'door')
        .reduce((sum, o) => sum + o.width * o.quantity, 0);
      const skirting = Math.max(0, wall.length - doorWidth);

      switch (face.finishType) {
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
  }

  return {
    paintAreaSqm: Math.round(paintAreaSqm * 100) / 100,
    plasterOnlyAreaSqm: Math.round(plasterOnlyAreaSqm * 100) / 100,
    tilesAreaSqm: Math.round(tilesAreaSqm * 100) / 100,
    skirtingLengthM: Math.round(skirtingLengthM * 100) / 100,
  };
}

// =============================================================================
// LINK SHARED WALLS
// =============================================================================

/**
 * Link two rooms that share a wall.
 * 
 * This is called when:
 * - A room is placed next to another room
 * - The user manually links two rooms
 * 
 * @param walls - Current wall list
 * @param roomAId - First room ID
 * @param roomASide - Which side of room A the shared wall is on
 * @param roomBId - Second room ID  
 * @param roomBSide - Which side of room B the shared wall is on
 * @returns Updated wall list
 */
export function linkSharedWalls(
  walls: Wall[],
  roomAId: string,
  roomASide: CompassSide,
  roomBId: string,
  roomBSide: CompassSide
): Wall[] {
  return walls.map((wall) => {
    // Check if this wall has one of the rooms
    const hasRoomA = wall.faceA.roomId === roomAId && wall.faceA.compassSide === roomASide;
    const hasRoomB = wall.faceB.roomId === roomBId && wall.faceB.compassSide === roomBSide;

    // If this wall is between the two rooms, update the faces
    if (hasRoomA && !hasRoomB) {
      // Room A is on face A, link room B to face B
      return {
        ...wall,
        faceB: {
          ...wall.faceB,
          spaceType: 'room' as SpaceType,
          roomId: roomBId,
          compassSide: roomBSide,
        },
        updatedAt: new Date().toISOString(),
      };
    }

    if (!hasRoomA && hasRoomB) {
      // Room B is on face B, link room A to face A
      return {
        ...wall,
        faceA: {
          ...wall.faceA,
          spaceType: 'room' as SpaceType,
          roomId: roomAId,
          compassSide: roomASide,
        },
        updatedAt: new Date().toISOString(),
      };
    }

    return wall;
  });
}

// =============================================================================
// MERGE CALCULATION RESULTS
// =============================================================================

/**
 * Merge wall-based BOQ with existing RoomSpec-based calculations.
 * 
 * This allows gradual migration from the simple 2*(l+w)*h formula
 * to the more detailed wall entity model.
 */
export function mergeBOQCalculations(
  _traditionalResult: {
    plasterInternalSft: number;
    skirtingRft: number;
    paintableAreaSft: number;
  },
  wallResult: ReturnType<typeof calculateFinishingFromWalls>
): {
  plasterInternalSqm: number;
  plasterInternalSft: number;
  skirtingM: number;
  skirtingRft: number;
  paintAreaSqm: number;
  paintAreaSft: number;
} {
  return {
    // Convert to both units for compatibility
    plasterInternalSqm: wallResult.paintAreaSqm + wallResult.plasterOnlyAreaSqm,
    plasterInternalSft: (wallResult.paintAreaSqm + wallResult.plasterOnlyAreaSqm) * 10.764,
    skirtingM: wallResult.skirtingLengthM,
    skirtingRft: wallResult.skirtingLengthM * 3.281,
    paintAreaSqm: wallResult.paintAreaSqm,
    paintAreaSft: wallResult.paintAreaSqm * 10.764,
  };
}