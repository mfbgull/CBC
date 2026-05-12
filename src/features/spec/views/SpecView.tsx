/**
 * SpecView — Room Specification Input Tab
 *
 * Hierarchical input: Project → Floors → Rooms → Openings.
 * Integrates with existing BOQ store via "Generate BOQ" button.
 *
 * Skill: vercel-composition-patterns — compound components
 * Skill: ag-grid — grid awareness, typing patterns
 * Skill: vercel-react-best-practices — render optimization
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useSpecStore } from '../store';
import { useBoqStore } from '../../boq/store';
import { useProjectsStore } from '../../projects/store';
import { SpecEditor } from '../components/SpecEditor';
import { WallPanel } from '../../walls/components/WallPanel';
import { calculateProject } from '../calculations';
import { formatCurrency } from '../../../lib/calculations';
import type { FloorSpec } from '../types';
import { useWallStore, generateWallsForRoom } from '../../walls';

// =============================================================================
// SPEC VIEW
// =============================================================================

export function SpecView(): React.ReactElement {
  const spec = useSpecStore((s) => s.spec);
  const isDirty = useSpecStore((s) => s.isDirty);
  const initSpec = useSpecStore((s) => s.initSpec);
  const setSpec = useSpecStore((s) => s.setSpec);
  const generateBoqItems = useSpecStore((s) => s.generateBoqItems);

  const currentProjectId = useProjectsStore((s) => s.currentProjectId);
  const currentProject = useProjectsStore((s) =>
    s.projects.find((p) => p.id === s.currentProjectId)
  );

  const addItems = useBoqStore((s) => s.addItems);
  const clearItems = useBoqStore((s) => s.clearItems);

  const [summary, setSummary] = useState<ReturnType<typeof calculateProject> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showWallPanel, setShowWallPanel] = useState(false);

  // Wall store
  const wallStore = useWallStore();
  const initWalls = wallStore.initWalls;
  const walls = wallStore.walls;

  // Load saved spec when project changes
  useEffect(() => {
    if (!currentProjectId) return;
    (async () => {
      const { getProjectSpec } = await import('../../../lib/db');
      const saved = await getProjectSpec(currentProjectId);
      if (saved) {
        setSpec(saved);
      } else if (currentProject) {
        initSpec(currentProject.name, currentProject.location);
      }
    })();
  }, [currentProjectId]);

  // Generate walls when spec changes
  useEffect(() => {
    if (!spec) return;
    
    // Build room list for wall store
    const roomInfos = spec.floors.flatMap((floor) =>
      floor.rooms.map((room) => ({
        id: room.id,
        name: room.name,
        height: room.h * 0.3048, // feet to metres
      }))
    );
    
    // Generate walls for all rooms
    const newWalls: ReturnType<typeof generateWallsForRoom>[] = [];
    for (const room of spec.floors.flatMap((f) => f.rooms)) {
      const roomWalls = generateWallsForRoom(room, String(currentProjectId), newWalls.flatMap((w) => w.map((wall) => wall.label)));
      newWalls.push(roomWalls);
    }
    
    // Flatten and initialize
    const allWalls = newWalls.flat();
    initWalls(allWalls, roomInfos);
  }, [spec?.id]); // Only re-generate when spec ID changes (not on every room update)

  // ── Recalculate on spec change ──────────────────────────────────────────────

  useEffect(() => {
    if (!spec) return;
    const result = calculateProject(spec);
    setSummary(result);
  }, [spec]);

  // ── Room Selection for Wall Editing ────────────────────────────────────

  const allRooms = useMemo(() => {
    return spec?.floors.flatMap((f) => 
      f.rooms.map((r) => ({ id: r.id, name: r.name, floorId: f.id, room: r }))
    ) ?? [];
  }, [spec]);

  const selectedRoom = useMemo(() => {
    return allRooms.find((r) => r.id === selectedRoomId);
  }, [allRooms, selectedRoomId]);

  const handleSelectRoom = useCallback((roomId: string) => {
    setSelectedRoomId(roomId);
    setShowWallPanel(true);
  }, []);

  const handleCloseWallPanel = useCallback(() => {
    setShowWallPanel(false);
  }, []);

  const handleSaveSpec = useCallback(async () => {
    if (!currentProjectId || !spec) return;
    setIsSaving(true);
    try {
      const { saveProjectSpec } = await import('../../../lib/db');
      await saveProjectSpec(currentProjectId, spec);
    } catch (err) {
      console.error('Failed to save spec:', err);
    } finally {
      setIsSaving(false);
    }
  }, [currentProjectId, spec]);

  // ── Save Spec ────────────────────────────────────────────────────────────

  const handleGenerateBOQ = useCallback(async () => {
    if (!currentProjectId) return;

    // Check if spec has any rooms
    const totalRooms = spec?.floors.reduce((sum, f) => sum + f.rooms.length, 0) ?? 0;
    if (totalRooms === 0) {
      setGenerationMessage('⚠️ Add rooms to your specification first before generating BOQ.');
      setTimeout(() => setGenerationMessage(null), 4000);
      return;
    }

    setIsGenerating(true);
    setGenerationMessage(null);

    try {
      // Clear existing BOQ items (keep currentProjectId)
      clearItems();

      // Generate items from spec
      const items = generateBoqItems();
      console.log('[SpecView] Generated BOQ items:', items.length);

      if (items.length > 0) {
        await addItems(items);
        setGenerationMessage(`✅ Generated ${items.length} BOQ items. Check the BOQ tab.`);
      } else {
        setGenerationMessage('⚠️ No items generated. Check room dimensions.');
      }
    } catch (err) {
      console.error('Failed to generate BOQ:', err);
      setGenerationMessage('❌ Failed to generate BOQ items.');
    } finally {
      setIsGenerating(false);
      // Auto-clear message after 6 seconds
      setTimeout(() => setGenerationMessage(null), 6000);
    }
  }, [currentProjectId, spec, generateBoqItems, addItems, clearItems]);

  // ── No project selected ─────────────────────────────────────────────────────

  if (!currentProjectId) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📐</div>
        <div className="empty-state-title">No Project Selected</div>
        <div className="empty-state-desc">
          Please select a project from the Projects tab to start a specification
        </div>
      </div>
    );
  }

  // ── No spec yet ─────────────────────────────────────────────────────────────

  if (!spec) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📐</div>
        <div className="empty-state-title">No Specification</div>
        <div className="empty-state-desc">Click "Start Specification" to begin</div>
        <button
          onClick={() => initSpec(currentProject?.name ?? 'New Project', currentProject?.location ?? '')}
          className="btn btn-primary mt-4"
        >
          Start Specification
        </button>
      </div>
    );
  }

  // ── Main Spec Editor ────────────────────────────────────────────────────────

  return (
    <div className="panel">
      {/* Toolbar */}
      <div className="panel-head">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-700">
            {spec.name}
          </span>
          <span className="text-xs text-muted">{spec.location}</span>
          {isDirty && (
            <span className="text-xs text-amber-500">● Unsaved</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">
            {spec.floors.reduce((s, f) => s + f.rooms.length, 0)} rooms across{' '}
            {spec.floors.length} floor(s)
          </span>
          {isDirty && (
            <button
              onClick={handleSaveSpec}
              disabled={isSaving}
              className="btn btn-ghost"
            >
              {isSaving ? 'Saving…' : '💾 Save'}
            </button>
          )}
          <button onClick={handleGenerateBOQ} className="btn btn-primary" disabled={isGenerating}>
            {isGenerating ? 'Generating…' : '⚡ Generate BOQ'}
          </button>
        </div>
      </div>

      {/* Generation message */}
      {generationMessage && (
        <div className={`spec-gen-message ${generationMessage.startsWith('✅') ? 'success' : generationMessage.startsWith('❌') ? 'error' : 'warning'}`}>
          {generationMessage}
        </div>
      )}

      {/* Compound Component Editor */}
      <SpecEditor.Provider>
        <div className="spec-editor-body">
          {/* Toolbar for wall panel */}
          {allRooms.length > 0 && (
            <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-800">🧱 Wall Management</span>
                <span className="text-xs text-blue-600">{walls.length} walls total</span>
              </div>
              <select
                value={selectedRoomId ?? ''}
                onChange={(e) => e.target.value && handleSelectRoom(e.target.value)}
                className="text-sm border rounded px-3 py-1.5 bg-white"
              >
                <option value="">-- Select a room to edit walls --</option>
                {allRooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Floors */}
          {spec.floors.map((floor: FloorSpec) => (
            <SpecEditor.Floor key={floor.id} floor={floor}>
              {/* Rooms */}
              {floor.rooms.map((room) => (
                <SpecEditor.RoomCard 
                  key={room.id} 
                  floorId={floor.id} 
                  room={room}
                  onEditWalls={() => handleSelectRoom(room.id)}
                >
                  {/* Openings inline */}
                  <SpecEditor.AddOpening floorId={floor.id} roomId={room.id} />
                </SpecEditor.RoomCard>
              ))}

              {/* Add room for this floor */}
              <SpecEditor.AddRoom floorId={floor.id} />
            </SpecEditor.Floor>
          ))}

          {/* Add floor */}
          <SpecEditor.AddFloor />
        </div>
      </SpecEditor.Provider>

      {/* Wall Panel (slide-out) */}
      {showWallPanel && selectedRoom && (
        <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-xl z-40 overflow-auto">
          <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">
              🧱 Wall Editor — {selectedRoom.name}
            </h2>
            <button
              onClick={handleCloseWallPanel}
              className="px-4 py-2 text-slate-600 hover:bg-gray-100 rounded"
            >
              ✕ Close
            </button>
          </div>
          <div className="p-4">
            <WallPanel
              roomId={selectedRoom.id}
              roomName={selectedRoom.name}
              allRooms={allRooms.map((r) => ({ id: r.id, name: r.name }))}
            />
          </div>
        </div>
      )}

      {/* Backdrop */}
      {showWallPanel && (
        <div 
          className="fixed inset-0 bg-black/20 z-30"
          onClick={handleCloseWallPanel}
        />
      )}

      {/* Cost Summary Panel */}
      {summary && (
        <div className="mt-6">
          <div className="summary-card">
            <div className="summary-header">
              <span className="summary-title">Specification Summary</span>
              <span className="summary-count">{summary.totalBuiltUpArea.toLocaleString()} ft²</span>
            </div>
            <div className="summary-body">
              <div className="summary-row">
                <span className="summary-label">Built-up Area</span>
                <span className="summary-value">{summary.totalBuiltUpArea.toLocaleString()} ft²</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Unit Cost (per ft²)</span>
                <span className="summary-value">{formatCurrency(summary.unitCostPerSft)}</span>
              </div>
              <div className="summary-divider" />
              <div className="summary-row">
                <span className="summary-label">Grey Structure</span>
                <span className="summary-value muted">{formatCurrency(summary.greyCost)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Finishing</span>
                <span className="summary-value muted">{formatCurrency(summary.finishingCost)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">MEP</span>
                <span className="summary-value muted">{formatCurrency(summary.mepCost)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Joinery</span>
                <span className="summary-value muted">{formatCurrency(summary.joineryCost)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Foundation</span>
                <span className="summary-value muted">{formatCurrency(summary.foundationCost)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Site / Hidden</span>
                <span className="summary-value muted">{formatCurrency(summary.siteCost)}</span>
              </div>
              <div className="summary-divider" />
              <div className="summary-row total-row">
                <span className="summary-label">Total Estimate</span>
                <span className="summary-value total">{formatCurrency(summary.totalMaterialCost)}</span>
              </div>
            </div>
          </div>

          {/* Material Quantities — horizontal scroll */}
          <div className="mt-4 spec-metric-strip">
            <MetricCard label="Cement Bags" value={summary.grey.cementBags.toLocaleString()} />
            <MetricCard label="Steel (Ton)" value={summary.grey.steelTon.toFixed(2)} />
            <MetricCard label="Bricks (Nos)" value={summary.grey.bricks.toLocaleString()} />
            <MetricCard label="Sand (cft)" value={summary.grey.sandCuFt.toLocaleString()} />
            <MetricCard label="Crush (cft)" value={summary.grey.crushCuFt.toLocaleString()} />
            <MetricCard label="Light Points" value={summary.mep.lightPoints} />
            <MetricCard label="Fan Points" value={summary.mep.fanPoints} />
            <MetricCard label="Sockets" value={summary.mep.socketPoints} />
            <MetricCard label="AC Units" value={summary.mep.acUnits} />
            <MetricCard label="Paint Drums" value={summary.finishing.paintDrums} />
            <MetricCard label="Plumbing (rft)" value={summary.mep.pprcRft.toLocaleString()} />
            <MetricCard label="Flooring (ft²)" value={summary.finishing.flooringSft.toLocaleString()} />
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// METRIC CARD — Simple, memoized
// =============================================================================

interface MetricCardProps {
  label: string;
  value: string | number;
}

const MetricCard = ({ label, value }: MetricCardProps): React.ReactElement => {
  return (
    <div className="metric-card">
      <span className="metric-card-label">{label}</span>
      <span className="metric-card-value">{value}</span>
    </div>
  );
};

export default SpecView;