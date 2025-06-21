# AI-Powered Place Finder

This application uses a local LLM (Ollama) to process natural language queries about places and displays the results using Google Maps and Places API. It provides intelligent location-based recommendations based on user queries and their current location.

## Prerequisites

1. Install [Ollama](https://ollama.ai/download) on your system
2. Install the Mistral model using Ollama:
   ```bash
   ollama pull mistral
   ```
3. [Create a Google Cloud Project](https://console.cloud.google.com/project) and enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Get your Google Maps API key from the Google Cloud Console

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following content:
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   OLLAMA_HOST=http://localhost:11434
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Features

- Natural language processing for place queries using local LLM (Mistral)
- Intelligent categorization of place types (Restaurant/Cafe, Shopping, Entertainment, etc.)
- Real-time geolocation-based search using user's current location
- Integration with Google Maps and Places API for accurate location data
- Interactive map with:
  - User location marker
  - Place markers with info windows
  - Automatic map centering on selected locations
- Detailed place information including:
  - Distance from user's location
  - Ratings
  - Address
  - Place types
- Responsive design with loading states and error handling
- Search results sorted by distance from user's location

## Architecture

### Frontend

- Next.js 14 with React and TypeScript
- @react-google-maps/api for Maps integration
- Tailwind CSS for styling
- Client-side geolocation

### Backend

- Next.js API routes
- Local LLM: Ollama running Mistral model
- Integration with Google APIs:
  - Places API for location search
  - Geocoding API for location context
  - Maps JavaScript API for visualization

### Data Flow

1. User enters natural language query
2. Query is processed by Mistral LLM to extract search intent and place type
3. Structured search is performed using Google Places API
4. Results are displayed on the map and in the sidebar
5. Real-time distance calculations and sorting

## Security Considerations

- Google Maps API key is properly secured using environment variables
- Rate limiting handled by Google APIs quotas
- Local LLM processing ensures privacy of user queries
- Error handling and input validation implemented
- Secure geolocation handling with user permission

## Development

The project uses TypeScript for type safety and includes:

- Custom type definitions for places and API responses
- Structured logging system
- Error handling and loading states
- Responsive UI components
