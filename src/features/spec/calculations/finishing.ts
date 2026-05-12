/**
 * Finishing Calculation Engine — Pure Functions
 *
 * Flooring, plaster, paint, skirting, joinery, cabinets
 *
 * All functions are:
 * - Deterministic (no random, no time)
 * - Side-effect free (no DOM, no DB, no network)
 * - Unit consistent (feet, sq ft, running ft)
 *
 * Formulas based on: Construction BOQ Calculator App Idea.md
 * References: [7, 9, 10, 11, 19, 21, 22, 24, 28, 38, 41]
 */

import type {
  RoomSpec,
  FloorSpec,
  FinishingMaterials,
  KitchenFields,
  ToiletFields,
  QualityTier,
  FlooringMaterial,
} from '../types';

// =============================================================================
// CONSTANTS — Finishing Thumb Rules
// =============================================================================

/** Putty coverage: 1 bag ≈ 450 sq ft (2 coats) */
const PUTTY_COVERAGE_SQFT = 450;

/** Primer coverage: 1 liter ≈ 100 sq ft per coat */
const PRIMER_COVERAGE_SQFT = 100;

/** Paint drum: 18L ≈ 400 sq ft coverage (2 coats) */
const PAINT_DRUM_COVERAGE_SQFT = 400;

// =============================================================================
// PAINT CALCULATIONS
// =============================================================================

/** Net internal wall area (total door openings deducted) */
export function netWallAreaInternal(room: RoomSpec): number {
  const gross = 2 * (room.l + room.w) * room.h;
  const doorArea = room.openings
    .filter((o) => o.type === 'door')
    .reduce((sum, o) => sum + o.width * o.height * o.count, 0);
  return Math.max(0, gross - doorArea);
}

/** Paintable area = internal wall plaster area + ceiling area */
export function paintableArea(room: RoomSpec): number {
  const wallArea = netWallAreaInternal(room) * 2; // both faces
  const ceiling = floorArea(room);
  return wallArea + ceiling;
}

/** Total paintable area for entire building */
export function buildingPaintableArea(floors: FloorSpec[]): number {
  let total = 0;
  for (const floor of floors) {
    for (const room of floor.rooms) {
      total += paintableArea(room);
    }
  }
  return total;
}

/** Putty bags (2 coats) */
export function puttyBags(paintableAreaVal: number): number {
  return Math.ceil((paintableAreaVal * 2) / PUTTY_COVERAGE_SQFT);
}

/** Primer liters (1 coat) */
export function primerLiters(paintableAreaVal: number): number {
  return Math.ceil(paintableAreaVal / PRIMER_COVERAGE_SQFT);
}

/** Paint drums — 18L each, 2 coats */
export function paintDrums(paintableAreaVal: number): number {
  return Math.ceil((paintableAreaVal * 2) / PAINT_DRUM_COVERAGE_SQFT);
}

// =============================================================================
// FLOORING CALCULATIONS
// =============================================================================

export function floorArea(room: RoomSpec): number {
  return room.l * room.w;
}

export function totalFloorArea(floors: FloorSpec[]): number {
  return floors.reduce(
    (sum, floor) =>
      sum + floor.rooms.reduce((s, room) => s + floorArea(room), 0),
    0
  );
}

/** Skirting length = perimeter of each room */
export function skirtingLength(room: RoomSpec): number {
  return 2 * (room.l + room.w);
}

/** Total skirting (running ft) */
export function totalSkirtingLength(floors: FloorSpec[]): number {
  return floors.reduce(
    (sum, floor) =>
      sum + floor.rooms.reduce((s, room) => s + skirtingLength(room), 0),
    0
  );
}

// =============================================================================
// KITCHEN CALCULATIONS
// =============================================================================

/**
 * Kitchen cabinet area (sq ft of shutter area).
 * Lower cabinet: front face = length × height (2.5 ft)
 * Upper cabinet: front face = length × height (2 ft)
 */
export function cabinetArea(kitchen: RoomSpec & Partial<KitchenFields>): number {
  const lower = (kitchen.cabinetLower || 0) * 2.5;
  const upper = (kitchen.cabinetUpper || 0) * 2.0;
  return lower + upper;
}

/**
 * Kitchen countertop area (sq ft).
 */
export function countertopArea(kitchen: RoomSpec & Partial<KitchenFields>): number {
  return (kitchen.cabinetLower || 0) * 2;
}

/**
 * Backsplash area (sq ft).
 */
export function backsplashArea(kitchen: RoomSpec & Partial<KitchenFields>): number {
  return (kitchen.cabinetLower || 0) * 1.5;
}

// =============================================================================
// TOILET CALCULATIONS
// =============================================================================

/**
 * Toilet waterproofing area (sq ft).
 * Floor + 1 ft up the walls.
 */
export function waterproofingArea(
  toilet: RoomSpec & Partial<ToiletFields>
): number {
  const floor = floorArea(toilet);
  const wallBase = 2 * (toilet.l + toilet.w) * 1;
  return floor + wallBase;
}

/**
 * Toilet full-height tiling area (sq ft).
 */
export function toiletWallTileArea(
  toilet: RoomSpec & Partial<ToiletFields>
): number {
  const tileHeight = toilet.tileHeight ?? 7;
  const perimeter = 2 * (toilet.l + toilet.w);
  return perimeter * tileHeight;
}

// =============================================================================
// JOINERY CALCULATIONS
// =============================================================================

/**
 * Main door count — 1 per floor.
 */
export function mainDoorCount(floors: FloorSpec[]): number {
  return floors.length;
}

/**
 * Internal door count — based on door openings in room specs.
 */
export function internalDoorCount(floors: FloorSpec[]): number {
  let count = 0;
  for (const floor of floors) {
    for (const room of floor.rooms) {
      count += room.openings
        .filter((o) => o.type === 'door')
        .reduce((s, o) => s + o.count, 0);
    }
  }
  return count;
}

/**
 * Aluminum window area (sq ft).
 */
export function aluminumWindowArea(floors: FloorSpec[]): number {
  let area = 0;
  for (const floor of floors) {
    for (const room of floor.rooms) {
      area += room.openings
        .filter((o) => o.type === 'window')
        .reduce((s, o) => s + o.width * o.height * o.count, 0);
    }
  }
  return area;
}

// =============================================================================
// QUALITY ADJUSTMENT
// =============================================================================

/**
 * Cost multiplier based on quality tier.
 */
export function qualityMultiplier(quality: QualityTier): number {
  switch (quality) {
    case 'economy':  return 0.75;
    case 'standard': return 1.0;
    case 'premium':  return 1.5;
  }
}

/**
 * Flooring rate per sq ft based on material.
 */
export function flooringRatePerSft(
  material: FlooringMaterial,
  quality: QualityTier
): number {
  const rates: Record<FlooringMaterial, number> = {
    ceramic_tiles:      80,
    porcelain_tiles:   150,
    vitrified_tiles:   200,
    mosaic:             60,
    kota_stone:        120,
    marble:            400,
    granite:           500,
    wooden_laminate:   180,
    vinyl:             100,
  };
  const baseRate = rates[material] ?? 100;
  return baseRate * qualityMultiplier(quality);
}

// =============================================================================
// AGGREGATION — FINISHING
// =============================================================================

/**
 * Calculate all finishing quantities for the project.
 */
export function calculateFinishing(
  floors: FloorSpec[],
  _flooringDefaults: Partial<Record<string, FlooringMaterial>>
): FinishingMaterials {
  let plasterInternalSft = 0;
  let plasterExternalSft = 0;
  let paintableAreaSft = 0;
  let skirtingRft = 0;
  let flooringSft = 0;
  let cabinetAreaSft = 0;
  let countertopSft = 0;

  for (const floor of floors) {
    for (const room of floor.rooms) {
      const area = floorArea(room);
      const plaster = netWallAreaInternal(room) * 2;
      const paint = paintableArea(room);

      plasterInternalSft += plaster;
      paintableAreaSft += paint;
      skirtingRft += skirtingLength(room);
      flooringSft += area;

      if (room.kind === 'kitchen') {
        cabinetAreaSft += cabinetArea(room as RoomSpec & Partial<KitchenFields>);
        countertopSft += countertopArea(room as RoomSpec & Partial<KitchenFields>);
      }
    }
  }

  return {
    plasterInternalSft: Math.round(plasterInternalSft),
    plasterExternalSft: Math.round(plasterExternalSft),
    paintableAreaSft: Math.round(paintableAreaSft),
    puttyBags: Math.ceil((paintableAreaSft * 2) / PUTTY_COVERAGE_SQFT),
    primerLiters: Math.ceil(paintableAreaSft / PRIMER_COVERAGE_SQFT),
    paintDrums: Math.ceil((paintableAreaSft * 2) / PAINT_DRUM_COVERAGE_SQFT),
    skirtingRft: Math.round(skirtingRft),
    flooringSft: Math.round(flooringSft),
    cabinetAreaSft: Math.round(cabinetAreaSft),
    countertopSft: Math.round(countertopSft),
  };
}
