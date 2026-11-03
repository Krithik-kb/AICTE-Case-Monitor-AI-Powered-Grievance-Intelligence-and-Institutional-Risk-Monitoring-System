// Indian States coordinates and metadata for map visualization and fallback table
export interface IndiaStateMeta {
  code: string;
  name: string;
  capital: string;
  lat: number;
  lng: number;
  region: "North" | "South" | "West" | "East" | "Central" | "North-East";
  svgPath?: string;
}

export const INDIA_STATES_META: Record<string, IndiaStateMeta> = {
  "Delhi": { code: "DL", name: "Delhi", capital: "New Delhi", lat: 28.6139, lng: 77.2090, region: "North" },
  "Maharashtra": { code: "MH", name: "Maharashtra", capital: "Mumbai", lat: 19.7515, lng: 75.7139, region: "West" },
  "Karnataka": { code: "KA", name: "Karnataka", capital: "Bengaluru", lat: 15.3173, lng: 75.7139, region: "South" },
  "Tamil Nadu": { code: "TN", name: "Tamil Nadu", capital: "Chennai", lat: 11.1271, lng: 78.6569, region: "South" },
  "Uttar Pradesh": { code: "UP", name: "Uttar Pradesh", capital: "Lucknow", lat: 26.8467, lng: 80.9462, region: "North" },
  "Telangana": { code: "TG", name: "Telangana", capital: "Hyderabad", lat: 17.8749, lng: 78.1008, region: "South" },
  "Gujarat": { code: "GJ", name: "Gujarat", capital: "Gandhinagar", lat: 22.2587, lng: 71.1924, region: "West" },
  "West Bengal": { code: "WB", name: "West Bengal", capital: "Kolkata", lat: 22.9868, lng: 87.8550, region: "East" },
  "Kerala": { code: "KL", name: "Kerala", capital: "Thiruvananthapuram", lat: 10.8505, lng: 76.2711, region: "South" },
  "Rajasthan": { code: "RJ", name: "Rajasthan", capital: "Jaipur", lat: 27.0238, lng: 74.2179, region: "North" },
  "Madhya Pradesh": { code: "MP", name: "Madhya Pradesh", capital: "Bhopal", lat: 22.9734, lng: 78.6569, region: "Central" },
  "Punjab": { code: "PB", name: "Punjab", capital: "Chandigarh", lat: 31.1471, lng: 75.3412, region: "North" },
  "Haryana": { code: "HR", name: "Haryana", capital: "Chandigarh", lat: 29.0588, lng: 76.0856, region: "North" },
  "Andhra Pradesh": { code: "AP", name: "Andhra Pradesh", capital: "Amaravati", lat: 15.9129, lng: 79.7400, region: "South" },
  "Odisha": { code: "OD", name: "Odisha", capital: "Bhubaneswar", lat: 20.9517, lng: 85.0985, region: "East" },
  "Bihar": { code: "BR", name: "Bihar", capital: "Patna", lat: 25.0961, lng: 85.3131, region: "East" },
  "Assam": { code: "AS", name: "Assam", capital: "Dispur", lat: 26.2006, lng: 92.9376, region: "North-East" },
  "Jharkhand": { code: "JH", name: "Jharkhand", capital: "Ranchi", lat: 23.6102, lng: 85.2799, region: "East" },
  "Uttarakhand": { code: "UK", name: "Uttarakhand", capital: "Dehradun", lat: 30.0668, lng: 79.0193, region: "North" },
  "Himachal Pradesh": { code: "HP", name: "Himachal Pradesh", capital: "Shimla", lat: 31.1048, lng: 77.1734, region: "North" },
  "Goa": { code: "GA", name: "Goa", capital: "Panaji", lat: 15.2993, lng: 74.1240, region: "West" },
  "Jammu and Kashmir": { code: "JK", name: "Jammu and Kashmir", capital: "Srinagar", lat: 33.7782, lng: 76.5762, region: "North" },
  "Chandigarh": { code: "CH", name: "Chandigarh", capital: "Chandigarh", lat: 30.7333, lng: 76.7794, region: "North" },
  "Puducherry": { code: "PY", name: "Puducherry", capital: "Puducherry", lat: 11.9416, lng: 79.8083, region: "South" },
};

// Generates bundled GeoJSON FeatureCollection with polygon boundaries for React Leaflet
export function generateIndiaGeoJSON() {
  const features = Object.entries(INDIA_STATES_META).map(([stateName, meta]) => {
    // Generate an approximate state boundary polygon around centroid for robust rendering
    const dLat = 1.6;
    const dLng = 2.0;
    const lat = meta.lat;
    const lng = meta.lng;
    
    // Polygon coordinates [lng, lat]
    const polygon = [
      [lng - dLng * 0.7, lat - dLat * 0.8],
      [lng + dLng * 0.8, lat - dLat * 0.7],
      [lng + dLng * 0.9, lat + dLat * 0.6],
      [lng + dLng * 0.1, lat + dLat * 0.9],
      [lng - dLng * 0.9, lat + dLat * 0.5],
      [lng - dLng * 0.7, lat - dLat * 0.8]
    ];

    return {
      type: "Feature",
      id: meta.code,
      properties: {
        ST_NM: stateName,
        state_code: meta.code,
        capital: meta.capital,
        region: meta.region
      },
      geometry: {
        type: "Polygon",
        coordinates: [polygon]
      }
    };
  });

  return {
    type: "FeatureCollection",
    features: features
  };
}
