/**
 * Specification feature store
 * Manages ProjectSpec state — room-based BOQ input
 */

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
} from './types';
import { calculateProject, generateBOQItems } from './calculations';
import type { BoqItemCreateInput } from '../../types/domain';

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
  error: null,

  // ── Initialization ────────────────────────────────────────────────────────

  initSpec: (name, location) => {
    const spec = defaultSpec(name, location);
    try {
      set({ spec, calculation: calculateProject(spec), isDirty: false, error: null });
    } catch (error) {
      console.error('Calculation failed on initSpec:', error);
      set({ spec, calculation: null, isDirty: false, error: null });
    }
  },

  setSpec: (spec) => {
    if (!spec) {
      set({ spec: null, calculation: null, isDirty: false });
      return;
    }
    try {
      set({ spec, calculation: calculateProject(spec), isDirty: false });
    } catch (error) {
      console.error('Calculation failed on setSpec:', error);
      set({ spec, calculation: null, isDirty: false });
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
      set({ calculation: calculateProject(newSpec) });
    } catch (error) {
      console.error('Calculation failed on addFloor:', error);
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
      set({ calculation: calculateProject(newSpec) });
    } catch (error) {
      console.error('Calculation failed on removeFloor:', error);
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
      set({ calculation: calculateProject(newSpec) });
    } catch (error) {
      console.error('Calculation failed on addRoom:', error);
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
      set({ calculation: calculateProject(newSpec) });
    } catch (error) {
      console.error('Calculation failed on removeRoom:', error);
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
    try {
      const calculation = calculateProject(newSpec);
      set({ calculation });
    } catch (error) {
      console.error('Calculation failed on updateRoom:', error);
    }
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
      set({ calculation: calculateProject(newSpec) });
    } catch (error) {
      console.error('Calculation failed on updateFoundation:', error);
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
      set({ calculation: calculateProject(newSpec) });
    } catch (error) {
      console.error('Calculation failed on updateMEP:', error);
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
      set({ calculation: calculateProject(newSpec) });
    } catch (error) {
      console.error('Calculation failed on updateSite:', error);
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
      set({ calculation: calculateProject(newSpec) });
    } catch (error) {
      console.error('Calculation failed on setFlooringDefault:', error);
    }
  },

  setPaintType: (paintType) => {
    const { spec } = get();
    if (!spec) return;
    const newSpec = { ...spec, paintType };
    set({ spec: newSpec, isDirty: true, calculation: null });
    try {
      set({ calculation: calculateProject(newSpec) });
    } catch (error) {
      console.error('Calculation failed on setPaintType:', error);
    }
  },

  setWastageFactor: (factor) => {
    const { spec } = get();
    if (!spec) return;
    const newSpec = { ...spec, wastageFactor: factor };
    set({ spec: newSpec, isDirty: true, calculation: null });
    try {
      set({ calculation: calculateProject(newSpec) });
    } catch (error) {
      console.error('Calculation failed on setWastageFactor:', error);
    }
  },

  // ── Calculation ───────────────────────────────────────────────────────────

  recalculate: () => {
    const { spec } = get();
    if (!spec) return;
    try {
      const calculation = calculateProject(spec);
      set({ calculation, isDirty: false });
    } catch (error) {
      console.error('Calculation failed:', error);
      set({ error: 'Calculation failed', calculation: null });
    }
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
