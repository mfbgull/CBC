/**
 * Wall Editor Component
 * 
 * UI for viewing and editing walls for a room.
 * Shows wall list with:
 * - Wall label, length, height
 * - Face A: space type, finish, openings
 * - Face B: space type, finish, openings
 * - Shared wall badges
 * - Unlinked wall warnings
 */

import React, { useState } from 'react';
import type {
  Wall,
  WallFace,
  SpaceType,
  FinishType,
  CompassSide,
  WallStatus,
} from '../../../types/wall';
import {
  SPACE_TYPE_LABELS,
  FINISH_TYPE_LABELS,
  getWallStatus,
  calculateWallFaceArea,
  calculateSkirtingLength,
} from '../../../types/wall';
import { useWallStore, type WallWithFaces } from '../store';

// =============================================================================
// TYPES
// =============================================================================

export interface WallEditorProps {
  roomId: string;
  roomName: string;
  onAddWall?: () => void;
  onEditWall?: (wallId: string) => void;
}

// =============================================================================
// BADGES
// =============================================================================

const STATUS_COLORS: Record<WallStatus, string> = {
  shared: 'bg-amber-100 text-amber-800 border-amber-300',
  external: 'bg-blue-100 text-blue-800 border-blue-300',
  open: 'bg-gray-100 text-gray-600 border-gray-300',
  unlinked: 'bg-red-100 text-red-800 border-red-300',
};

const STATUS_LABELS: Record<WallStatus, string> = {
  shared: 'Shared',
  external: 'External',
  open: 'Open',
  unlinked: 'Unlinked',
};

function StatusBadge({ status }: { status: WallStatus }) {
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded border ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

// =============================================================================
// OPENING EDITOR
// =============================================================================

interface OpeningEditorProps {
  face: WallFace;
  wallId: string;
  faceSide: 'a' | 'b';
}

function OpeningEditor({ face, wallId, faceSide }: OpeningEditorProps) {
  const { addOpening, removeOpening } = useWallStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newType, setNewType] = useState<'door' | 'window' | 'archway'>('door');
  const [newWidth, setNewWidth] = useState('0.90');
  const [newHeight, setNewHeight] = useState('2.10');

  const handleAdd = () => {
    const width = parseFloat(newWidth);
    const height = parseFloat(newHeight);
    if (width > 0 && height > 0) {
      addOpening(wallId, faceSide, newType, width, height);
      setIsAdding(false);
      setNewWidth('0.90');
      setNewHeight('2.10');
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase">Openings</span>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            + Add Opening
          </button>
        )}
      </div>

      {/* Existing openings */}
      {face.openings.length > 0 && (
        <div className="space-y-1">
          {face.openings.map((opening) => (
            <div
              key={opening.id}
              className="flex items-center justify-between bg-gray-50 rounded px-2 py-1"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700 capitalize">
                  {opening.openingType}
                </span>
                <span className="text-xs text-gray-500">
                  {opening.width}m × {opening.height}m
                  {opening.quantity > 1 && ` × ${opening.quantity}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeOpening(wallId, faceSide, opening.id)}
                className="text-red-500 hover:text-red-700 text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add opening form */}
      {isAdding && (
        <div className="bg-gray-100 rounded p-2 space-y-2">
          <div className="flex gap-2">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as any)}
              className="text-xs border rounded px-1 py-1"
            >
              <option value="door">Door</option>
              <option value="window">Window</option>
              <option value="archway">Archway</option>
            </select>
            <input
              type="number"
              value={newWidth}
              onChange={(e) => setNewWidth(e.target.value)}
              placeholder="Width (m)"
              className="text-xs border rounded px-1 py-1 w-20"
              step="0.01"
            />
            <input
              type="number"
              value={newHeight}
              onChange={(e) => setNewHeight(e.target.value)}
              placeholder="Height (m)"
              className="text-xs border rounded px-1 py-1 w-20"
              step="0.01"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-gray-600 px-2 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// FACE EDITOR
// =============================================================================

interface FaceEditorProps {
  face: WallFace;
  wallId: string;
  faceSide: 'a' | 'b';
  neighborLabel: string;
  neighborStatus: WallStatus;
  isEditable?: boolean;
}

function FaceEditor({
  face,
  wallId,
  faceSide,
  neighborLabel,
  neighborStatus,
  isEditable = true,
}: FaceEditorProps) {
  const { updateFaceFinish } = useWallStore();

  const netArea = calculateWallFaceArea(face, { id: wallId, length: 0, height: 0, faceA: face, faceB: face } as Wall);
  const skirting = calculateSkirtingLength(face, { length: 0 } as any);

  return (
    <div className="bg-gray-50 rounded p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-600">
          Face {faceSide.toUpperCase()} — {face.compassSide ? capitalize(face.compassSide) : 'Unspecified'}
        </span>
        <div className="flex items-center gap-2">
          <StatusBadge status={neighborStatus} />
          <span className="text-xs text-gray-500">{neighborLabel}</span>
        </div>
      </div>

      {/* Space type (readonly, set when creating wall) */}
      <div>
        <label className="text-xs text-gray-500">Space Type</label>
        <div className="text-sm font-medium text-gray-800">
          {SPACE_TYPE_LABELS[face.spaceType]}
        </div>
      </div>

      {/* Finish type */}
      {isEditable && face.spaceType !== 'open' && face.spaceType !== 'external' && (
        <div>
          <label className="text-xs text-gray-500 block mb-1">Finish</label>
          <select
            value={face.finishType}
            onChange={(e) => updateFaceFinish(wallId, faceSide, e.target.value as FinishType)}
            className="text-sm border rounded px-2 py-1 w-full"
          >
            {Object.entries(FINISH_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Calculated areas */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t">
        <div>
          <span className="text-xs text-gray-500">Net Area</span>
          <div className="text-sm font-medium">{netArea.toFixed(2)} m²</div>
        </div>
        <div>
          <span className="text-xs text-gray-500">Skirting</span>
          <div className="text-sm font-medium">{skirting.toFixed(2)} m</div>
        </div>
      </div>

      {/* Openings */}
      <OpeningEditor face={face} wallId={wallId} faceSide={faceSide} />
    </div>
  );
}

// =============================================================================
// WALL CARD
// =============================================================================

interface WallCardProps {
  wallWithFaces: WallWithFaces;
  neighborLabelA: string;
  neighborStatusA: WallStatus;
  neighborLabelB: string;
  neighborStatusB: WallStatus;
  onEdit?: () => void;
}

function WallCard({
  wallWithFaces,
  neighborLabelA,
  neighborStatusA,
  neighborLabelB,
  neighborStatusB,
  onEdit,
}: WallCardProps) {
  const { wall, roomFace } = wallWithFaces;

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      {/* Wall header */}
      <div className="bg-gray-100 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-bold text-gray-800">{wall.label}</span>
          <span className="text-xs text-gray-500">
            {wall.length.toFixed(2)}m × {wall.height.toFixed(2)}m
          </span>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Edit
          </button>
        )}
      </div>

      {/* Faces */}
      <div className="p-3 space-y-3">
        {roomFace && roomFace.faceSide === 'a' ? (
          <>
            <FaceEditor
              face={wall.faceA}
              wallId={wall.id}
              faceSide="a"
              neighborLabel={neighborLabelB}
              neighborStatus={neighborStatusB}
            />
            <FaceEditor
              face={wall.faceB}
              wallId={wall.id}
              faceSide="b"
              neighborLabel={neighborLabelA}
              neighborStatus={neighborStatusA}
            />
          </>
        ) : (
          <>
            <FaceEditor
              face={wall.faceB}
              wallId={wall.id}
              faceSide="b"
              neighborLabel={neighborLabelA}
              neighborStatus={neighborStatusA}
            />
            <FaceEditor
              face={wall.faceA}
              wallId={wall.id}
              faceSide="a"
              neighborLabel={neighborLabelB}
              neighborStatus={neighborStatusB}
            />
          </>
        )}
      </div>

      {/* Unlinked warning */}
      {(neighborStatusA === 'unlinked' || neighborStatusB === 'unlinked') && (
        <div className="px-3 py-2 bg-red-50 border-t border-red-200">
          <p className="text-xs text-red-700">
            ⚠️ Neighbor room not yet linked. This wall is treated as external until linked.
          </p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// WALL LIST (MAIN COMPONENT)
// =============================================================================

export function WallList({ roomId, roomName, onAddWall }: WallEditorProps) {
  const { getWallsForRoom, getRoomBOQ } = useWallStore();
  
  const wallsForRoom = getWallsForRoom(roomId);
  const boqSummary = getRoomBOQ(roomId);

  const getNeighborInfo = (face: WallFace, rooms: Map<string, { name: string }>) => {
    if (face.roomId) {
      const room = rooms.get(face.roomId);
      return { label: room?.name ?? 'Unknown', status: 'shared' as WallStatus };
    }
    return { label: SPACE_TYPE_LABELS[face.spaceType], status: getWallStatus(face) };
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800">Walls</h3>
          <p className="text-xs text-gray-500">
            {wallsForRoom.length} wall{wallsForRoom.length !== 1 ? 's' : ''} for {roomName}
          </p>
        </div>
        {onAddWall && (
          <button
            type="button"
            onClick={onAddWall}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            + Add Wall
          </button>
        )}
      </div>

      {/* BOQ Summary */}
      {boqSummary.wallBreakdown.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <h4 className="text-xs font-medium text-blue-800 mb-2">BOQ Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <span className="text-xs text-blue-600">Paint Area</span>
              <div className="text-lg font-bold text-blue-900">
                {boqSummary.paintAreaSqm.toFixed(2)} m²
              </div>
            </div>
            <div>
              <span className="text-xs text-blue-600">Plaster Only</span>
              <div className="text-lg font-bold text-blue-900">
                {boqSummary.plasterOnlyAreaSqm.toFixed(2)} m²
              </div>
            </div>
            <div>
              <span className="text-xs text-blue-600">Tiles Area</span>
              <div className="text-lg font-bold text-blue-900">
                {boqSummary.tilesAreaSqm.toFixed(2)} m²
              </div>
            </div>
            <div>
              <span className="text-xs text-blue-600">Skirting</span>
              <div className="text-lg font-bold text-blue-900">
                {boqSummary.skirtingLengthM.toFixed(2)} m
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wall cards */}
      {wallsForRoom.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No walls defined for this room.</p>
          {onAddWall && (
            <button
              type="button"
              onClick={onAddWall}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              + Add your first wall
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {wallsForRoom.map(({ wall, roomFace, oppositeFace }) => {
            const infoA = getNeighborInfo(wall.faceA, new Map());
            const infoB = getNeighborInfo(wall.faceB, new Map());

            return (
              <WallCard
                key={wall.id}
                wallWithFaces={{ wall, roomFace, oppositeFace }}
                neighborLabelA={infoA.label}
                neighborStatusA={infoA.status}
                neighborLabelB={infoB.label}
                neighborStatusB={infoB.status}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ADD WALL FORM
// =============================================================================

interface AddWallFormProps {
  roomId: string;
  roomName: string;
  roomHeight: number;
  existingRooms: Array<{ id: string; name: string }>;
  onCancel: () => void;
  onSubmit: (data: AddWallFormData) => void;
}

export interface AddWallFormData {
  compassSide: CompassSide;
  length: number;
  faceBSpaceType: SpaceType;
  faceBRoomId: string | null;
  faceBFinishType: FinishType;
}

export function AddWallForm({
  roomId,
  roomName,
  roomHeight,
  existingRooms,
  onCancel,
  onSubmit,
}: AddWallFormProps) {
  const [compassSide, setCompassSide] = useState<CompassSide>('north');
  const [length, setLength] = useState('4.00');
  const [height, setHeight] = useState(roomHeight.toString());
  const [faceBSpaceType, setFaceBSpaceType] = useState<SpaceType>('external');
  const [faceBRoomId, setFaceBRoomId] = useState<string | null>(null);
  const [faceBFinishType, setFaceBFinishType] = useState<FinishType>('paint');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      compassSide,
      length: parseFloat(length),
      faceBSpaceType,
      faceBRoomId,
      faceBFinishType,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-4 rounded-lg border">
      <h3 className="font-bold text-gray-800">Add Wall to {roomName}</h3>

      {/* Compass side */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Wall Side
        </label>
        <select
          value={compassSide}
          onChange={(e) => setCompassSide(e.target.value as CompassSide)}
          className="w-full border rounded px-3 py-2"
        >
          <option value="north">North</option>
          <option value="east">East</option>
          <option value="south">South</option>
          <option value="west">West</option>
        </select>
      </div>

      {/* Dimensions */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Length (m)
          </label>
          <input
            type="number"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            step="0.01"
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Height (m)
          </label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            step="0.01"
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>

      {/* Face B: Space type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Neighbor Space Type
        </label>
        <select
          value={faceBSpaceType}
          onChange={(e) => {
            setFaceBSpaceType(e.target.value as SpaceType);
            if (e.target.value !== 'room') {
              setFaceBRoomId(null);
            }
          }}
          className="w-full border rounded px-3 py-2"
        >
          <option value="external">External Wall</option>
          <option value="open">Open / Void</option>
          <option value="room">Room</option>
          <option value="kitchen">Kitchen</option>
          <option value="bathroom">Bathroom</option>
          <option value="corridor">Corridor</option>
        </select>
      </div>

      {/* Face B: Room picker */}
      {faceBSpaceType === 'room' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Room
          </label>
          <select
            value={faceBRoomId ?? ''}
            onChange={(e) => setFaceBRoomId(e.target.value || null)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">-- Select a room --</option>
            {existingRooms
              .filter((r) => r.id !== roomId)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </select>
        </div>
      )}

      {/* Face B: Finish type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Neighbor Finish Type
        </label>
        <select
          value={faceBFinishType}
          onChange={(e) => setFaceBFinishType(e.target.value as FinishType)}
          className="w-full border rounded px-3 py-2"
        >
          {Object.entries(FINISH_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Add Wall
        </button>
      </div>
    </form>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}