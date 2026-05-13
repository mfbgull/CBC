/**
 * Specification Engine Types
 *
 * Room-based input model that generates BOQ line items.
 * Replaces manual entry with structured geometric input.
 *
 * Based on: Construction BOQ Calculator App Idea.md
 * - Room modules with L, W, H parameters
 * - Opening deductions for doors/windows
 * - Kitchen/Toilet specialized fields
 * - Foundation and substructure quantification
 * - MEP point-based estimation
 */

// =============================================================================
// ENUMS & LITERALS
// =============================================================================

/** Room functional type — triggers calculation logic per category */
export type RoomKind =
  | 'lounge'
  | 'bedroom'
  | 'kitchen'
  | 'toilet'
  | 'dining'
  | 'porch'
  | 'corridor'
  | 'carport'
  | 'store'
  | 'staircase'
  | 'passage';

export const ROOM_KIND_OPTIONS: Array<{ value: RoomKind; label: string; icon: string }> = [
  { value: 'bedroom', label: 'Bedroom', icon: '🛏️' },
  { value: 'lounge', label: 'Lounge / Living', icon: '📺' },
  { value: 'dining', label: 'Dining Area', icon: '🍽️' },
  { value: 'kitchen', label: 'Kitchen', icon: '🍳' },
  { value: 'toilet', label: 'Toilet / Bath', icon: '🚿' },
  { value: 'porch', label: 'Covered Porch', icon: '🚪' },
  { value: 'carport', label: 'Car Port', icon: '🚗' },
  { value: 'corridor', label: 'Corridor', icon: '🚶' },
  { value: 'store', label: 'Store Room', icon: '📦' },
  { value: 'staircase', label: 'Staircase', icon: '🪜' },
  { value: 'passage', label: 'Passage', icon: '➡️' },
];

/** Floor type for structural calculations */
export type FloorLevel = 'ground' | 'typical' | 'roof' | 'basement';

/** Wall thickness in inches */
export type WallThickness = 4.5 | 9;

/** Wall construction material */
export type WallMaterial =
  | 'brick'
  | 'aac_block'
  | 'solid_block'
  | 'stone'
  | 'mud'
  | 'rammed_earth';

export const WALL_MATERIAL_OPTIONS: Array<{ value: WallMaterial; label: string }> = [
  { value: 'brick', label: 'Clay Brick (9")' },
  { value: 'aac_block', label: 'AAC Block (Sand Block)' },
  { value: 'solid_block', label: 'Solid Cement Block' },
  { value: 'stone', label: 'Rubble Stone' },
  { value: 'mud', label: 'Mud / Adobe' },
  { value: 'rammed_earth', label: 'Rammed Earth' },
];

/** Structural framing system */
export type StructuralSystem = 'rcc_frame' | 'load_bearing' | 'steel_frame';

export const STRUCTURAL_SYSTEM_OPTIONS: Array<{ value: StructuralSystem; label: string }> = [
  { value: 'rcc_frame', label: 'RCC Frame (Columns + Beams)' },
  { value: 'load_bearing', label: 'Load Bearing (Walls Carry Load)' },
  { value: 'steel_frame', label: 'Steel Frame' },
];

/** Roof/ceiling structural type per floor */
export type RoofStructure =
  | 'rcc_slab'
  | 'rcc_beam_slab'
  | 'girder_jack_arch'
  | 'wooden_truss'
  | 'steel_truss';

export const ROOF_STRUCTURE_OPTIONS: Array<{ value: RoofStructure; label: string }> = [
  { value: 'rcc_slab', label: 'RCC Flat Slab' },
  { value: 'rcc_beam_slab', label: 'RCC Beam + Slab' },
  { value: 'girder_jack_arch', label: 'Steel Girders + Brick Arch (T-Iron)' },
  { value: 'wooden_truss', label: 'Wooden Truss' },
  { value: 'steel_truss', label: 'Steel Truss' },
];

/** Foundation type */
export type FoundationType = 'strip' | 'raft' | 'isolated';

/** MEP point types */
export type ElectricalPointType = 'light' | 'fan' | 'socket' | 'ac' | 'tv';
export type PlumbingPointType = 'tap' | 'shower' | 'geyser' | 'wc' | 'washbasin' | 'kitchen';

/** Finishing quality tiers */
export type QualityTier = 'economy' | 'standard' | 'premium';
export const QUALITY_TIER_OPTIONS: Array<{ value: QualityTier; label: string }> = [
  { value: 'economy', label: 'Economy' },
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
];

/** Countertop material for kitchens */
export type CounterMaterial = 'tiles' | 'granite' | 'marble' | 'engineered';
export const COUNTER_MATERIAL_OPTIONS: Array<{ value: CounterMaterial; label: string }> = [
  { value: 'tiles', label: 'Tiles' },
  { value: 'granite', label: 'Granite' },
  { value: 'marble', label: 'Marble' },
  { value: 'engineered', label: 'Engineered Stone' },
];

/** Flooring material options */
export type FlooringMaterial =
  | 'ceramic_tiles'
  | 'porcelain_tiles'
  | 'vitrified_tiles'
  | 'marble'
  | 'granite'
  | 'mosaic'
  | 'kota_stone'
  | 'wooden_laminate'
  | 'vinyl';
export const FLOORING_OPTIONS: Array<{ value: FlooringMaterial; label: string }> = [
  { value: 'ceramic_tiles', label: 'Ceramic Tiles' },
  { value: 'porcelain_tiles', label: 'Porcelain Tiles' },
  { value: 'vitrified_tiles', label: 'Vitrified Tiles' },
  { value: 'mosaic', label: 'Mosaic' },
  { value: 'kota_stone', label: 'Kota Stone' },
  { value: 'marble', label: 'Marble' },
  { value: 'granite', label: 'Granite' },
  { value: 'wooden_laminate', label: 'Wooden Laminate' },
  { value: 'vinyl', label: 'Vinyl' },
];

/** Paint type */
export type PaintType = 'distemper' | 'emulsion' | 'acrylic' | 'enamel';
export const PAINT_TYPE_OPTIONS: Array<{ value: PaintType; label: string }> = [
  { value: 'distemper', label: 'Distemper' },
  { value: 'emulsion', label: 'Emulsion' },
  { value: 'acrylic', label: 'Acrylic' },
  { value: 'enamel', label: 'Enamel' },
];

/** MEP fixture quality */
export type FixtureQuality = 'economy' | 'standard' | 'branded';
export const FIXTURE_QUALITY_OPTIONS: Array<{ value: FixtureQuality; label: string }> = [
  { value: 'economy', label: 'Economy' },
  { value: 'standard', label: 'Standard' },
  { value: 'branded', label: 'Branded' },
];

// =============================================================================
// OPENINGS
// =============================================================================

export interface Opening {
  id: string;
  type: 'door' | 'window' | 'vent';
  width: number;   // feet
  height: number;  // feet
  count: number;   // number of identical openings
}

export function openingArea(opening: Opening): number {
  return opening.width * opening.height * opening.count;
}

export function totalOpeningArea(openings: Opening[]): number {
  return openings.reduce((sum, o) => sum + openingArea(o), 0);
}

// =============================================================================
// ROOM SPEC
// =============================================================================

/** Kitchen-specific fields */
export interface KitchenFields {
  cabinetLower: number;   // running ft of lower cabinet
  cabinetUpper: number;  // running ft of upper cabinet
  counterMaterial: CounterMaterial;
  hasGasConnection: boolean;
  hasChimney: boolean;
  hasDishwasher: boolean;
}

/** Toilet-specific fields */
export interface ToiletFields {
  tileHeight: number;    // ft — full height or partial (e.g., 7ft)
  fixtureCount: number;  // number of wall mixers / fixture points
  hasShower: boolean;
  hasExhaustFan: boolean;
  wcType: 'indian' | 'western' | 'orissa';
}

/** Lounge / living room fields */
export interface LoungeFields {
  hasFalseCeiling: boolean;
  ceilingType: 'gypsum' | 'pvc' | 'wooden' | 'none';
}

/** Staircase fields */
export interface StaircaseFields {
  flightCount: number;   // number of flights
  treadCount: number;     // total treads
  hasRailing: boolean;
  railingMaterial: 'steel' | 'ss' | 'wooden';
}

/** Base room — all room types extend this */
export interface RoomSpecBase {
  id: string;
  name: string;
  kind: RoomKind;
  /** Dimensions in feet */
  l: number;  // length
  w: number;  // width
  h: number;  // height (clear height from floor to ceiling)
  /** Openings (doors, windows) — their area is deducted from wall area */
  openings: Opening[];
  /** Quality tier affects finishing rates */
  quality: QualityTier;
  /** Notes */
  notes?: string;
}

/** Discriminated union for room type-specific fields */
export type RoomSpec =
  | (RoomSpecBase & { kind: 'kitchen' } & Partial<KitchenFields>)
  | (RoomSpecBase & { kind: 'toilet' } & Partial<ToiletFields>)
  | (RoomSpecBase & { kind: 'lounge' } & Partial<LoungeFields>)
  | (RoomSpecBase & { kind: 'staircase' } & Partial<StaircaseFields>)
  | RoomSpecBase;  // all other kinds — no extra fields

/** Convenience: create a plain room */
export function createRoomSpec(
  name: string,
  kind: RoomKind,
  l: number,
  w: number,
  h: number,
  opts?: Partial<RoomSpecBase>
): RoomSpec {
  return {
    id: crypto.randomUUID(),
    name,
    kind,
    l,
    w,
    h,
    openings: opts?.openings ?? [],
    quality: opts?.quality ?? 'standard',
    notes: opts?.notes,
  };
}

// =============================================================================
// FLOOR SPEC
// =============================================================================

export interface FloorSpec {
  id: string;
  name: string;
  level: FloorLevel;
  rooms: RoomSpec[];
  /** Structural */
  slabThickness: number;   // inches — default 5"
  roofStructure: RoofStructure;
  wallMaterial: WallMaterial;
  wallThickness: WallThickness;
  /** Parapet (roof edge wall) */
  parapetPerimeter: number;  // ft
  parapetHeight: number;     // ft
  parapetThickness: WallThickness;
}

export function createFloorSpec(
  name: string,
  level: FloorLevel,
  rooms: RoomSpec[] = []
): FloorSpec {
  return {
    id: crypto.randomUUID(),
    name,
    level,
    rooms,
    slabThickness: 5,
    roofStructure: 'rcc_slab',
    wallMaterial: 'brick',
    wallThickness: 9,
    parapetPerimeter: 0,
    parapetHeight: 3,
    parapetThickness: 4.5,
  };
}

// =============================================================================
// FOUNDATION SPEC
// =============================================================================

export interface FoundationSpec {
  type: FoundationType;
  /** For strip footing */
  trenchWidth: number;    // ft
  trenchDepth: number;     // ft
  /** For raft */
  raftDepth: number;        // ft
  /** For all: Lean concrete */
  leanConcreteMix: '1:4:8' | '1:3:6';
  leanConcreteDepth: number;  // inches
  /** DPC */
  dpcDepth: number;        // inches (typically 1.5")
  /** Soil bearing capacity — from geotech report */
  soilBearingCapacity: number;  // kN/m²
  /** Excavation overdig factor */
  excavationFactor: number;  // multiplier (default 1.25 for overrun)
}

export const DEFAULT_FOUNDATION: FoundationSpec = {
  type: 'strip',
  trenchWidth: 3,
  trenchDepth: 5,
  raftDepth: 3,
  leanConcreteMix: '1:4:8',
  leanConcreteDepth: 4,
  dpcDepth: 1.5,
  soilBearingCapacity: 150,
  excavationFactor: 1.25,
};

// =============================================================================
// SITE SPEC
// =============================================================================

export interface SiteSpec {
  plotArea: number;         // sq ft
  buildingCoverage: number; // sq ft — total covered area
  /** Site preparation */
  soilType: 'normal' | 'soft' | 'rocky';
  hasBasement: boolean;
  basementDepth: number;     // ft
  /** Hidden / regulatory costs */
  includeMapApprovalFee: boolean;
  includeScrutinyFee: boolean;
  includeNocCharges: boolean;
  /** Safety */
  includeTermiteProofing: boolean;
  includeSecurity: boolean;
  /** Logistics */
  hasRiverBoulders: boolean;
  hasBrandedSteel: boolean;
  city: string;              // for MRS location factor
  quality: QualityTier;
}

export const DEFAULT_SITE: SiteSpec = {
  plotArea: 0,
  buildingCoverage: 0,
  soilType: 'normal',
  hasBasement: false,
  basementDepth: 8,
  includeMapApprovalFee: true,
  includeScrutinyFee: true,
  includeNocCharges: false,
  includeTermiteProofing: true,
  includeSecurity: true,
  hasRiverBoulders: false,
  hasBrandedSteel: false,
  city: 'Peshawar',
  quality: 'standard',
};

// =============================================================================
// MEP SPEC
// =============================================================================

export interface ElectricalSpec {
  lightPointsPerRoom: number;    // per standard room
  fanPointsPerRoom: number;
  socketPointsPerRoom: number;
  acUnits: number;                // 1.5 ton equivalent
  mainPanelAmps: number;         // e.g. 100A, 200A
  wiringQuality: 'standard' | 'premium';
  conduitType: 'PVC' | 'metal';
}

export interface PlumbingSpec {
  /** Wet points per fixture type */
  waterSupplyPoints: number;      // PPRC pipe points
  sewerPoints: number;            // UPVC pipe points
  geyserCount: number;
  pumpRequired: boolean;
  waterTankCapacity: number;      // gallons
  plumbingQuality: FixtureQuality;
}

export interface MEPSpec {
  electrical: ElectricalSpec;
  plumbing: PlumbingSpec;
}

export const DEFAULT_MEP: MEPSpec = {
  electrical: {
    lightPointsPerRoom: 4,
    fanPointsPerRoom: 2,
    socketPointsPerRoom: 6,
    acUnits: 0,
    mainPanelAmps: 100,
    wiringQuality: 'standard',
    conduitType: 'PVC',
  },
  plumbing: {
    waterSupplyPoints: 8,
    sewerPoints: 4,
    geyserCount: 2,
    pumpRequired: false,
    waterTankCapacity: 500,
    plumbingQuality: 'standard',
  },
};

// =============================================================================
// SPEC AGGREGATE — full project specification
// =============================================================================

export interface ProjectSpec {
  id: string;
  name: string;
  location: string;
  floors: FloorSpec[];
  structuralSystem: StructuralSystem;
  foundation: FoundationSpec;
  mep: MEPSpec;
  site: SiteSpec;
  /** Flooring selections per room kind — can be overridden per room */
  flooringDefaults: Record<RoomKind, FlooringMaterial>;
  paintType: PaintType;
  /** Overall wastage factor % */
  wastageFactor: number;
}

// =============================================================================
// CALCULATION RESULTS — outputs from the engine
// =============================================================================

/** Material quantities from grey structure */
export interface GreyStructureMaterials {
  /** Bricks — total number */
  bricks: number;
  /** Cement bags (50kg) */
  cementBags: number;
  /** Sand — cubic ft */
  sandCuFt: number;
  /** Crush — cubic ft */
  crushCuFt: number;
  /** Steel — kg */
  steelKg: number;
  /** Steel — tons (for display) */
  steelTon: number;
  /** Mortar volume — cubic ft */
  mortarCuFt: number;
  /** Lean concrete — cubic ft */
  leanConcreteCuFt: number;
  /** PCC (floor bed) — cubic ft */
  pccCuFt: number;
  /** Excavation — cubic ft */
  excavationCuFt: number;
}

/** Finishing quantities */
export interface FinishingMaterials {
  /** Internal plaster — sq ft */
  plasterInternalSft: number;
  /** External plaster — sq ft */
  plasterExternalSft: number;
  /** Paintable area — sq ft (2 coats primer + 2 coats) */
  paintableAreaSft: number;
  /** Putty bags */
  puttyBags: number;
  /** Primer liters */
  primerLiters: number;
  /** Paint drums (18L) */
  paintDrums: number;
  /** Skirting length — running ft */
  skirtingRft: number;
  /** Flooring — sq ft */
  flooringSft: number;
  /** Kitchen cabinet area — sq ft */
  cabinetAreaSft: number;
  /** Granite/marble countertop — sq ft */
  countertopSft: number;
}

/** MEP quantities */
export interface MEPMaterials {
  /** Total light points */
  lightPoints: number;
  /** Total fan points */
  fanPoints: number;
  /** Total socket points */
  socketPoints: number;
  /** AC units */
  acUnits: number;
  /** PVC conduit — running ft */
  conduitRft: number;
  /** Wiring — sq ft coverage (proxy) */
  wiringSft: number;
  /** PPRC water supply — running ft */
  pprcRft: number;
  /** UPVC sewer — running ft */
  upvcRft: number;
  /** Geyser count */
  geyserCount: number;
}

/** Door/Window quantities */
export interface JoineryMaterials {
  /** Main door count (wooden) */
  mainDoors: number;
  /** Internal door count */
  internalDoors: number;
  /** Window count */
  windows: number;
  /** Aluminum windows — sq ft */
  aluminumWindowsSft: number;
  /** Glass — sq ft */
  glassSft: number;
}

/** Summary for a single room */
export interface RoomCalculation {
  room: RoomSpec;
  floorArea: number;         // sq ft
  wallArea: number;           // sq ft (with opening deductions)
  openingArea: number;       // sq ft (deducted)
  netWallArea: number;        // sq ft
  ceilingArea: number;       // sq ft
  perimeter: number;          // ft
  // Materials
  bricks: number;
  cementBags: number;
  plasterInternalSft: number;
  flooringSft: number;
  skirtingRft: number;
  paintableAreaSft: number;
  // MEP
  lightPoints: number;
  fanPoints: number;
  socketPoints: number;
  // Cost estimate (rough — rates applied later)
  greyCost: number;
  finishingCost: number;
  mepCost: number;
  joineryCost: number;
  roomTotal: number;
}

/** Full project calculation output */
export interface ProjectCalculation {
  spec: ProjectSpec;
  /** Per-floor, per-room breakdown */
  rooms: RoomCalculation[];
  /** Aggregated materials */
  grey: GreyStructureMaterials;
  finishing: FinishingMaterials;
  mep: MEPMaterials;
  joinery: JoineryMaterials;
  /** Cost by section */
  greyCost: number;
  finishingCost: number;
  mepCost: number;
  joineryCost: number;
  foundationCost: number;
  siteCost: number;
  /** Grand total (before tax/margin — those are handled at BOQ level) */
  totalMaterialCost: number;
  /** Per sq ft metrics */
  totalBuiltUpArea: number;
  unitCostPerSft: number;
}
