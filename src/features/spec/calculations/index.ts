/**
 * Specification Calculation Engine — Entry Point
 *
 * Aggregates all calculation modules into a single API.
 * All functions are pure, deterministic, side-effect free.
 */

import type { ProjectSpec, ProjectCalculation, RoomCalculation, JoineryMaterials, FloorSpec } from '../types';

import { calculateRoom, calculateGreyStructure } from './structural';
import { calculateFinishing, mainDoorCount, internalDoorCount, aluminumWindowArea } from './finishing';
import { calculateMEP } from './mep';
import { hiddenCosts, foundationTotalCost, excavationVolumeCuFt } from './foundation';

function calcTotalFloorArea(floors: FloorSpec[]): number {
  return floors.reduce(
    (sum, floor) => sum + floor.rooms.reduce((s, room) => s + room.l * room.w, 0),
    0
  );
}

function centerlinePerimeter(floors: FloorSpec[]): number {
  let total = 0;
  for (const floor of floors) {
    for (const room of floor.rooms) {
      total += 2 * (room.l + room.w);
    }
  }
  return total;
}

/**
 * Full project calculation — generates all material quantities
 * and cost estimates from a ProjectSpec.
 *
 * Uses default thumb-rule rates for cost estimation.
 * For accurate costing, replace with actual rates from the rates library.
 */
export function calculateProject(spec: ProjectSpec): ProjectCalculation {
  const rooms: RoomCalculation[] = [];
  for (const floor of spec.floors) {
    for (const room of floor.rooms) {
      rooms.push(calculateRoom(room));
    }
  }

  const buildingCoverage = calcTotalFloorArea(spec.floors);
  const grey = calculateGreyStructure(spec.floors, spec.foundation, buildingCoverage);
  const finishing = calculateFinishing(spec.floors, spec.flooringDefaults);
  const mep = calculateMEP(spec.floors, spec.mep, buildingCoverage);

  const joinery: JoineryMaterials = {
    mainDoors: mainDoorCount(spec.floors),
    internalDoors: internalDoorCount(spec.floors),
    windows: 0,
    aluminumWindowsSft: aluminumWindowArea(spec.floors),
    glassSft: aluminumWindowArea(spec.floors),
  };

  const greyCost =
    grey.cementBags * 1450 +
    grey.steelTon * 265000 +
    grey.bricks * 18 +
    grey.sandCuFt * 105 +
    grey.crushCuFt * 120 +
    buildingCoverage * 500 * 1.1;

  const finishingCost =
    finishing.flooringSft * 150 +
    finishing.plasterInternalSft * 50 +
    finishing.puttyBags * 800 +
    finishing.primerLiters * 350 +
    finishing.paintDrums * 12000 +
    finishing.skirtingRft * 80 +
    finishing.cabinetAreaSft * 300 +
    finishing.countertopSft * 500;

  const mepCost =
    mep.lightPoints * 2500 +
    mep.fanPoints * 2000 +
    mep.socketPoints * 1500 +
    mep.acUnits * 45000 +
    mep.conduitRft * 80 +
    mep.pprcRft * 180 +
    mep.upvcRft * 120 +
    mep.geyserCount * 35000;

  const joineryCost =
    joinery.mainDoors * 25000 +
    joinery.internalDoors * 15000 +
    joinery.aluminumWindowsSft * 400 +
    joinery.glassSft * 200;

  const clPerim = centerlinePerimeter(spec.floors);
  const excVol = excavationVolumeCuFt(clPerim, spec.foundation);
  const foundationCost = foundationTotalCost(excVol, spec.foundation, spec.site, clPerim, buildingCoverage);

  const siteCost = hiddenCosts(buildingCoverage, spec.site);

  const totalMaterialCost =
    greyCost + finishingCost + mepCost + joineryCost + foundationCost + siteCost;

  return {
    spec,
    rooms,
    grey,
    finishing,
    mep,
    joinery,
    greyCost,
    finishingCost,
    mepCost,
    joineryCost,
    foundationCost,
    siteCost,
    totalMaterialCost,
    totalBuiltUpArea: buildingCoverage,
    unitCostPerSft: buildingCoverage > 0 ? totalMaterialCost / buildingCoverage : 0,
  };
}

/**
 * Generate BOQ line items from a ProjectCalculation.
 * Converts material quantities into BoqItemCreateInput[] for the existing BOQ store.
 */
export function generateBOQItems(
  calc: ProjectCalculation,
): Array<{
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  category: 'excavation' | 'foundation' | 'structure' | 'masonry' | 'concrete' | 'steel' | 'plumbing' | 'electrical' | 'finishing' | 'other';
}> {
  const items: ReturnType<typeof generateBOQItems> = [];
  const wastage = 1 + calc.spec.wastageFactor / 100;

  // Grey Structure
  items.push({
    description: 'Cement (OPC 50kg)',
    quantity: Math.ceil(calc.grey.cementBags * wastage),
    unit: 'bags',
    rate: 1450,
    category: 'masonry',
  });

  items.push({
    description: 'Reinforcement Steel Grade-60',
    quantity: Math.round(calc.grey.steelTon * wastage * 1000) / 1000,
    unit: 'ton',
    rate: 265000,
    category: 'steel',
  });

  items.push({
    description: 'A-Class Bricks',
    quantity: Math.ceil(calc.grey.bricks * wastage),
    unit: 'pcs',
    rate: 18,
    category: 'masonry',
  });

  if (calc.grey.sandCuFt > 0) {
    items.push({
      description: 'Sand (Ravi / Chenab)',
      quantity: Math.ceil(calc.grey.sandCuFt * wastage),
      unit: 'cft',
      rate: 105,
      category: 'masonry',
    });
  }

  if (calc.grey.crushCuFt > 0) {
    items.push({
      description: 'Crush (Margalla)',
      quantity: Math.ceil(calc.grey.crushCuFt * wastage),
      unit: 'cft',
      rate: 120,
      category: 'masonry',
    });
  }

  // Finishing
  items.push({
    description: 'Internal Wall Plaster (1:4)',
    quantity: Math.ceil(calc.finishing.plasterInternalSft * wastage),
    unit: 'sft',
    rate: 50,
    category: 'finishing',
  });

  items.push({
    description: 'Wall Putty (2 coats)',
    quantity: calc.finishing.puttyBags,
    unit: 'bags',
    rate: 800,
    category: 'finishing',
  });

  items.push({
    description: 'Primer (1 coat)',
    quantity: calc.finishing.primerLiters,
    unit: 'liters',
    rate: 350,
    category: 'finishing',
  });

  items.push({
    description: `Paint (${calc.spec.paintType}) 2 coats`,
    quantity: calc.finishing.paintDrums,
    unit: 'drums',
    rate: 12000,
    category: 'finishing',
  });

  items.push({
    description: 'Floor Skirting',
    quantity: Math.ceil(calc.finishing.skirtingRft * wastage),
    unit: 'rft',
    rate: 80,
    category: 'finishing',
  });

  if (calc.finishing.flooringSft > 0) {
    items.push({
      description: 'Ceramic/Porcelain Floor Tiles',
      quantity: Math.ceil(calc.finishing.flooringSft * wastage * 1.1),
      unit: 'sft',
      rate: 150,
      category: 'finishing',
    });
  }

  if (calc.finishing.cabinetAreaSft > 0) {
    items.push({
      description: 'Kitchen Cabinets (Lower + Upper)',
      quantity: Math.ceil(calc.finishing.cabinetAreaSft * wastage),
      unit: 'sft',
      rate: 300,
      category: 'finishing',
    });
  }

  if (calc.finishing.countertopSft > 0) {
    items.push({
      description: 'Granite/Marble Countertop',
      quantity: Math.ceil(calc.finishing.countertopSft * wastage * 1.15),
      unit: 'sft',
      rate: 500,
      category: 'finishing',
    });
  }

  // MEP
  if (calc.mep.lightPoints > 0) {
    items.push({
      description: 'Light Points (Conduit + Wiring + Switch)',
      quantity: calc.mep.lightPoints,
      unit: 'points',
      rate: 2500,
      category: 'electrical',
    });
  }

  if (calc.mep.fanPoints > 0) {
    items.push({
      description: 'Fan Points',
      quantity: calc.mep.fanPoints,
      unit: 'points',
      rate: 2000,
      category: 'electrical',
    });
  }

  if (calc.mep.socketPoints > 0) {
    items.push({
      description: 'Power Socket Points',
      quantity: calc.mep.socketPoints,
      unit: 'points',
      rate: 1500,
      category: 'electrical',
    });
  }

  if (calc.mep.pprcRft > 0) {
    items.push({
      description: 'PPRC Water Supply Pipe',
      quantity: Math.ceil(calc.mep.pprcRft * wastage),
      unit: 'rft',
      rate: 180,
      category: 'plumbing',
    });
  }

  if (calc.mep.upvcRft > 0) {
    items.push({
      description: 'UPVC Sewer/Drainage Pipe',
      quantity: Math.ceil(calc.mep.upvcRft * wastage),
      unit: 'rft',
      rate: 120,
      category: 'plumbing',
    });
  }

  if (calc.mep.geyserCount > 0) {
    items.push({
      description: 'Geyser Installation',
      quantity: calc.mep.geyserCount,
      unit: 'nos',
      rate: 35000,
      category: 'plumbing',
    });
  }

  // Joinery
  if (calc.joinery.mainDoors > 0) {
    items.push({
      description: 'Main Door (Wooden Frame + Shutters)',
      quantity: calc.joinery.mainDoors,
      unit: 'nos',
      rate: 25000,
      category: 'finishing',
    });
  }

  if (calc.joinery.internalDoors > 0) {
    items.push({
      description: 'Internal Door Set',
      quantity: calc.joinery.internalDoors,
      unit: 'nos',
      rate: 15000,
      category: 'finishing',
    });
  }

  if (calc.joinery.aluminumWindowsSft > 0) {
    items.push({
      description: 'Aluminum Windows (Powder Coated)',
      quantity: Math.ceil(calc.joinery.aluminumWindowsSft * wastage * 1.05),
      unit: 'sft',
      rate: 400,
      category: 'finishing',
    });
  }

  return items;
}
