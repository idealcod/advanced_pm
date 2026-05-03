"use client";

import { useState } from "react";
import { DEFAULT_H3 } from "@/hooks/useRamadanApp";

export function useGeolocationH3(onDetected: (h3Index: string) => void) {
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  async function detectLocation() {
    setLocationError(null);
    if (!navigator.geolocation) {
      onDetected(DEFAULT_H3);
      setLocationError("Geolocation is not available in this browser.");
      return false;
    }

    setLocating(true);
    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latLngToCell } = await import("h3-js");
            onDetected(latLngToCell(position.coords.latitude, position.coords.longitude, 7));
            resolve(true);
          } catch {
            setLocationError("Could not convert your location.");
            resolve(false);
          } finally {
            setLocating(false);
          }
        },
        () => {
          setLocationError("Location permission was denied.");
          setLocating(false);
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    });
  }

  return { locating, locationError, detectLocation };
}
