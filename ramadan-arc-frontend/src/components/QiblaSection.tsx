"use client";

import { useEffect, useMemo, useState } from "react";

const KAABA = { lat: 21.422487, lng: 39.826206 };

export function QiblaSection() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [heading, setHeading] = useState(0);
  const [message, setMessage] = useState("Location is needed for qibla direction.");
  const qibla = useMemo(() => (coords ? bearingToKaaba(coords.lat, coords.lng) : 0), [coords]);
  const rotation = qibla - heading;

  useEffect(() => {
    function onOrientation(event: DeviceOrientationEvent) {
      const webkitHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      if (typeof webkitHeading === "number") {
        setHeading(webkitHeading);
        return;
      }
      if (typeof event.alpha === "number") setHeading(360 - event.alpha);
    }

    window.addEventListener("deviceorientation", onOrientation, true);
    return () => window.removeEventListener("deviceorientation", onOrientation, true);
  }, []);

  async function activate() {
    setMessage("Getting location and compass...");
    const orientation = DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<PermissionState> };
    if (typeof orientation.requestPermission === "function") {
      const permission = await orientation.requestPermission();
      if (permission !== "granted") {
        setMessage("Compass permission was denied.");
        return;
      }
    }

    if (!navigator.geolocation) {
      setMessage("Geolocation is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setMessage("Point the top of your phone toward the gold marker.");
      },
      () => setMessage("Location permission was denied."),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 }
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionTitle eyebrow="Direction" title="Qibla compass" />
        <button onClick={activate} className="rounded-2xl bg-[var(--green)] px-4 py-2.5 text-sm font-bold text-white">
          Activate compass
        </button>
      </div>

      <div className="rounded-[28px] border border-[var(--line)] bg-[var(--soft)] p-5">
        <div className="mx-auto flex aspect-square w-full max-w-[360px] items-center justify-center rounded-full border border-[var(--line)] bg-[var(--night-card)] shadow-premium">
          <div className="relative h-[82%] w-[82%] rounded-full border border-[var(--line)]">
            <div className="absolute left-1/2 top-3 -translate-x-1/2 text-xs font-bold text-[var(--muted)]">N</div>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs font-bold text-[var(--muted)]">S</div>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--muted)]">W</div>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--muted)]">E</div>
            <div
              className="absolute left-1/2 top-1/2 h-[42%] w-3 origin-bottom -translate-x-1/2 -translate-y-full rounded-full bg-[var(--gold)] shadow-soft transition-transform"
              style={{ transform: `translate(-50%, -100%) rotate(${rotation}deg)` }}
            />
            <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--green)]" />
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Metric label="Qibla" value={`${Math.round(qibla)}°`} />
          <Metric label="Heading" value={`${Math.round(heading)}°`} />
          <Metric label="Distance" value={coords ? `${Math.round(distanceToKaaba(coords.lat, coords.lng))} km` : "--"} />
        </div>
        <p className="mt-4 text-sm text-[var(--muted)]">{message}</p>
      </div>
    </div>
  );
}

function bearingToKaaba(lat: number, lng: number) {
  const phi1 = toRad(lat);
  const phi2 = toRad(KAABA.lat);
  const deltaLng = toRad(KAABA.lng - lng);
  const y = Math.sin(deltaLng) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function distanceToKaaba(lat: number, lng: number) {
  const r = 6371;
  const dLat = toRad(KAABA.lat - lat);
  const dLng = toRad(KAABA.lng - lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(KAABA.lat)) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function toDeg(value: number) {
  return (value * 180) / Math.PI;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[rgba(255,255,255,0.03)] p-4 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--green-dark)]">{value}</p>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-dark)]">{eyebrow}</p>
      <h2 className="mt-1 font-display text-3xl font-bold text-[var(--green-dark)]">{title}</h2>
    </div>
  );
}
