import {
  lookupWeather,
  lookupWeatherSchema,
  lookupWeatherToMcpResult,
} from "./lookup-weather";
import {
  searchReactDocs,
  searchReactDocsSchema,
  searchReactDocsToMcpResult,
} from "./search-react-docs";

export const SCRAPE_TOOLS = {
  search_react_docs: {
    description:
      "当用户提问关于 React 源码、API 用法或具体技术细节时，必须调用此工具去知识库中检索背景信息。",
    schema: searchReactDocsSchema,
    execute: searchReactDocs,
    toMcpResult: searchReactDocsToMcpResult,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  lookup_weather: {
    description: "当用户提问某个地点的实时天气时，调用此工具查询该地点当前天气。",
    schema: lookupWeatherSchema,
    execute: lookupWeather,
    toMcpResult: lookupWeatherToMcpResult,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
} as const;
