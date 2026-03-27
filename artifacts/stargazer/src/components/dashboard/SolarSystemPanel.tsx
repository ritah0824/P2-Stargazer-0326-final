import React from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { CircleDot, Target, ArrowUpRight, AlertCircle } from "lucide-react";
import { useGetSolarSystemPositions } from "@workspace/api-client-react";
import { useLocation } from "@/hooks/use-location";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, LabelList, Cell,
} from "recharts";

function EphemerisTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-black/85 border border-white/10 rounded-lg px-3 py-2 text-xs backdrop-blur-sm">
      <p className="text-white font-bold mb-1.5">{d?.fullName}</p>
      <p className="text-emerald-400">↑ Alt: {d?.altitude?.toFixed(1)}°</p>
      <p className="text-amber-400">⊙ Az: {d?.azimuth?.toFixed(1)}°</p>
      <p className={`mt-1 ${d?.isVisible ? "text-emerald-400" : "text-white/30"}`}>
        {d?.isVisible ? "● Above horizon" : "● Below horizon"}
      </p>
    </div>
  );
}

function SymbolTick({ x, y, payload, objects }: any) {
  const obj = objects?.find((o: any) => o.symbol === payload.value);
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0} y={0} dy={11}
        textAnchor="middle"
        fill="rgba(255,255,255,0.7)"
        fontSize={12}
        fontFamily="sans-serif"
      >
        {payload.value}
      </text>
      {obj?.isVisible && (
        <circle
          cx={0} cy={20} r={3}
          fill="#22c55e"
          style={{ filter: "drop-shadow(0 0 4px #22c55e)" }}
        />
      )}
      {!obj?.isVisible && (
        <circle cx={0} cy={20} r={2.5} fill="rgba(255,255,255,0.12)" />
      )}
    </g>
  );
}

function AltLabel({ x, y, width, value, index, objects }: any) {
  if (value == null || width < 16) return null;
  const obj = objects?.[index];
  const positive = (value ?? 0) >= 0;
  const labelY = positive ? (y ?? 0) - 4 : (y ?? 0) + 12;
  return (
    <text
      x={(x ?? 0) + (width ?? 0) / 2}
      y={labelY}
      textAnchor="middle"
      fontSize={9}
      fill={positive ? "#34d399" : "#f87171"}
      fontFamily="monospace"
    >
      {(value as number).toFixed(0)}°
    </text>
  );
}

function AzLabel({ x, y, width, value }: any) {
  if (value == null || width < 16) return null;
  return (
    <text
      x={(x ?? 0) + (width ?? 0) / 2}
      y={(y ?? 0) - 4}
      textAnchor="middle"
      fontSize={9}
      fill="#fbbf24"
      fontFamily="monospace"
    >
      {(value as number).toFixed(0)}°
    </text>
  );
}

export function SolarSystemPanel() {
  const { location } = useLocation();
  const { data, isLoading, error } = useGetSolarSystemPositions(
    { lat: location.lat, lon: location.lon },
    { query: { refetchInterval: 60000 } }
  );

  if (isLoading) {
    return (
      <GlassCard className="h-full p-6 flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse">Tracking planetary bodies...</p>
      </GlassCard>
    );
  }

  if (error || !data) {
    return (
      <GlassCard className="h-full p-6 flex flex-col justify-center items-center text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <p className="text-white font-medium">Ephemeris Offline</p>
      </GlassCard>
    );
  }

  const allObjects = [...data.planets, data.sun, data.moon].sort(
    (a, b) => b.altitude - a.altitude
  );

  const chartData = allObjects.map(obj => ({
    symbol:    obj.symbol,
    fullName:  obj.name,
    altitude:  parseFloat(obj.altitude.toFixed(1)),
    azimuth:   parseFloat(obj.azimuth.toFixed(1)),
    isVisible: obj.isVisible,
  }));

  const maxAlt = Math.max(...allObjects.map(o => o.altitude), 30);
  const minAlt = Math.min(...allObjects.map(o => o.altitude), -30);
  const altDomain: [number, number] = [
    Math.floor(minAlt / 15) * 15,
    Math.ceil(maxAlt / 15) * 15,
  ];

  return (
    <GlassCard glowColor="accent" className="p-6 h-full">
      <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-display font-semibold text-white flex items-center gap-2">
          <CircleDot className="w-5 h-5 text-accent" /> Planetary Ephemeris
        </h2>
        <Badge variant="outline" className="border-accent/30 text-accent bg-accent/10">
          Local Horizon
        </Badge>
      </div>

      <div className="mb-8 rounded-xl bg-white/[0.03] border border-white/[0.06] px-2 pt-3 pb-1">
        <div className="flex items-center gap-4 mb-2 px-2">
          <span className="flex items-center gap-1.5 text-[10px] text-white/50 uppercase tracking-wider">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/70 inline-block" />
            Altitude °
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-white/50 uppercase tracking-wider">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400/70 inline-block" />
            Azimuth °
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-white/50 uppercase tracking-wider ml-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" style={{ boxShadow: "0 0 5px #22c55e" }} />
            visible &nbsp;
            <span className="w-2 h-2 rounded-full bg-white/15 inline-block" />
            below horizon
          </span>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={chartData}
            margin={{ top: 16, right: 4, left: 4, bottom: 28 }}
            barGap={2}
            barCategoryGap="20%"
          >
            <YAxis
              yAxisId="alt"
              domain={altDomain}
              hide
            />
            <YAxis
              yAxisId="az"
              domain={[0, 360]}
              orientation="right"
              hide
            />

            <ReferenceLine
              yAxisId="alt"
              y={0}
              stroke="rgba(255,255,255,0.18)"
              strokeDasharray="4 3"
            />

            <XAxis
              dataKey="symbol"
              tick={<SymbolTick objects={allObjects} />}
              tickLine={false}
              axisLine={false}
              height={32}
            />

            <Tooltip
              content={<EphemerisTooltip />}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />

            <Bar yAxisId="alt" dataKey="altitude" name="Altitude" radius={[3, 3, 0, 0]} maxBarSize={18}>
              {chartData.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.isVisible ? "rgba(52,211,153,0.75)" : "rgba(248,113,113,0.45)"}
                  stroke={d.isVisible ? "rgba(52,211,153,0.4)" : "rgba(248,113,113,0.2)"}
                  strokeWidth={1}
                />
              ))}
              <LabelList content={<AltLabel objects={allObjects} />} />
            </Bar>

            <Bar yAxisId="az" dataKey="azimuth" name="Azimuth" radius={[3, 3, 0, 0]} maxBarSize={18}>
              {chartData.map((_, i) => (
                <Cell
                  key={i}
                  fill="rgba(251,191,36,0.60)"
                  stroke="rgba(251,191,36,0.30)"
                  strokeWidth={1}
                />
              ))}
              <LabelList content={<AzLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        {allObjects.map((obj, i) => (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            key={obj.name}
            className={`px-4 py-3 rounded-xl border flex items-center justify-between transition-all ${
              obj.isVisible
                ? "bg-white/5 border-white/10 hover:bg-white/10"
                : "bg-black/20 border-white/5 opacity-55"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-full flex items-center justify-center font-display text-2xl shadow-inner shrink-0 ${
                obj.name === "Sun"  ? "bg-orange-500/20 text-orange-400" :
                obj.name === "Moon" ? "bg-gray-400/20 text-gray-200" :
                "bg-accent/20 text-accent"
              }`}>
                {obj.symbol}
              </div>
              <div>
                <p className="text-lg font-bold text-white flex items-center gap-2 leading-tight">
                  {obj.name}
                  {obj.isVisible
                    ? <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse" />
                    : <span className="w-2 h-2 rounded-full bg-white/15" />
                  }
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">
                  {obj.constellation}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-right">
              <div className="hidden sm:block">
                <p className="text-xs text-muted-foreground uppercase flex items-center justify-end gap-1 mb-0.5">
                  <ArrowUpRight className="w-3 h-3" /> Altitude
                </p>
                <p className={`text-xl font-mono font-semibold ${obj.altitude > 0 ? "text-starlight" : "text-muted-foreground"}`}>
                  {obj.altitude.toFixed(1)}°
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase flex items-center justify-end gap-1 mb-0.5">
                  <Target className="w-3 h-3" /> Azimuth
                </p>
                <p className="text-xl font-mono font-semibold text-starlight">
                  {obj.azimuth.toFixed(1)}°
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      </div>
    </GlassCard>
  );
}
