import { NextResponse } from "next/server";
import { Ollama } from "ollama";
import { Location, Place, PlaceResult, PlacesApiResponse } from "@/app/types";

type LogData = Record<string, unknown>;

interface Logger {
  info(message: string, data?: LogData): void;
  error(message: string, error: unknown): void;
  debug(message: string, data?: LogData): void;
}

const logger: Logger = {
  info: (message: string, data?: LogData) => {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : "");
  },
  error: (message: string, error: unknown) => {
    console.error(`[ERROR] ${message}`, error);
    if (error instanceof Error && error.stack) {
      console.error("[ERROR] Stack trace:", error.stack);
    }
  },
  debug: (message: string, data?: LogData) => {
    console.debug(
      `[DEBUG] ${message}`,
      data ? JSON.stringify(data, null, 2) : ""
    );
  },
};

const ollama = new Ollama({
  host: process.env.OLLAMA_HOST || "http://localhost:11434",
});

const SYSTEM_PROMPT = `You are a helpful assistant that provides information about places. 
When asked about places, extract the location and type of place from the query.
The user's current location will be provided - use this to make the search more relevant.

For the type field, use one of these categories:
- Restaurant/Cafe
- Shopping
- Entertainment
- Outdoor/Park
- Cultural
- Nightlife
- Health/Fitness
- Education
- Services
- Other

Respond in JSON format with the following structure:
{
  "searchQuery": "the search term for Google Places API - include 'near {location}' if no specific location is mentioned",
  "type": "one of the categories listed above that best matches the query",
  "description": "a brief description of what the user is looking for"
}`;

async function getLocationContext(location: Location): Promise<string> {
  logger.debug("Getting location context for coordinates:", {
    coordinates: location,
  });

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.append("latlng", `${location.lat},${location.lng}`);
  url.searchParams.append(
    "key",
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
  );

  try {
    const response = await fetch(url.toString());
    const data = await response.json();

    if (response.ok && data.results && data.results.length > 0) {
      const addressComponents = data.results[0].address_components;
      let locality = "";
      let area = "";

      for (const component of addressComponents) {
        if (component.types.includes("locality")) {
          locality = component.long_name;
        } else if (component.types.includes("administrative_area_level_1")) {
          area = component.long_name;
        }
      }

      const locationContext = locality ? locality : area;
      logger.info("Retrieved location context:", { context: locationContext });
      return locationContext;
    }

    logger.error("Failed to get location context:", {
      response: {
        status: response.status,
        data,
      },
    });
    return "";
  } catch (error) {
    logger.error("Error getting location context:", error);
    return "";
  }
}

function calculateDistance(point1: Location, point2: Location): number {
  const R = 6371; // Earth's radius in kilometers

  const lat1 = (point1.lat * Math.PI) / 180;
  const lat2 = (point2.lat * Math.PI) / 180;
  const deltaLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const deltaLng = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

async function searchPlaces(
  query: string,
  location: Location
): Promise<Place[]> {
  logger.debug("Searching places with parameters:", {
    searchQuery: query,
    searchLocation: location,
  });

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/textsearch/json"
  );
  url.searchParams.append("query", query);
  url.searchParams.append("location", `${location.lat},${location.lng}`);
  url.searchParams.append("radius", "5000"); // 5km radius
  url.searchParams.append(
    "key",
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""
  );

  try {
    const response = await fetch(url.toString());
    const data = (await response.json()) as PlacesApiResponse;

    if (!response.ok || !data.results || data.results.length === 0) {
      logger.error("Places API error or no results:", {
        response: {
          status: response.status,
          statusText: response.statusText,
          data,
        },
      });
      throw new Error("No places found");
    }

    const places = data.results.map((place: PlaceResult) => ({
      name: place.name,
      address: place.formatted_address,
      location: place.geometry.location,
      rating: place.rating,
      types: place.types,
      place_id: place.place_id,
      distance: calculateDistance(location, place.geometry.location),
    }));

    // Sort places by distance
    places.sort((a, b) => (a.distance || 0) - (b.distance || 0));

    logger.info("Places search results:", {
      searchQuery: query,
      stats: {
        resultCount: places.length,
        firstResult: places[0],
      },
    });

    return places;
  } catch (error) {
    logger.error("Error searching places:", error);
    throw error;
  }
}

export async function POST(req: Request) {
  const requestId = Math.random().toString(36).substring(7);
  logger.info("Received place search request", { metadata: { requestId } });

  try {
    const { query, userLocation } = await req.json();
    logger.debug("Processing request:", {
      metadata: { requestId },
      request: { query, userLocation },
    });

    // Get the location context (city/area name)
    const locationContext = await getLocationContext(userLocation);
    logger.debug("Retrieved location context:", {
      metadata: { requestId },
      context: { location: locationContext },
    });

    // Prepare AI prompt
    const userPrompt = `User is currently in ${locationContext}. Query: ${query}`;
    logger.debug("Preparing AI request:", {
      metadata: { requestId },
      prompt: {
        system: SYSTEM_PROMPT,
        user: userPrompt,
      },
    });

    // Get structured data from Ollama
    const response = await ollama.chat({
      model: "mistral",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    logger.debug("Received AI response:", {
      metadata: { requestId },
      response: { content: response.message.content },
    });

    let parsedResponse;
    try {
      const jsonMatch = response.message.content.match(/\{[\s\S]*\}/);
      parsedResponse = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      logger.debug("Parsed AI response:", {
        metadata: { requestId },
        parsed: parsedResponse,
      });
    } catch (error) {
      logger.error("Failed to parse AI response:", {
        metadata: { requestId },
        error,
        rawResponse: response.message.content,
      });
      return NextResponse.json(
        { error: "Failed to parse location data" },
        { status: 500 }
      );
    }

    if (!parsedResponse?.searchQuery) {
      logger.error("Invalid AI response format:", {
        metadata: { requestId },
        response: parsedResponse,
      });
      return NextResponse.json(
        { error: "Could not determine location from query" },
        { status: 400 }
      );
    }

    // If no specific location is mentioned in the query, append the user's location context
    if (
      !parsedResponse.searchQuery.toLowerCase().includes("near") &&
      !parsedResponse.searchQuery.toLowerCase().includes("in ")
    ) {
      const originalQuery = parsedResponse.searchQuery;
      parsedResponse.searchQuery += ` near ${locationContext}`;
      logger.debug("Modified search query:", {
        metadata: { requestId },
        query: {
          original: originalQuery,
          modified: parsedResponse.searchQuery,
        },
      });
    }

    // Search for places using Google Places API
    const places = await searchPlaces(parsedResponse.searchQuery, userLocation);

    const response_data = {
      searchQuery: parsedResponse.searchQuery,
      type: parsedResponse.type,
      description: parsedResponse.description,
      places,
    };

    logger.info("Successfully processed request", {
      metadata: { requestId },
      stats: {
        queryType: parsedResponse.type,
        resultCount: places.length,
      },
    });

    return NextResponse.json(response_data);
  } catch (error) {
    logger.error("Request processing error:", {
      metadata: { requestId },
      error,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
