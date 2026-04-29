import type { NextApiRequest, NextApiResponse } from "next";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createScrapeMcpServer } from "../../../app/api/scrape/mcp-server";

type SessionStore = Record<string, SSEServerTransport>;

declare global {
  var __scrapeMcpSseTransports__: SessionStore | undefined;
}

const transports: SessionStore = global.__scrapeMcpSseTransports__ ?? {};

if (!global.__scrapeMcpSseTransports__) {
  global.__scrapeMcpSseTransports__ = transports;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 用 GET (SSE) 充当服务器到客户端的下行通道，用 POST 充当客户端到服务器的上行通道。
  if (req.method === "GET") {
    try {
      const transport = new SSEServerTransport("/api/scrape/mcp", res);
      const sessionId = transport.sessionId;
      transports[sessionId] = transport;

      transport.onclose = () => {
        delete transports[sessionId];
      };

      const server = createScrapeMcpServer();
      await server.connect(transport);
      return;
    } catch (error) {
      console.error("[MCP SSE] establish stream failed:", error);
      if (!res.headersSent) {
        res.status(500).send("Error establishing SSE stream");
      }
      return;
    }
  }

  if (req.method === "POST") {
    const sessionId =
      typeof req.query.sessionId === "string" ? req.query.sessionId : undefined;

    if (!sessionId) {
      res.status(400).send("Missing sessionId parameter");
      return;
    }

    const transport = transports[sessionId];

    if (!transport) {
      res.status(404).send("Session not found");
      return;
    }

    try {
      await transport.handlePostMessage(req, res, req.body);
      return;
    } catch (error) {
      console.error("[MCP SSE] handle message failed:", error);
      if (!res.headersSent) {
        res.status(500).send("Error handling request");
      }
      return;
    }
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).send("Method Not Allowed");
}

export const config = {
  api: {
    bodyParser: true,
  },
};
