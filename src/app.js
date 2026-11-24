const express = require("express");
const client = require("prom-client");

const app = express();

// Metriques systeme par defaut (CPU, memoire, event loop...)
client.collectDefaultMetrics();

const httpRequests = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"],
});

const httpDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Request latency in seconds",
  labelNames: ["method", "route"],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2],
});

// Middleware : metriques + log JSON pour chaque requete
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    // Pattern de la route (ex: /health) et non l'URL complete,
    // pour garder un nombre de valeurs de label limite
    const route = req.route ? req.route.path : "unmatched";
    const seconds = Number(process.hrtime.bigint() - start) / 1e9;
    httpRequests.inc({ method: req.method, route, status: res.statusCode });
    httpDuration.observe({ method: req.method, route }, seconds);
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: res.statusCode >= 500 ? "error" : "info",
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms: Math.round(seconds * 1000),
      })
    );
  });
  next();
});

app.get("/health", (req, res) => res.send("OK"));
app.get("/version", (req, res) => res.send("v2"));

// Endpoint lent : delai aleatoire jusqu'a 2 s
app.get("/slow", (req, res) => {
  setTimeout(() => res.send("slow"), Math.random() * 2000);
});

// Endpoint qui renvoie une erreur 500 environ 30% du temps
app.get("/error", (req, res) => {
  if (Math.random() < 0.3) {
    return res.status(500).send("error");
  }
  res.send("ok");
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

module.exports = app;
