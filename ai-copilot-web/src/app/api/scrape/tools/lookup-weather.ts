import { z } from "zod";
import { fetchWithRetry } from "../resilience/network";
import { sanitizeLocation } from "../security/input-sanitizers";

const weatherCodeMap: Record<number, string> = {
  0: "晴朗",
  1: "大体晴",
  2: "局部多云",
  3: "阴天",
  45: "有雾",
  48: "冻雾",
  51: "小毛毛雨",
  53: "毛毛雨",
  55: "强毛毛雨",
  56: "小冻毛毛雨",
  57: "强冻毛毛雨",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  66: "小冻雨",
  67: "强冻雨",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  77: "冰粒",
  80: "小阵雨",
  81: "中等阵雨",
  82: "强阵雨",
  85: "小阵雪",
  86: "强阵雪",
  95: "雷暴",
  96: "伴小冰雹雷暴",
  99: "伴强冰雹雷暴",
};

export const lookupWeatherSchema = z.object({
  location: z
    .string()
    .min(1)
    .max(80)
    .describe("要查询天气的地点名称，例如 Shanghai、Tokyo、New York"),
});

export type LookupWeatherInput = z.infer<typeof lookupWeatherSchema>;

export async function lookupWeather({
  location,
}: LookupWeatherInput): Promise<string> {
  const safeLocation = sanitizeLocation(location);

  console.log(`[Function Calling] Weather lookup: ${safeLocation}`);

  const geoRes = await fetchWithRetry(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      safeLocation
    )}&count=1&language=zh&format=json`,
    { method: "GET" }
  );

  if (!geoRes.ok) {
    const errorText = await geoRes.text();
    console.error("[Function Calling] 地理编码查询失败:", errorText);
    return `查询 ${safeLocation} 天气失败，地理编码服务异常`;
  }

  const geoData = await geoRes.json();
  const place = geoData.results?.[0];

  if (!place) {
    return `未找到地点：${safeLocation}`;
  }

  const weatherRes = await fetchWithRetry(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`,
    { method: "GET" }
  );

  if (!weatherRes.ok) {
    const errorText = await weatherRes.text();
    console.error("[Function Calling] 天气查询失败:", errorText);
    return `查询 ${place.name} 天气失败，天气服务异常`;
  }

  const weatherData = await weatherRes.json();
  const current = weatherData.current;

  if (!current) {
    return `未获取到 ${place.name} 的实时天气数据`;
  }

  const weatherText =
    weatherCodeMap[current.weather_code] ?? `天气代码 ${current.weather_code}`;

  return [
    `地点：${place.name}${place.admin1 ? `, ${place.admin1}` : ""}${
      place.country ? `, ${place.country}` : ""
    }`,
    `时间：${current.time}`,
    `天气：${weatherText}`,
    `气温：${current.temperature_2m}${
      weatherData.current_units?.temperature_2m ?? "°C"
    }`,
    `体感温度：${current.apparent_temperature}${
      weatherData.current_units?.apparent_temperature ?? "°C"
    }`,
    `相对湿度：${current.relative_humidity_2m}${
      weatherData.current_units?.relative_humidity_2m ?? "%"
    }`,
    `风速：${current.wind_speed_10m}${
      weatherData.current_units?.wind_speed_10m ?? "km/h"
    }`,
  ].join("\n");
}

export function lookupWeatherToMcpResult(text: string) {
  return {
    content: [{ type: "text" as const, text }],
    structuredContent: { text },
  };
}
