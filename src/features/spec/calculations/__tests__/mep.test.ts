import { describe, it, expect } from 'vitest';
import {
  conduitLengthRft,
  pprcWaterLengthRft,
  upvcSewerLengthRft,
  totalMEPPoints,
  roomMEPCost,
  electricalSystemCost,
  plumbingSystemCost,
} from '../mep';
import type { FloorSpec, MEPSpec } from '../../types';

/** MEPSpec with zero overrides — tests use room-type default points */
const BASE_MEP: MEPSpec = {
  electrical: {
    lightPointsPerRoom: 0,
    fanPointsPerRoom: 0,
    socketPointsPerRoom: 0,
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

function makeFloor(rooms: Array<{ kind: string; l: number; w: number; h: number }>): FloorSpec {
  return {
    id: 'f1',
    name: 'Ground Floor',
    level: 'ground',
    rooms: rooms.map((r) => ({
      id: `room_${r.kind}`,
      name: r.kind,
      kind: r.kind as any,
      l: r.l,
      w: r.w,
      h: r.h,
      openings: [],
      quality: 'standard' as const,
    })),
    slabThickness: 5,
    roofStructure: 'rcc_slab' as const,
    wallMaterial: 'brick' as const,
    wallThickness: 9 as const,
    parapetPerimeter: 0,
    parapetHeight: 0,
    parapetThickness: 4.5 as const,
  };
}

describe('MEP Calculations', () => {
  describe('conduitLengthRft', () => {
    it('returns 2x building area', () => {
      expect(conduitLengthRft(1000)).toBe(2000);
      expect(conduitLengthRft(0)).toBe(0);
    });
  });

  describe('pprcWaterLengthRft', () => {
    it('returns 20x wet points', () => {
      expect(pprcWaterLengthRft(4)).toBe(80);
      expect(pprcWaterLengthRft(0)).toBe(0);
    });
  });

  describe('upvcSewerLengthRft', () => {
    it('returns 12x wet points', () => {
      expect(upvcSewerLengthRft(4)).toBe(48);
      expect(upvcSewerLengthRft(0)).toBe(0);
    });
  });

  describe('totalMEPPoints', () => {
    it('counts points for a single bedroom', () => {
      const floors = [makeFloor([{ kind: 'bedroom', l: 12, w: 10, h: 10 }])];
      const points = totalMEPPoints(floors, BASE_MEP);
      expect(points.light).toBe(2);
      expect(points.fan).toBe(2);
      expect(points.socket).toBe(4);
      expect(points.ac).toBe(1);
      expect(points.wetPoints).toBe(0);
    });

    it('counts points for a toilet with wet points', () => {
      const floors = [makeFloor([{ kind: 'toilet', l: 8, w: 6, h: 10 }])];
      const points = totalMEPPoints(floors, BASE_MEP);
      expect(points.wetPoints).toBe(4);
    });

    it('accumulates points across multiple rooms', () => {
      const floors = [
        makeFloor([
          { kind: 'bedroom', l: 12, w: 10, h: 10 },
          { kind: 'lounge', l: 15, w: 12, h: 10 },
          { kind: 'kitchen', l: 10, w: 8, h: 10 },
        ]),
      ];
      const points = totalMEPPoints(floors, BASE_MEP);
      expect(points.light).toBe(2 + 3 + 4);
      expect(points.fan).toBe(2 + 2 + 1);
      expect(points.socket).toBe(4 + 6 + 5);
      expect(points.wetPoints).toBe(0 + 0 + 3);
    });
  });

  describe('roomMEPCost', () => {
    it('calculates cost for a bedroom', () => {
      const room = { id: '1', name: 'Bedroom', kind: 'bedroom' as const, l: 12, w: 10, h: 10, openings: [], quality: 'standard' as const };
      const cost = roomMEPCost(room, BASE_MEP);
      expect(cost).toBeGreaterThan(0);
      // 2*2500 + 2*2000 + 4*1500 + 1*45000 + 0*12000
      expect(cost).toBe(5000 + 4000 + 6000 + 45000);
    });

    it('calculates cost for a toilet with plumbing', () => {
      const room = { id: '1', name: 'Toilet', kind: 'toilet' as const, l: 8, w: 6, h: 10, openings: [], quality: 'standard' as const };
      const cost = roomMEPCost(room, BASE_MEP);
      // 2*2500 + 1*2000 + 1*1500 + 0*45000 + 4*12000
      expect(cost).toBe(5000 + 2000 + 1500 + 48000);
    });
  });

  describe('electricalSystemCost', () => {
    it('aggregates component costs', () => {
      const cost = electricalSystemCost(10, 5, 15, 2, 2000);
      expect(cost).toBe(10 * 2500 + 5 * 2000 + 15 * 1500 + 2 * 45000 + 2000 * 80);
    });
  });

  describe('plumbingSystemCost', () => {
    it('aggregates plumbing costs', () => {
      const cost = plumbingSystemCost(200, 100, 2, 8);
      expect(cost).toBe(200 * 180 + 100 * 120 + 2 * 35000 + 8 * 12000);
    });
  });
});
