import http from "http";

http.get("http://localhost:5173/", (res) => {
  console.log("Status Code:", res.statusCode);
  console.log("Headers:", res.headers);
  let data = "";
  res.on("data", (chunk) => { data += chunk; });
  res.on("end", () => {
    console.log("HTML Preview (first 300 chars):", data.slice(0, 300));
  });
}).on("error", (err) => {
  console.error("HTTP fetch error:", err.message);
});
