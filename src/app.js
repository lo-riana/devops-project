const express = require("express");
const app = express();

app.get("/health", (req, res) => res.send("OK"));
app.get("/version", (req, res) => res.send("v2"));

module.exports = app;