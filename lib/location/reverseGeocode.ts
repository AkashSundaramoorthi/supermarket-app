/**
 * Reverse geocoding utility: converts (lat, lng) to human-readable street address.
 * Uses Google Maps Geocoding API when available, falling back seamlessly to OpenStreetMap Nominatim.
 */
export async function reverseGeocodeCoords(
  lat: number,
  lng: number,
): Promise<{
  formattedAddress: string;
  pincode?: string;
  suggestedName?: string;
}> {
  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // 1. Try Google Geocoding if key is present
  if (googleKey) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleKey}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data.status === "OK" && data.results && data.results.length > 0) {
          const first = data.results[0];
          let pincode: string | undefined;
          for (const comp of first.address_components || []) {
            if (comp.types?.includes("postal_code")) {
              pincode = comp.long_name;
              break;
            }
          }
          return {
            formattedAddress: first.formatted_address,
            pincode,
            suggestedName: first.address_components?.[1]?.long_name || "My Current Spot",
          };
        }
      }
    } catch (e) {
      console.warn("Google reverse geocoding failed, falling back to OpenStreetMap:", e);
    }
  }

  // 2. OpenStreetMap Nominatim Fallback (100% free, reliable)
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: {
          "Accept-Language": "en",
        },
      },
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const parts = [
        addr.road || addr.pedestrian || addr.suburb,
        addr.neighbourhood || addr.suburb,
        addr.city || addr.town || addr.village,
        addr.state,
      ].filter(Boolean);

      const formatted = parts.length > 0 ? parts.join(", ") : data.display_name;
      return {
        formattedAddress: formatted || `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        pincode: addr.postcode?.replace(/\D/g, "")?.slice(0, 6),
        suggestedName: addr.neighbourhood || addr.suburb || "Current Location",
      };
    }
  } catch (e) {
    console.warn("OpenStreetMap Nominatim reverse geocode error:", e);
  }

  // 3. Fallback coordinates string
  return {
    formattedAddress: `Live GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    suggestedName: "Current GPS Location",
  };
}
