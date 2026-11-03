"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { INDIA_STATES_META, generateIndiaGeoJSON } from "@/data/indiaMapData";
import { MapPin, Table as TableIcon, Layers, ExternalLink, AlertTriangle, ShieldCheck } from "lucide-react";
import Link from "next/link";

// Dynamically import Leaflet components with SSR disabled
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import("react-leaflet").then((mod) => mod.GeoJSON),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("react-leaflet").then((mod) => mod.Tooltip),
  { ssr: false }
);

interface StateStat {
  state: string;
  total: number;
  open: number;
  resolved: number;
  overdue: number;
  institutions_count: number;
}

interface IndiaMapProps {
  stateStatistics: StateStat[];
}

export function IndiaMap({ stateStatistics }: IndiaMapProps) {
  const [selectedState, setSelectedState] = useState<string>("Maharashtra");
  const [activeTab, setActiveTab] = useState<"map" | "table">("map");
  const [mounted, setMounted] = useState(false);
  const [geoData, setGeoData] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    // Load local bundled GeoJSON
    try {
      const data = generateIndiaGeoJSON();
      setGeoData(data);
    } catch (e) {
      console.error("GeoJSON generation error:", e);
    }
  }, []);

  const statsMap: Record<string, StateStat> = {};
  stateStatistics.forEach((s) => {
    statsMap[s.state] = s;
  });

  const getColor = (count: number) => {
    if (count >= 25) return "#991b1b"; // Deep Red (High Volume)
    if (count >= 15) return "#ea580c"; // Saffron Red
    if (count >= 8) return "#d97706";  // Amber
    if (count >= 3) return "#2563eb";  // AICTE Blue
    return "#059669";                  // Emerald (Low Volume)
  };

  const selectedData = statsMap[selectedState] || {
    state: selectedState,
    total: 0,
    open: 0,
    resolved: 0,
    overdue: 0,
    institutions_count: 0
  };

  const styleGeoJson = (feature: any) => {
    const stateName = feature.properties?.ST_NM;
    const stat = statsMap[stateName];
    const count = stat ? stat.total : 0;
    const isSelected = selectedState === stateName;

    return {
      fillColor: getColor(count),
      weight: isSelected ? 3 : 1.5,
      opacity: 1,
      color: isSelected ? "#0f172a" : "#cbd5e1",
      dashArray: isSelected ? "" : "3",
      fillOpacity: isSelected ? 0.85 : 0.65
    };
  };

  const onEachFeature = (feature: any, layer: any) => {
    const stateName = feature.properties?.ST_NM;
    const stat = statsMap[stateName];
    const count = stat ? stat.total : 0;

    layer.on({
      click: () => {
        setSelectedState(stateName);
      },
      mouseover: (e: any) => {
        const l = e.target;
        l.setStyle({
          weight: 3,
          color: "#1e3a8a",
          fillOpacity: 0.9
        });
      },
      mouseout: (e: any) => {
        const l = e.target;
        l.setStyle(styleGeoJson(feature));
      }
    });

    layer.bindTooltip(
      `<strong>${stateName}</strong><br/>Total Complaints: ${count}<br/>Active: ${stat?.open || 0}`,
      { sticky: true }
    );
  };

  return (
    <div className="aicte-card p-6 bg-white">
      {/* Header with View Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Layers className="w-5 h-5 text-blue-900" />
            <span>Interactive India Grievance Density Map</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time state-wise complaint distribution across AICTE regulated institutions
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("map")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "map"
                ? "bg-white text-blue-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Map View</span>
          </button>
          <button
            onClick={() => setActiveTab("table")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === "table"
                ? "bg-white text-blue-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>State Fallback Table</span>
          </button>
        </div>
      </div>

      {activeTab === "map" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Canvas */}
          <div className="lg:col-span-2 h-[420px] rounded-xl overflow-hidden border border-slate-200 relative bg-slate-100">
            {mounted && geoData ? (
              <MapContainer
                center={[22.5, 82.0]}
                zoom={4}
                minZoom={3}
                maxZoom={7}
                scrollWheelZoom={false}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; AICTE Case Monitor | OpenStreetMap'
                />
                <GeoJSON
                  key={selectedState}
                  data={geoData}
                  style={styleGeoJson}
                  onEachFeature={onEachFeature}
                />
                {/* State Centroid Circle Markers for quick tapping */}
                {Object.entries(INDIA_STATES_META).map(([name, meta]) => {
                  const stat = statsMap[name];
                  const count = stat ? stat.total : 0;
                  return (
                    <CircleMarker
                      key={name}
                      center={[meta.lat, meta.lng]}
                      radius={count > 20 ? 9 : (count > 8 ? 7 : 5)}
                      pathOptions={{
                        fillColor: getColor(count),
                        color: "#ffffff",
                        weight: 1.5,
                        fillOpacity: 0.95
                      }}
                      eventHandlers={{
                        click: () => setSelectedState(name)
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -5]}>
                        <span>{name}: {count} cases</span>
                      </Tooltip>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                Initializing Leaflet spatial engine...
              </div>
            )}

            {/* Map Legend */}
            <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-xs p-2.5 rounded-lg border border-slate-200 shadow-md text-[11px] space-y-1">
              <div className="font-semibold text-slate-700 mb-1">Complaints Intensity</div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-xs bg-[#991b1b]"></span>
                <span className="text-slate-600">Critical (&gt; 25)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-xs bg-[#ea580c]"></span>
                <span className="text-slate-600">High (15-24)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-xs bg-[#d97706]"></span>
                <span className="text-slate-600">Moderate (8-14)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-xs bg-[#2563eb]"></span>
                <span className="text-slate-600">Low (3-7)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-xs bg-[#059669]"></span>
                <span className="text-slate-600">Minimal (0-2)</span>
              </div>
            </div>
          </div>

          {/* Selected State Telemetry Card */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                  Selected State
                </span>
                <span className="text-xs text-slate-500">Click map or circle to switch</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">
                {selectedData.state}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Region: {INDIA_STATES_META[selectedData.state]?.region || "India"} • Regulated Institutions: {selectedData.institutions_count}
              </p>

              {/* State Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <div className="text-[10px] font-medium text-slate-500 uppercase">Total Cases</div>
                  <div className="text-xl font-extrabold text-slate-900 mt-0.5">{selectedData.total}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <div className="text-[10px] font-medium text-slate-500 uppercase">Active / Open</div>
                  <div className="text-xl font-extrabold text-amber-600 mt-0.5">{selectedData.open}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <div className="text-[10px] font-medium text-slate-500 uppercase">Resolved</div>
                  <div className="text-xl font-extrabold text-emerald-600 mt-0.5">{selectedData.resolved}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                  <div className="text-[10px] font-medium text-slate-500 uppercase">Overdue SLA</div>
                  <div className="text-xl font-extrabold text-rose-600 mt-0.5">{selectedData.overdue}</div>
                </div>
              </div>

              {/* Status Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Resolution Ratio</span>
                  <span className="font-semibold">
                    {selectedData.total > 0
                      ? Math.round((selectedData.resolved / selectedData.total) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                  <div
                    style={{
                      width: `${selectedData.total > 0 ? (selectedData.resolved / selectedData.total) * 100 : 0}%`
                    }}
                    className="bg-emerald-500 h-full"
                  />
                  <div
                    style={{
                      width: `${selectedData.total > 0 ? (selectedData.open / selectedData.total) * 100 : 0}%`
                    }}
                    className="bg-amber-500 h-full"
                  />
                  <div
                    style={{
                      width: `${selectedData.total > 0 ? (selectedData.overdue / selectedData.total) * 100 : 0}%`
                    }}
                    className="bg-rose-500 h-full"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <Link
                href={`/complaints?state=${encodeURIComponent(selectedData.state)}`}
                className="w-full inline-flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-blue-900 text-white hover:bg-blue-800 text-xs font-semibold shadow-xs transition-colors"
              >
                <span>Filter All Complaints in {selectedData.state}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* State Fallback Table */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">State / Union Territory</th>
                <th className="py-2.5 px-3">Region</th>
                <th className="py-2.5 px-3 text-right">Institutions</th>
                <th className="py-2.5 px-3 text-right">Total Cases</th>
                <th className="py-2.5 px-3 text-right">Open Cases</th>
                <th className="py-2.5 px-3 text-right">Resolved</th>
                <th className="py-2.5 px-3 text-right">Overdue SLA</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stateStatistics.map((st) => (
                <tr key={st.state} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{st.state}</td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {INDIA_STATES_META[st.state]?.region || "General"}
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium">{st.institutions_count}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">{st.total}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-amber-600">{st.open}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-emerald-600">{st.resolved}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-rose-600">
                    {st.overdue > 0 ? (
                      <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                        {st.overdue}
                      </span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <Link
                      href={`/complaints?state=${encodeURIComponent(st.state)}`}
                      className="text-blue-700 hover:text-blue-900 font-semibold text-[11px]"
                    >
                      View Desk &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
