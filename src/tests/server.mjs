import { Router } from "express";
import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { json, urlencoded } = bodyParser;
const router = Router();

router.use((request, response, next) => {
  if (request.accepts(["text/html", "application/xhtml+xml"])) {
    next();
  } else {
    response.sendStatus(422);
  }
});

router.get("/", (_request, response) => {
  response
    .type("html")
    .status(200)
    .send(
      fs.readFileSync(path.join(__dirname, "fixtures", "root.html"), "utf8")
    );
});

router.get("/items", (request, response) => {
  const ids = [];
  for (let i = 1; i <= 1000; i++) {
    ids.push(i);
  }
  const template = fs
    .readFileSync(path.join(__dirname, "fixtures", "items.html"), "utf8")
    .replace(/\{ids\}/g, JSON.stringify(ids));
  response.type("html").status(200).send(template);
});

router.get("/load-items", (request, response) => {
  const {
    q: { id_in: ids },
  } = request.query;

  const html = ids
    .map((id) => {
      const template = fs.readFileSync(
        path.join(__dirname, "fixtures", "item.html"),
        "utf8"
      );
      return template.replace(/\{id\}/g, id);
    })
    .join("\n");

  response
    .type("text/vnd.turbo-stream.html; charset=utf-8")
    .status(200)
    .send(html);
});

function acceptsStreams(request) {
  return !!request.accepts("text/vnd.turbo-stream.html");
}

const app = express();
const port = parseInt(process.env.PORT || "9000");

app.use(json({ limit: "1mb" }), urlencoded({ extended: true }));
app.use(express.static("."));
app.use(router);
app.listen(port, () => {
  console.log(`Test server listening on port http://localhost:${port}`);
});

export const TestServer = router;
