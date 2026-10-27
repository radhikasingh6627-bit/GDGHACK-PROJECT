/**
 * Road Distance & Navigation Utility for MandiDarpan
 * Features:
 * 1. Real Road Distance & Travel Duration using OpenStreetMap OSRM Routing Engine (100% Free).
 * 2. 1-Click Google Maps turn-by-turn Navigation Link for farmers.
 * 3. Known APMC coordinates fallback.
 */

// Known APMC Mandi coordinates dictionary
export const MANDI_COORDINATES = {
  'lucknow (dubagga)': { lat: 26.8682, lng: 80.8715 },
  'lucknow (sitapur road)': { lat: 26.9150, lng: 80.9380 },
  'lucknow': { lat: 26.8467, lng: 80.9462 },
  'kanpur (chaubepur)': { lat: 26.6214, lng: 80.1706 },
  'kanpur (govind nagar)': { lat: 26.4420, lng: 80.3120 },
  'kanpur': { lat: 26.4499, lng: 80.3319 },
  'varanasi (visheshwarganj)': { lat: 25.3260, lng: 83.0130 },
  'varanasi': { lat: 25.3176, lng: 82.9739 },
  'agra (fatehabad road)': { lat: 27.1650, lng: 78.0450 },
  'agra': { lat: 27.1767, lng: 78.0081 },
  'bhopal (karond mandi)': { lat: 23.3050, lng: 77.4120 },
  'bhopal': { lat: 23.2599, lng: 77.4126 },
  'indore (choithram mandi)': { lat: 22.6850, lng: 75.8450 },
  'indore': { lat: 22.7196, lng: 75.8577 },
  'ludhiana (new grain market)': { lat: 30.9010, lng: 75.8573 },
  'ludhiana': { lat: 30.9010, lng: 75.8573 },
  'jaipur (muhana mandi)': { lat: 26.8120, lng: 75.7680 },
  'jaipur': { lat: 26.9124, lng: 75.7873 },
  'nashik (lasalgaon apmc)': { lat: 20.1470, lng: 74.2250 },
  'nashik (pimpalgaon)': { lat: 20.1650, lng: 73.9850 },
  'nashik': { lat: 19.9975, lng: 73.7898 },
  'patna': { lat: 25.5941, lng: 85.1376 },
  'karnal': { lat: 29.6857, lng: 76.9905 }
};

/**
 * Resolves coordinates for a mandi either from its record or known coordinates dictionary
 */
export function getMandiCoords(mandi) {
  if (mandi?.latitude && mandi?.longitude) {
    return { lat: Number(mandi.latitude), lng: Number(mandi.longitude) };
  }
  const key = (mandi?.market || mandi?.district || '').toLowerCase().trim();
  return MANDI_COORDINATES[key] || null;
}

/**
 * Calculates Haversine aerial distance in km
 */
export function calculateHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Fetches exact real-world driving road distance and duration using free OSRM Routing Engine
 */
export async function fetchRoadDistance(originLat, originLon, destLat, destLon) {
  if (!originLat || !originLon || !destLat || !destLon) {
    return null;
  }

  const url = `https://router.project-osrm.org/route/v1/driving/${originLon},${originLat};${destLon},${destLat}?overview=false`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 second timeout

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const roadDistanceKm = Math.round((route.distance / 1000) * 10) / 10;
        const totalMinutes = Math.round(route.duration / 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        let durationFormatted = '';
        if (hours > 0) {
          durationFormatted = `${hours}h ${minutes}m`;
        } else {
          durationFormatted = `${minutes} min`;
        }

        return {
          roadDistanceKm,
          totalMinutes,
          durationFormatted,
          isExactRoad: true
        };
      }
    }
  } catch {
    // Graceful fallback to Haversine * 1.25 road winding factor if offline or network slow
  }

  const aerial = calculateHaversine(originLat, originLon, destLat, destLon);
  const estimatedRoadKm = Math.round(aerial * 1.25 * 10) / 10;
  const estimatedMins = Math.round(estimatedRoadKm * 1.5); // Average 40km/h on Indian rural roads
  const hours = Math.floor(estimatedMins / 60);
  const minutes = estimatedMins % 60;

  return {
    roadDistanceKm: estimatedRoadKm,
    totalMinutes: estimatedMins,
    durationFormatted: hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`,
    isExactRoad: false,
    isEstimated: true
  };
}

/**
 * Generates 1-Click Google Maps turn-by-turn Navigation URL
 */
export function getGoogleMapsNavigationUrl({ marketName = '', district = '', destLat = null, destLon = null, userLat = null, userLon = null }) {
  const query = encodeURIComponent(`${marketName} APMC Mandi, ${district}`);

  if (destLat && destLon) {
    if (userLat && userLon) {
      return `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLon}&destination=${destLat},${destLon}&travelmode=driving`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLon}&travelmode=driving`;
  }

  if (userLat && userLon) {
    return `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLon}&destination=${query}&travelmode=driving`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
