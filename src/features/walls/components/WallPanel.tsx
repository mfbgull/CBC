/**
 * WallPanel — Wall Management for SpecView
 * 
 * Integrates Wall Entity Model into the existing SpecView.
 * Shows walls for the selected room with:
 * - Visual status badges
 * - Face finish types
 * - Opening management
 * - BOQ summary
 * 
 * This is designed to be placed within or alongside the SpecEditor.
 */

import { useState } from 'react';
import { useWallStore } from '../store';
import type { 
  Wall, 
  WallFace, 
  SpaceType, 
  FinishType,
  WallStatus 
} from '../../../types/wall';
import {
  SPACE_TYPE_LABELS,
  FINISH_TYPE_LABELS,
  calculateWallFaceArea,
  calculateSkirtingLength,
  grossWallArea,
  getWallStatus,
} from '../../../types/wall';

// =============================================================================
// TYPES
// =============================================================================

export interface WallPanelProps {
  roomId: string;
  roomName: string;
  /** All rooms in the project for linking */
  allRooms: Array<{ id: string; name: string }>;
  /** Called when wall is updated */
  onWallChange?: (wallId: string) => void;
  /** Called when user wants to add a new wall */
  onAddWall?: () => void;
}

// =============================================================================
// STATUS BADGES
// =============================================================================

const STATUS_CONFIG: Record<WallStatus, { label: string; bg: string; text: string; border: string }> = {
  shared: { label: 'Shared', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  external: { label: 'External', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  open: { label: 'Open', bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200' },
  unlinked: { label: '⚠️ Unlinked', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

function StatusBadge({ status }: { status: WallStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
    </span>
  );
}

// =============================================================================
// WALL CARD
// =============================================================================

interface WallCardProps {
  wall: Wall;
  roomFace: WallFace;
  oppositeFace: WallFace;
  neighborName: string;
  isEditable: boolean;
  onUpdateFinish: (finishType: FinishType) => void;
  onUpdateSpaceType?: (spaceType: SpaceType, roomId?: string | null) => void;
  onLinkRoom?: (roomId: string) => void;
  /** All rooms for link dropdown */
  availableRooms?: Array<{ id: string; name: string }>;
}

function WallCard({
  wall,
  roomFace,
  oppositeFace,
  neighborName,
  isEditable,
  onUpdateFinish,
  onUpdateSpaceType,
  onLinkRoom,
  availableRooms = [],
}: WallCardProps) {
  const [showLinkModal, setShowLinkModal] = useState(false);

  const netArea = calculateWallFaceArea(roomFace, wall);
  const grossArea = grossWallArea(wall);
  const skirting = calculateSkirtingLength(roomFace, wall);
  
  const neighborStatus = getWallStatus(oppositeFace);
  const neighborConfig = STATUS_CONFIG[neighborStatus];

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-700">{wall.label}</span>
          <span className="text-xs text-slate-500">
            {wall.length.toFixed(2)}m × {wall.height.toFixed(2)}m
          </span>
        </div>
        <span className={`text-xs ${neighborConfig.text}`}>
          → {neighborName}
        </span>
      </div>

      {/* Body */}
      <div className="p-3 space-y-3">
        {/* Face A (this room) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase">
              Your Side ({roomFace.compassSide || 'Unknown'})
            </span>
            <StatusBadge status={getWallStatus(roomFace)} />
          </div>

          {/* Finish type */}
          {isEditable && (
            <div>
              <label className="text-xs text-slate-500 block mb-1">Finish</label>
              <select
                value={roomFace.finishType}
                onChange={(e) => onUpdateFinish(e.target.value as FinishType)}
                className="w-full text-sm border rounded px-2 py-1.5"
              >
                {Object.entries(FINISH_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
            <div>
              <span className="text-xs text-slate-500 block">Gross Area</span>
              <span className="text-sm font-medium">{grossArea.toFixed(2)} m²</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Net Area</span>
              <span className="text-sm font-medium text-blue-600">{netArea.toFixed(2)} m²</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Skirting</span>
              <span className="text-sm font-medium">{skirting.toFixed(2)} m</span>
            </div>
          </div>

          {/* Openings */}
          {roomFace.openings.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <span className="text-xs text-slate-500 block mb-1">Openings</span>
              <div className="flex flex-wrap gap-1">
                {roomFace.openings.map((opening) => (
                  <span key={opening.id} className="inline-flex items-center gap-1 text-xs bg-gray-100 px-2 py-0.5 rounded">
                    {opening.openingType === 'door' ? '🚪' : opening.openingType === 'window' ? '🪟' : '🏛️'}
                    {opening.width.toFixed(2)}m × {opening.height.toFixed(2)}m
                    {opening.quantity > 1 && ` ×${opening.quantity}`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Neighbor Face */}
        <div className="pt-2 border-t border-dashed border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-400 uppercase">
              Neighbor Side
            </span>
            <StatusBadge status={neighborStatus} />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">{neighborName}</span>
            
            {neighborStatus === 'unlinked' && onLinkRoom && (
              <button
                onClick={() => setShowLinkModal(true)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                🔗 Link Room
              </button>
            )}
          </div>

          {/* Space type editor (for unlinked) */}
          {neighborStatus === 'unlinked' && onLinkRoom && (
            <div className="mt-2">
              <select
                value={oppositeFace.spaceType}
                onChange={() => { void onUpdateSpaceType; void onLinkRoom; void neighborStatus; }}
                className="w-full text-sm border rounded px-2 py-1"
              >
                <option value="room">Room (to be linked)</option>
                <option value="external">External Wall</option>
                <option value="open">Open / Void</option>
                <option value="kitchen">Kitchen</option>
                <option value="bathroom">Bathroom</option>
                <option value="corridor">Corridor</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 w-80 space-y-3">
            <h3 className="font-bold text-slate-800">Link to Room</h3>
            <p className="text-sm text-slate-600">
              Select a room to link with this wall segment.
            </p>
            <div className="space-y-2">
              {availableRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => {
                    onLinkRoom?.(room.id);
                    setShowLinkModal(false);
                  }}
                  className="w-full text-left px-3 py-2 border rounded hover:bg-gray-50"
                >
                  {room.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowLinkModal(false)}
              className="w-full px-4 py-2 text-slate-600 hover:bg-gray-100 rounded"
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
// BOQ SUMMARY CARD
// =============================================================================

interface BOQSummaryCardProps {
  roomId: string;
}

function BOQSummaryCard({ roomId }: BOQSummaryCardProps) {
  const { getRoomBOQ } = useWallStore();
  const boq = getRoomBOQ(roomId);

  if (!boq.wallBreakdown.length) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
      <h4 className="text-sm font-bold text-blue-800 mb-3">
        📐 Wall BOQ Summary
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <span className="text-xs text-blue-600 block">Paint Area</span>
          <span className="text-xl font-bold text-blue-900">
            {boq.paintAreaSqm.toFixed(2)} m²
          </span>
          <span className="text-xs text-blue-500">
            ({(boq.paintAreaSqm * 10.764).toFixed(0)} ft²)
          </span>
        </div>
        <div>
          <span className="text-xs text-blue-600 block">Plaster Only</span>
          <span className="text-xl font-bold text-blue-900">
            {boq.plasterOnlyAreaSqm.toFixed(2)} m²
          </span>
        </div>
        <div>
          <span className="text-xs text-blue-600 block">Tiles</span>
          <span className="text-xl font-bold text-blue-900">
            {boq.tilesAreaSqm.toFixed(2)} m²
          </span>
        </div>
        <div>
          <span className="text-xs text-blue-600 block">Skirting</span>
          <span className="text-xl font-bold text-blue-900">
            {boq.skirtingLengthM.toFixed(2)} m
          </span>
          <span className="text-xs text-blue-500">
            ({(boq.skirtingLengthM * 3.281).toFixed(0)} ft)
          </span>
        </div>
      </div>

      {/* Wall count */}
      <div className="mt-3 pt-2 border-t border-blue-200">
        <span className="text-xs text-blue-600">
          {boq.wallBreakdown.length} wall{boq.wallBreakdown.length !== 1 ? 's' : ''} • 
          {boq.wallBreakdown.filter((w) => w.neighborStatus === 'unlinked').length} unlinked
        </span>
      </div>
    </div>
  );
}

// =============================================================================
// WALL PANEL (MAIN COMPONENT)
// =============================================================================

export function WallPanel({
  roomId,
  roomName,
  allRooms,
  onWallChange,
  onAddWall,
}: WallPanelProps) {
  const { 
    getWallsForRoom, 
    updateFaceFinish,
    linkUnlinkedWall,
  } = useWallStore();

  const wallsForRoom = getWallsForRoom(roomId);
  const availableRooms = allRooms.filter((r) => r.id !== roomId);

  const getNeighborName = (face: WallFace): string => {
    if (face.roomId) {
      const room = allRooms.find((r) => r.id === face.roomId);
      return room?.name ?? 'Unknown Room';
    }
    return SPACE_TYPE_LABELS[face.spaceType] ?? face.spaceType;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800">
            🧱 Walls — {roomName}
          </h3>
          <p className="text-sm text-slate-500">
            {wallsForRoom.length} wall{wallsForRoom.length !== 1 ? 's' : ''} • 
            Click a badge to change status
          </p>
        </div>
        {onAddWall && (
          <button
            onClick={onAddWall}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <span>+</span> Add Wall
          </button>
        )}
      </div>

      {/* BOQ Summary */}
      <BOQSummaryCard roomId={roomId} />

      {/* Walls */}
      {wallsForRoom.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <div className="text-4xl mb-2">🧱</div>
          <p className="text-slate-600 font-medium">No walls for this room</p>
          <p className="text-sm text-slate-400 mb-4">
            Walls are auto-generated when you add a room, or add manually here.
          </p>
          {onAddWall && (
            <button
              onClick={onAddWall}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Add Your First Wall
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {wallsForRoom.map(({ wall, roomFace, oppositeFace }) => (
            <WallCard
              key={wall.id}
              wall={wall}
              roomFace={roomFace!}
              oppositeFace={oppositeFace!}
              neighborName={getNeighborName(oppositeFace!)}
              isEditable={true}
              onUpdateFinish={(finishType) => {
                const faceSide = wall.faceA.roomId === roomId ? 'a' : 'b';
                updateFaceFinish(wall.id, faceSide, finishType);
                onWallChange?.(wall.id);
              }}
              onLinkRoom={(linkedRoomId) => {
                const faceSide = oppositeFace!.faceSide === 'a' ? 'a' : 'b';
                linkUnlinkedWall(wall.id, faceSide, linkedRoomId);
                onWallChange?.(wall.id);
              }}
              availableRooms={availableRooms}
            />
          ))}
        </div>
      )}

      {/* Help text */}
      <div className="text-xs text-slate-400 bg-gray-50 p-3 rounded">
        <p><strong>💡 Tip:</strong> Walls shared with other rooms contribute to both rooms' 
        BOQ independently. Each face owns its finish separately.</p>
      </div>
    </div>
  );
}

export default WallPanel;