import React, { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Sparkles, Telescope, ChevronRight, AlertCircle, ArrowUp, ArrowDown } from "lucide-react";
import { useGetVisibleObjects } from "@workspace/api-client-react";
import { useLocation } from "@/hooks/use-location";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

export function VisibleObjectsPanel() {
  const { location } = useLocation();
  const [filter, setFilter] = useState<string>("all");
  
  const { data, isLoading, error } = useGetVisibleObjects(
    { lat: location.lat, lon: location.lon },
    { query: { refetchInterval: 60000 } }
  );

  if (isLoading) {
    return (
      <GlassCard className="h-[400px] p-6 flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse">Scanning the cosmos...</p>
      </GlassCard>
    );
  }

  if (error || !data) {
    return (
      <GlassCard className="h-[400px] p-6 flex flex-col justify-center items-center text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <p className="text-white font-medium">Deep Space Array Offline</p>
      </GlassCard>
    );
  }

  const objects = data.objects.filter(obj => filter === "all" || obj.type === filter);
  
  const types = ["all", ...Array.from(new Set(data.objects.map(o => o.type)))];

  const getBadgeVariant = (type: string) => {
    switch(type) {
      case 'planet': return 'planet';
      case 'star': return 'star';
      case 'galaxy': case 'nebula': case 'cluster': return 'deepsky';
      default: return 'default';
    }
  };

  return (
    <GlassCard glowColor="primary" className="p-6 flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-xl font-display font-semibold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" /> Notable Targets
        </h2>
        
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
          {types.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                filter === t 
                  ? "bg-primary/30 text-primary border border-primary/50" 
                  : "bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {objects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
          <Telescope className="w-12 h-12 mb-3 opacity-20" />
          <p>No objects visible matching this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {objects.map((obj, i) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                key={obj.name}
                className={`p-4 rounded-xl border transition-all group ${
                  obj.isVisible
                    ? "bg-black/40 border-white/10 hover:border-primary/50 hover:bg-white/5"
                    : "bg-black/20 border-white/5 opacity-50 hover:opacity-75"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-glow transition-all flex items-center gap-2">
                      {obj.name}
                      {obj.isVisible
                        ? <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.8)] animate-pulse shrink-0" />
                        : <span className="w-2 h-2 rounded-full bg-white/15 shrink-0" />
                      }
                    </h3>
                    <p className="text-[10px] text-muted-foreground uppercase mt-1">
                      {obj.constellation || "Unknown Constellation"}
                    </p>
                  </div>
                  <Badge variant={getBadgeVariant(obj.type)} className="capitalize">
                    {obj.type}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-white/5 rounded-lg p-2">
                    <span className="text-[10px] text-muted-foreground uppercase">Magnitude</span>
                    <p className="text-sm font-mono text-starlight">{obj.magnitude.toFixed(2)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2">
                    <span className="text-[10px] text-muted-foreground uppercase">Altitude</span>
                    <p className="text-sm font-mono text-starlight">{obj.altitude.toFixed(1)}°</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs border-t border-white/10 pt-3">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    {obj.isRising ? <ArrowUp className="w-3 h-3 text-green-400" /> : <ArrowDown className="w-3 h-3 text-orange-400" />}
                    <span>{obj.isRising ? "Rising" : "Setting"}</span>
                  </div>
                  <button className="text-primary hover:text-white flex items-center gap-1 transition-colors">
                    Details <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </GlassCard>
  );
}
