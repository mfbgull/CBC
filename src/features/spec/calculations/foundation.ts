/**
 * Foundation & Site Calculation Engine — Pure Functions
 *
 * Excavation, foundation concrete, DPC, hidden costs.
 * Based on: Construction BOQ Calculator App Idea.md
 * References: [11, 19, 23, 24, 25, 49]
 */

import type { FoundationSpec, SiteSpec } from '../types';

// =============================================================================
// HIDDEN / REGULATORY COSTS
// =============================================================================

/**
 * PDA (Peshawar Development Authority) map approval fee.
 * Based on covered area — approximated.
 * Actual fee from: https://www.pda.kp.gov.pk/fe-downloads [49]
 */
export function mapApprovalFee(coveredAreaSqFt: number): number {
  return coveredAreaSqFt * 10;
}

/**
 * PDA scrutiny fee.
 */
export function scrutinyFee(coveredAreaSqFt: number): number {
  return 25000 + coveredAreaSqFt * 5;
}

/**
 * NOC and possession charges.
 */
export function nocCharges(): number {
  return 15000;
}

/**
 * Termite proofing — chemical soil treatment.
 * Rs. 4–8 per sq ft. [24]
 */
export function termiteProofingCost(coveredAreaSqFt: number): number {
  return coveredAreaSqFt * 6;
}

/**
 * Soil testing — geotechnical investigation.
 * Rs. 20,000–50,000 depending on soil type. [25]
 */
export function soilTestingCost(site: SiteSpec): number {
  switch (site.soilType) {
    case 'rocky':  return 50000;
    case 'soft':   return 45000;
    case 'normal': return 30000;
  }
}

/**
 * Site security — Chowkidar (watchman) for construction duration.
 * Rs. 25,000/month × months.
 */
export function securityCost(months: number = 12): number {
  return months * 25000;
}

/**
 * Water tank cost.
 */
export function waterTankCost(capacityGallons: number): number {
  if (capacityGallons <= 500) return 25000;
  if (capacityGallons <= 1000) return 40000;
  return 60000;
}

// =============================================================================
// FOUNDATION COSTS
// =============================================================================

/**
 * Excavation cost estimate.
 * Soft soil ≈ Rs. 30–50/cu ft, rocky ≈ Rs. 100+/cu ft.
 */
export function excavationCost(
  volumeCuFt: number,
  soilType: 'normal' | 'soft' | 'rocky'
): number {
  const ratePerCuFt: Record<string, number> = {
    soft:   35,
    normal: 50,
    rocky:  110,
  };
  return volumeCuFt * (ratePerCuFt[soilType] ?? 50);
}

/**
 * Lean concrete (PCC 1:4:8 or 1:3:6) cost.
 * Material + labor per cu ft. Rate ≈ Rs. 200–250 per cu ft.
 */
export function leanConcreteCost(volumeCuFt: number): number {
  return volumeCuFt * 220;
}

/**
 * RCC strip footing cost.
 * Rate ≈ Rs. 600–800 per cu ft.
 */
export function rccFoundationCost(volumeCuFt: number): number {
  return volumeCuFt * 700;
}

/**
 * DPC cost — cementitious waterproofing at plinth.
 * Rs. 15–25 per sq ft.
 */
export function dpcCost(surfaceAreaSqFt: number): number {
  return surfaceAreaSqFt * 20;
}

// =============================================================================
// SITE PREP AGGREGATION
// =============================================================================

/**
 * Total hidden/regulatory costs.
 */
export function hiddenCosts(
  coveredAreaSqFt: number,
  site: SiteSpec,
  constructionMonths: number = 12
): number {
  let total = 0;

  if (site.includeMapApprovalFee)    total += mapApprovalFee(coveredAreaSqFt);
  if (site.includeScrutinyFee)       total += scrutinyFee(coveredAreaSqFt);
  if (site.includeNocCharges)        total += nocCharges();
  if (site.includeTermiteProofing)   total += termiteProofingCost(coveredAreaSqFt);
  if (site.includeSecurity)         total += securityCost(constructionMonths);

  total += soilTestingCost(site);
  total += waterTankCost(site.waterTankCapacity);

  return total;
}

/**
 * Excavation volume (cu ft) — strip footing.
 * V = centerline perimeter × trench width × depth × overdig factor.
 */
export function excavationVolumeCuFt(
  centerlinePerimeter: number,
  foundation: FoundationSpec
): number {
  return centerlinePerimeter * foundation.trenchWidth * foundation.trenchDepth * foundation.excavationFactor;
}

/**
 * Total foundation cost.
 */
export function foundationTotalCost(
  excavationVolCuFt: number,
  foundation: FoundationSpec,
  site: SiteSpec,
  centerlinePerimeter: number,
  _buildingCoverage: number
): number {
  const excCost = excavationCost(excavationVolCuFt, site.soilType);
  const leanVol = centerlinePerimeter * foundation.trenchWidth * (foundation.leanConcreteDepth / 12);
  const leanCost = leanConcreteCost(leanVol);
  const dpcArea = centerlinePerimeter * foundation.trenchWidth;
  const dpcCostVal = dpcCost(dpcArea);
  const rccVol = leanVol * 0.5;
  const rccCost = rccFoundationCost(rccVol);

  return excCost + leanCost + dpcCostVal + rccCost;
}
