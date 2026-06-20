import { z } from 'zod';

import type { ToolSpec } from '@domain/ports/tool-registry.port';

const argsSchema = z.object({
  city: z.string().describe('City name to look up weather for'),
});

export const weatherSpec: ToolSpec = {
  name: 'get_weather',
  description: 'Get current weather conditions (temperature, humidity, sky condition) for any city.',
  parameters: argsSchema,
};

const WMO_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Icy fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  80: 'Slight showers',
  81: 'Moderate showers',
  82: 'Violent showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with heavy hail',
};

interface GeoResult {
  results?: {
    name: string;
    latitude: number;
    longitude: number;
    country: string;
  }[];
}

interface WeatherResult {
  current_weather: {
    temperature: number;
    weathercode: number;
  };
  hourly: {
    relative_humidity_2m: number[];
  };
}

export async function executeWeather(rawArgs: unknown): Promise<unknown> {
  const { city } = argsSchema.parse(rawArgs);

  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
  );
  const geoData = (await geoRes.json()) as GeoResult;
  const loc = geoData.results?.[0];
  if (!loc) throw new Error(`City not found: ${city}`);

  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current_weather=true&hourly=relative_humidity_2m&forecast_days=1`,
  );
  const weatherData = (await weatherRes.json()) as WeatherResult;
  const { temperature, weathercode } = weatherData.current_weather;
  const humidity = weatherData.hourly.relative_humidity_2m[0] ?? 0;

  return {
    city: `${loc.name}, ${loc.country}`,
    temperature_c: Math.round(temperature),
    condition: WMO_CODES[weathercode] ?? 'Unknown',
    humidity_pct: humidity,
  };
}
