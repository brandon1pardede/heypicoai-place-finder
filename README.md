# Local LLM Place Finder

This application uses a local LLM (Ollama) to process natural language queries about places and displays the results on Google Maps.

## Prerequisites

1. Install [Ollama](https://ollama.ai/download) on your system
2. Install the Mistral model using Ollama:
   ```bash
   ollama pull mistral
   ```
3. [Create a Google Cloud Project](https://console.cloud.google.com/project) and enable the Maps JavaScript API
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

- Natural language processing for place queries using local LLM
- Google Maps integration for displaying locations
- Real-time search results with place descriptions
- Responsive design

## Architecture

- Frontend: Next.js with React and TypeScript
- Local LLM: Ollama running Mistral model
- Maps Integration: Google Maps JavaScript API
- Styling: Tailwind CSS

## Security Considerations

- Google Maps API key is properly secured using environment variables
- Rate limiting is handled by Google Maps API quotas
- Local LLM processing ensures privacy of user queries

## Notes

- The application currently uses mock coordinates for demonstration purposes
- In a production environment, you would want to integrate the Google Places API for accurate location data
- The local LLM requires the Ollama service to be running on your machine
