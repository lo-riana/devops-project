const request = require("supertest");
const app = require("../src/app");

test("GET /health returns OK", async () => {
  const res = await request(app).get("/health");
  expect(res.status).toBe(200);
  expect(res.text).toBe("OK");
});