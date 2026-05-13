/**
 * SpecEditor — Compound Component
 *
 * Room-based specification input for the BOQ calculator.
 * Uses compound component pattern from vercel-composition-patterns.
 *
 * Structure:
 *   <SpecEditor.Provider>
 *     <SpecEditor.Floor>
 *       <SpecEditor.RoomCard />
 *       <SpecEditor.RoomCard />
 *     </SpecEditor.Floor>
 *     <SpecEditor.AddRoom />
 *   </SpecEditor.Provider>
 */

import { createContext, use, useState, type ReactNode, type ReactElement } from 'react';
import { useSpecStore } from '../store';
import type { FloorSpec, RoomSpec, RoomKind, StructuralSystem, WallMaterial, RoofStructure } from '../types';
import { ROOM_KIND_OPTIONS, WALL_MATERIAL_OPTIONS, ROOF_STRUCTURE_OPTIONS } from '../types';

// =============================================================================
// CONTEXT
// =============================================================================

interface SpecEditorContextValue {
  // State
  spec: ReturnType<typeof useSpecStore.getState>['spec'];
  isDirty: boolean;
  // Actions
  addFloor: (name: string, level: FloorSpec['level']) => void;
  removeFloor: (floorId: string) => void;
  updateFloor: (floorId: string, updates: Partial<FloorSpec>) => void;
  addRoom: (floorId: string, room: RoomSpec) => void;
  removeRoom: (floorId: string, roomId: string) => void;
  updateRoom: (floorId: string, roomId: string, updates: Partial<RoomSpec>) => void;
  recalculate: () => void;
  setStructuralSystem: (system: StructuralSystem) => void;
}

const SpecEditorContext = createContext<SpecEditorContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

interface SpecEditorProviderProps {
  children: ReactNode;
}

export function SpecEditorProvider({ children }: SpecEditorProviderProps): ReactElement {
  const store = useSpecStore();

  const value: SpecEditorContextValue = {
    spec: store.spec,
    isDirty: store.isDirty,
    addFloor: store.addFloor,
    removeFloor: store.removeFloor,
    updateFloor: store.updateFloor,
    addRoom: store.addRoom,
    removeRoom: store.removeRoom,
    updateRoom: store.updateRoom,
    recalculate: store.recalculate,
    setStructuralSystem: store.setStructuralSystem,
  };

  return (
    <SpecEditorContext.Provider value={value}>
      {children}
    </SpecEditorContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

function useSpecEditorContext(): SpecEditorContextValue {
  const ctx = use(SpecEditorContext);
  if (!ctx) {
    throw new Error('useSpecEditorContext must be used within SpecEditorProvider');
  }
  return ctx;
}

// =============================================================================
// COMPOUND COMPONENTS
// =============================================================================

// ── Floor ──────────────────────────────────────────────────────────────────────

interface FloorProps {
  floor: FloorSpec;
  children?: ReactNode;
}

function Floor({ floor, children }: FloorProps): ReactElement {
  const { removeFloor, updateFloor } = useSpecEditorContext();

  return (
    <div className="spec-floor" data-floor-id={floor.id}>
      <div className="spec-floor-header">
        <span className="spec-floor-name">{floor.name}</span>
        <span className="spec-floor-level">{floor.level}</span>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={floor.wallMaterial}
            onChange={(e) => updateFloor(floor.id, { wallMaterial: e.target.value as WallMaterial })}
            className="spec-structure-select"
            title="Wall material"
          >
            {WALL_MATERIAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={floor.roofStructure}
            onChange={(e) => updateFloor(floor.id, { roofStructure: e.target.value as RoofStructure })}
            className="spec-structure-select"
            title="Roof structure"
          >
            {ROOF_STRUCTURE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => removeFloor(floor.id)}
          className="spec-btn-icon text-red-400 hover:text-red-600"
          title="Remove floor"
        >
          ✕
        </button>
      </div>
      <div className="spec-floor-rooms">
        {children}
      </div>
    </div>
  );
}

// ── Room Card ─────────────────────────────────────────────────────────────────

interface RoomCardProps {
  floorId: string;
  room: RoomSpec;
  children?: ReactNode;
  onEditWalls?: () => void;
}

function RoomCard({ floorId, room, children, onEditWalls }: RoomCardProps): ReactElement {
  const { removeRoom, updateRoom } = useSpecEditorContext();

  const area = room.l * room.w;
  const kindConfig = ROOM_KIND_OPTIONS.find((k) => k.value === room.kind);

  return (
    <div className="spec-room-card" data-room-id={room.id}>
      <div className="spec-room-header">
        <span className="spec-room-icon">{kindConfig?.icon ?? '📐'}</span>
        <input
          type="text"
          value={room.name}
          onChange={(e) => updateRoom(floorId, room.id, { name: e.target.value })}
          className="spec-room-name-input"
        />
        <span className="spec-room-area text-muted text-sm">
          {area.toFixed(0)} ft²
        </span>
        {onEditWalls && (
          <button
            onClick={onEditWalls}
            className="spec-btn-icon text-blue-500 hover:text-blue-700"
            title="Edit walls"
          >
            🧱
          </button>
        )}
        <button
          onClick={() => removeRoom(floorId, room.id)}
          className="spec-btn-icon text-slate-300 hover:text-red-500"
          title="Remove room"
        >
          ✕
        </button>
      </div>

      <div className="spec-room-dims">
        <div className="spec-field">
          <label className="spec-field-label">L (ft)</label>
          <input
            type="number"
            value={room.l}
            min={1}
            onChange={(e) => updateRoom(floorId, room.id, { l: parseFloat(e.target.value) || 0 })}
            className="spec-field-input"
          />
        </div>
        <div className="spec-field">
          <label className="spec-field-label">W (ft)</label>
          <input
            type="number"
            value={room.w}
            min={1}
            onChange={(e) => updateRoom(floorId, room.id, { w: parseFloat(e.target.value) || 0 })}
            className="spec-field-input"
          />
        </div>
        <div className="spec-field">
          <label className="spec-field-label">H (ft)</label>
          <input
            type="number"
            value={room.h}
            min={1}
            onChange={(e) => updateRoom(floorId, room.id, { h: parseFloat(e.target.value) || 0 })}
            className="spec-field-input"
          />
        </div>
        <div className="spec-field">
          <label className="spec-field-label">Type</label>
          <select
            value={room.kind}
            onChange={(e) =>
              updateRoom(floorId, room.id, { kind: e.target.value as RoomKind })
            }
            className="spec-field-input"
          >
            {ROOM_KIND_OPTIONS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.icon} {k.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {children}
    </div>
  );
}

// ── Add Room Button ────────────────────────────────────────────────────────────

interface AddRoomProps {
  floorId: string;
}

function AddRoom({ floorId }: AddRoomProps): ReactElement {
  const { addRoom } = useSpecEditorContext();

  const handleAdd = (kind: RoomKind) => {
    const room: RoomSpec = {
      id: crypto.randomUUID(),
      name: ROOM_KIND_OPTIONS.find((k) => k.value === kind)?.label ?? 'Room',
      kind,
      l: 12,
      w: 12,
      h: 10,
      openings: [],
      quality: 'standard',
    };
    addRoom(floorId, room);
  };

  return (
    <div className="spec-add-room">
      <span className="spec-add-room-label">+ Add Room</span>
      <div className="spec-add-room-types">
        {ROOM_KIND_OPTIONS.map((k) => (
          <button
            key={k.value}
            onClick={() => handleAdd(k.value)}
            className="spec-kind-btn"
            title={`Add ${k.label}`}
          >
            <span>{k.icon}</span>
            <span className="spec-kind-btn-label">{k.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Add Floor Button ─────────────────────────────────────────────────────────

interface AddFloorProps {
  name?: string;
  level?: FloorSpec['level'];
}

function AddFloor({ name, level = 'typical' }: AddFloorProps): ReactElement {
  const { addFloor } = useSpecEditorContext();
  const store = useSpecStore.getState();
  const nextNumber = (store.spec?.floors.length ?? 0) + 1;

  return (
    <button
      onClick={() => addFloor(name ?? `Floor ${nextNumber}`, level)}
      className="spec-add-floor-btn"
    >
      + Add Floor
    </button>
  );
}

// ── Opening Modal Placeholder ──────────────────────────────────────────────────

interface AddOpeningProps {
  floorId: string;
  roomId: string;
}

function AddOpening({ floorId, roomId }: AddOpeningProps): ReactElement {
  const { updateRoom } = useSpecEditorContext();
  const store = useSpecStore.getState();
  const room = store.spec?.floors
    .find((f) => f.id === floorId)
    ?.rooms.find((r) => r.id === roomId);

  const [doorW, setDoorW] = useState('3');
  const [doorH, setDoorH] = useState('7');
  const [windowW, setWindowW] = useState('4');
  const [windowH, setWindowH] = useState('3');
  const [count, setCount] = useState('1');

  const addDoor = () => {
    if (!room) return;
    const opening = {
      id: crypto.randomUUID(), type: 'door' as const,
      width: parseFloat(doorW) || 3, height: parseFloat(doorH) || 7,
      count: parseInt(count) || 1,
    };
    updateRoom(floorId, roomId, { openings: [...room.openings, opening] });
  };

  const addWindow = () => {
    if (!room) return;
    const opening = {
      id: crypto.randomUUID(), type: 'window' as const,
      width: parseFloat(windowW) || 4, height: parseFloat(windowH) || 3,
      count: parseInt(count) || 1,
    };
    updateRoom(floorId, roomId, { openings: [...room.openings, opening] });
  };

  const removeOpening = (openingId: string) => {
    if (!room) return;
    updateRoom(floorId, roomId, {
      openings: room.openings.filter((o) => o.id !== openingId),
    });
  };

  const updateOpening = (openingId: string, field: 'width' | 'height' | 'count', value: string) => {
    if (!room) return;
    const num = field === 'count' ? parseInt(value) || 1 : parseFloat(value) || 0;
    updateRoom(floorId, roomId, {
      openings: room.openings.map((o) =>
        o.id === openingId ? { ...o, [field]: num } : o
      ),
    });
  };

  return (
    <div className="spec-openings">
      <div className="spec-openings-sizes">
        <div className="spec-opening-size-row">
          <span className="spec-opening-type-label">Door</span>
          <input
            type="number" step="0.5" min="0.5"
            value={doorW}
            onChange={(e) => setDoorW(e.target.value)}
            className="spec-size-input" title="Door width"
          />
          <span className="spec-size-sep">×</span>
          <input
            type="number" step="0.5" min="0.5"
            value={doorH}
            onChange={(e) => setDoorH(e.target.value)}
            className="spec-size-input" title="Door height"
          />
          <span className="spec-size-unit">ft</span>
          <button onClick={addDoor} className="spec-btn-sm spec-btn-sm--add">+Door</button>
        </div>
        <div className="spec-opening-size-row">
          <span className="spec-opening-type-label">Window</span>
          <input
            type="number" step="0.5" min="0.5"
            value={windowW}
            onChange={(e) => setWindowW(e.target.value)}
            className="spec-size-input" title="Window width"
          />
          <span className="spec-size-sep">×</span>
          <input
            type="number" step="0.5" min="0.5"
            value={windowH}
            onChange={(e) => setWindowH(e.target.value)}
            className="spec-size-input" title="Window height"
          />
          <span className="spec-size-unit">ft</span>
          <button onClick={addWindow} className="spec-btn-sm spec-btn-sm--add">+Window</button>
        </div>
        <div className="spec-opening-count-row">
          <label className="spec-opening-type-label">Qty</label>
          <input
            type="number" step="1" min="1"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="spec-size-input" title="Quantity"
          />
        </div>
      </div>
      <div className="spec-openings-list">
        {room?.openings.map((o) => (
          <div key={o.id} className="spec-opening-item">
            <span>{o.type === 'door' ? '🚪' : '🪟'}</span>
            <input
              type="number" step="0.5" min="0.5"
              value={o.width}
              onChange={(e) => updateOpening(o.id, 'width', e.target.value)}
              className="spec-dim-input"
            />
            <span>×</span>
            <input
              type="number" step="0.5" min="0.5"
              value={o.height}
              onChange={(e) => updateOpening(o.id, 'height', e.target.value)}
              className="spec-dim-input"
            />
            <span className="spec-opening-unit">ft</span>
            <span className="spec-opening-count">×{o.count}</span>
            <button onClick={() => removeOpening(o.id)} className="spec-btn-icon text-xs">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// COMPOUND COMPONENT EXPORTS
// =============================================================================

export const SpecEditor = {
  Provider: SpecEditorProvider,
  Floor,
  RoomCard,
  AddRoom,
  AddFloor,
  AddOpening,
};

export type { SpecEditorProviderProps, FloorProps, RoomCardProps, AddRoomProps, AddFloorProps, AddOpeningProps };
