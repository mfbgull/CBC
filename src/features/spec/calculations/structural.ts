/**
 * Structural Calculation Engine — Pure Functions
 *
 * Grey structure: excavation, foundation, brickwork, RCC, steel
 *
 * All functions are:
 * - Deterministic (no random, no time)
 * - Side-effect free (no DOM, no DB, no network)
 * - Unit consistent (feet, sq ft, cu ft, kg, bags)
 *
 * Formulas based on: Construction BOQ Calculator App Idea.md
 * References: [10, 19, 21, 29, 32, 33, 34, 35, 36, 37]
 */

import type {
  Opening,
  RoomSpec,
  FloorSpec,
  FoundationSpec,
  GreyStructureMaterials,
  RoomCalculation,
} from '../types';

// =============================================================================
// CONSTANTS — Construction Thumb Rules (South Asian Residential)
// =============================================================================

/** Bricks per sq ft of wall (including mortar): 0.75 × 13.5 */
export const BRICKS_PER_SQFT = 0.75 * 13.5;

/** Cement bags per 100 bricks (1:4 mortar) */
export const CEMENT_PER_100_BRICK = 1;

/** Cement bags per 50 sq ft of plaster (1:4 mix) */
export const CEMENT_PER_SQFT_PLASTER = 1 / 50;

/** Steel kg per sq ft of slab area (average residential: 1.0–1.2 kg/sqft) */
export const STEEL_KG_PER_SQFT_SLAB = 1.1;

/** Steel kg per linear ft of beam (average) */
export const STEEL_KG_PER_RFT_BEAM = 1.75;

/** Steel kg per linear ft of column (average) */
export const STEEL_KG_PER_RFT_COLUMN = 2.75;

/** Mortar as fraction of masonry volume */
export const MORTAR_FRACTION = 0.25;

/** Dry volume factor for mortar (accounts for shrinkage) */
export const DRY_VOLUME_FACTOR = 1.33;

/** Sand cu ft per sq ft of floor area (for PCC floor bed) */
export const SAND_CUFT_PER_SQFT = 0.2;

/** Crush cu ft per sq ft of floor area (for PCC floor bed) */
export const CRUSH_CUFT_PER_SQFT = 0.25;

/** PCC thickness in inches */
export const PCC_THICKNESS_INCHES = 3;

/** Lean concrete thickness in inches */
export const LEAN_CONCRETE_THICKNESS_INCHES = 4;

/** Wall plaster on both faces (multiply wall area by 2) */
export const PLASTER_FACE_MULTIPLIER = 2;

/** Standard height for skirting in inches */
export const SKIRTING_HEIGHT_INCHES = 4;

// =============================================================================
// OPENING HELPERS
// =============================================================================

export function openingArea(width: number, height: number, count: number = 1): number {
  return width * height * count;
}

export function totalOpeningArea(openings: Opening[]): number {
  return openings.reduce((sum, o) => sum + openingArea(o.width, o.height, o.count), 0);
}

// =============================================================================
// ROOM CALCULATIONS
// =============================================================================

export function roomFloorArea(room: RoomSpec): number {
  return room.l * room.w;
}

export function roomPerimeter(room: RoomSpec): number {
  return 2 * (room.l + room.w);
}

export function grossWallArea(room: RoomSpec): number {
  return roomPerimeter(room) * room.h;
}

export function netWallArea(room: RoomSpec): number {
  return grossWallArea(room) - totalOpeningArea(room.openings);
}

export function ceilingArea(room: RoomSpec): number {
  return roomFloorArea(room);
}

/** Bricks required for a room's walls */
export function roomBricks(room: RoomSpec): number {
  return Math.ceil(netWallArea(room) * BRICKS_PER_SQFT);
}

/** Cement bags for a room's brickwork + plaster */
export function roomCementBags(room: RoomSpec): number {
  const brickCement = roomBricks(room) / 100;
  const plasterCement = netWallArea(room) * PLASTER_FACE_MULTIPLIER / 50;
  return Math.ceil(brickCement + plasterCement);
}

/** Steel for floor slab (rough estimate) */
export function roomSteelKg(room: RoomSpec): number {
  return roomFloorArea(room) * STEEL_KG_PER_SQFT_SLAB;
}

/** Internal plaster area (both faces of walls) */
export function roomPlasterSft(room: RoomSpec): number {
  return netWallArea(room) * PLASTER_FACE_MULTIPLIER;
}

/** Skirting length (perimeter of floor) */
export function roomSkirtingRft(room: RoomSpec): number {
  return roomPerimeter(room);
}

/**
 * Paintable area estimate.
 * Rule of thumb: total paintable area ≈ 3× to 3.5× built-up area.
 * More accurate: walls + ceiling.
 */
export function roomPaintableArea(room: RoomSpec): number {
  const walls = netWallArea(room) * PLASTER_FACE_MULTIPLIER;
  const ceiling = ceilingArea(room);
  return walls + ceiling;
}

/** Putty bags: 1 bag covers ~400–500 sq ft (2 coats) */
export function puttyBagsNeeded(paintableArea: number): number {
  return Math.ceil((paintableArea * 2) / 450);
}

/** Primer liters: 1 liter covers ~100 sq ft per coat */
export function primerLitersNeeded(paintableArea: number): number {
  return Math.ceil((paintableArea * 2) / 100);
}

/** Paint drums (18L each — 2 coats): 1 drum covers ~400 sq ft */
export function paintDrumsNeeded(paintableArea: number): number {
  return Math.ceil((paintableArea * 2) / 400);
}

// =============================================================================
// FLOOR CALCULATIONS
// =============================================================================

/** Total built-up area of a floor */
export function floorBuiltUpArea(floor: FloorSpec): number {
  return floor.rooms.reduce((sum, room) => sum + roomFloorArea(room), 0);
}

/** Total slab area = built-up area */
export function floorSlabArea(floor: FloorSpec): number {
  return floorBuiltUpArea(floor);
}

/** RCC concrete volume for slab (cu ft) */
export function floorSlabConcreteCuFt(floor: FloorSpec): number {
  // Thickness in inches → feet
  const thicknessFt = floor.slabThickness / 12;
  return floorSlabArea(floor) * thicknessFt;
}

/** Steel for floor slab (kg) */
export function floorSlabSteelKg(floor: FloorSpec): number {
  return floorSlabArea(floor) * STEEL_KG_PER_SQFT_SLAB;
}

/** Parapet wall area */
export function parapetWallArea(floor: FloorSpec): number {
  return floor.parapetPerimeter * floor.parapetHeight;
}

/** Parapet bricks */
export function parapetBricks(floor: FloorSpec): number {
  if (floor.parapetPerimeter === 0 || floor.parapetHeight === 0) return 0;
  return Math.ceil(parapetWallArea(floor) * BRICKS_PER_SQFT);
}

// =============================================================================
// FOUNDATION CALCULATIONS
// =============================================================================

/**
 * Excavation volume (cu ft) — strip footing
 * V = centerline perimeter × trench width × depth
 * Overdig factor accounts for overrun.
 */
export function excavationVolumeCuFt(
  centerlinePerimeter: number,
  foundation: FoundationSpec
): number {
  const raw = centerlinePerimeter * foundation.trenchWidth * foundation.trenchDepth;
  return raw * foundation.excavationFactor;
}

/**
 * Lean concrete volume (cu ft) — under strip footing or raft
 */
export function leanConcreteCuFt(
  centerlinePerimeter: number,
  foundation: FoundationSpec
): number {
  if (foundation.type === 'raft') {
    // Raft: whole building footprint × depth
    // This should be passed in from spec
    return 0; // caller provides raft area
  }
  // Strip: centerline × width × lean depth
  const depthFt = foundation.leanConcreteDepth / 12;
  return centerlinePerimeter * foundation.trenchWidth * depthFt;
}

/**
 * DPC (Damp Proof Course) volume — thin layer at plinth
 * Volume in cu ft (for costing purposes)
 */
export function dpcCuFt(
  centerlinePerimeter: number,
  foundation: FoundationSpec
): number {
  const depthFt = foundation.dpcDepth / 12;
  return centerlinePerimeter * foundation.trenchWidth * depthFt;
}

// =============================================================================
// AGGREGATION — GREY STRUCTURE
// =============================================================================

/**
 * Calculate grey structure material quantities for all floors.
 * Rates are applied at the BOQ generation step.
 */
export function calculateGreyStructure(
  floors: FloorSpec[],
  _foundation: FoundationSpec,
  _buildingCoverage: number
): GreyStructureMaterials {
  let bricks = 0;
  let cementBags = 0;
  let sandCuFt = 0;
  let crushCuFt = 0;
  let steelKg = 0;

  for (const floor of floors) {
    // Aggregate room-level quantities
    for (const room of floor.rooms) {
      bricks += roomBricks(room);
      cementBags += roomCementBags(room);
      steelKg += roomSteelKg(room);
    }

    // Parapet bricks
    bricks += parapetBricks(floor);

    // Slab steel
    steelKg += floorSlabSteelKg(floor);

    // PCC (floor bed) — sand + crush per sq ft
    const pccArea = floorBuiltUpArea(floor);
    sandCuFt += pccArea * SAND_CUFT_PER_SQFT;
    crushCuFt += pccArea * CRUSH_CUFT_PER_SQFT;
  }

  return {
    bricks,
    cementBags,
    sandCuFt: Math.round(sandCuFt),
    crushCuFt: Math.round(crushCuFt),
    steelKg: Math.round(steelKg),
    steelTon: Math.round(steelKg) / 1000,
    // Mortar: bricks × 0.25 of brick volume
    mortarCuFt: Math.round(bricks * MORTAR_FRACTION / 13.5 * 0.1337),
    // These need centerline perimeter — set to 0 here, caller provides
    leanConcreteCuFt: 0,
    pccCuFt: 0,
    excavationCuFt: 0,
  };
}

// =============================================================================
// PER-ROOM CALCULATION
// =============================================================================

/**
 * Full calculation for a single room.
 * Grey cost, finishing cost, MEP cost are estimated using
 * default thumb-rule rates. Callers replace these with
 * actual material rates from the rates library.
 */
export function calculateRoom(room: RoomSpec, greyRatePerSft: number = 500): RoomCalculation {
  const floorArea = roomFloorArea(room);
  const wallArea = grossWallArea(room);
  const openingArea = totalOpeningArea(room.openings);
  const netWall = wallArea - openingArea;
  const perimeter = roomPerimeter(room);
  const ceiling = ceilingArea(room);

  const bricks = roomBricks(room);
  const cementBags = roomCementBags(room);
  const plasterSft = roomPlasterSft(room);
  const paintable = roomPaintableArea(room);
  const skirting = roomSkirtingRft(room);

  // Rough cost estimates using default rates
  // These get replaced by actual rates when generating BOQ
  const greyCost = floorArea * greyRatePerSft;

  // Finishing varies by room type
  let finishingCost = 0;
  let flooringSft = floorArea;
  let mepCost = 0;

  switch (room.kind) {
    case 'toilet':
      finishingCost = floorArea * 600 + netWall * 200;
      mepCost = 45000; // base + premium
      break;
    case 'toilet':
      finishingCost = floorArea * 600 + netWall * 200;
      mepCost = 45000;
      break;
    case 'kitchen':
    case 'dining':
    case 'bedroom':
      finishingCost = floorArea * 350 + plasterSft * 50;
      mepCost = 15000;
      break;
    case 'porch':
    case 'carport':
      finishingCost = floorArea * 400;
      mepCost = 5000;
      break;
    case 'corridor':
    case 'passage':
      finishingCost = floorArea * 300 + plasterSft * 40;
      mepCost = 10000;
      break;
    case 'staircase':
      finishingCost = floorArea * 550;
      mepCost = 20000;
      break;
    case 'store':
      finishingCost = floorArea * 250;
      mepCost = 8000;
      break;
    default:
      finishingCost = floorArea * 350;
      mepCost = 15000;
  }

  return {
    room,
    floorArea,
    wallArea,
    openingArea,
    netWallArea: netWall,
    ceilingArea: ceiling,
    perimeter,
    bricks,
    cementBags,
    plasterInternalSft: plasterSft,
    flooringSft,
    skirtingRft: skirting,
    paintableAreaSft: paintable,
    lightPoints: 0, // filled by MEP
    fanPoints: 0,
    socketPoints: 0,
    greyCost,
    finishingCost,
    mepCost,
    joineryCost: 0,
    roomTotal: greyCost + finishingCost + mepCost,
  };
}
