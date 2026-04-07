"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudFog,
  Snowflake,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  CloudSun,
  History,
} from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import {
  addAlertToLog,
  WeatherAlertLog,
} from "@/components/facility/WeatherAlertLog";
import type { WeatherWarningRule } from "@/types/facility";

// ── WMO weather code mapping ─────────────────────────────────────────

function getAnimStyle(code: number): React.CSSProperties | undefined {
  if (code === 0) return { animation: "spin 20s linear infinite" };
  if (code <= 3) return { animation: "float 4s ease-in-out infinite" };
  if (code <= 48) return { animation: "pulse 3s ease-in-out infinite" };
  if (code <= 57) return { animation: "sway 3s ease-in-out infinite" };
  if (code <= 67) return { animation: "sway 3s ease-in-out infinite" };
  if (code <= 77) return { animation: "bounce 4s ease-in-out infinite" };
  if (code <= 82) return { animation: "sway 3s ease-in-out infinite" };
  if (code <= 86) return { animation: "bounce 4s ease-in-out infinite" };
  if (code <= 99) return { animation: "pulse 1.5s ease-in-out infinite" };
  return { animation: "float 4s ease-in-out infinite" };
}

function getWeatherIcon(code: number, size = "size-6", animated = false) {
  const style = animated ? getAnimStyle(code) : undefined;
  if (code === 0)
    return (
      <Sun
        className={`${size} text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]`}
        style={style}
      />
    );
  if (code <= 3)
    return (
      <CloudSun
        className={`${size} text-amber-300 drop-shadow-sm`}
        style={style}
      />
    );
  if (code <= 48)
    return (
      <CloudFog
        className={`${size} text-slate-400 drop-shadow-sm`}
        style={style}
      />
    );
  if (code <= 57)
    return (
      <CloudDrizzle
        className={`${size} text-sky-400 drop-shadow-sm`}
        style={style}
      />
    );
  if (code <= 67)
    return (
      <CloudRain
        className={`${size} text-blue-400 drop-shadow-[0_0_4px_rgba(96,165,250,0.3)]`}
        style={style}
      />
    );
  if (code <= 77)
    return (
      <Snowflake
        className={`${size} text-sky-300 drop-shadow-[0_0_4px_rgba(125,211,252,0.4)]`}
        style={style}
      />
    );
  if (code <= 82)
    return (
      <CloudRain
        className={`${size} text-blue-500 drop-shadow-[0_0_4px_rgba(59,130,246,0.3)]`}
        style={style}
      />
    );
  if (code <= 86)
    return (
      <CloudSnow
        className={`${size} text-sky-400 drop-shadow-sm`}
        style={style}
      />
    );
  if (code <= 99)
    return (
      <CloudLightning
        className={`${size} text-violet-400 drop-shadow-[0_0_6px_rgba(167,139,250,0.4)]`}
        style={style}
      />
    );
  return (
    <Cloud className={`${size} text-slate-400 drop-shadow-sm`} style={style} />
  );
}

function getWeatherName(code: number): string {
  if (code === 0) return "Clear Sky";
  if (code <= 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 65) return "Rain";
  if (code <= 67) return "Freezing Rain";
  if (code <= 75) return "Snow";
  if (code <= 77) return "Snow Grains";
  if (code <= 82) return "Rain Showers";
  if (code <= 86) return "Snow Showers";
  if (code === 95) return "Thunderstorm";
  if (code <= 99) return "Thunderstorm w/ Hail";
  return "Unknown";
}

function codeToWeatherType(
  code: number,
):
  | "clear"
  | "cloudy"
  | "rain"
  | "drizzle"
  | "snow"
  | "thunderstorm"
  | "fog"
  | "sleet" {
  if (code <= 1) return "clear";
  if (code <= 3) return "cloudy";
  if (code <= 48) return "fog";
  if (code <= 57) return "drizzle";
  if (code <= 67) return "rain";
  if (code <= 77) return "snow";
  if (code <= 82) return "rain";
  if (code <= 86) return "snow";
  if (code <= 99) return "thunderstorm";
  return "cloudy";
}

function getCardBg(code: number): string {
  if (code === 0) return "bg-amber-50/60 border-l-amber-300 border-l-3";
  if (code <= 3) return "bg-slate-50/60 border-l-slate-300 border-l-3";
  if (code <= 48) return "bg-slate-50/50 border-l-slate-300 border-l-3";
  if (code <= 67) return "bg-blue-50/60 border-l-blue-300 border-l-3";
  if (code <= 86) return "bg-sky-50/60 border-l-sky-300 border-l-3";
  if (code <= 99) return "bg-violet-50/60 border-l-violet-300 border-l-3";
  return "";
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: undefined,
    hour12: true,
  });
}

// ── Warning rule evaluation ──────────────────────────────────────────

interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  windSpeed: number;
  weatherCode: number;
}

interface HourlyEntry {
  time: string;
  temperature: number;
  weatherCode: number;
  precipitationProbability: number;
}

type TriggeredRule = WeatherWarningRule & {
  triggeredBy: "current" | "forecast";
  forecastTime?: string;
};

function evaluateWarningRules(
  rules: WeatherWarningRule[],
  current: CurrentWeather,
  hourly: HourlyEntry[],
): TriggeredRule[] {
  const triggered: TriggeredRule[] = [];

  for (const rule of rules) {
    if (!rule.isActive) continue;
    const val = typeof rule.value === "number" ? rule.value : 0;
    const strVal = typeof rule.value === "string" ? rule.value : "";

    // Check current
    let currentMatch = false;
    switch (rule.condition) {
      case "temperature_below":
        currentMatch = current.temperature < val;
        break;
      case "temperature_above":
        currentMatch = current.temperature > val;
        break;
      case "feels_like_below":
        currentMatch = current.feelsLike < val;
        break;
      case "feels_like_above":
        currentMatch = current.feelsLike > val;
        break;
      case "wind_speed_above":
        currentMatch = current.windSpeed > val;
        break;
      case "weather_is":
        currentMatch = codeToWeatherType(current.weatherCode) === strVal;
        break;
    }

    if (currentMatch) {
      triggered.push({ ...rule, triggeredBy: "current" });
      continue;
    }

    // Check forecast (next 6 hours)
    for (const h of hourly.slice(0, 6)) {
      let forecastMatch = false;
      switch (rule.condition) {
        case "temperature_below":
          forecastMatch = h.temperature < val;
          break;
        case "temperature_above":
          forecastMatch = h.temperature > val;
          break;
        case "weather_is":
          forecastMatch = codeToWeatherType(h.weatherCode) === strVal;
          break;
        case "precipitation_probability_above":
          forecastMatch = h.precipitationProbability > val;
          break;
      }
      if (forecastMatch) {
        triggered.push({
          ...rule,
          triggeredBy: "forecast",
          forecastTime: h.time,
        });
        break;
      }
    }
  }

  return triggered.sort((a, b) => {
    const sev = { critical: 0, warning: 1, info: 2 };
    return sev[a.severity] - sev[b.severity];
  });
}

// ── Weather data type ────────────────────────────────────────────────

interface WeatherData {
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    weatherCode: number;
  };
  hourly: HourlyEntry[];
  fetchedAt: number;
}

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ── Component ────────────────────────────────────────────────────────

export function WeatherWidget() {
  const { profile, weatherRules } = useSettings();
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef<WeatherData | null>(null);

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("weather-widget-collapsed") === "true";
  });

  const unit = profile.preferences.temperatureUnit;

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("weather-widget-collapsed", String(next));
  };

  const city = profile.address.city;
  const state = profile.address.state;

  useEffect(() => {
    cacheRef.current = null;
  }, [unit]);

  const fetchWeather = useCallback(async () => {
    if (
      cacheRef.current &&
      Date.now() - cacheRef.current.fetchedAt < CACHE_TTL
    ) {
      setData(cacheRef.current);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Geocode
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`,
      );
      const geoData = await geoRes.json();
      if (!geoData.results?.length) throw new Error("Location not found");

      const { latitude, longitude } = geoData.results[0];

      // Fetch weather
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature&hourly=temperature_2m,weather_code,precipitation_probability&forecast_days=2&timezone=auto&temperature_unit=${unit}`,
      );
      const weatherData = await weatherRes.json();

      const now = new Date();
      const currentHourIndex = weatherData.hourly.time.findIndex(
        (t: string) => new Date(t) >= now,
      );

      const hourlySlice: HourlyEntry[] = weatherData.hourly.time
        .slice(currentHourIndex, currentHourIndex + 12)
        .map((time: string, i: number) => ({
          time,
          temperature: weatherData.hourly.temperature_2m[currentHourIndex + i],
          weatherCode: weatherData.hourly.weather_code[currentHourIndex + i],
          precipitationProbability:
            weatherData.hourly.precipitation_probability[currentHourIndex + i],
        }));

      const result: WeatherData = {
        current: {
          temperature: Math.round(weatherData.current.temperature_2m),
          feelsLike: Math.round(weatherData.current.apparent_temperature),
          humidity: weatherData.current.relative_humidity_2m,
          windSpeed: Math.round(weatherData.current.wind_speed_10m),
          weatherCode: weatherData.current.weather_code,
        },
        hourly: hourlySlice,
        fetchedAt: Date.now(),
      };

      cacheRef.current = result;
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch weather");
    } finally {
      setLoading(false);
    }
  }, [city, unit]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  // Evaluate warnings
  const warnings = data
    ? evaluateWarningRules(
        weatherRules,
        {
          temperature: data.current.temperature,
          feelsLike: data.current.feelsLike,
          windSpeed: data.current.windSpeed,
          weatherCode: data.current.weatherCode,
        },
        data.hourly,
      )
    : [];

  // Log alerts + auto-create tasks when warnings trigger
  const loggedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (warnings.length === 0) return;
    for (const w of warnings) {
      if (loggedRef.current.has(w.id)) continue;
      loggedRef.current.add(w.id);

      const autoTasks: string[] = [];
      if (w.autoAction) autoTasks.push(w.autoAction);
      if (w.severity === "critical") {
        autoTasks.push("Check all outdoor areas for pets");
        autoTasks.push("Notify on-duty staff immediately");
      }
      if (
        w.condition === "weather_is" &&
        (w.value === "rain" || w.value === "thunderstorm" || w.value === "snow")
      ) {
        autoTasks.push("Set up drying station at entrance");
      }

      addAlertToLog({
        ruleId: w.id,
        ruleName: w.name,
        severity: w.severity,
        message: w.message,
        triggeredAt: new Date().toISOString(),
        triggeredBy: w.triggeredBy,
        acknowledged: false,
        actionsTaken: [],
        autoTasksCreated: autoTasks,
      });
    }
  }, [warnings]);

  const [showLog, setShowLog] = useState(false);

  const minutesAgo = data
    ? Math.round((Date.now() - data.fetchedAt) / 60000)
    : 0;
  const unitSymbol = unit === "celsius" ? "°C" : "°F";

  // Error state
  if (error && !data) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex items-center justify-between py-3">
          <div className="flex items-center gap-2">
            <Cloud className="text-muted-foreground size-5" />
            <span className="text-muted-foreground text-sm">
              Weather unavailable
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={fetchWeather}
          >
            <RefreshCw className="size-3.5" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex items-center gap-2 py-3">
          <RefreshCw className="text-muted-foreground size-4 animate-spin" />
          <span className="text-muted-foreground text-sm">
            Loading weather...
          </span>
        </CardContent>
      </Card>
    );
  }

  // Collapsed view
  if (collapsed) {
    return (
      <Card
        className={`cursor-pointer border-slate-200 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${getCardBg(data.current.weatherCode)}`}
        onClick={toggleCollapsed}
      >
        <CardContent className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3">
            {getWeatherIcon(data.current.weatherCode, "size-5", true)}
            <span className="text-lg font-bold tabular-nums">
              {data.current.temperature}
              {unitSymbol}
            </span>
            <span className="text-muted-foreground text-sm">
              {city}, {state}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {warnings.length > 0 && (
              <Badge
                className={
                  warnings[0].severity === "critical"
                    ? "bg-red-100 text-red-800"
                    : "bg-amber-100 text-amber-800"
                }
              >
                <AlertTriangle className="mr-1 size-3" />
                {warnings.length} alert{warnings.length !== 1 ? "s" : ""}
              </Badge>
            )}
            <ChevronDown className="text-muted-foreground size-4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full view
  return (
    <>
      <Card
        className={`overflow-hidden border-slate-200 transition-all duration-500 ${getCardBg(data.current.weatherCode)}`}
        style={{ animation: "slideIn 0.4s ease-out" }}
      >
        <CardContent className="p-0">
          {/* Main weather row */}
          <div className="flex items-center justify-between px-5 py-4">
            {/* Left: current weather */}
            <div className="flex items-center gap-4">
              {getWeatherIcon(data.current.weatherCode, "size-10", true)}
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight text-slate-800 tabular-nums">
                    {data.current.temperature}
                  </span>
                  <span className="text-lg font-medium text-slate-400">
                    {unitSymbol}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  {getWeatherName(data.current.weatherCode)}
                </p>
                <p className="text-muted-foreground text-xs">
                  Feels like {data.current.feelsLike}
                  {unitSymbol} · Wind {data.current.windSpeed} km/h · {city},{" "}
                  {state}
                </p>
              </div>
            </div>

            {/* Right: 6-hour forecast */}
            <div className="flex items-center gap-1">
              <div className="border-border mr-3 h-12 border-l" />
              {data.hourly.slice(0, 6).map((h, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-0.5 px-2"
                  style={{
                    animation: `fadeSlideUp 0.3s ease-out ${i * 0.08}s both`,
                  }}
                >
                  <span className="text-[10px] font-medium text-slate-400">
                    {formatTime(h.time)}
                  </span>
                  {getWeatherIcon(h.weatherCode, "size-5", true)}
                  <span className="text-sm font-semibold text-slate-700 tabular-nums">
                    {Math.round(h.temperature)}°
                  </span>
                </div>
              ))}

              {/* Collapse + refresh */}
              <div className="ml-2 flex flex-col items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={toggleCollapsed}
                >
                  <ChevronUp className="size-3.5" />
                </Button>
                <span className="text-muted-foreground text-[9px]">
                  {minutesAgo < 1 ? "now" : `${minutesAgo}m`}
                </span>
              </div>
            </div>
          </div>

          {/* Warning strip */}
          {warnings.length > 0 && (
            <div className="space-y-0 border-t">
              {warnings.map((w, i) => (
                <div
                  key={`${w.id}-${i}`}
                  style={{
                    animation: `fadeSlideUp 0.3s ease-out ${i * 0.1}s both`,
                  }}
                  className={`flex items-start gap-2.5 px-5 py-2.5 ${
                    w.severity === "critical"
                      ? "border-red-200 bg-red-50 text-red-900"
                      : w.severity === "warning"
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-blue-200 bg-blue-50 text-blue-900"
                  }`}
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 animate-pulse" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium">{w.message}</p>
                    {w.triggeredBy === "forecast" && w.forecastTime && (
                      <p className="mt-0.5 text-[10px] opacity-70">
                        Expected at {formatTime(w.forecastTime)}
                      </p>
                    )}
                    {w.autoAction && (
                      <p className="mt-0.5 text-[10px] font-semibold opacity-80">
                        Action: {w.autoAction}
                      </p>
                    )}
                  </div>
                  <Badge
                    className={`shrink-0 text-[9px] ${
                      w.severity === "critical"
                        ? "bg-red-200 text-red-800"
                        : w.severity === "warning"
                          ? "bg-amber-200 text-amber-800"
                          : "bg-blue-200 text-blue-800"
                    }`}
                  >
                    {w.severity}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert history toggle + log */}
      {warnings.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setShowLog(!showLog)}
          >
            <History className="size-3.5" />
            {showLog ? "Hide" : "View"} Alert History
          </Button>
        </div>
      )}
      {showLog && <WeatherAlertLog />}
    </>
  );
}
