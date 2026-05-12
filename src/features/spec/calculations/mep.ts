/**
 * MEP Calculation Engine — Pure Functions
 *
 * Mechanical, Electrical, and Plumbing estimation.
 * Point-based system per room type.
 *
 * All functions are deterministic and side-effect free.
 *
 * Formulas based on: Construction BOQ Calculator App Idea.md
 * References: [7, 23, 28, 30, 43]
 */

import type {
  RoomSpec,
  FloorSpec,
  MEPSpec,
  MEPMaterials,
} from '../types';

// =============================================================================
// CONSTANTS — MEP Thumb Rules
// =============================================================================

/** Base cost per light point (PKR) — conduit + wiring + switch */
const COST_PER_LIGHT_POINT = 2500;

/** Cost per fan point (PKR) */
const COST_PER_FAN_POINT = 2000;

/** Cost per socket point (PKR) */
const COST_PER_SOCKET_POINT = 1500;

/** Cost per AC unit (PKR) — 1.5 ton equivalent */
const COST_PER_AC_UNIT = 45000;

/** Cost per running ft of PPRC water pipe */
const COST_PER_PPRC_RFT = 180;

/** Cost per running ft of UPVC sewer pipe */
const COST_PER_UPVC_RFT = 120;

/** Cost per running ft of PVC conduit */
const COST_PER_CONDUIT_RFT = 80;

/** Cost per geyser (installation + unit) */
const COST_PER_GEYSER = 35000;

/** Wet point cost (wall mixer, tap connection) */
const COST_PER_WET_POINT = 12000;

// =============================================================================
// ROOM TYPE → POINT COUNTS
// =============================================================================

/**
 * Default MEP point counts by room type.
 * These can be overridden via MEPSpec.
 */
interface RoomPoints {
  light: number;
  fan: number;
  socket: number;
  ac: number;
  wetPoints: number;
}

const DEFAULT_POINTS: Record<string, RoomPoints> = {
  bedroom:    { light: 2, fan: 2, socket: 4, ac: 1, wetPoints: 0 },
  lounge:     { light: 3, fan: 2, socket: 6, ac: 1, wetPoints: 0 },
  dining:     { light: 2, fan: 1, socket: 3, ac: 0, wetPoints: 0 },
  kitchen:    { light: 4, fan: 1, socket: 5, ac: 0, wetPoints: 3 },
  toilet:     { light: 2, fan: 1, socket: 1, ac: 0, wetPoints: 4 },
  porch:      { light: 1, fan: 0, socket: 1, ac: 0, wetPoints: 0 },
  carport:    { light: 1, fan: 0, socket: 0, ac: 0, wetPoints: 0 },
  corridor:   { light: 1, fan: 0, socket: 1, ac: 0, wetPoints: 0 },
  store:      { light: 1, fan: 0, socket: 2, ac: 0, wetPoints: 0 },
  staircase:  { light: 1, fan: 0, socket: 0, ac: 0, wetPoints: 0 },
  passage:    { light: 1, fan: 0, socket: 1, ac: 0, wetPoints: 0 },
};

/**
 * Get point counts for a room.
 * Overrideable per MEPSpec.
 */
export function roomMEPPoints(
  room: RoomSpec,
  spec: MEPSpec
): RoomPoints {
  const defaults = DEFAULT_POINTS[room.kind] ?? DEFAULT_POINTS.bedroom;

  return {
    light: spec.electrical.lightPointsPerRoom || defaults.light,
    fan: spec.electrical.fanPointsPerRoom || defaults.fan,
    socket: spec.electrical.socketPointsPerRoom || defaults.socket,
    ac: defaults.ac, // AC count per room is fixed by defaults
    wetPoints: defaults.wetPoints,
  };
}

/**
 * Total MEP points for all rooms.
 */
export function totalMEPPoints(
  floors: FloorSpec[],
  spec: MEPSpec
): { light: number; fan: number; socket: number; ac: number; wetPoints: number } {
  let light = 0;
  let fan = 0;
  let socket = 0;
  let ac = 0;
  let wetPoints = 0;

  for (const floor of floors) {
    for (const room of floor.rooms) {
      const pts = roomMEPPoints(room, spec);
      light += pts.light;
      fan += pts.fan;
      socket += pts.socket;
      ac += pts.ac;
      wetPoints += pts.wetPoints;
    }
  }

  return { light, fan, socket, ac, wetPoints };
}

// =============================================================================
// COST ESTIMATES
// =============================================================================

/**
 * Rough conduit length estimate.
 * Rule: conduit ≈ 2× floor area (run to DB + drops)
 */
export function conduitLengthRft(buildingAreaSqFt: number): number {
  return buildingAreaSqFt * 2;
}

/**
 * Rough PPRC water supply pipe length (running ft).
 * Rule: ~2× wet points × 10 ft per point
 */
export function pprcWaterLengthRft(totalWetPoints: number): number {
  return totalWetPoints * 20;
}

/**
 * Rough UPVC sewer pipe length (running ft).
 * Rule: ~1.5× wet points × 8 ft per point
 */
export function upvcSewerLengthRft(totalWetPoints: number): number {
  return totalWetPoints * 12;
}

/**
 * Calculate rough MEP cost for a room (PKR).
 * Rates use default thumb-rule costs.
 */
export function roomMEPCost(
  room: RoomSpec,
  spec: MEPSpec
): number {
  const pts = roomMEPPoints(room, spec);
  const electricalCost =
    pts.light * COST_PER_LIGHT_POINT +
    pts.fan * COST_PER_FAN_POINT +
    pts.socket * COST_PER_SOCKET_POINT +
    pts.ac * COST_PER_AC_UNIT;

  const plumbingCost =
    pts.wetPoints * COST_PER_WET_POINT;

  return electricalCost + plumbingCost;
}

// =============================================================================
// AGGREGATION — MEP
// =============================================================================

/**
 * Calculate all MEP quantities for the project.
 * Building area is passed in for conduit estimation.
 */
export function calculateMEP(
  floors: FloorSpec[],
  spec: MEPSpec,
  buildingAreaSqFt: number
): MEPMaterials {
  const points = totalMEPPoints(floors, spec);
  const conduit = conduitLengthRft(buildingAreaSqFt);
  const pprc = pprcWaterLengthRft(points.wetPoints);
  const upvc = upvcSewerLengthRft(points.wetPoints);

  return {
    lightPoints: points.light,
    fanPoints: points.fan,
    socketPoints: points.socket,
    acUnits: points.ac,
    conduitRft: Math.round(conduit),
    wiringSft: buildingAreaSqFt, // proxy for wiring coverage
    pprcRft: Math.round(pprc),
    upvcRft: Math.round(upvc),
    geyserCount: spec.plumbing.geyserCount,
  };
}

// =============================================================================
// MEP cost by category
// =============================================================================

/**
 * Rough electrical system cost (PKR).
 * Includes conduit, wiring, switches, DB.
 */
export function electricalSystemCost(
  lightPoints: number,
  fanPoints: number,
  socketPoints: number,
  acUnits: number,
  conduitRft: number
): number {
  return (
    lightPoints * COST_PER_LIGHT_POINT +
    fanPoints * COST_PER_FAN_POINT +
    socketPoints * COST_PER_SOCKET_POINT +
    acUnits * COST_PER_AC_UNIT +
    conduitRft * COST_PER_CONDUIT_RFT
  );
}

/**
 * Rough plumbing system cost (PKR).
 * Includes pipes, fittings, fixtures.
 */
export function plumbingSystemCost(
  pprcRft: number,
  upvcRft: number,
  geyserCount: number,
  wetPoints: number
): number {
  return (
    pprcRft * COST_PER_PPRC_RFT +
    upvcRft * COST_PER_UPVC_RFT +
    geyserCount * COST_PER_GEYSER +
    wetPoints * COST_PER_WET_POINT
  );
}

/**
 * Total MEP cost for the project.
 */
export function totalMEPCost(
  floors: FloorSpec[],
  spec: MEPSpec,
  buildingAreaSqFt: number
): number {
  const points = totalMEPPoints(floors, spec);
  const conduit = conduitLengthRft(buildingAreaSqFt);

  const electrical = electricalSystemCost(
    points.light,
    points.fan,
    points.socket,
    points.ac,
    Math.round(conduit)
  );

  const plumbing = plumbingSystemCost(
    pprcWaterLengthRft(points.wetPoints),
    upvcSewerLengthRft(points.wetPoints),
    spec.plumbing.geyserCount,
    points.wetPoints
  );

  return electrical + plumbing;
}
