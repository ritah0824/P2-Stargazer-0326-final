import React, { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { SkyConditionsPanel } from "@/components/dashboard/SkyConditionsPanel";
import { SolarSystemPanel } from "@/components/dashboard/SolarSystemPanel";
import { VisibleObjectsPanel } from "@/components/dashboard/VisibleObjectsPanel";
import { AstronomicalEventsPanel } from "@/components/dashboard/AstronomicalEventsPanel";
import { motion, AnimatePresence } from "framer-motion";

function useSpaceBackground() {
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [bgTitle, setBgTitle] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sky/background?t=${Date.now()}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelled && data?.url) {
          const img = new Image();
          img.onload = () => {
            if (!cancelled) {
              setBgUrl(data.url);
              setBgTitle(data.title);
              setLoaded(true);
            }
          };
          img.onerror = () => {
            if (!cancelled) setLoaded(true);
          };
          img.src = data.url;
        } else if (!cancelled) {
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  return { bgUrl, bgTitle, loaded };
}

export function Dashboard() {
  const { bgUrl, bgTitle, loaded } = useSpaceBackground();

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 z-0 pointer-events-none bg-black">
        <img
          src={`${import.meta.env.BASE_URL}images/starmap-bg.png`}
          alt="Deep Space"
          className="w-full h-full object-cover opacity-20 mix-blend-screen"
        />

        <AnimatePresence>
          {loaded && bgUrl && (
            <motion.img
              key={bgUrl}
              src={bgUrl}
              alt={bgTitle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5 }}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: undefined }}
            />
          )}
        </AnimatePresence>

        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.65)_100%)]" />
      </div>

      {bgTitle && (
        <div className="fixed bottom-3 right-4 z-50 text-[10px] text-white/25 hover:text-white/60 transition-colors cursor-default">
          NASA APOD: {bgTitle}
        </div>
      )}

      <div className="relative z-10">
        <Header />

        <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch"
          >
            <div className="lg:col-span-1 h-full">
              <SkyConditionsPanel />
            </div>
            <div className="lg:col-span-2 h-full">
              <SolarSystemPanel />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2">
              <VisibleObjectsPanel />
            </div>
            <div className="lg:col-span-1">
              <AstronomicalEventsPanel />
            </div>
          </motion.div>
        </main>

        <footer className="mt-12 py-6 border-t border-white/5 text-center text-xs text-muted-foreground backdrop-blur-md bg-black/20">
          <p>StarGazer Live Observatory • Real-time celestial telemetry</p>
        </footer>
      </div>
    </div>
  );
}

export default Dashboard;
