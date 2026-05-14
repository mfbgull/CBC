import { describe, it, expect } from 'vitest';
import {
  excavationVolumeCuFt,
  foundationTotalCost,
  hiddenCosts,
  mapApprovalFee,
  scrutinyFee,
  nocCharges,
  termiteProofingCost,
  soilTestingCost,
  securityCost,
  waterTankCost,
} from '../foundation';
import type { FoundationSpec, SiteSpec } from '../../types';

const BASE_FOUNDATION: FoundationSpec = {
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

const BASE_SITE: SiteSpec = {
  plotArea: 1000,
  buildingCoverage: 800,
  soilType: 'normal',
  hasBasement: false,
  basementDepth: 8,
  includeMapApprovalFee: true,
  includeScrutinyFee: true,
  includeNocCharges: true,
  includeTermiteProofing: true,
  includeSecurity: true,
  waterTankCapacity: 500,
  hasRiverBoulders: false,
  hasBrandedSteel: false,
  city: 'Peshawar',
  quality: 'standard',
};

describe('Foundation Calculations', () => {
  describe('excavationVolumeCuFt', () => {
    it('calculates strip footing excavation with overdig factor', () => {
      const vol = excavationVolumeCuFt(100, BASE_FOUNDATION);
      expect(vol).toBe(100 * 3 * 5 * 1.25);
    });

    it('returns 0 for zero perimeter', () => {
      expect(excavationVolumeCuFt(0, BASE_FOUNDATION)).toBe(0);
    });
  });

  describe('foundationTotalCost', () => {
    it('returns positive cost for valid inputs', () => {
      const cost = foundationTotalCost(1875, BASE_FOUNDATION, BASE_SITE, 100, 800);
      expect(cost).toBeGreaterThan(0);
    });

    it('cost increases for rocky soil', () => {
      const rockySite = { ...BASE_SITE, soilType: 'rocky' as const };
      const normalCost = foundationTotalCost(1875, BASE_FOUNDATION, BASE_SITE, 100, 800);
      const rockyCost = foundationTotalCost(1875, BASE_FOUNDATION, rockySite, 100, 800);
      expect(rockyCost).toBeGreaterThan(normalCost);
    });
  });

  describe('hiddenCosts', () => {
    it('includes all enabled costs', () => {
      const costs = hiddenCosts(800, BASE_SITE);
      expect(costs).toBeGreaterThan(0);
      // Should include: mapApproval + scrutiny + noc + termite + security + soilTest + waterTank
      expect(costs).toBe(
        mapApprovalFee(800) +
        scrutinyFee(800) +
        nocCharges() +
        termiteProofingCost(800) +
        securityCost(12) +
        soilTestingCost(BASE_SITE) +
        waterTankCost(500)
      );
    });

    it('excludes costs when flags are off', () => {
      const minimalSite = { ...BASE_SITE, includeMapApprovalFee: false, includeScrutinyFee: false, includeNocCharges: false, includeTermiteProofing: false, includeSecurity: false };
      const costs = hiddenCosts(800, minimalSite);
      // Only soil test + water tank
      expect(costs).toBe(soilTestingCost(minimalSite) + waterTankCost(500));
    });

    it('handles zero coverage', () => {
      const costs = hiddenCosts(0, BASE_SITE);
      expect(costs).toBeGreaterThan(0); // fixed costs like noc, security, soil test still apply
    });
  });

  describe('mapApprovalFee', () => {
    it('is 10 per sqft', () => {
      expect(mapApprovalFee(800)).toBe(8000);
    });
  });

  describe('scrutinyFee', () => {
    it('is 25000 + 5 per sqft', () => {
      expect(scrutinyFee(800)).toBe(25000 + 4000);
    });
  });

  describe('soilTestingCost', () => {
    it('varies by soil type', () => {
      expect(soilTestingCost({ ...BASE_SITE, soilType: 'normal' })).toBe(30000);
      expect(soilTestingCost({ ...BASE_SITE, soilType: 'soft' })).toBe(45000);
      expect(soilTestingCost({ ...BASE_SITE, soilType: 'rocky' })).toBe(50000);
    });
  });

  describe('waterTankCost', () => {
    it('has tiered pricing', () => {
      expect(waterTankCost(500)).toBe(25000);
      expect(waterTankCost(1000)).toBe(40000);
      expect(waterTankCost(2000)).toBe(60000);
    });
  });
});
