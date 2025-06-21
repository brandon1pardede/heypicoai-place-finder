export interface Location {
  lat: number;
  lng: number;
}

export interface PlaceResult {
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  types: string[];
  place_id: string;
}

export interface PlacesApiResponse {
  results: PlaceResult[];
  status: string;
}

export interface Place {
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  rating?: number;
  types: string[];
  place_id: string;
  distance?: number;
}

export interface SearchResult {
  searchQuery: string;
  type: string;
  description: string;
  places: Place[];
}
