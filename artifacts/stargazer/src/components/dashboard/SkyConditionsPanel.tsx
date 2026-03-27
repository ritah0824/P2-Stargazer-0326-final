import React from "react";
import { GlassCard } from "@/components/ui/glass-card";
import {
  Moon, Cloud, Sun, Star, AlertCircle, Target,
  Thermometer, Wind, Droplets, Eye, CloudRain
} from "lucide-react";
import { useGetSkyConditions, useGetSkyWeather } from "@workspace/api-client-react";
import { useLocation } from "@/hooks/use-location";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";

export function SkyConditionsPanel() {
  const { location } = useLocation();
  const params = { lat: location.lat, lon: location.lon };
  const queryOpts = { query: { refetchInterval: 60000 } };

  const { data, isLoading, error } = useGetSkyConditions(params, queryOpts);
  const { data: weather, isLoading: weatherLoading } = useGetSkyWeather(params, queryOpts);

  if (isLoading) {
    return (
      <GlassCard className="h-full p-6 flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse">Analyzing atmosphere...</p>
      </GlassCard>
    );
  }

  if (error || !data) {
    return (
      <GlassCard className="h-full p-6 flex flex-col justify-center items-center text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <p className="text-white font-medium">Telemetry Offline</p>
        <p className="text-xs text-muted-foreground mt-1">Unable to fetch sky conditions</p>
      </GlassCard>
    );
  }

  const { moonPhase, bortle, skyQuality, astronomicalTwilight, isNight, siderealTime, sunAltitude } = data;

  const bortleColors = [
    "bg-black", "bg-gray-900", "bg-blue-900", "bg-blue-800",
    "bg-indigo-700", "bg-purple-700", "bg-pink-600", "bg-orange-500", "bg-red-500"
  ];

  const skyScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-cyan-400";
    if (score >= 40) return "text-yellow-400";
    if (score >= 20) return "text-orange-400";
    return "text-red-400";
  };

  const cloudChartData = (weather?.hourlyCloudCover ?? []).map(p => ({
    t: format(parseISO(p.time), "HH:mm"),
    v: p.value,
  }));

  const tempChartData = (weather?.hourlyTemperature ?? []).map(p => ({
    t: format(parseISO(p.time), "HH:mm"),
    v: p.value,
  }));

  const windDirLabel = (deg: number) => {
    const dirs = ["N","NE","E","SE","S","SW","W","NW"];
    return dirs[Math.round(deg / 45) % 8];
  };

  return (
    <GlassCard glowColor="secondary" className="p-5 h-full">
      <div className="flex flex-col gap-5 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-semibold text-white flex items-center gap-2">
          <Cloud className="w-5 h-5 text-secondary" /> Sky Conditions
        </h2>
        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-starlight">
          LST {siderealTime}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center relative overflow-hidden shadow-[inset_-3px_-3px_8px_rgba(0,0,0,0.5)] shrink-0">
            <Moon className="w-5 h-5 text-starlight drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]" />
            <div
              className="absolute inset-0 bg-black/60 mix-blend-multiply"
              style={{
                width: `${100 - moonPhase.illumination}%`,
                left: (moonPhase.phase.includes("waxing") || moonPhase.phase === "first_quarter") ? 0 : "auto",
                right: (moonPhase.phase.includes("waning") || moonPhase.phase === "last_quarter") ? 0 : "auto",
              }}
            />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Moon</p>
            <p className="text-sm font-semibold text-white capitalize leading-tight break-words">{moonPhase.phase.replace(/_/g, " ")}</p>
            <p className="text-xs text-primary font-mono">{moonPhase.illumination.toFixed(1)}% illum</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex flex-col justify-center">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Light Pollution</p>
              <p className="text-sm font-semibold text-white capitalize">{skyQuality} Sky</p>
            </div>
            <span className="text-xl font-display font-bold text-secondary">{bortle}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden flex">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-full opacity-20 ${bortleColors[i]} ${i + 1 <= bortle ? "!opacity-100" : ""}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          {
            icon: <Cloud className="w-5 h-5 text-blue-400" />,
            label: "Cloud Cover",
            value: weatherLoading ? "—" : `${weather?.cloudCover ?? "—"}%`,
            sub: null,
          },
          {
            icon: <Moon className="w-5 h-5 text-starlight" />,
            label: "Moon Illumination",
            value: `${moonPhase.illumination.toFixed(0)}%`,
            sub: null,
          },
          {
            icon: <Thermometer className="w-5 h-5 text-orange-400" />,
            label: "Temperature",
            value: weatherLoading ? "—" : `${weather?.temperature ?? "—"}°C`,
            sub: weather ? `Dew ${weather.dewPoint}°C` : null,
          },
          {
            icon: <Wind className="w-5 h-5 text-cyan-400" />,
            label: "Wind Speed",
            value: weatherLoading ? "—" : `${weather?.windSpeed ?? "—"} km/h`,
            sub: weather ? windDirLabel(weather.windDirection) : null,
          },
        ].map(({ icon, label, value, sub }) => (
          <div key={label} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3">
            <div className="mt-0.5">{icon}</div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className="text-base font-bold text-white leading-tight">{value}</p>
              {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
            </div>
          </div>
        ))}

        <div className="col-span-2 p-4 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3">
          <Droplets className="w-5 h-5 text-emerald-400 mt-0.5" />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Air Quality (AQI)</p>
            <p className="text-base font-bold text-white leading-tight">
              {weatherLoading ? "—" : weather?.aqi != null ? weather.aqi : "N/A"}
            </p>
            {weather?.aqiCategory && (
              <p className="text-[10px] text-muted-foreground">{weather.aqiCategory}</p>
            )}
          </div>
          {!weatherLoading && weather?.visibility != null && (
            <div className="ml-auto text-right">
              <Eye className="w-4 h-4 text-muted-foreground ml-auto mb-0.5" />
              <p className="text-[10px] text-muted-foreground uppercase">Visibility</p>
              <p className="text-sm font-bold text-white">{weather.visibility} km</p>
            </div>
          )}
        </div>
      </div>

      {weather && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-gradient-to-br from-indigo-950/60 to-black/60 border border-white/10 p-5 text-center"
        >
          <p className={`text-6xl font-display font-black mb-1 ${skyScoreColor(weather.skyScore)}`}>
            {weather.skyScore}
          </p>
          <p className={`text-lg font-semibold mb-2 ${skyScoreColor(weather.skyScore)}`}>
            {weather.skyScoreLabel.toUpperCase()}
          </p>
          <p className="text-xs text-muted-foreground">{weather.skyScoreMessage}</p>
        </motion.div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
          <Sun className="w-4 h-4 text-accent mx-auto mb-1 opacity-80" />
          <p className="text-[10px] text-muted-foreground uppercase">Sun Alt</p>
          <p className="text-sm font-mono text-white">{sunAltitude.toFixed(1)}°</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
          {isNight ? (
            <Star className="w-4 h-4 text-secondary mx-auto mb-1 opacity-80" />
          ) : (
            <CloudRain className="w-4 h-4 text-blue-400 mx-auto mb-1 opacity-80" />
          )}
          <p className="text-[10px] text-muted-foreground uppercase">Status</p>
          <p className="text-sm font-semibold text-white">{isNight ? "Night" : "Day"}</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center">
          <Target className="w-4 h-4 text-primary mx-auto mb-1 opacity-80" />
          <p className="text-[10px] text-muted-foreground uppercase">Dark Sky</p>
          <p className="text-xs font-semibold">
            {astronomicalTwilight ? (
              <span className="text-green-400">Optimal</span>
            ) : (
              <span className="text-orange-400">Sub-opt</span>
            )}
          </p>
        </div>
      </div>

      {!weatherLoading && weather && cloudChartData.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-black/40 border border-white/5 p-4">
            <p className="text-xs font-semibold text-white/70 mb-3">24-Hour Cloud Cover Forecast</p>
            <ResponsiveContainer width="100%" height={110}>
              <LineChart data={cloudChartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="t"
                  tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 9 }}
                  interval={3}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                  itemStyle={{ color: "#60a5fa" }}
                  formatter={(v: number) => [`${v}%`, "Cloud Cover"]}
                />
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#60a5fa" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl bg-black/40 border border-white/5 p-4">
            <p className="text-xs font-semibold text-white/70 mb-3">24-Hour Temperature Forecast</p>
            <ResponsiveContainer width="100%" height={110}>
              <LineChart data={tempChartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="t"
                  tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 9 }}
                  interval={3}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                  itemStyle={{ color: "#f59e0b" }}
                  formatter={(v: number) => [`${v}°C`, "Temperature"]}
                />
                <Line
                  type="monotone"
                  dataKey="v"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "#f59e0b" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      </div>
    </GlassCard>
  );
}
