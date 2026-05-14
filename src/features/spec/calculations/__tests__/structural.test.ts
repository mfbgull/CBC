import { describe, it, expect } from 'vitest';
import {
  openingArea,
  totalOpeningArea,
  roomFloorArea,
  roomPerimeter,
  grossWallArea,
  netWallArea,
  ceilingArea,
  roomWallUnits,
  roomCementBags,
  roomPlasterSft,
  roomSkirtingRft,
  roomPaintableArea,
  puttyBagsNeeded,
  primerLitersNeeded,
  paintDrumsNeeded,
  floorBuiltUpArea,
  excavationVolumeCuFt,
  calculateRoom,
} from '../structural';

describe('Structural Calculations', () => {
  describe('Opening calculations', () => {
    it('calculates single opening area correctly', () => {
      expect(openingArea(3, 7, 1)).toBe(21);
    });

    it('calculates multiple opening area correctly', () => {
      expect(openingArea(3, 7, 2)).toBe(42);
    });

    it('calculates total opening area for multiple openings', () => {
      const openings = [
        { id: '1', type: 'door' as const, width: 3, height: 7, count: 1 },
        { id: '2', type: 'window' as const, width: 4, height: 4, count: 2 },
      ];
      expect(totalOpeningArea(openings)).toBe(53);
    });
  });

  describe('Room calculations', () => {
    const mockRoom = {
      id: '1',
      name: 'Test Room',
      kind: 'bedroom' as const,
      l: 12,
      w: 10,
      h: 10,
      openings: [] as { id: string; type: 'door' | 'window' | 'vent'; width: number; height: number; count: number }[],
      quality: 'standard' as const,
    };

    it('calculates floor area correctly', () => {
      expect(roomFloorArea(mockRoom)).toBe(120);
    });

    it('calculates perimeter correctly', () => {
      expect(roomPerimeter(mockRoom)).toBe(44);
    });

    it('calculates gross wall area correctly', () => {
      expect(grossWallArea(mockRoom)).toBe(440);
    });

    it('calculates net wall area without openings', () => {
      expect(netWallArea(mockRoom)).toBe(440);
    });

    it('calculates net wall area with door opening', () => {
      const roomWithDoor = {
        ...mockRoom,
        openings: [{ id: '1', type: 'door' as const, width: 3, height: 7, count: 1 }],
      };
      expect(netWallArea(roomWithDoor)).toBe(419);
    });

    it('calculates ceiling area correctly', () => {
      expect(ceilingArea(mockRoom)).toBe(120);
    });

    it('calculates wall units for brick wall', () => {
      expect(roomWallUnits(mockRoom, 'brick')).toBeGreaterThan(0);
    });

    it('calculates cement bags', () => {
      expect(roomCementBags(mockRoom, 'brick')).toBeGreaterThan(0);
    });

    it('calculates plaster area (both faces)', () => {
      expect(roomPlasterSft(mockRoom)).toBe(880);
    });

    it('calculates skirting length', () => {
      expect(roomSkirtingRft(mockRoom)).toBe(44);
    });

    it('calculates paintable area', () => {
      expect(roomPaintableArea(mockRoom)).toBe(1000);
    });

    it('calculates putty bags needed', () => {
      expect(puttyBagsNeeded(1000)).toBe(5);
    });

    it('calculates primer liters needed', () => {
      expect(primerLitersNeeded(1000)).toBe(20);
    });

    it('calculates paint drums needed', () => {
      expect(paintDrumsNeeded(1000)).toBe(5);
    });
  });

  describe('Floor calculations', () => {
    it('calculates total built-up area for floor with multiple rooms', () => {
      const floor = {
        id: '1',
        name: 'Ground Floor',
        level: 'ground' as const,
        rooms: [
          { id: '1', name: 'Room 1', kind: 'bedroom' as const, l: 10, w: 10, h: 10, openings: [], quality: 'standard' as const },
          { id: '2', name: 'Room 2', kind: 'lounge' as const, l: 12, w: 10, h: 10, openings: [], quality: 'standard' as const },
        ],
        slabThickness: 5,
        roofStructure: 'rcc_slab' as const,
        wallMaterial: 'brick' as const,
        wallThickness: 9 as const,
        parapetPerimeter: 0,
        parapetHeight: 0,
        parapetThickness: 4.5 as const,
      };
      expect(floorBuiltUpArea(floor)).toBe(220);
    });
  });

  describe('Foundation calculations', () => {
    it('calculates excavation volume for strip footing', () => {
      const foundation = {
        type: 'strip' as const,
        trenchWidth: 3,
        trenchDepth: 5,
        raftDepth: 3,
        leanConcreteMix: '1:4:8' as const,
        leanConcreteDepth: 4,
        dpcDepth: 1.5,
        soilBearingCapacity: 150,
        excavationFactor: 1.25,
      };
      expect(excavationVolumeCuFt(100, foundation)).toBe(1875);
    });
  });

  describe('calculateRoom', () => {
    it('calculates complete room calculation', () => {
      const room = {
        id: '1',
        name: 'Master Bedroom',
        kind: 'bedroom' as const,
        l: 15,
        w: 12,
        h: 10,
        openings: [{ id: '1', type: 'door' as const, width: 3, height: 7, count: 1 }],
        quality: 'standard' as const,
      };
      const result = calculateRoom(room, 'brick', 500);
      expect(result.floorArea).toBe(180);
      expect(result.bricks).toBeGreaterThan(0);
      expect(result.cementBags).toBeGreaterThan(0);
      expect(result.roomTotal).toBeGreaterThan(0);
    });

    it('handles toilet room with higher MEP cost', () => {
      const toilet = {
        id: '1',
        name: 'Bathroom',
        kind: 'toilet' as const,
        l: 8,
        w: 6,
        h: 10,
        openings: [],
        quality: 'standard' as const,
      };
      const result = calculateRoom(toilet, 'brick', 500);
      expect(result.mepCost).toBe(45000);
      expect(result.finishingCost).toBeGreaterThan(result.greyCost);
    });

    it('handles kitchen room', () => {
      const kitchen = {
        id: '1',
        name: 'Kitchen',
        kind: 'kitchen' as const,
        l: 10,
        w: 8,
        h: 10,
        openings: [],
        quality: 'standard' as const,
      };
      const result = calculateRoom(kitchen, 'brick', 500);
      expect(result.mepCost).toBe(15000);
      expect(result.flooringSft).toBe(80);
    });
  });
});