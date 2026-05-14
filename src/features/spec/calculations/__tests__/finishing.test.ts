import { describe, it, expect } from 'vitest';
import {
  floorArea,
  totalFloorArea,
  skirtingLength,
  totalSkirtingLength,
  cabinetArea,
  countertopArea,
  backsplashArea,
  waterproofingArea,
  toiletWallTileArea,
  mainDoorCount,
  internalDoorCount,
  aluminumWindowArea,
  qualityMultiplier,
  flooringRatePerSft,
  puttyBags,
  primerLiters,
  paintDrums,
} from '../finishing';
import type { FloorSpec, RoomSpec } from '../../types';

function makeRoom(overrides: Partial<RoomSpec> & { kind: RoomSpec['kind'] }): RoomSpec {
  return {
    id: 'r1',
    name: 'Room',
    l: 12,
    w: 10,
    h: 10,
    openings: [],
    quality: 'standard' as const,
    ...overrides,
  };
}

function makeFloor(rooms: RoomSpec[]): FloorSpec {
  return {
    id: 'f1',
    name: 'Ground Floor',
    level: 'ground' as const,
    rooms,
    slabThickness: 5,
    roofStructure: 'rcc_slab' as const,
    wallMaterial: 'brick' as const,
    wallThickness: 9 as const,
    parapetPerimeter: 0,
    parapetHeight: 0,
    parapetThickness: 4.5 as const,
  };
}

describe('Finishing Calculations', () => {
  describe('floorArea', () => {
    it('returns L × W', () => {
      expect(floorArea(makeRoom({ kind: 'bedroom', l: 12, w: 10 }))).toBe(120);
    });
  });

  describe('totalFloorArea', () => {
    it('sums all rooms across floors', () => {
      const floors = [
        makeFloor([makeRoom({ kind: 'bedroom', l: 12, w: 10 }), makeRoom({ kind: 'lounge', l: 15, w: 12 })]),
        makeFloor([makeRoom({ kind: 'bedroom', l: 12, w: 10 })]),
      ];
      expect(totalFloorArea(floors)).toBe(120 + 180 + 120);
    });
  });

  describe('skirtingLength', () => {
    it('equals room perimeter', () => {
      expect(skirtingLength(makeRoom({ kind: 'bedroom', l: 12, w: 10 }))).toBe(44);
    });
  });

  describe('totalSkirtingLength', () => {
    it('sums all room perimeters', () => {
      const floors = [
        makeFloor([makeRoom({ kind: 'bedroom', l: 12, w: 10 }), makeRoom({ kind: 'dining', l: 10, w: 8 })]),
      ];
      expect(totalSkirtingLength(floors)).toBe(44 + 36);
    });
  });

  describe('cabinetArea', () => {
    it('calculates shutter area from lower + upper cabinet', () => {
      const kitchen = makeRoom({ kind: 'kitchen', cabinetLower: 10, cabinetUpper: 8 } as any);
      const area = cabinetArea(kitchen as any);
      expect(area).toBe(10 * 2.5 + 8 * 2.0);
    });

    it('handles zero cabinets', () => {
      const kitchen = makeRoom({ kind: 'kitchen' } as any);
      expect(cabinetArea(kitchen as any)).toBe(0);
    });
  });

  describe('countertopArea', () => {
    it('equals lower cabinet length × 2', () => {
      const kitchen = makeRoom({ kind: 'kitchen', cabinetLower: 10 } as any);
      expect(countertopArea(kitchen as any)).toBe(20);
    });
  });

  describe('backsplashArea', () => {
    it('equals lower cabinet length × 1.5', () => {
      const kitchen = makeRoom({ kind: 'kitchen', cabinetLower: 10 } as any);
      expect(backsplashArea(kitchen as any)).toBe(15);
    });
  });

  describe('waterproofingArea', () => {
    it('includes floor + 1ft wall base', () => {
      const toilet = makeRoom({ kind: 'toilet', l: 8, w: 6 } as any);
      const area = waterproofingArea(toilet as any);
      expect(area).toBe(48 + 2 * (8 + 6) * 1);
    });
  });

  describe('toiletWallTileArea', () => {
    it('uses tile height × perimeter', () => {
      const toilet = makeRoom({ kind: 'toilet', l: 8, w: 6, tileHeight: 7 } as any);
      const area = toiletWallTileArea(toilet as any);
      expect(area).toBe(2 * (8 + 6) * 7);
    });
  });

  describe('joinery', () => {
    it('mainDoorCount equals number of floors', () => {
      const floors = [
        makeFloor([makeRoom({ kind: 'bedroom' })]),
        makeFloor([makeRoom({ kind: 'bedroom' })]),
      ];
      expect(mainDoorCount(floors)).toBe(2);
    });

    it('internalDoorCount equals total door openings', () => {
      const floors = [
        makeFloor([
          makeRoom({ kind: 'bedroom', openings: [{ id: 'd1', type: 'door', width: 3, height: 7, count: 1 }] }),
        ]),
      ];
      expect(internalDoorCount(floors)).toBe(1);
    });

    it('aluminumWindowArea sums window opening sizes', () => {
      const floors = [
        makeFloor([
          makeRoom({ kind: 'bedroom', openings: [{ id: 'w1', type: 'window', width: 4, height: 4, count: 2 }] }),
        ]),
      ];
      expect(aluminumWindowArea(floors)).toBe(4 * 4 * 2);
    });
  });

  describe('qualityMultiplier', () => {
    it('returns correct multipliers', () => {
      expect(qualityMultiplier('economy')).toBe(0.75);
      expect(qualityMultiplier('standard')).toBe(1.0);
      expect(qualityMultiplier('premium')).toBe(1.5);
    });
  });

  describe('flooringRatePerSft', () => {
    it('returns base rate × quality multiplier', () => {
      const rate = flooringRatePerSft('vitrified_tiles', 'standard');
      expect(rate).toBe(200 * 1.0);
    });

    it('premium costs more', () => {
      const standard = flooringRatePerSft('marble', 'standard');
      const premium = flooringRatePerSft('marble', 'premium');
      expect(premium).toBe(standard * 1.5);
    });
  });

  describe('paint material calculations', () => {
    it('puttyBags uses coverage constant', () => {
      expect(puttyBags(0)).toBe(0);
      expect(puttyBags(450)).toBe(2); // 450*2/450 = 2
    });

    it('primerLiters uses coverage constant', () => {
      expect(primerLiters(100)).toBe(1);
    });

    it('paintDrums uses coverage constant', () => {
      expect(paintDrums(400)).toBe(2); // 400*2/400 = 2
    });
  });
});
