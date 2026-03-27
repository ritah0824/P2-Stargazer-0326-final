import React from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { CalendarDays, AlertCircle, Globe, Navigation, ArrowRight } from "lucide-react";
import { useGetAstronomicalEvents } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { format, parseISO, isAfter } from "date-fns";
import { Badge } from "@/components/ui/badge";

export function AstronomicalEventsPanel() {
  const { data, isLoading, error } = useGetAstronomicalEvents({
    query: { refetchInterval: 300000 } // Poll every 5 mins
  });

  if (isLoading) {
    return (
      <GlassCard className="h-full p-6 flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-secondary/20 border-t-secondary rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse">Calculating event timelines...</p>
      </GlassCard>
    );
  }

  if (error || !data) {
    return (
      <GlassCard className="h-full p-6 flex flex-col justify-center items-center text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <p className="text-white font-medium">Event DB Offline</p>
      </GlassCard>
    );
  }

  // Sort events by date
  const upcomingEvents = data.events
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5); // Show next 5

  return (
    <GlassCard className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display font-semibold text-white flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-secondary" /> Upcoming Phenomena
        </h2>
      </div>

      <div className="flex-1 space-y-4">
        {upcomingEvents.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No major events on the horizon.</p>
        ) : (
          upcomingEvents.map((event, i) => {
            const eventDate = parseISO(event.date);
            
            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={`${event.name}-${i}`}
                className="group relative pl-6 pb-4 border-l border-white/10 last:border-0 last:pb-0"
              >
                {/* Timeline node */}
                <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-secondary shadow-[0_0_10px_rgba(176,0,255,0.8)] group-hover:scale-150 transition-transform" />
                
                <div className="bg-black/30 border border-white/5 rounded-xl p-4 group-hover:bg-white/5 group-hover:border-secondary/30 transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-secondary transition-colors">{event.name}</h4>
                      <p className="text-xs text-secondary mt-0.5">{format(eventDate, "MMMM do, yyyy")}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-white/5">
                      {event.type === "meteor_shower" ? "meteor" : event.type.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
                    {event.description}
                  </p>

                  <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground font-mono">
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" /> {event.visibility.replace('_', ' ')}
                    </span>
                    {event.peakIntensity && (
                      <span className="flex items-center gap-1">
                        <Navigation className="w-3 h-3" /> Peak: {event.peakIntensity}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
      
      <button className="w-full mt-4 py-2 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors border-t border-white/5 pt-4">
        View Full Calendar <ArrowRight className="w-4 h-4" />
      </button>
    </GlassCard>
  );
}
