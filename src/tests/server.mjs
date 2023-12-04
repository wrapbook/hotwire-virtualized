import { Router } from "express";
import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import methodOverride from "method-override";

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

router.get("/items", (_request, response) => {
  const ids = [];
  for (let i = 1; i <= 100; i++) {
    ids.push(i);
  }
  const template = fs
    .readFileSync(path.join(__dirname, "fixtures", "items.html"), "utf8")
    .replace(/\{ids\}/g, JSON.stringify(ids));
  response.type("html").status(200).send(template);
});

router.get("/preloaded", (_request, response) => {
  const ids = [1, 2, 3, 4, 5];
  const template = fs
    .readFileSync(path.join(__dirname, "fixtures", "preloaded.html"), "utf8")
    .replace(/\{ids\}/g, JSON.stringify(ids));
  response.type("html").status(200).send(template);
});

router.get("/multiple", (_request, response) => {
  const template = fs.readFileSync(
    path.join(__dirname, "fixtures", "multiple.html"),
    "utf8"
  );
  response.type("html").status(200).send(template);
});

router.get("/variable", (_request, response) => {
  const template = fs.readFileSync(
    path.join(__dirname, "fixtures", "variable.html"),
    "utf8"
  );
  response.type("html").status(200).send(template);
});

router.delete("/items/:id", (request, response) => {
  const { id } = request.params;
  response
    .type("text/vnd.turbo-stream.html; charset=utf-8")
    .status(200)
    .send(`<turbo-stream action="v-remove" target="${id}"></turbo-stream>`);
});

router.get("/load-items", (request, response) => {
  const {
    q: { id_in: ids },
  } = request.query;

  const html = ids
    .map((id) => {
      return fs
        .readFileSync(path.join(__dirname, "fixtures", "item.html"), "utf8")
        .replace(/\{id\}/g, id)
        .replace(/\{virtualizedId\}/g, "");
    })
    .join("\n");

  response
    .type("text/vnd.turbo-stream.html; charset=utf-8")
    .status(200)
    .send(html);
});

router.get("/multiple-load-items", (request, response) => {
  const {
    q: { id_in: ids },
  } = request.query;
  let virtualizedId = request.headers["x-virtualized-id"];

  const html = ids
    .map((id) => {
      return fs
        .readFileSync(path.join(__dirname, "fixtures", "item.html"), "utf8")
        .replace(/\{id\}/g, id)
        .replace(/\{virtualizedId\}/g, virtualizedId);
    })
    .join("\n");

  response
    .type("text/vnd.turbo-stream.html; charset=utf-8")
    .status(200)
    .send(html);
});

router.get("/variable-load-items", (request, response) => {
  const {
    q: { id_in: ids },
  } = request.query;

  const html = ids
    .map((id) => {
      return fs
        .readFileSync(path.join(__dirname, "fixtures", "item.html"), "utf8")
        .replace(/\{id\}/g, id)
        .replace(/50px/, `${Math.floor(Math.random() * 200) + 25}px`)
        .replace(/\{virtualizedId\}/g, "");
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

app.use(methodOverride("_method"));
app.use(json({ limit: "1mb" }), urlencoded({ extended: true }));
app.use(express.static("."));
app.use(router);
app.listen(port, () => {
  console.log(`Test server listening on port http://localhost:${port}`);
});

export const TestServer = router;
