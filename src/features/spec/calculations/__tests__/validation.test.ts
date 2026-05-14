import { describe, it, expect } from 'vitest';
import {
  validateRoom,
  validateFloor,
  validateSpec,
  validateOpenings,
} from '../../validation';
import type { RoomSpec, Opening } from '../../types';

describe('Spec Validation', () => {
  describe('validateOpenings', () => {
    it('returns errors for negative dimensions', () => {
      const openings: Opening[] = [
        { id: 'o1', type: 'door', width: -1, height: 7, count: 1 },
      ];
      const issues = validateOpenings(openings, 440, 'room');
      expect(issues.some((i) => i.severity === 'error')).toBe(true);
    });

    it('warns when opening area exceeds 80% of wall', () => {
      const openings: Opening[] = [
        { id: 'o1', type: 'window', width: 20, height: 20, count: 2 }, // 800 sqft
      ];
      const issues = validateOpenings(openings, 400, 'room');
      expect(issues.some((i) => i.severity === 'warning' && i.message.includes('80%'))).toBe(true);
    });

    it('passes for reasonable openings', () => {
      const openings: Opening[] = [
        { id: 'o1', type: 'door', width: 3, height: 7, count: 1 },
      ];
      const issues = validateOpenings(openings, 440, 'room');
      expect(issues.filter((i) => i.severity === 'error').length).toBe(0);
    });
  });

  describe('validateRoom', () => {
    const validRoom: RoomSpec = {
      id: 'r1', name: 'Bedroom', kind: 'bedroom', l: 12, w: 10, h: 10,
      openings: [], quality: 'standard',
    };

    it('passes for valid room', () => {
      const issues = validateRoom(validRoom, '/room');
      expect(issues.filter((i) => i.severity === 'error').length).toBe(0);
    });

    it('errors on empty name', () => {
      const issues = validateRoom({ ...validRoom, name: '' }, '/room');
      expect(issues.some((i) => i.severity === 'error' && i.message.includes('name'))).toBe(true);
    });

    it('errors on zero dimensions', () => {
      const issues = validateRoom({ ...validRoom, l: 0 }, '/room');
      expect(issues.some((i) => i.severity === 'error' && i.path.includes('/l'))).toBe(true);
    });

    it('warns on unusually large dimensions', () => {
      const issues = validateRoom({ ...validRoom, w: 200 }, '/room');
      expect(issues.some((i) => i.severity === 'warning' && i.path.includes('/w'))).toBe(true);
    });

    it('warns on excessive height', () => {
      const issues = validateRoom({ ...validRoom, h: 25 }, '/room');
      expect(issues.some((i) => i.severity === 'warning' && i.message.includes('height'))).toBe(true);
    });
  });

  describe('validateFloor', () => {
    it('passes for valid floor with rooms', () => {
      const floor = {
        id: 'f1', name: 'Ground Floor', level: 'ground' as const,
        rooms: [{ id: 'r1', name: 'Bedroom', kind: 'bedroom' as const, l: 12, w: 10, h: 10, openings: [], quality: 'standard' as const }],
        slabThickness: 5, roofStructure: 'rcc_slab' as const, wallMaterial: 'brick' as const,
        wallThickness: 9 as const, parapetPerimeter: 0, parapetHeight: 0, parapetThickness: 4.5 as const,
      };
      const issues = validateFloor(floor, '/floor');
      expect(issues.filter((i) => i.severity === 'error').length).toBe(0);
    });

    it('warns on parapet perimeter without height', () => {
      const floor = {
        id: 'f1', name: 'Ground Floor', level: 'ground' as const,
        rooms: [], slabThickness: 5, roofStructure: 'rcc_slab' as const, wallMaterial: 'brick' as const,
        wallThickness: 9 as const, parapetPerimeter: 100, parapetHeight: 0, parapetThickness: 4.5 as const,
      };
      const issues = validateFloor(floor, '/floor');
      expect(issues.some((i) => i.severity === 'warning' && i.message.toLowerCase().includes('parapet'))).toBe(true);
    });
  });

  describe('validateSpec', () => {
    it('errors on zero floors', () => {
      const spec = {
        id: 's1', name: 'Test', location: 'Lahore',
        floors: [], structuralSystem: 'rcc_frame' as const,
        foundation: {} as any, mep: {} as any, site: {} as any,
        flooringDefaults: {} as any, paintType: 'emulsion' as const, wastageFactor: 10,
      };
      const result = validateSpec(spec);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('at least one floor'))).toBe(true);
    });

    it('warns on no rooms', () => {
      const spec = {
        id: 's1', name: 'Test', location: 'Lahore',
        floors: [{ id: 'f1', name: 'Ground', level: 'ground' as const, rooms: [], slabThickness: 5, roofStructure: 'rcc_slab' as const, wallMaterial: 'brick' as const, wallThickness: 9 as const, parapetPerimeter: 0, parapetHeight: 0, parapetThickness: 4.5 as const }],
        structuralSystem: 'rcc_frame' as const,
        foundation: {} as any, mep: {} as any, site: {} as any,
        flooringDefaults: {} as any, paintType: 'emulsion' as const, wastageFactor: 10,
      };
      const result = validateSpec(spec);
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.message.includes('No rooms'))).toBe(true);
    });
  });
});
