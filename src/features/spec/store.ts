import { create } from 'zustand';
import type {
  ProjectSpec,
  FloorSpec,
  RoomSpec,
  FoundationSpec,
  SiteSpec,
  MEPSpec,
  ProjectCalculation,
  RoomKind,
  FlooringMaterial,
  PaintType,
  StructuralSystem,
} from './types';
import { calculateProject, generateBOQItems } from './calculations';
import type { BoqItemCreateInput } from '../../types/domain';
import { logger } from '../../lib/logger';

// =============================================================================
// CALCULATION CACHE
// =============================================================================

interface CalcCacheEntry {
  hash: string;
  result: ProjectCalculation;
}

const calcCache = new Map<string, CalcCacheEntry>();
const MAX_CACHE_SIZE = 10;

function specHash(spec: ProjectSpec): string {
  return JSON.stringify(spec);
}

function getCachedCalculation(spec: ProjectSpec): ProjectCalculation | null {
  const hash = specHash(spec);
  const entry = calcCache.get(hash);
  if (entry) return entry.result;
  return null;
}

function setCachedCalculation(spec: ProjectSpec, result: ProjectCalculation): void {
  const hash = specHash(spec);
  // Evict oldest entry if at capacity
  if (calcCache.size >= MAX_CACHE_SIZE) {
    const firstKey = calcCache.keys().next().value;
    if (firstKey) calcCache.delete(firstKey);
  }
  calcCache.set(hash, { hash, result });
}

/**
 * Run calculation with cache lookup. Falls back to synchronous calc on cache miss.
 */
function runCalculation(spec: ProjectSpec): ProjectCalculation {
  const cached = getCachedCalculation(spec);
  if (cached) return cached;

  if (import.meta.env.DEV) {
    console.time('calculateProject');
  }
  const result = calculateProject(spec);
  if (import.meta.env.DEV) {
    console.timeEnd('calculateProject');
  }

  setCachedCalculation(spec, result);
  return result;
}

/**
 * Schedule a delayed recalculation. Cancels previous pending recalculation.
 * Used for rapid-fire mutations like `updateRoom`.
 */
let _pendingCalcTimer: ReturnType<typeof setTimeout> | null = null;
const RECALC_DEBOUNCE_MS = 300;

function scheduleRecalculation(spec: ProjectSpec, setFn: (s: Partial<SpecState>) => void): void {
  if (_pendingCalcTimer) clearTimeout(_pendingCalcTimer);
  setFn({ isRecalculating: true });
  _pendingCalcTimer = setTimeout(() => {
    try {
      setFn({ calculation: runCalculation(spec), isRecalculating: false });
    } catch (error) {
      logger.error('Debounced calculation failed:', error);
      setFn({ isRecalculating: false });
    }
    _pendingCalcTimer = null;
  }, RECALC_DEBOUNCE_MS);
}

// =============================================================================
// STATE
// =============================================================================

export interface SpecState {
  /** Current project specification */
  spec: ProjectSpec | null;
  /** Last calculation result */
  calculation: ProjectCalculation | null;
  /** Dirty flag */
  isDirty: boolean;
  /** Loading flag */
  isLoading: boolean;
  /** Recalculation in progress (for debounced updates) */
  isRecalculating: boolean;
  /** Error */
  error: string | null;

  // Actions
  initSpec: (name: string, location: string) => void;
  setSpec: (spec: ProjectSpec) => void;

  // Floor actions
  addFloor: (name: string, level: FloorSpec['level']) => void;
  removeFloor: (floorId: string) => void;
  updateFloor: (floorId: string, updates: Partial<Omit<FloorSpec, 'id' | 'rooms'>>) => void;

  // Room actions
  addRoom: (floorId: string, room: RoomSpec) => void;
  removeRoom: (floorId: string, roomId: string) => void;
  updateRoom: (floorId: string, roomId: string, updates: Partial<RoomSpec>) => void;

  // Foundation
  updateFoundation: (updates: Partial<FoundationSpec>) => void;

  // MEP
  updateMEP: (updates: Partial<MEPSpec>) => void;

  // Site
  updateSite: (updates: Partial<SiteSpec>) => void;

  // Flooring defaults
  setFlooringDefault: (roomKind: RoomKind, material: FlooringMaterial) => void;
  setPaintType: (paintType: PaintType) => void;
  setWastageFactor: (factor: number) => void;

  // Calculation
  recalculate: () => void;
  setStructuralSystem: (system: StructuralSystem) => void;
  markSpecClean: () => void;
  generateBoqItems: () => BoqItemCreateInput[];
  clearSpec: () => void;
  setError: (error: string | null) => void;
}

// =============================================================================
// DEFAULTS
// =============================================================================

function defaultSpec(name: string, location: string): ProjectSpec {
  const groundFloor: FloorSpec = {
    id: crypto.randomUUID(),
    name: 'Ground Floor',
    level: 'ground',
    rooms: [],
    slabThickness: 5,
    roofStructure: 'rcc_slab',
    wallMaterial: 'brick',
    wallThickness: 9,
    parapetPerimeter: 0,
    parapetHeight: 3,
    parapetThickness: 4.5,
  };

  return {
    id: crypto.randomUUID(),
    name,
    location,
    floors: [groundFloor],
    structuralSystem: 'rcc_frame',
    foundation: {
      type: 'strip',
      trenchWidth: 3,
      trenchDepth: 5,
      raftDepth: 3,
      leanConcreteMix: '1:4:8',
      leanConcreteDepth: 4,
      dpcDepth: 1.5,
      soilBearingCapacity: 150,
      excavationFactor: 1.25,
    },
    mep: {
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
    },
    site: {
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
      waterTankCapacity: 500,
      hasRiverBoulders: false,
      hasBrandedSteel: false,
      city: 'Peshawar',
      quality: 'standard',
    },
    flooringDefaults: {
      lounge: 'vitrified_tiles',
      bedroom: 'wooden_laminate',
      kitchen: 'porcelain_tiles',
      toilet: 'porcelain_tiles',
      dining: 'vitrified_tiles',
      porch: 'kota_stone',
      carport: 'kota_stone',
      corridor: 'ceramic_tiles',
      store: 'mosaic',
      staircase: 'kota_stone',
      passage: 'ceramic_tiles',
    },
    paintType: 'emulsion',
    wastageFactor: 10,
  };
}

// =============================================================================
// STORE
// =============================================================================

export const useSpecStore = create<SpecState>()((set, get) => ({
  spec: null,
  calculation: null,
  isDirty: false,
  isLoading: false,
  isRecalculating: false,
  error: null,

  // ── Initialization ────────────────────────────────────────────────────────

  initSpec: (name, location) => {
    const spec = defaultSpec(name, location);
    try {
      set({ spec, calculation: runCalculation(spec), isDirty: false, error: null });
    } catch (error) {
      logger.error('Calculation failed on initSpec:', error);
      set({ spec, calculation: null, isDirty: false, error: null });
    }
  },

  setSpec: (spec) => {
    if (!spec) {
      set({ spec: null, calculation: null, isDirty: false });
      return;
    }
    // Backward compat: old saved specs lack structure/site fields
    const migrated: ProjectSpec = {
      ...spec,
      structuralSystem: spec.structuralSystem ?? 'rcc_frame',
      floors: spec.floors.map((f) => ({
        ...f,
        wallMaterial: f.wallMaterial ?? ('brick' as const),
        roofStructure: f.roofStructure ?? ('rcc_slab' as const),
      })),
      site: {
        ...spec.site,
        waterTankCapacity: spec.site?.waterTankCapacity ?? 500,
      },
    };
    try {
      set({ spec: migrated, calculation: runCalculation(migrated), isDirty: false });
    } catch (error) {
      logger.error('Calculation failed on setSpec:', error);
      set({ spec: migrated, calculation: null, isDirty: false });
    }
  },

  // ── Floor actions ─────────────────────────────────────────────────────────

  addFloor: (name, level) => {
    const { spec } = get();
    if (!spec) return;

    const newFloor: FloorSpec = {
      id: crypto.randomUUID(),
      name,
      level,
      rooms: [],
      slabThickness: 5,
      roofStructure: 'rcc_slab',
      wallMaterial: 'brick',
      wallThickness: 9,
      parapetPerimeter: 0,
      parapetHeight: 3,
      parapetThickness: 4.5,
    };

    const newSpec = { ...spec, floors: [...spec.floors, newFloor] };
    set({ spec: newSpec, isDirty: true, calculation: null });
    try {
      set({ calculation: runCalculation(newSpec) });
    } catch (error) {
      logger.error('Calculation failed on addFloor:', error);
    }
  },

  removeFloor: (floorId) => {
    const { spec } = get();
    if (!spec) return;
    const newSpec = {
      ...spec,
      floors: spec.floors.filter((f) => f.id !== floorId),
    };
    set({ spec: newSpec, isDirty: true, calculation: null });
    try {
      set({ calculation: runCalculation(newSpec) });
    } catch (error) {
      logger.error('Calculation failed on removeFloor:', error);
    }
  },

  updateFloor: (floorId, updates) => {
    const { spec } = get();
    if (!spec) return;
    set({
      spec: {
        ...spec,
        floors: spec.floors.map((f) =>
          f.id === floorId ? { ...f, ...updates } : f
        ),
      },
      isDirty: true,
    });
  },

  // ── Room actions ───────────────────────────────────────────────────────────

  addRoom: (floorId, room) => {
    const { spec } = get();
    if (!spec) return;
    const newSpec = {
      ...spec,
      floors: spec.floors.map((f) =>
        f.id === floorId ? { ...f, rooms: [...f.rooms, room] } : f
      ),
    };
    set({ spec: newSpec, isDirty: true, calculation: null });
    try {
      set({ calculation: runCalculation(newSpec) });
    } catch (error) {
      logger.error('Calculation failed on addRoom:', error);
    }
  },

  removeRoom: (floorId, roomId) => {
    const { spec } = get();
    if (!spec) return;
    const newSpec = {
      ...spec,
      floors: spec.floors.map((f) =>
        f.id === floorId
          ? { ...f, rooms: f.rooms.filter((r) => r.id !== roomId) }
          : f
      ),
    };
    set({ spec: newSpec, isDirty: true, calculation: null });
    try {
      set({ calculation: runCalculation(newSpec) });
    } catch (error) {
      logger.error('Calculation failed on removeRoom:', error);
    }
  },

  updateRoom: (floorId, roomId, updates) => {
    const { spec } = get();
    if (!spec) return;
    const newSpec = {
      ...spec,
      floors: spec.floors.map((f) =>
        f.id === floorId
          ? {
              ...f,
              rooms: f.rooms.map((r) =>
                r.id === roomId ? { ...r, ...updates } : r
              ),
            }
          : f
      ),
    };
    set({ spec: newSpec, isDirty: true, calculation: null });
    scheduleRecalculation(newSpec, set);
  },

  // ── Foundation ─────────────────────────────────────────────────────────────

  updateFoundation: (updates) => {
    const { spec } = get();
    if (!spec) return;
    const newSpec = {
      ...spec,
      foundation: { ...spec.foundation, ...updates },
    };
    set({ spec: newSpec, isDirty: true, calculation: null });
    try {
      set({ calculation: runCalculation(newSpec) });
    } catch (error) {
      logger.error('Calculation failed on updateFoundation:', error);
    }
  },

  // ── MEP ────────────────────────────────────────────────────────────────────

  updateMEP: (updates) => {
    const { spec } = get();
    if (!spec) return;
    const newSpec = {
      ...spec,
      mep: {
        electrical: {
          ...spec.mep.electrical,
          ...(updates.electrical ?? {}),
        },
        plumbing: {
          ...spec.mep.plumbing,
          ...(updates.plumbing ?? {}),
        },
      },
    };
    set({ spec: newSpec, isDirty: true, calculation: null });
    try {
      set({ calculation: runCalculation(newSpec) });
    } catch (error) {
      logger.error('Calculation failed on updateMEP:', error);
    }
  },

  // ── Site ──────────────────────────────────────────────────────────────────

  updateSite: (updates) => {
    const { spec } = get();
    if (!spec) return;
    const newSpec = {
      ...spec,
      site: { ...spec.site, ...updates },
    };
    set({ spec: newSpec, isDirty: true, calculation: null });
    try {
      set({ calculation: runCalculation(newSpec) });
    } catch (error) {
      logger.error('Calculation failed on updateSite:', error);
    }
  },

  // ── Flooring defaults ───────────────────────────────────────────────────────

  setFlooringDefault: (roomKind, material) => {
    const { spec } = get();
    if (!spec) return;
    const newSpec = {
      ...spec,
      flooringDefaults: { ...spec.flooringDefaults, [roomKind]: material },
    };
    set({ spec: newSpec, isDirty: true, calculation: null });
    try {
      set({ calculation: runCalculation(newSpec) });
    } catch (error) {
      logger.error('Calculation failed on setFlooringDefault:', error);
    }
  },

  setPaintType: (paintType) => {
    const { spec } = get();
    if (!spec) return;
    const newSpec = { ...spec, paintType };
    set({ spec: newSpec, isDirty: true, calculation: null });
    try {
      set({ calculation: runCalculation(newSpec) });
    } catch (error) {
      logger.error('Calculation failed on setPaintType:', error);
    }
  },

  setWastageFactor: (factor) => {
    const { spec } = get();
    if (!spec) return;
    const newSpec = { ...spec, wastageFactor: factor };
    set({ spec: newSpec, isDirty: true, calculation: null });
    try {
      set({ calculation: runCalculation(newSpec) });
    } catch (error) {
      logger.error('Calculation failed on setWastageFactor:', error);
    }
  },

  // ── Calculation ───────────────────────────────────────────────────────────

  recalculate: () => {
    const { spec } = get();
    if (!spec) return;
    try {
      const calculation = runCalculation(spec);
      set({ calculation, isDirty: false });
    } catch (error) {
      logger.error('Calculation failed:', error);
      set({ error: 'Calculation failed', calculation: null });
    }
  },

  setStructuralSystem: (system) => {
    const { spec } = get();
    if (!spec) return;
    const newSpec = { ...spec, structuralSystem: system };
    set({ spec: newSpec, isDirty: true });
    try {
      set({ calculation: runCalculation(newSpec) });
    } catch (error) {
      logger.error('Calculation failed:', error);
    }
  },

  markSpecClean: () => {
    set({ isDirty: false });
  },

  generateBoqItems: () => {
    const { calculation } = get();
    if (!calculation) return [];
    const items = generateBOQItems(calculation);
    return items.map((item) => ({ ...item })) as BoqItemCreateInput[];
  },

  clearSpec: () => {
    set({ spec: null, calculation: null, isDirty: false });
  },

  setError: (error) => set({ error }),
}));

// =============================================================================
// SELECTORS
// =============================================================================

export const selectSpec = (state: SpecState) => state.spec;
export const selectCalculation = (state: SpecState) => state.calculation;
export const selectFloors = (state: SpecState) => state.spec?.floors ?? [];
export const selectIsDirty = (state: SpecState) => state.isDirty;
