/**
 * Wall Entity Model - Specification
 * 
 * This file contains the specification/documentation for the Wall Entity Model.
 * Actual tests should be run in a Vitest environment.
 * 
 * See tests in: src/features/walls/__tests__/ (when Vitest is configured)
 */

// =============================================================================
// WALL ENTITY MODEL SPECIFICATION
// =============================================================================

/**
 * Core Principles:
 * 
 * 1. A wall is stored ONCE and referenced by both adjacent spaces
 * 2. Each wall has two independent faces (face_a and face_b)
 * 3. Each face has its own finish type, openings, and BOQ contribution
 * 4. Shared walls never double-count in the total BOQ
 * 5. NO 50% split — each face owns its finish independently
 * 
 * Key Rules:
 * 
 * - External walls: face_b is 'external' space type
 * - Open/void: face_b is 'open' space type  
 * - Unlinked rooms: face_b has space_type='room' but room_id=null
 * - When a room is deleted, convert its face to 'external' (don't delete wall)
 * - Each face calculates its own net area: gross - openings
 */

// =============================================================================
// EXAMPLE USAGE
// =============================================================================

/**
 * Example 1: Room with 4 walls (3 shared, 1 external)
 * 
 * Room "Master Bedroom" has:
 * - North wall: external
 * - East wall: shared with Kitchen
 * - South wall: shared with Corridor
 * - West wall: shared with Room B
 * 
 * Total paint area for Master Bedroom:
 * - All 4 walls contribute to Master Bedroom's BOQ
 * - Each wall's face A contributes FULL net area
 * - No splitting, no double counting
 * 
 * Total: (W-N + W-E + W-S + W-W) × height = net areas
 */

/**
 * Example 2: Room sharing 3 sides
 * 
 * Room "Study Room" has:
 * - Side 1: empty (open to space, no wall)
 * - Side 2: Kitchen (shared wall)
 * - Side 3: Corridor (shared wall)  
 * - Side 4: Another Room (shared wall)
 * 
 * BOQ contribution:
 * - Side 1: 0 (no wall, no finish)
 * - Side 2-4: Full net area of each shared wall
 */

/**
 * Example 3: Door in shared wall
 * 
 * Shared wall between Room A and Room B has a door on Room A's side.
 * 
 * - Room A's face (face A): net area = gross - door opening
 * - Room B's face (face B): net area = gross (no door deduction)
 * 
 * Both faces get their own independent calculation.
 */

// =============================================================================
// DATABASE SCHEMA
// =============================================================================

/**
 * SQLite tables:
 * 
 * walls
 *   id             TEXT PRIMARY KEY
 *   project_id     TEXT NOT NULL
 *   label          TEXT
 *   length         REAL NOT NULL
 *   height         REAL NOT NULL
 *   created_at     TEXT DEFAULT (datetime('now'))
 * 
 * wall_faces
 *   id             TEXT PRIMARY KEY
 *   wall_id        TEXT NOT NULL REFERENCES walls(id) ON DELETE CASCADE
 *   face_side      TEXT NOT NULL ('a' or 'b')
 *   space_type     TEXT NOT NULL
 *   room_id        TEXT REFERENCES rooms(id)
 *   finish_type    TEXT
 *   tile_height    REAL
 * 
 * wall_openings
 *   id             TEXT PRIMARY KEY
 *   face_id        TEXT NOT NULL REFERENCES wall_faces(id) ON DELETE CASCADE
 *   opening_type   TEXT NOT NULL ('door' | 'window' | 'archway')
 *   width          REAL NOT NULL
 *   height         REAL NOT NULL
 *   quantity       INTEGER DEFAULT 1
 * 
 * room_walls
 *   room_id        TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE
 *   wall_id        TEXT NOT NULL REFERENCES walls(id) ON DELETE CASCADE
 *   compass_side   TEXT
 *   PRIMARY KEY (room_id, wall_id)
 */

// =============================================================================
// CALCULATION FORMULAS
// =============================================================================

/**
 * Gross wall area: length × height
 * Net wall area: gross - Σ(opening.width × opening.height × quantity)
 * Skirting: length - Σ(door.width × quantity)
 * 
 * Paint area: sum of net areas for all faces with finishType='paint'
 * Plaster only: sum of net areas for faces with finishType='plaster_only'
 * Tiles: sum of net areas for faces with finishType='tiles'
 */

// =============================================================================
// EDGE CASES
// =============================================================================

/**
 * A. Partial sharing: OUT OF SCOPE for v1.0
 *    Full wall length is always shared between two spaces.
 *    Partial segment support tracked in: https://github.com/.../issues/partial-sharing
 */

/**
 * DO NOT:
 * - Apply 50% area split to either face
 * - Store finish area as a static field (always derive from wall + openings)
 * - Allow a wall without at least face_a assigned
 * - Duplicate the wall record for the other room
 */