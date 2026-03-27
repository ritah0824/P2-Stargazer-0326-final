import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { MapPin, Clock, Telescope, Compass, Target } from "lucide-react";
import { useLocation } from "@/hooks/use-location";
import { motion, AnimatePresence } from "framer-motion";

export function Header() {
  const { location, setLocation, useCurrentLocation, isLocating } = useLocation();
  const [time, setTime] = useState(new Date());
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const [tempLat, setTempLat] = useState(location.lat.toString());
  const [tempLon, setTempLon] = useState(location.lon.toString());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(tempLat);
    const lon = parseFloat(tempLon);
    if (!isNaN(lat) && !isNaN(lon)) {
      setLocation({ lat, lon, name: "Custom Coordinates" });
      setIsLocationMenuOpen(false);
    }
  };

  return (
    <header className="w-full py-6 px-4 md:px-8 border-b border-white/5 bg-background/40 backdrop-blur-2xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            <Telescope className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-white text-glow tracking-widest">
              STAR<span className="text-primary">GAZER</span>
            </h1>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Live Observatory
            </p>
          </div>
        </div>

        {/* Info & Actions */}
        <div className="flex items-center gap-6">
          {/* Clock */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-secondary" />
            <div className="flex flex-col">
              <span className="text-white font-mono">{format(time, "HH:mm:ss")} LCL</span>
              <span className="text-muted-foreground font-mono text-[10px]">{format(time, "HH:mm:ss 'UTC'", { timeZone: 'UTC' } as any)}</span>
            </div>
          </div>

          <div className="h-8 w-px bg-white/10" />

          {/* Location */}
          <div className="relative">
            <button 
              onClick={() => setIsLocationMenuOpen(!isLocationMenuOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm group"
            >
              <MapPin className="w-4 h-4 text-accent group-hover:animate-bounce" />
              <span className="text-starlight font-medium hidden sm:inline-block max-w-[150px] truncate">
                {location.name}
              </span>
            </button>

            <AnimatePresence>
              {isLocationMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full mt-2 w-72 glass-panel p-4 rounded-2xl z-50"
                >
                  <h3 className="text-sm font-display text-white mb-4 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-primary" /> Set Location
                  </h3>
                  
                  <button
                    onClick={() => {
                      useCurrentLocation();
                      setIsLocationMenuOpen(false);
                    }}
                    disabled={isLocating}
                    className="w-full mb-4 px-4 py-2 bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Target className="w-4 h-4" />
                    {isLocating ? "Locating..." : "Use Current Location"}
                  </button>

                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-px bg-white/10 flex-1" />
                    <span className="text-xs text-muted-foreground uppercase">or</span>
                    <div className="h-px bg-white/10 flex-1" />
                  </div>

                  <form onSubmit={handleLocationSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Lat</label>
                        <input
                          type="number"
                          step="any"
                          value={tempLat}
                          onChange={(e) => setTempLat(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Lon</label>
                        <input
                          type="number"
                          step="any"
                          value={tempLon}
                          onChange={(e) => setTempLon(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-sm font-semibold transition-colors"
                    >
                      Update Coordinates
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
