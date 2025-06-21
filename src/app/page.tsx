"use client";

import { useState, useEffect } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import { Place, SearchResult, Location } from "@/app/types";

const containerStyle = {
  width: "100%",
  height: "600px",
};

// Default to San Francisco if geolocation fails
const defaultCenter = {
  lat: 37.7749,
  lng: -122.4194,
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  useEffect(() => {
    // Get user's location when component mounts
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          setMapCenter(location);
          setLocationLoading(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocationLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    } else {
      setLocationLoading(false);
    }
  }, []);

  const handleSearch = async () => {
    try {
      setLoading(true);
      setError("");
      setSelectedPlace(null);

      const response = await fetch("/api/places", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          userLocation: userLocation || defaultCenter,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to search for places");
      }

      const data = await response.json();
      setSearchResult(data);

      // Automatically select the first result if available
      if (data.places && data.places.length > 0) {
        const firstPlace = data.places[0];
        setSelectedPlace(firstPlace);
        setMapCenter(firstPlace.location);
      }
    } catch (err) {
      setError("Failed to search for places. Please try again.");
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkerClick = (place: Place) => {
    setSelectedPlace(place);
    setMapCenter(place.location);
  };

  const formatRating = (rating?: number) => {
    if (!rating) return "No rating";
    return `${rating.toFixed(1)} ⭐`;
  };

  const calculateDistance = (place: Place) => {
    if (!userLocation) return null;

    const R = 6371; // Earth's radius in km
    const dLat = ((place.location.lat - userLocation.lat) * Math.PI) / 180;
    const dLon = ((place.location.lng - userLocation.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userLocation.lat * Math.PI) / 180) *
        Math.cos((place.location.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance < 1
      ? `${(distance * 1000).toFixed(0)}m away`
      : `${distance.toFixed(1)}km away`;
  };

  return (
    <main className="min-h-screen">
      <div className="max-w-6xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Place Finder</h1>

        <div className="mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about places to go, eat, or visit near me..."
              className="flex-1 p-3 border rounded-lg"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-colors"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>

          {locationLoading && (
            <p className="mt-4 text-blue-600">Getting your location...</p>
          )}
          {error && <p className="mt-4 text-red-600">{error}</p>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="sticky top-8">
              <div className="rounded-lg overflow-hidden shadow-lg">
                <LoadScript
                  googleMapsApiKey={
                    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
                  }
                >
                  <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={mapCenter}
                    zoom={14}
                  >
                    {/* User location marker */}
                    {userLocation && (
                      <Marker
                        position={userLocation}
                        icon={{
                          path: google.maps.SymbolPath.CIRCLE,
                          scale: 7,
                          fillColor: "#4285F4",
                          fillOpacity: 1,
                          strokeColor: "#ffffff",
                          strokeWeight: 2,
                        }}
                        title="Your location"
                      />
                    )}

                    {/* Place markers */}
                    {searchResult?.places.map((place) => (
                      <Marker
                        key={place.place_id}
                        position={place.location}
                        onClick={() => handleMarkerClick(place)}
                      />
                    ))}

                    {selectedPlace && (
                      <InfoWindow
                        position={selectedPlace.location}
                        onCloseClick={() => setSelectedPlace(null)}
                      >
                        <div className="p-2">
                          <h3 className="font-semibold">
                            {selectedPlace.name}
                          </h3>
                          <p className="text-sm">{selectedPlace.address}</p>
                          <p className="text-sm mt-1">
                            {formatRating(selectedPlace.rating)}
                          </p>
                          {userLocation && (
                            <p className="text-sm text-blue-600">
                              {calculateDistance(selectedPlace)}
                            </p>
                          )}
                        </div>
                      </InfoWindow>
                    )}
                  </GoogleMap>
                </LoadScript>
              </div>
            </div>
          </div>

          <div>
            {searchResult && (
              <>
                <div className="p-4 bg-gray-100 rounded-lg mb-4 shadow-sm">
                  <h2 className="text-xl font-semibold mb-2">Search Results</h2>
                  <p>
                    <strong>Looking for:</strong> {searchResult.description}
                  </p>
                  <p>
                    <strong>Type:</strong> {searchResult.type}
                  </p>
                </div>

                <div className="space-y-4">
                  {searchResult.places.map((place) => (
                    <div
                      key={place.place_id}
                      className={`p-4 border rounded-lg hover:border-blue-500 cursor-pointer transition-colors shadow-sm hover:shadow-md ${
                        selectedPlace?.place_id === place.place_id
                          ? "border-blue-500 bg-blue-50"
                          : ""
                      }`}
                      onClick={() => handleMarkerClick(place)}
                    >
                      <h3 className="font-semibold">{place.name}</h3>
                      <p className="text-sm text-gray-600">{place.address}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <div>
                          <span className="text-sm block">
                            {formatRating(place.rating)}
                          </span>
                          {userLocation && (
                            <span className="text-sm text-blue-600 block">
                              {calculateDistance(place)}
                            </span>
                          )}
                        </div>
                        <a
                          href={`https://www.google.com/maps/place/?q=place_id:${place.place_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View on Google Maps →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
