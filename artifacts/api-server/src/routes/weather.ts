import { Router, type IRouter } from "express";
import { GetSkyWeatherResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function aqiCategory(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

function computeSkyScore(cloudCover: number, moonIllum: number, aqi: number | null, windSpeed: number): number {
  let score = 100;
  score -= Math.round(cloudCover * 0.45);
  score -= Math.round(moonIllum * 0.25);
  if (aqi !== null) {
    if (aqi > 150) score -= 20;
    else if (aqi > 100) score -= 12;
    else if (aqi > 50) score -= 6;
    else score -= 2;
  }
  if (windSpeed > 50) score -= 10;
  else if (windSpeed > 30) score -= 6;
  else if (windSpeed > 20) score -= 3;
  return Math.max(0, Math.min(100, score));
}

function skyScoreLabel(score: number): "Excellent" | "Good" | "Fair" | "Poor" | "Terrible" {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  if (score >= 20) return "Poor";
  return "Terrible";
}

function skyScoreMessage(score: number, cloudCover: number, moonIllum: number, isDay: boolean): string {
  if (!isDay && cloudCover < 10 && moonIllum < 20) return "🌙 Perfect dark skies right now";
  if (cloudCover > 80) return "☁️ Heavy cloud cover — observing not possible";
  if (cloudCover > 50) return "⛅ Partial cloud cover limiting visibility";
  if (moonIllum > 80) return "🌕 Bright moon washing out faint objects";
  if (score >= 80) return "✨ Excellent transparency and seeing";
  if (score >= 60) return "🔭 Good conditions for observation";
  if (score >= 40) return "😐 Marginal conditions — try anyway";
  return "🌫️ Poor conditions — wait for improvement";
}

router.get("/", async (req, res) => {
  const lat = parseFloat(req.query.lat as string) || 40.7128;
  const lon = parseFloat(req.query.lon as string) || -74.006;

  try {
    const [weatherResp, aqResp] = await Promise.allSettled([
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,dew_point_2m,wind_speed_10m,wind_direction_10m,cloud_cover,weather_code,visibility` +
        `&hourly=temperature_2m,cloud_cover` +
        `&forecast_days=2&timezone=auto&wind_speed_unit=kmh`
      ),
      fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
        `&current=us_aqi&timezone=auto`
      ),
    ]);

    let weather: any = null;
    let aqData: any = null;

    if (weatherResp.status === "fulfilled" && weatherResp.value.ok) {
      weather = await weatherResp.value.json();
    }
    if (aqResp.status === "fulfilled" && aqResp.value.ok) {
      aqData = await aqResp.value.json();
    }

    const now = new Date();

    if (!weather) {
      throw new Error("Failed to fetch weather data from Open-Meteo");
    }

    const cur = weather.current;
    const cloudCover: number = cur.cloud_cover ?? 0;
    const temperature: number = cur.temperature_2m ?? 15;
    const windSpeed: number = cur.wind_speed_10m ?? 0;
    const windDirection: number = cur.wind_direction_10m ?? 0;
    const humidity: number = cur.relative_humidity_2m ?? 50;
    const dewPoint: number = cur.dew_point_2m ?? 10;
    const visibilityM: number = cur.visibility ?? 10000;
    const visibility: number = Math.round(visibilityM / 100) / 10;

    const aqi: number | null = aqData?.current?.us_aqi ?? null;

    const hourlyTimes: string[] = weather.hourly?.time ?? [];
    const hourlyClouds: number[] = weather.hourly?.cloud_cover ?? [];
    const hourlyTemps: number[] = weather.hourly?.temperature_2m ?? [];

    const nowMs = now.getTime();
    const next24h = hourlyTimes
      .map((t: string, i: number) => ({ time: t, cloudVal: hourlyClouds[i], tempVal: hourlyTemps[i] }))
      .filter(({ time }) => {
        const tMs = new Date(time).getTime();
        return tMs >= nowMs - 3600000 && tMs <= nowMs + 86400000;
      })
      .slice(0, 25);

    const hourlyCloudCover = next24h.map(({ time, cloudVal }) => ({ time, value: cloudVal ?? 0 }));
    const hourlyTemperature = next24h.map(({ time, tempVal }) => ({ time, value: tempVal ?? 0 }));

    const sunAltDeg = -10;
    const isDay = sunAltDeg > 0;

    const score = computeSkyScore(cloudCover, 1, aqi, windSpeed);
    const label = skyScoreLabel(score);
    const message = skyScoreMessage(score, cloudCover, 1, isDay);

    const data = GetSkyWeatherResponse.parse({
      timestamp: now.toISOString(),
      lat,
      lon,
      cloudCover,
      temperature: Math.round(temperature * 10) / 10,
      windSpeed: Math.round(windSpeed * 10) / 10,
      windDirection,
      humidity,
      dewPoint: Math.round(dewPoint * 10) / 10,
      visibility,
      aqi,
      aqiCategory: aqi !== null ? aqiCategory(aqi) : null,
      skyScore: score,
      skyScoreLabel: label,
      skyScoreMessage: message,
      hourlyCloudCover,
      hourlyTemperature,
    });

    res.json(data);
  } catch (err: any) {
    console.error("Weather fetch error:", err.message);
    res.status(502).json({ error: "Failed to fetch weather data", message: err.message });
  }
});

export default router;
