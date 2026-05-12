import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Calculator,
  FileText,
  Settings,
  Layers,
  ArrowRight,
  Hammer,
  Info,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

// =============================================================================
// TYPES
// =============================================================================

interface MaterialRates {
  cement: number;
  steel: number;
  bricks: number;
  sand: number;
  crush: number;
  labor_grey: number;
  paint: number;
  tiles_avg: number;
}

interface Room {
  id: string;
  type: RoomType;
  name: string;
  l: number;
  w: number;
  h: number;
}

interface Floor {
  id: string;
  name: string;
  rooms: Room[];
}

interface Project {
  name: string;
  location: string;
  floors: Floor[];
}

type RoomType = 'bedroom' | 'kitchen' | 'toilet' | 'lounge' | 'dining' | 'porch' | 'corridor';

interface RoomTypeConfig {
  id: RoomType;
  name: string;
  icon: string;
}

interface BOQResult {
  mep: number;
  finishing: number;
  totalArea: number;
  materials: {
    cement: number;
    steel: number;
    bricks: number;
    sand: number;
    crush: number;
  };
  civilCost: number;
  chartData: Array<{ name: string; value: number; color: string }>;
  grandTotal: number;
}

// =============================================================================
// CONSTANTS - Construction Thumb Rules
// =============================================================================

const DEFAULT_RATES: MaterialRates = {
  cement: 1450,
  steel: 265000,
  bricks: 18,
  sand: 105,
  crush: 120,
  labor_grey: 500,
  paint: 12000,
  tiles_avg: 2500,
};

const ROOM_TYPES: RoomTypeConfig[] = [
  { id: 'bedroom', name: 'Bedroom', icon: '🛏️' },
  { id: 'kitchen', name: 'Kitchen', icon: '🍳' },
  { id: 'toilet', name: 'Toilet/Bath', icon: '🚿' },
  { id: 'lounge', name: 'Lounge/Living', icon: '📺' },
  { id: 'dining', name: 'Dining Area', icon: '🍽️' },
  { id: 'porch', name: 'Covered Porch', icon: '🚗' },
  { id: 'corridor', name: 'Corridor', icon: '🚶' },
];

// Construction calculation constants
const CALC = {
  // Bricks: wall area (sq ft) × 0.75 (mortar gap factor) × 13.5 (bricks per sq ft)
  bricksPerSqFt: 0.75 * 13.5,

  // Cement: (brick count / 100) bags + (wall area / 50) bags for plastering
  cementBrickFactor: 1 / 100,
  cementPlasterFactor: 1 / 50,

  // Steel: 4 kg per sq ft of floor area (average for residential)
  steelKgPerSqFt: 4,

  // Sand: 0.5 cu ft per sq ft
  sandCuFtPerSqFt: 0.5,

  // Crush: 0.4 cu ft per sq ft
  crushCuFtPerSqFt: 0.4,

  // MEP base cost per room (PKR)
  mepBaseRoom: 15000,
  mepToiletPremium: 45000,
  mepKitchenPremium: 30000,

  // Finishing cost per sq ft (PKR)
  finishingBaseRate: 350,
  finishingWallRate: 150,
} as const;

// =============================================================================
// PURE CALCULATION FUNCTIONS
// =============================================================================

function calculateRoomArea(room: Room): number {
  return room.l * room.w;
}

function calculateWallArea(room: Room): number {
  const perimeter = 2 * (room.l + room.w);
  return perimeter * room.h;
}

function calculateBricks(wallArea: number): number {
  return wallArea * CALC.bricksPerSqFt;
}

function calculateCement(wallArea: number, brickCount: number): number {
  return (brickCount * CALC.cementBrickFactor) + (wallArea * CALC.cementPlasterFactor);
}

function calculateSteel(floorArea: number): number {
  return floorArea * CALC.steelKgPerSqFt;
}

function calculateSand(floorArea: number): number {
  return floorArea * CALC.sandCuFtPerSqFt;
}

function calculateCrush(floorArea: number): number {
  return floorArea * CALC.crushCuFtPerSqFt;
}

function calculateRoomMEP(roomType: RoomType): number {
  let cost = CALC.mepBaseRoom;
  if (roomType === 'toilet') cost += CALC.mepToiletPremium;
  if (roomType === 'kitchen') cost += CALC.mepKitchenPremium;
  return cost;
}

function calculateRoomFinishing(roomType: RoomType, floorArea: number, wallArea: number): number {
  let cost = floorArea * CALC.finishingBaseRate;
  if (roomType === 'toilet' || roomType === 'kitchen') {
    cost += wallArea * CALC.finishingWallRate;
  }
  return cost;
}

function calculateBOQ(
  project: Project,
  rates: MaterialRates,
  wastageFactor: number
): BOQResult {
  const totals = {
    mep: 0,
    finishing: 0,
    totalArea: 0,
    materials: {
      cement: 0,
      steel: 0,
      bricks: 0,
      sand: 0,
      crush: 0,
    },
  };

  for (const floor of project.floors) {
    for (const room of floor.rooms) {
      const floorArea = calculateRoomArea(room);
      const wallArea = calculateWallArea(room);
      totals.totalArea += floorArea;

      // Civil materials
      const brickCount = calculateBricks(wallArea);
      totals.materials.bricks += brickCount;
      totals.materials.cement += calculateCement(wallArea, brickCount);
      totals.materials.steel += calculateSteel(floorArea);
      totals.materials.sand += calculateSand(floorArea);
      totals.materials.crush += calculateCrush(floorArea);

      // MEP and Finishing
      totals.mep += calculateRoomMEP(room.type);
      totals.finishing += calculateRoomFinishing(room.type, floorArea, wallArea);
    }
  }

  const multiplier = 1 + wastageFactor / 100;
  const civilCost =
    ((totals.materials.cement * rates.cement) +
      ((totals.materials.steel / 1000) * rates.steel) +
      totals.materials.bricks * rates.bricks +
      totals.totalArea * rates.labor_grey) *
    multiplier;

  const chartData = [
    { name: 'Civil Works', value: Math.round(civilCost), color: '#1d4ed8' },
    { name: 'MEP Services', value: Math.round(totals.mep), color: '#3b82f6' },
    { name: 'Finishing', value: Math.round(totals.finishing), color: '#10b981' },
  ];

  return {
    ...totals,
    civilCost,
    chartData,
    grandTotal: civilCost + totals.mep + totals.finishing,
  };
}

// =============================================================================
// APP COMPONENT
// =============================================================================

type TabType = 'input' | 'rates' | 'report';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export default function App(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<TabType>('input');
  const [wastageFactor, setWastageFactor] = useState<number>(10);
  const [rates, setRates] = useState<MaterialRates>(DEFAULT_RATES);
  const [project, setProject] = useState<Project>({
    name: 'My Dream Home',
    location: 'Construction Site',
    floors: [
      {
        id: 'f1',
        name: 'Ground Floor',
        rooms: [
          { id: 'r1', type: 'bedroom', name: 'Master Bed', l: 14, w: 12, h: 11 },
          { id: 'r2', type: 'toilet', name: 'Attach Bath', l: 8, w: 6, h: 11 },
          { id: 'r3', type: 'kitchen', name: 'Main Kitchen', l: 10, w: 10, h: 11 },
        ],
      },
    ],
  });

  const boqData = useMemo<BOQResult>(
    () => calculateBOQ(project, rates, wastageFactor),
    [project, rates, wastageFactor]
  );

  const addFloor = (): void => {
    const newFloor: Floor = {
      id: generateId(),
      name: `Floor ${project.floors.length + 1}`,
      rooms: [],
    };
    setProject({ ...project, floors: [...project.floors, newFloor] });
  };

  const addRoom = (floorId: string): void => {
    const newRoom: Room = {
      id: generateId(),
      type: 'bedroom',
      name: 'New Room',
      l: 12,
      w: 12,
      h: 10,
    };
    setProject({
      ...project,
      floors: project.floors.map((f) =>
        f.id === floorId ? { ...f, rooms: [...f.rooms, newRoom] } : f
      ),
    });
  };

  const updateRoom = (
    floorId: string,
    roomId: string,
    field: keyof Room,
    value: string | number
  ): void => {
    setProject({
      ...project,
      floors: project.floors.map((f) =>
        f.id === floorId
          ? {
              ...f,
              rooms: f.rooms.map((r) =>
                r.id === roomId ? { ...r, [field]: value } : r
              ),
            }
          : f
      ),
    });
  };

  const deleteRoom = (floorId: string, roomId: string): void => {
    setProject({
      ...project,
      floors: project.floors.map((f) =>
        f.id === floorId
          ? { ...f, rooms: f.rooms.filter((r) => r.id !== roomId) }
          : f
      ),
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      {/* Navbar */}
      <nav className="bg-blue-700 text-white p-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-6 h-6" />
            <h1 className="font-bold text-xl">BuildCalc PRO</h1>
          </div>
          <div className="flex bg-blue-800 rounded-lg p-1">
            {(['input', 'rates', 'report'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-white text-blue-700 shadow'
                    : 'hover:bg-blue-600'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {/* INPUT VIEW */}
        {activeTab === 'input' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  className="w-full text-lg font-bold border-b focus:border-blue-500 outline-none py-1"
                  value={project.name}
                  onChange={(e) =>
                    setProject({ ...project, name: e.target.value })
                  }
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-400 uppercase block mb-1">
                  Location
                </label>
                <input
                  type="text"
                  className="w-full text-lg font-bold border-b focus:border-blue-500 outline-none py-1"
                  value={project.location}
                  onChange={(e) =>
                    setProject({ ...project, location: e.target.value })
                  }
                />
              </div>
            </div>

            {project.floors.map((floor) => (
              <div
                key={floor.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
              >
                <div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center">
                  <h3 className="font-bold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" /> {floor.name}
                  </h3>
                  <button
                    onClick={() => addRoom(floor.id)}
                    className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md flex items-center gap-1 hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Room
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                      <tr>
                        <th className="px-6 py-3">Room / Type</th>
                        <th className="px-6 py-3">L (ft)</th>
                        <th className="px-6 py-3">W (ft)</th>
                        <th className="px-6 py-3">H (ft)</th>
                        <th className="px-6 py-3 text-right">Sq Ft</th>
                        <th className="px-6 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {floor.rooms.map((room) => (
                        <tr
                          key={room.id}
                          className="hover:bg-slate-50 transition-colors group"
                        >
                          <td className="px-6 py-4 flex items-center gap-2">
                            <select
                              value={room.type}
                              onChange={(e) =>
                                updateRoom(
                                  floor.id,
                                  room.id,
                                  'type',
                                  e.target.value as RoomType
                                )
                              }
                              className="text-xl"
                            >
                              {ROOM_TYPES.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.icon}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={room.name}
                              onChange={(e) =>
                                updateRoom(floor.id, room.id, 'name', e.target.value)
                              }
                              className="font-medium bg-transparent border-b border-transparent group-hover:border-slate-200 focus:border-blue-500 outline-none"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              className="w-12 border rounded p-1 text-center"
                              value={room.l}
                              onChange={(e) =>
                                updateRoom(
                                  floor.id,
                                  room.id,
                                  'l',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              className="w-12 border rounded p-1 text-center"
                              value={room.w}
                              onChange={(e) =>
                                updateRoom(
                                  floor.id,
                                  room.id,
                                  'w',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="number"
                              className="w-12 border rounded p-1 text-center"
                              value={room.h}
                              onChange={(e) =>
                                updateRoom(
                                  floor.id,
                                  room.id,
                                  'h',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                            />
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-slate-500">
                            {calculateRoomArea(room).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => deleteRoom(floor.id, room.id)}
                              className="text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            <button
              onClick={addFloor}
              className="w-full border-2 border-dashed border-slate-200 py-6 rounded-xl text-slate-400 hover:bg-slate-100 transition-all flex items-center justify-center gap-2 font-bold uppercase text-xs tracking-widest"
            >
              <Plus className="w-4 h-4" /> Add Next Floor level
            </button>
          </div>
        )}

        {/* RATES VIEW */}
        {activeTab === 'rates' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4" /> Material Unit Rates
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(Object.entries(rates) as [keyof MaterialRates, number][]).map(
                  ([key, val]) => (
                    <div key={key} className="p-3 bg-slate-50 rounded-lg border">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                        {key.replace('_', ' ')}
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-xs">Rs.</span>
                        <input
                          type="number"
                          value={val}
                          onChange={(e) =>
                            setRates({
                              ...rates,
                              [key]: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="bg-transparent font-mono font-bold w-full outline-none"
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-blue-900 flex items-center gap-2">
                  <Info className="w-4 h-4" /> Contingency & Wastage
                </h3>
                <span className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold">
                  +{wastageFactor}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                value={wastageFactor}
                onChange={(e) => setWastageFactor(parseInt(e.target.value))}
                className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-xs text-blue-600/70 mt-3 italic">
                Standard practice suggests 10-12% buffer for overlapping steel and
                brick breakage.
              </p>
            </div>
          </div>
        )}

        {/* REPORT VIEW */}
        {activeTab === 'report' && (
          <div className="space-y-6">
            {/* Visual Header */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border shadow-sm lg:col-span-2">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-4">
                  Cost Distribution
                </h3>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={boqData.chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {boqData.chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => `Rs. ${Number(value).toLocaleString()}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-around mt-4">
                  {boqData.chartData.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-600 p-8 rounded-xl text-white shadow-lg flex flex-col justify-center">
                <p className="text-xs font-bold text-blue-200 uppercase mb-2">
                  Total Project Estimate
                </p>
                <h2 className="text-4xl font-black mb-4">
                  Rs. {Math.round(boqData.grandTotal).toLocaleString()}
                </h2>
                <div className="space-y-2 border-t border-blue-500 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-100">Total Covered Area</span>
                    <span className="font-bold">
                      {boqData.totalArea.toLocaleString()} ft²
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-100">Unit Cost (per ft²)</span>
                    <span className="font-bold">
                      Rs.{' '}
                      {Math.round(
                        boqData.grandTotal / (boqData.totalArea || 1)
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="bg-slate-800 text-white px-6 py-3 font-bold flex items-center gap-2">
                <Hammer className="w-4 h-4" /> Civil &amp; Grey Structure Details
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-slate-500 font-bold">
                    <th className="px-6 py-3 text-left">Item Description</th>
                    <th className="px-6 py-3 text-right">Quantity</th>
                    <th className="px-6 py-3 text-right">Unit</th>
                    <th className="px-6 py-3 text-right">Total PKR</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="px-6 py-4 font-medium">
                      Cement (Standard OPC)
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      {Math.ceil(boqData.materials.cement)}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-400 uppercase text-[10px]">
                      Bags
                    </td>
                    <td className="px-6 py-4 text-right font-bold">
                      {(
                        Math.ceil(boqData.materials.cement) * rates.cement
                      ).toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-medium">
                      Reinforcement Steel (Grade 60)
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      {(boqData.materials.steel / 1000).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-400 uppercase text-[10px]">
                      Tons
                    </td>
                    <td className="px-6 py-4 text-right font-bold">
                      {Math.round(
                        (boqData.materials.steel / 1000) * rates.steel
                      ).toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 font-medium">Bricks (A-Class)</td>
                    <td className="px-6 py-4 text-right font-mono">
                      {Math.ceil(boqData.materials.bricks).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-400 uppercase text-[10px]">
                      Nos
                    </td>
                    <td className="px-6 py-4 text-right font-bold">
                      {Math.round(
                        Math.ceil(boqData.materials.bricks) * rates.bricks
                      ).toLocaleString()}
                    </td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="px-6 py-4 font-bold text-blue-600">
                      Total Civil Component
                    </td>
                    <td colSpan={3} className="px-6 py-4 text-right font-black text-blue-600 text-lg">
                      Rs. {Math.round(boqData.civilCost).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-center gap-4 pt-4">
              <button
                onClick={() => window.print()}
                className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-900 transition-all shadow-md"
              >
                <FileText className="w-5 h-5" /> Generate PDF Report
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Button for Summary */}
      {activeTab !== 'report' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-xl bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center z-40 border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Running Estimate
              </p>
              <p className="text-xl font-black">
                Rs. {Math.round(boqData.grandTotal).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('report')}
            className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2"
          >
            Review Report <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
