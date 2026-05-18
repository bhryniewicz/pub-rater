"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";

type Status = "idle" | "loading" | "granted" | "denied" | "unavailable";

type GeolocationState = {
  status: Status;
  coords: { lat: number; lon: number } | null;
  address: string | null;
  enable: () => void;
  disable: () => void;
};

const GeolocationContext = createContext<GeolocationState>({
  status: "idle",
  coords: null,
  address: null,
  enable: () => {},
  disable: () => {},
});

export function useGeolocation() {
  return useContext(GeolocationContext);
}

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${token}&types=address,place&limit=1`,
    );
    const json = (await res.json()) as { features?: { place_name: string }[] };
    return json.features?.[0]?.place_name ?? null;
  } catch {
    return null;
  }
}

export function GeolocationProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("idle");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const startWatch = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    setStatus("loading");
    stopWatch();
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const newCoords = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };
        setStatus("granted");
        setCoords(newCoords);
        const addr = await reverseGeocode(newCoords.lat, newCoords.lon);
        setAddress(addr);
      },
      () => {
        setStatus("denied");
      },
      { enableHighAccuracy: true },
    );
  }, [stopWatch]);

  const enable = useCallback(() => {
    localStorage.removeItem("pub_rater_location_disabled");
    startWatch();
  }, [startWatch]);

  const disable = useCallback(() => {
    localStorage.setItem("pub_rater_location_disabled", "true");
    stopWatch();
    setStatus("idle");
    setCoords(null);
    setAddress(null);
  }, [stopWatch]);

  useEffect(() => {
    if (localStorage.getItem("pub_rater_location_disabled") !== "true") {
      startWatch();
    }
    return stopWatch;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <GeolocationContext.Provider value={{ status, coords, address, enable, disable }}>
      {children}
    </GeolocationContext.Provider>
  );
}
