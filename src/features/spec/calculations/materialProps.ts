/**
 * Material Properties Lookup Table
 *
 * Maps each WallMaterial to its construction quantities.
 * Pure data — no side effects, no runtime computation.
 *
 * Wall unit dimensions (standard):
 *   Brick:       9"×4.5"×3"   → 13.5 pcs per sqft of 9" wall (with 0.5" mortar)
 *   AAC Block:   24"×8"×8"    → 0.75 blocks per sqft of 8" wall
 *   Solid Block: 16"×8"×8"    → 1.125 blocks per sqft of 8" wall
 *   Stone:       varies       → ~1.2 cu ft per sqft of 18" wall
 *   Mud/Adobe:   18"×6"×6"    → ~0.67 blocks per sqft of 18" wall
 */

import type { WallMaterial, StructuralSystem, RoofStructure } from '../types';

// =============================================================================
// WALL MATERIAL PROPERTIES
// =============================================================================

export interface WallMaterialProps {
  label: string;
  /** Units (bricks/blocks) per sqft of standard thickness wall */
  unitsPerSqft: number;
  /** Label for the unit */
  unitLabel: string;
  /** Standard wall thickness in inches this is based on */
  standardThicknessInches: number;
  /** Cement bags per 100 units of wall material (mortar) */
  cementBagsPer100: number;
  /** Sand cu ft per 100 units of wall material (mortar) */
  sandCuftPer100: number;
  /** Crush cu ft per 100 units (for concrete block fill if applicable) */
  crushCuftPer100: number;
  /** Cement bags per sqft of plaster on this wall type */
  plasterCementPerSqft: number;
  /** Sand cu ft per sqft of plaster */
  plasterSandPerSqft: number;
  /** Whether this wall type receives cement plaster */
  needsCementPlaster: boolean;
  /** Steel kg per sqft of wall (for lintels in load-bearing) */
  steelKgPerSqftWall: number;
  /** Weight multiplier for foundation sizing (relative to brick=1.0) */
  foundationLoadFactor: number;
  /** Labor rate multiplier (relative to brick=1.0) */
  laborMultiplier: number;
}

export const WALL_MATERIAL_PROPS: Record<WallMaterial, WallMaterialProps> = {
  brick: {
    label: 'Clay Brick',
    unitsPerSqft: 10.125,           // 13.5 × 0.75 (for 9" wall with mortar)
    unitLabel: 'pcs',
    standardThicknessInches: 9,
    cementBagsPer100: 1.0,          // 1 bag per 100 bricks (1:4 mortar)
    sandCuftPer100: 4.5,            // sand for mortar per 100 bricks
    crushCuftPer100: 0,
    plasterCementPerSqft: 1 / 50,   // 1 bag per 50 sqft (1:4, 0.5" thick)
    plasterSandPerSqft: 0.12,       // sand for plaster per sqft
    needsCementPlaster: true,
    steelKgPerSqftWall: 0.15,       // lintel steel for load-bearing
    foundationLoadFactor: 1.0,
    laborMultiplier: 1.0,
  },

  aac_block: {
    label: 'AAC Block',
    unitsPerSqft: 0.75,             // 1 block covers ~1.33 sqft of 8" wall
    unitLabel: 'blocks',
    standardThicknessInches: 8,
    cementBagsPer100: 0.5,          // thinner joints, less mortar
    sandCuftPer100: 2.5,
    crushCuftPer100: 0,
    plasterCementPerSqft: 1 / 60,   // AAC needs 6mm plaster (thinner)
    plasterSandPerSqft: 0.08,
    needsCementPlaster: true,
    steelKgPerSqftWall: 0.08,       // lighter material, smaller lintels
    foundationLoadFactor: 0.6,      // much lighter than brick
    laborMultiplier: 0.9,           // faster to lay
  },

  solid_block: {
    label: 'Solid Cement Block',
    unitsPerSqft: 1.125,
    unitLabel: 'blocks',
    standardThicknessInches: 8,
    cementBagsPer100: 0.8,
    sandCuftPer100: 3.5,
    crushCuftPer100: 0,
    plasterCementPerSqft: 1 / 50,
    plasterSandPerSqft: 0.12,
    needsCementPlaster: true,
    steelKgPerSqftWall: 0.12,
    foundationLoadFactor: 1.1,      // slightly heavier than brick
    laborMultiplier: 1.0,
  },

  stone: {
    label: 'Rubble Stone',
    unitsPerSqft: 0,                // not unit-based, measured by volume
    unitLabel: 'cu ft',
    standardThicknessInches: 18,
    cementBagsPer100: 0,            // calculated by volume, not units
    sandCuftPer100: 0,
    crushCuftPer100: 5.5,           // rubble fill uses crush
    plasterCementPerSqft: 1 / 45,   // thicker plaster for uneven surface
    plasterSandPerSqft: 0.15,
    needsCementPlaster: true,
    steelKgPerSqftWall: 0,
    foundationLoadFactor: 2.5,      // very heavy
    laborMultiplier: 2.0,           // skilled masons needed
  },

  mud: {
    label: 'Mud / Adobe',
    unitsPerSqft: 0,                // measured by volume
    unitLabel: 'cu ft',
    standardThicknessInches: 18,
    cementBagsPer100: 0,            // no cement in mud walls
    sandCuftPer100: 0,
    crushCuftPer100: 0,
    plasterCementPerSqft: 0,        // mud plaster, no cement
    plasterSandPerSqft: 0,
    needsCementPlaster: false,       // mud plaster instead
    steelKgPerSqftWall: 0,
    foundationLoadFactor: 1.8,
    laborMultiplier: 0.6,            // unskilled labor can build
  },

  rammed_earth: {
    label: 'Rammed Earth',
    unitsPerSqft: 0,                // measured by volume
    unitLabel: 'cu ft',
    standardThicknessInches: 18,
    cementBagsPer100: 0.3,          // small amount for stabilization
    sandCuftPer100: 2.0,
    crushCuftPer100: 0,
    plasterCementPerSqft: 0,        // can be left exposed or lime plaster
    plasterSandPerSqft: 0,
    needsCementPlaster: false,
    steelKgPerSqftWall: 0,
    foundationLoadFactor: 1.5,
    laborMultiplier: 1.5,           // labor-intensive process
  },
};

// =============================================================================
// STRUCTURAL SYSTEM PROPERTIES
// =============================================================================

export interface StructuralSystemProps {
  label: string;
  /** Steel kg per sqft of slab/floor area */
  steelKgPerSqftSlab: number;
  /** Steel kg per running ft of beam */
  steelKgPerRftBeam: number;
  /** Steel kg per running ft of column */
  steelKgPerRftColumn: number;
  /** Concrete cu ft per sqft of floor (columns + beams) */
  concreteCuftPerSqft: number;
  /** Foundation type preference */
  defaultFoundation: 'strip' | 'isolated' | 'raft';
}

export const STRUCTURAL_SYSTEM_PROPS: Record<StructuralSystem, StructuralSystemProps> = {
  rcc_frame: {
    label: 'RCC Frame',
    steelKgPerSqftSlab: 1.1,
    steelKgPerRftBeam: 1.75,
    steelKgPerRftColumn: 2.75,
    concreteCuftPerSqft: 0.5,
    defaultFoundation: 'isolated',
  },

  load_bearing: {
    label: 'Load Bearing',
    steelKgPerSqftSlab: 1.1,       // same slab steel
    steelKgPerRftBeam: 0,          // no beams — walls carry load
    steelKgPerRftColumn: 0,        // no columns
    concreteCuftPerSqft: 0.15,     // only lintels + roof band
    defaultFoundation: 'strip',
  },

  steel_frame: {
    label: 'Steel Frame',
    steelKgPerSqftSlab: 1.1,       // deck slab on steel
    steelKgPerRftBeam: 0,          // steel beams accounted separately
    steelKgPerRftColumn: 0,
    concreteCuftPerSqft: 0.2,      // only floor slabs
    defaultFoundation: 'isolated',
  },
};

// =============================================================================
// ROOF STRUCTURE PROPERTIES
// =============================================================================

export interface RoofStructureProps {
  label: string;
  /** Steel kg per sqft of roof area */
  steelKgPerSqft: number;
  /** Concrete cu ft per sqft of roof area */
  concreteCuftPerSqft: number;
  /** Brick pcs per sqft of roof area (for jack arch) */
  bricksPerSqft: number;
  /** Wood cu ft per sqft of roof area (for trusses) */
  woodCuftPerSqft: number;
}

export const ROOF_STRUCTURE_PROPS: Record<RoofStructure, RoofStructureProps> = {
  rcc_slab: {
    label: 'RCC Flat Slab',
    steelKgPerSqft: 1.1,
    concreteCuftPerSqft: 0.42,     // 5" slab / 12 = 0.42 ft
    bricksPerSqft: 0,
    woodCuftPerSqft: 0,
  },

  rcc_beam_slab: {
    label: 'RCC Beam + Slab',
    steelKgPerSqft: 1.5,           // more steel for beams + slab
    concreteCuftPerSqft: 0.58,     // 5" slab + 9" beams (average)
    bricksPerSqft: 0,
    woodCuftPerSqft: 0,
  },

  girder_jack_arch: {
    label: 'Steel Girders + Brick Arch',
    steelKgPerSqft: 0.4,           // only steel girders
    concreteCuftPerSqft: 0.1,      // concrete on girders
    bricksPerSqft: 20,             // brick arch between girders
    woodCuftPerSqft: 0,
  },

  wooden_truss: {
    label: 'Wooden Truss',
    steelKgPerSqft: 0.05,          // only connectors/nails
    concreteCuftPerSqft: 0,
    bricksPerSqft: 0,
    woodCuftPerSqft: 0.15,         // truss timber volume
  },

  steel_truss: {
    label: 'Steel Truss',
    steelKgPerSqft: 2.5,           // truss + purlins
    concreteCuftPerSqft: 0,
    bricksPerSqft: 0,
    woodCuftPerSqft: 0.02,         // only if timber purlins
  },
};
