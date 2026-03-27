import React, { createContext, useContext, useState, useEffect } from "react";

interface LocationState {
  lat: number;
  lon: number;
  name: string;
}

interface LocationContextType {
  location: LocationState;
  setLocation: (loc: LocationState) => void;
  useCurrentLocation: () => void;
  isLocating: boolean;
}

const DEFAULT_LOCATION: LocationState = {
  lat: 40.7128,
  lon: -74.0060,
  name: "New York, USA (Default)",
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocationState] = useState<LocationState>(() => {
    const saved = localStorage.getItem("stargazer-location");
    return saved ? JSON.parse(saved) : DEFAULT_LOCATION;
  });
  
  const [isLocating, setIsLocating] = useState(false);

  const setLocation = (loc: LocationState) => {
    setLocationState(loc);
    localStorage.setItem("stargazer-location", JSON.stringify(loc));
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          name: "Current Location",
        });
        setIsLocating(false);
      },
      (error) => {
        console.error("Error getting location", error);
        alert("Unable to retrieve your location. Using default.");
        setIsLocating(false);
      }
    );
  };

  return (
    <LocationContext.Provider value={{ location, setLocation, useCurrentLocation, isLocating }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}
