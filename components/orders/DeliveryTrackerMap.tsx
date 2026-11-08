"use client";

import { useEffect, useRef, useState } from "react";
import type { OrderStatus } from "@/features/orders/stateMachine";
import { store } from "@/lib/placeholder/catalog";

interface DeliveryTrackerMapProps {
  status: OrderStatus;
  deliveryAddress?: string;
  driverName?: string;
  driverPhone?: string;
}

// Store coordinates (Supermarket location)
const STORE_COORDS: [number, number] = [12.9716, 77.5946];
// Customer delivery destination
const DEST_COORDS: [number, number] = [12.9792, 77.6048];

// Route waypoints simulating city streets
const ROUTE_POINTS: [number, number][] = [
  STORE_COORDS,
  [12.9728, 77.5962],
  [12.9745, 77.5985],
  [12.9765, 77.6012],
  [12.9778, 77.6030],
  DEST_COORDS,
];

function getDriverCoords(currentStatus: OrderStatus): [number, number] {
  switch (currentStatus) {
    case "paid":
      return STORE_COORDS;
    case "packed":
      return ROUTE_POINTS[1];
    case "out_for_delivery":
      return ROUTE_POINTS[3];
    case "delivered":
      return DEST_COORDS;
    default:
      return ROUTE_POINTS[3];
  }
}

export function DeliveryTrackerMap({
  status,
  deliveryAddress = "Main Delivery Address",
  driverName = "Ramesh Kumar",
  driverPhone = "+91 98765 43210",
}: DeliveryTrackerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // Using explicit unknown typing for map/marker instances to support both Google Maps and Leaflet
  const mapInstanceRef = useRef<unknown>(null);
  const driverMarkerRef = useRef<unknown>(null);
  const mapEngineRef = useRef<"google" | "leaflet">("leaflet");
  const [mapEngine, setMapEngine] = useState<"google" | "leaflet">("leaflet");
  const [mapLoaded, setMapLoaded] = useState(false);

  // Derive ETA dynamically from status
  const etaMinutes =
    status === "delivered"
      ? 0
      : status === "out_for_delivery"
      ? 6
      : status === "packed"
      ? 12
      : 15;

  useEffect(() => {
    let isMounted = true;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    async function initGoogleMaps(key: string): Promise<boolean> {
      try {
        const { importLibrary, setOptions } = await import("@googlemaps/js-api-loader");
        setOptions({
          key,
          v: "weekly",
        });

        const { Map, Polyline } = await importLibrary("maps");
        const { Marker } = await importLibrary("marker");

        if (!isMounted || !mapContainerRef.current) return false;

        const centerLat = (STORE_COORDS[0] + DEST_COORDS[0]) / 2;
        const centerLng = (STORE_COORDS[1] + DEST_COORDS[1]) / 2;

        const map = new Map(mapContainerRef.current, {
          center: { lat: centerLat, lng: centerLng },
          zoom: 14,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        });

        mapInstanceRef.current = map;
        mapEngineRef.current = "google";
        setMapEngine("google");

        // Store Pin Marker
        new Marker({
          position: { lat: STORE_COORDS[0], lng: STORE_COORDS[1] },
          map,
          title: store.name,
          label: {
            text: "🏪",
            fontSize: "20px",
          },
        });

        // Destination Pin Marker
        new Marker({
          position: { lat: DEST_COORDS[0], lng: DEST_COORDS[1] },
          map,
          title: `Delivery: ${deliveryAddress}`,
          label: {
            text: "📍",
            fontSize: "20px",
          },
        });

        // Delivery Route Line
        new Polyline({
          path: ROUTE_POINTS.map(([lat, lng]) => ({ lat, lng })),
          geodesic: true,
          strokeColor: "#059669",
          strokeOpacity: 0.85,
          strokeWeight: 5,
          map,
        });

        // Driver Marker
        const initialDriverPos = getDriverCoords(status);
        const driverMarker = new Marker({
          position: { lat: initialDriverPos[0], lng: initialDriverPos[1] },
          map,
          title: `Driver: ${driverName}`,
          label: {
            text: "🛵",
            fontSize: "22px",
          },
        });
        driverMarkerRef.current = driverMarker;

        // Fit bounds
        const bounds = new google.maps.LatLngBounds();
        bounds.extend({ lat: STORE_COORDS[0], lng: STORE_COORDS[1] });
        bounds.extend({ lat: DEST_COORDS[0], lng: DEST_COORDS[1] });
        map.fitBounds(bounds, 50);

        setMapLoaded(true);
        return true;
      } catch (err) {
        console.warn("Failed to initialize Google Maps, falling back to Leaflet:", err);
        return false;
      }
    }

    async function initLeaflet() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;
      if (mapInstanceRef.current) return;

      const L = await import("leaflet");

      if (!isMounted || !mapContainerRef.current) return;

      const centerLat = (STORE_COORDS[0] + DEST_COORDS[0]) / 2;
      const centerLng = (STORE_COORDS[1] + DEST_COORDS[1]) / 2;

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      mapInstanceRef.current = map;
      mapEngineRef.current = "leaflet";
      setMapEngine("leaflet");

      L.control.zoom({ position: "topright" }).addTo(map);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      const storeIcon = L.divIcon({
        className: "custom-store-pin",
        html: `
          <div style="background:#047857; color:white; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; box-shadow:0 4px 10px rgba(0,0,0,0.3); border:2px solid white;">
            🏪
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const destIcon = L.divIcon({
        className: "custom-dest-pin",
        html: `
          <div style="background:#dc2626; color:white; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; box-shadow:0 4px 10px rgba(0,0,0,0.3); border:2px solid white;">
            📍
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      });

      const driverIcon = L.divIcon({
        className: "custom-driver-pin",
        html: `
          <div style="position:relative; width:40px; height:40px; display:flex; align-items:center; justify-content:center;">
            <div style="position:absolute; width:100%; height:100%; border-radius:50%; background:#10b981; opacity:0.35; animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
            <div style="position:relative; background:#0f766e; color:white; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:20px; box-shadow:0 4px 12px rgba(16,185,129,0.5); border:2px solid white;">
              🛵
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      L.marker(STORE_COORDS, { icon: storeIcon })
        .addTo(map)
        .bindPopup(`<b>${store.name}</b><br/>Store Dispatch Location`);

      L.marker(DEST_COORDS, { icon: destIcon })
        .addTo(map)
        .bindPopup(`<b>Your Location</b><br/>${deliveryAddress}`);

      L.polyline(ROUTE_POINTS, {
        color: "#059669",
        weight: 5,
        opacity: 0.85,
        smoothFactor: 1,
      }).addTo(map);

      const initialDriverPos = getDriverCoords(status);
      const driverMarker = L.marker(initialDriverPos, { icon: driverIcon }).addTo(map);
      driverMarkerRef.current = driverMarker;

      const bounds = L.latLngBounds([STORE_COORDS, DEST_COORDS]);
      map.fitBounds(bounds, { padding: [50, 50] });

      setMapLoaded(true);
    }

    async function setupMap() {
      if (apiKey) {
        const success = await initGoogleMaps(apiKey);
        if (success) return;
      }
      await initLeaflet();
    }

    setupMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current && mapEngineRef.current === "leaflet") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mapInstanceRef.current as any).remove();
        mapInstanceRef.current = null;
      }
    };
  }, [deliveryAddress, driverName, status]);

  // Update driver position when status changes
  useEffect(() => {
    if (!driverMarkerRef.current) return;
    const newCoords = getDriverCoords(status);
    if (mapEngineRef.current === "google") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (driverMarkerRef.current as any).setPosition({ lat: newCoords[0], lng: newCoords[1] });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (driverMarkerRef.current as any).setLatLng(newCoords);
    }
  }, [status]);

  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-4 shadow-xs overflow-hidden">
      {/* Header with Live Status & Engine badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500"></span>
          </span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-fg">
            Live Driver GPS Tracking
          </h2>
          <span className="hidden sm:inline-block rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 text-[9px] font-semibold text-muted">
            {mapEngine === "google" ? "Google Maps" : "Live GPS"}
          </span>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
          {status === "delivered"
            ? "Delivered"
            : status === "out_for_delivery"
            ? `Arriving in ~${etaMinutes} mins`
            : "Driver Assigned"}
        </span>
      </div>

      {/* Map Canvas */}
      <div className="relative h-64 w-full overflow-hidden rounded-[12px] border border-border bg-neutral-100 dark:bg-neutral-800">
        <div ref={mapContainerRef} className="h-full w-full" style={{ zIndex: 1 }} />
        {!mapLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-neutral-100 text-xs text-muted dark:bg-neutral-800">
            <div className="size-6 animate-spin rounded-full border-2 border-accent border-t-transparent"></div>
            <span>Loading live delivery map...</span>
          </div>
        )}
      </div>

      {/* Driver Information Card */}
      <div className="flex items-center justify-between rounded-[12px] bg-neutral-50 p-3.5 dark:bg-neutral-800/60">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-full bg-emerald-600 text-xl font-bold text-white shadow-xs">
            🛵
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-bold text-fg">{driverName}</p>
              <span className="rounded bg-emerald-100 px-1 py-0.2 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                ★ 4.9
              </span>
            </div>
            <p className="text-[11px] text-muted">
              Electric Scooter · KA 05 EV 8821
            </p>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium pt-0.5">
              {status === "delivered"
                ? "Package handed over at doorstep"
                : status === "out_for_delivery"
                ? "On the way from store to your location"
                : "Driver arriving at store to collect package"}
            </p>
          </div>
        </div>

        <a
          href={`tel:${driverPhone.replace(/\s+/g, "")}`}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs transition-transform hover:scale-105 active:scale-95"
          title="Call Driver"
        >
          📞
        </a>
      </div>
    </div>
  );
}
