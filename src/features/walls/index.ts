/**
 * Walls Feature
 * 
 * Wall Entity Model for BOQ Calculator
 * 
 * Key concepts:
 * - A wall is stored ONCE and referenced by both adjacent spaces
 * - Each wall has two faces (face_a and face_b)
 * - Each face has its own finish type, openings, and BOQ contribution
 * - Shared walls never double-count in the total BOQ
 * - No 50% split — each face owns its finish independently
 */

export { useWallStore } from './store';
export type { WallStore, RoomInfo, WallWithFaces } from './store';

// Wall Entity Types
export type {
  Wall,
  WallFace,
  WallOpening,
  SpaceType,
  FinishType,
  OpeningType,
  FaceSide,
  CompassSide,
  WallStatus,
  RoomWallSummary,
  RoomBOQSummary,
} from '../../types/wall';

// Wall entity helpers
export {
  createWall,
  createWallFace,
  createWallOpening,
  calculateWallFaceArea,
  calculateSkirtingLength,
  grossWallArea,
  getNeighborLabel,
  getWallStatus,
  SPACE_TYPE_LABELS,
  FINISH_TYPE_LABELS,
  generateWallLabel,
} from '../../types/wall';

// Database operations
export {
  loadWallsFromStorage,
  saveWallsToStorage,
  getAllWalls,
  getWallsByProject,
  getWallsByRoom,
  saveWall,
  saveWalls,
  deleteWallById,
  deleteWallsByRoom,
  migrateLegacyRooms,
  validateWalls,
  exportWalls,
  importWalls,
} from './db';

// Integration with Spec system
export {
  generateWallsForRoom,
  convertRoomOpeningsToWallOpenings,
  calculateRoomBOQFromWalls,
  aggregateWallsFromSpec,
  calculateFinishingFromWalls,
  linkSharedWalls,
  mergeBOQCalculations,
  feetToMetres,
  metresToFeet,
} from './integration';

// Components
export { WallList, AddWallForm } from './components/WallEditor';
export type { WallEditorProps, AddWallFormData } from './components/WallEditor';

// Views
export { WallPanel } from './components/WallPanel';