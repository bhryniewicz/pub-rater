"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/query";

type Status = "idle" | "loading" | "granted" | "denied" | "unavailable";

type GeolocationData = {
  coords: { lat: number; lon: number };
  address: string | null;
} | null;

type GeolocationState = {
  status: Status;
  coords: { lat: number; lon: number } | null;
  address: string | null;
  enable: () => void;
  disable: () => void;
};

const DISABLED_KEY = "pub_rater_location_disabled";

// Marks the "no Geolocation API" case so the hook can map it to "unavailable"
// separately from a permission denial.
class GeolocationUnavailableError extends Error {}

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

async function fetchGeolocation(): Promise<GeolocationData> {
  if (localStorage.getItem(DISABLED_KEY) === "true") return null;
  if (!("geolocation" in navigator)) throw new GeolocationUnavailableError();

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
    });
  });

  const coords = {
    lat: position.coords.latitude,
    lon: position.coords.longitude,
  };
  const address = await reverseGeocode(coords.lat, coords.lon);
  return { coords, address };
}

function errorToStatus(error: unknown): Status {
  if (error instanceof GeolocationUnavailableError) return "unavailable";
  if (
    typeof GeolocationPositionError !== "undefined" &&
    error instanceof GeolocationPositionError &&
    error.code === error.PERMISSION_DENIED
  ) {
    return "denied";
  }
  return "unavailable";
}

export function useGeolocation(): GeolocationState {
  const queryClient = useQueryClient();

  const { data, error, isLoading } = useQuery({
    queryKey: QUERY_KEYS.GEOLOCATION,
    queryFn: fetchGeolocation,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const enable = useCallback(() => {
    localStorage.removeItem(DISABLED_KEY);
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GEOLOCATION });
  }, [queryClient]);

  const disable = useCallback(() => {
    localStorage.setItem(DISABLED_KEY, "true");
    queryClient.cancelQueries({ queryKey: QUERY_KEYS.GEOLOCATION });
    queryClient.setQueryData<GeolocationData>(QUERY_KEYS.GEOLOCATION, null);
  }, [queryClient]);

  let status: Status;
  if (isLoading) status = "loading";
  else if (error) status = errorToStatus(error);
  else if (data) status = "granted";
  else status = "idle";

  return {
    status,
    coords: data?.coords ?? null,
    address: data?.address ?? null,
    enable,
    disable,
  };
}
