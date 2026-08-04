import server from "../dist/server/server.js";

export default async function handler(req, res) {
  try {
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host =
      req.headers["x-forwarded-host"] ||
      req.headers.host ||
      "localhost";

    const fullUrl = `${protocol}://${host}${req.url}`;

    const headers = new Headers();

    for (const [key, val] of Object.entries(req.headers)) {
      if (Array.isArray(val)) {
        val.forEach((v) => headers.append(key, v));
      } else if (val) {
        headers.set(key, val);
      }
    }

    const webRequest = new Request(fullUrl, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method)
        ? undefined
        : req,
      duplex: "half",
    });

    const webResponse = await server.fetch(webRequest);

    res.statusCode = webResponse.status;

    webResponse.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const body = await webResponse.arrayBuffer();

    res.end(Buffer.from(body));
  } catch (error) {
    console.error("Vercel SSR Handler Error:", error);

    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain");
    res.end("Internal Server Error during SSR");
  }
}