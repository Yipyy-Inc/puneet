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
  CloudMoon,
  Moon,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks/use-settings";
import {
  addAlertToLog,
  WeatherAlertLog,
} from "@/components/facility/WeatherAlertLog";
import { WeatherSky, skyKind } from "@/components/facility/weather-sky";
import type { WeatherWarningRule } from "@/types/facility";

// ── WMO weather code mapping ─────────────────────────────────────────

// ── THE GLYPHS WEAR REAL WEATHER COLOUR, NOT STATUS INK ──────────────────
//
// They always tried to: the branches below said text-amber-400 for the sun,
// text-sky-400 for drizzle, text-blue-400 for rain, text-violet-400 for a
// storm. Then stage 1 remapped every step of Tailwind's raw palette onto the
// six status inks, and the result was a SUN THAT RENDERS BROWN — #8A5115, the
// warning ink — with drizzle, rain, freezing rain, snow and showers all
// collapsed onto one #0F58C6. Five different skies in a single colour, and
// the one everybody knows the real colour of got it wrong.
//
// §5b1 says an icon never introduces a colour, and that rule is about UI
// glyphs standing beside a label whose ink they should inherit. These are not
// that. They are a picture of the sky, on a picture of the sky, and they are
// the one set of marks in the product where the colour IS the information —
// which is why the values are governed --weather-* tokens rather than hex
// literals, and why nothing outside this panel may reach for them.
//
// A shadow rather than a glow: every one of these now sits on a photograph-
// dark sky, where the old drop-shadow-[0_0_6px_…] halos read as smudges.

// The two conditions where the sky itself is visible are the two that have
// to know the time of day: a bright sun over a 2 a.m. column is the single
// most obviously wrong thing a weather strip can show, and it is what the
// first live screenshot showed. Everything else looks the same at night —
// rain is rain — so only clear and partly get a night face.
function weatherGlyph(code: number, night = false) {
  if (code === 0)
    return night
      ? { Icon: Moon, tone: "text-weather-snow" }
      : { Icon: Sun, tone: "text-weather-sun" };
  if (code <= 2)
    return night
      ? { Icon: CloudMoon, tone: "text-weather-snow" }
      : { Icon: CloudSun, tone: "text-weather-sun" };
  if (code === 3) return { Icon: Cloud, tone: "text-weather-cloud" };
  if (code <= 48) return { Icon: CloudFog, tone: "text-weather-fog" };
  if (code <= 57) return { Icon: CloudDrizzle, tone: "text-weather-rain" };
  if (code <= 67) return { Icon: CloudRain, tone: "text-weather-rain" };
  if (code <= 77) return { Icon: Snowflake, tone: "text-weather-snow" };
  if (code <= 82) return { Icon: CloudRain, tone: "text-weather-rain" };
  if (code <= 86) return { Icon: CloudSnow, tone: "text-weather-snow" };
  if (code <= 99) return { Icon: CloudLightning, tone: "text-weather-bolt" };
  return { Icon: Cloud, tone: "text-weather-cloud" };
}

function getWeatherIcon(code: number, size = "size-6", night = false) {
  const { Icon, tone } = weatherGlyph(code, night);
  return (
    <Icon
      className={cn(size, tone, "drop-shadow-[0_1px_3px_rgba(4,14,30,0.55)]")}
    />
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

// The card's field used to be a flat --wash-* tint chosen from the WMO code.
// It is a drawn sky now — see weather-sky.tsx, which carries the reasoning and
// the reason the four status washes were the wrong four colours for fourteen
// conditions.

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
  /** Per hour, not per card — a forecast strip crosses sunset. */
  isDay: boolean;
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
    /**
     * Whether the sun is up AT THE FACILITY, from the API rather than from
     * the viewer's clock. A manager in Vancouver checking a Montreal site at
     * 21 h would otherwise get a bright blue afternoon sky over a dark city.
     */
    isDay: boolean;
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
  const [, setLoading] = useState(false);
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
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature,is_day&hourly=temperature_2m,weather_code,precipitation_probability,is_day&forecast_days=2&timezone=auto&temperature_unit=${unit}`,
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
          isDay: weatherData.hourly.is_day[currentHourIndex + i] !== 0,
        }));

      const result: WeatherData = {
        current: {
          temperature: Math.round(weatherData.current.temperature_2m),
          feelsLike: Math.round(weatherData.current.apparent_temperature),
          humidity: weatherData.current.relative_humidity_2m,
          windSpeed: Math.round(weatherData.current.wind_speed_10m),
          weatherCode: weatherData.current.weather_code,
          isDay: weatherData.current.is_day !== 0,
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
        className="border-line/40 shadow-card relative cursor-pointer overflow-hidden transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-md"
        onClick={toggleCollapsed}
      >
        <WeatherSky
          kind={skyKind(data.current.weatherCode)}
          night={!data.current.isDay}
        />
        {/* Everything above the sky is white — see the note on the full view. */}
        <CardContent className="relative flex items-center justify-between px-4 py-2.5 text-white">
          <div className="flex items-center gap-3">
            {getWeatherIcon(
              data.current.weatherCode,
              "size-5",
              !data.current.isDay,
            )}
            <span className="text-lg font-bold tabular-nums drop-shadow-[0_1px_3px_rgba(4,14,30,0.6)]">
              {data.current.temperature}
              {unitSymbol}
            </span>
            <span className="text-sm text-white/80">
              {city}, {state}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {warnings.length > 0 && (
              <Badge
                className={
                  warnings[0].severity === "critical"
                    ? "text-destructive bg-white"
                    : "text-warning bg-white"
                }
              >
                <AlertTriangle className="mr-1 size-3" />
                {warnings.length} alert{warnings.length !== 1 ? "s" : ""}
              </Badge>
            )}
            <ChevronDown className="size-4 text-white/80" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full view
  return (
    <>
      {/* ── THE PANEL IS A WINDOW, NOT A CARD ────────────────────────────
          It reports the sky, so it shows the sky: the condition and the time
          of day AT THE FACILITY choose the scene, and everything on top of it
          is white with a shadow, the way every weather app on a phone does
          it. The scrim inside WeatherSky is what keeps the readout legible
          over a bright horizon. */}
      <Card
        className="border-line/40 shadow-card relative overflow-hidden"
        style={{ animation: "slideIn 0.4s ease-out" }}
      >
        <WeatherSky
          kind={skyKind(data.current.weatherCode)}
          night={!data.current.isDay}
        />
        <CardContent className="relative p-0 text-white">
          {/* Main weather row */}
          <div className="flex items-center justify-between px-5 py-4">
            {/* Left: current weather */}
            <div className="flex items-center gap-4">
              {getWeatherIcon(
                data.current.weatherCode,
                "size-10",
                !data.current.isDay,
              )}
              <div className="[text-shadow:0_1px_4px_rgba(4,14,30,0.55)]">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight tabular-nums">
                    {data.current.temperature}
                  </span>
                  <span className="text-lg font-medium text-white/70">
                    {unitSymbol}
                  </span>
                </div>
                <p className="text-sm font-semibold">
                  {getWeatherName(data.current.weatherCode)}
                </p>
                <p className="text-xs text-white/75">
                  Feels like {data.current.feelsLike}
                  {unitSymbol} · Wind {data.current.windSpeed} km/h · {city},{" "}
                  {state}
                </p>
              </div>
            </div>

            {/* Right: the hourly forecast — scrolls on mobile rather than
                being clipped (six hours needs ~330px, viewport is 390px minus
                the current-conditions block).

                ── TWELVE HOURS ON A WIDE SCREEN, SIX BELOW ─────────────────

                Six hours in a fixed block left ~800px of nothing between the
                temperature and the forecast on a 2552px monitor. Capping the
                page was tried and was worse — it moved the void to the outside
                edges. So the card USES the width instead: hours seven to
                twelve render from 2xl (1536px) and are display:none below it.

                More forecast, not more gap. And it is real content rather than
                six items stretched apart, which is the difference between a
                filled row and a padded one. */}
            <div className="flex max-w-full items-center gap-1 overflow-x-auto">
              <div className="mr-3 hidden h-12 border-l border-white/25 sm:block" />
              {data.hourly.slice(0, 12).map((h, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-2",
                    i >= 6 && "hidden 2xl:flex",
                  )}
                  style={{
                    animation: `fadeSlideUp 0.3s ease-out ${i * 0.08}s both`,
                  }}
                >
                  {/* 85 and a shadow, not 70 and none. The strip crosses
                      whatever the sky is doing behind it — at 599px the sun
                      lands squarely on the first column — and white at .70
                      over #FFC23D is not a contrast anyone can read. The
                      shadow is what makes one ink work on every sky, which
                      is cheaper than moving the sun per breakpoint. */}
                  <span className="text-[10px] font-medium text-white/85 [text-shadow:0_1px_3px_rgba(4,14,30,0.7)]">
                    {formatTime(h.time)}
                  </span>
                  {getWeatherIcon(h.weatherCode, "size-5", !h.isDay)}
                  <span className="text-sm font-semibold tabular-nums drop-shadow-[0_1px_3px_rgba(4,14,30,0.6)]">
                    {Math.round(h.temperature)}°
                  </span>
                </div>
              ))}

              {/* Collapse + refresh */}
              <div className="ml-2 flex flex-col items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-white hover:bg-white/15 hover:text-white"
                  onClick={toggleCollapsed}
                >
                  <ChevronUp className="size-3.5" />
                </Button>
                <span className="text-[9px] text-white/70">
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
