/**
 * Specification Validation Layer
 *
 * Pure validation functions that check room/floor/spec integrity.
 * All functions are deterministic and side-effect free.
 */

import type {
  ProjectSpec,
  FloorSpec,
  RoomSpec,
  Opening,
} from './types';

// =============================================================================
// RESULT TYPE
// =============================================================================

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  path: string;
  severity: ValidationSeverity;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

function createResult(issues: ValidationIssue[]): ValidationResult {
  return {
    valid: issues.every((i) => i.severity !== 'error'),
    issues,
    errors: issues.filter((i) => i.severity === 'error'),
    warnings: issues.filter((i) => i.severity === 'warning'),
  };
}

// =============================================================================
// OPENING VALIDATION
// =============================================================================

export function validateOpenings(
  openings: Opening[],
  wallArea: number,
  path: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const o of openings) {
    if (o.width <= 0) {
      issues.push({
        path: `${path}/openings/${o.id}/width`,
        severity: 'error',
        message: `Opening width must be positive, got ${o.width}`,
      });
    }
    if (o.height <= 0) {
      issues.push({
        path: `${path}/openings/${o.id}/height`,
        severity: 'error',
        message: `Opening height must be positive, got ${o.height}`,
      });
    }
    if (o.count < 1) {
      issues.push({
        path: `${path}/openings/${o.id}/count`,
        severity: 'error',
        message: `Opening count must be at least 1, got ${o.count}`,
      });
    }
  }

  if (wallArea > 0) {
    const totalOpenArea = openings.reduce(
      (sum, o) => sum + o.width * o.height * o.count,
      0
    );
    if (totalOpenArea > wallArea * 0.8) {
      issues.push({
        path: `${path}/openings`,
        severity: 'warning',
        message: `Total opening area (${totalOpenArea.toFixed(1)} sqft) exceeds 80% of wall area (${wallArea.toFixed(1)} sqft)`,
      });
    }
  }

  return issues;
}

// =============================================================================
// ROOM VALIDATION
// =============================================================================

export function validateRoom(room: RoomSpec, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!room.name.trim()) {
    issues.push({
      path: `${path}/name`,
      severity: 'error',
      message: 'Room name is required',
    });
  }

  if (room.l <= 0) {
    issues.push({
      path: `${path}/l`,
      severity: 'error',
      message: `Room length must be positive, got ${room.l}`,
    });
  }

  if (room.w <= 0) {
    issues.push({
      path: `${path}/w`,
      severity: 'error',
      message: `Room width must be positive, got ${room.w}`,
    });
  }

  if (room.h <= 0) {
    issues.push({
      path: `${path}/h`,
      severity: 'error',
      message: `Room height must be positive, got ${room.h}`,
    });
  }

  if (room.l > 100) {
    issues.push({
      path: `${path}/l`,
      severity: 'warning',
      message: `Unusually large room length: ${room.l} ft`,
    });
  }

  if (room.w > 100) {
    issues.push({
      path: `${path}/w`,
      severity: 'warning',
      message: `Unusually large room width: ${room.w} ft`,
    });
  }

  if (room.h > 20) {
    issues.push({
      path: `${path}/h`,
      severity: 'warning',
      message: `Unusually large room height: ${room.h} ft (typical max 12-14 ft)`,
    });
  }

  // Validate openings
  const wallArea = 2 * (room.l + room.w) * room.h;
  issues.push(...validateOpenings(room.openings, wallArea, path));

  return issues;
}

// =============================================================================
// FLOOR VALIDATION
// =============================================================================

export function validateFloor(floor: FloorSpec, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!floor.name.trim()) {
    issues.push({
      path: `${path}/name`,
      severity: 'error',
      message: 'Floor name is required',
    });
  }

  if (floor.slabThickness <= 0) {
    issues.push({
      path: `${path}/slabThickness`,
      severity: 'error',
      message: `Slab thickness must be positive, got ${floor.slabThickness}`,
    });
  }

  if (floor.parapetPerimeter > 0 && floor.parapetHeight <= 0) {
    issues.push({
      path: `${path}/parapetHeight`,
      severity: 'warning',
      message: 'Parapet perimeter set but height is zero',
    });
  }

  // Validate all rooms in floor
  for (let i = 0; i < floor.rooms.length; i++) {
    const roomIssues = validateRoom(floor.rooms[i], `${path}/rooms[${i}]`);
    issues.push(...roomIssues);
  }

  return issues;
}

// =============================================================================
// SPEC VALIDATION
// =============================================================================

export interface SpecValidationOptions {
  checkCostWarnings?: boolean;
  checkCompletion?: boolean;
}

export function validateSpec(
  spec: ProjectSpec,
  options?: SpecValidationOptions
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const opts = { checkCostWarnings: true, checkCompletion: true, ...options };

  // Check floors
  if (spec.floors.length === 0) {
    issues.push({
      path: '/floors',
      severity: 'error',
      message: 'Specification must have at least one floor',
    });
  }

  // Validate each floor
  for (let i = 0; i < spec.floors.length; i++) {
    const floorIssues = validateFloor(spec.floors[i], `/floors[${i}]`);
    issues.push(...floorIssues);

    // Check for duplicate room names within a floor
    const roomNames = spec.floors[i].rooms.map((r) => r.name.trim().toLowerCase());
    const duplicates = roomNames.filter(
      (name, idx) => name && roomNames.indexOf(name) !== idx
    );
    if (duplicates.length > 0) {
      issues.push({
        path: `/floors[${i}]/rooms`,
        severity: 'warning',
        message: `Duplicate room names found: ${[...new Set(duplicates)].join(', ')}`,
      });
    }
  }

  // Check total rooms
  if (opts.checkCompletion) {
    const totalRooms = spec.floors.reduce((sum, f) => sum + f.rooms.length, 0);
    if (totalRooms === 0) {
      issues.push({
        path: '/floors',
        severity: 'warning',
        message: 'No rooms added to any floor — BOQ generation will produce zero items',
      });
    }

    if (!spec.location.trim()) {
      issues.push({
        path: '/location',
        severity: 'warning',
        message: 'Project location is not specified — may affect rate lookups',
      });
    }
  }

  return createResult(issues);
}
