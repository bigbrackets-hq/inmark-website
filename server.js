/* InMark site + Studio content server (no dependencies).
   - Serves the static site
   - Injects window.INMARK_CONTENT into every HTML page
   - GET/PUT /api/content persists content.json (the CMS store)
   - Missing routes get 404.html with a real 404 status */
require("dotenv").config();
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const connectDB = require("./db");
const User = require("./models/user");

const ROOT = __dirname;
const STORE = path.join(ROOT, "content.json");
const PORT = process.env.PORT || 3440;
const HOST = process.env.HOST || "127.0.0.1";
const LINK_BASE = process.env.EVENT_LINK_BASE || "http://" + HOST + ":" + PORT;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function readContent() {
  try {
    return fs.readFileSync(STORE, "utf8");
  } catch (e) {
    return "{}";
  }
}

function send(res, status, body, type) {
  res.writeHead(status, {
    "Content-Type": type || "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function serveHtml(res, file, status) {
  let html = fs.readFileSync(file, "utf8");
  const inject =
    "<script>window.INMARK_CONTENT = " + readContent() + ";</script>";
  html = html.includes("</head>")
    ? html.replace("</head>", inject + "\n</head>")
    : inject + html;
  send(res, status || 200, html, MIME[".html"]);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  let p = decodeURIComponent(url.pathname);

  if (p === "/api/upload" && req.method === "POST") {
    const name = (url.searchParams.get("name") || "file")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(-80);
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > 15e6) return req.destroy();
      chunks.push(c);
    });
    req.on("end", () => {
      try {
        const dir = path.join(ROOT, "assets", "uploads");
        fs.mkdirSync(dir, { recursive: true });
        const fn = Date.now().toString(36) + "-" + name;
        fs.writeFileSync(path.join(dir, fn), Buffer.concat(chunks));
        send(
          res,
          200,
          JSON.stringify({ ok: true, url: "assets/uploads/" + fn }),
          MIME[".json"],
        );
      } catch (e) {
        send(res, 500, '{"ok":false}', MIME[".json"]);
      }
    });
    return;
  }

  const readL = (f) => {
    const fp = path.join(ROOT, f);
    return fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, "utf8")) : [];
  };
  const writeL = (f, v) =>
    fs.writeFileSync(path.join(ROOT, f), JSON.stringify(v, null, 2));

  if (p === "/api/guest" && req.method === "GET") {
    const c = url.searchParams.get("c") || "";
    User.findOne({ usercode: c })
      .then((g) => {
        if (!g) return send(res, 404, '{"ok":false}', MIME[".json"]);
        const rsvped = readL("rsvps.local.json").some((r) => r.id === c);
        send(
          res,
          200,
          JSON.stringify({
            ok: true,
            name: g.fullname,
            org: g.organization || "",
            role: g.role || "",
            rsvped,
          }),
          MIME[".json"],
        );
      })
      .catch((e) => {
        console.error("GET /api/guest error:", e);
        send(res, 500, '{"ok":false}', MIME[".json"]);
      });
    return;
  }

  if (p === "/api/guests") {
    if (req.method === "GET") {
      User.find({})
        .sort({ usercode: 1 })
        .then((rows) => {
          const guests = rows.map((g) => ({
            code: g.usercode,
            name: g.fullname,
            org: g.organization,
            role: g.role,
            createdAt: g.createdAt,
            checked: g.checked,
            checkedAt: g.checkedAt,
            status: g.status,
            link: LINK_BASE + "/event/?i=" + g.usercode,
          }));
          send(
            res,
            200,
            JSON.stringify({ ok: true, count: guests.length, guests }),
            MIME[".json"],
          );
        })
        .catch((e) => {
          console.error("GET /api/guests error:", e);
          send(res, 500, '{"ok":false}', MIME[".json"]);
        });
      return;
    }
    if (req.method === "POST") {
      let body = "";
      req.on("data", (c) => {
        body += c;
        if (body.length > 5e5) req.destroy();
      });
      req.on("end", async () => {
        try {
          const b = JSON.parse(body || "{}");
          const clean = (x) =>
            String(x || "")
              .toLowerCase()
              .replace(/[^a-z0-9-]/g, "")
              .slice(0, 48);

          const insertOne = async (row, code) => {
            try {
              await User.create({
                fullname: row.name,
                usercode: code,
                organization: row.org || "",
                role: row.role || "",
                phone: row.phone || "",
              });
              return {
                ok: true,
                code,
                name: row.name,
                link: LINK_BASE + "/event/?i=" + code,
              };
            } catch (e) {
              if (e.code === 11000)
                return { ok: false, error: "code already exists" }; // Mongo duplicate key
              throw e;
            }
          };

          if (Array.isArray(b.bulk)) {
            const prefix = clean(b.prefix) || "px-iml-usr";
            const start = parseInt(b.start, 10) || 1;
            const tail = b.randomTail !== false;
            const rows = b.bulk.filter((x) => x.name);
            const made = [];
            for (let i = 0; i < rows.length; i++) {
              const row = rows[i];
              const code =
                clean(row.code) ||
                prefix +
                  "-" +
                  String(start + i).padStart(3, "0") +
                  (tail ? "-" + crypto.randomBytes(2).toString("hex") : "");
              made.push(await insertOne(row, code));
            }
            return send(
              res,
              200,
              JSON.stringify({
                ok: true,
                created: made.filter((m) => m.ok).length,
                guests: made,
              }),
              MIME[".json"],
            );
          }

          if (!b.name) return send(res, 400, '{"ok":false}', MIME[".json"]);
          const code = clean(b.code) || crypto.randomBytes(5).toString("hex");
          const one = await insertOne(b, code);
          send(res, one.ok ? 200 : 400, JSON.stringify(one), MIME[".json"]);
        } catch (e) {
          console.error("POST /api/guests error:", e);
          send(res, 500, '{"ok":false}', MIME[".json"]);
        }
      });
      return;
    }
    if (req.method === "PUT") {
      let body = "";
      req.on("data", (c) => {
        body += c;
        if (body.length > 1e4) req.destroy();
      });
      req.on("end", async () => {
        try {
          const b = JSON.parse(body || "{}");
          const existing = await User.findOne({ usercode: b.code });
          if (!existing) return send(res, 404, '{"ok":false}', MIME[".json"]);

          const update = {};

          // Editable profile fields — only touched if present in the payload
          const editableFields = [
            "fullname",
            "phone",
            "organization",
            "role",
            "usetype",
            "faceid",
          ];
          editableFields.forEach((field) => {
            if (b[field] !== undefined) update[field] = b[field];
          });

          if (b.checked !== undefined) {
            update.checked = !!b.checked;
            update.checkedAt = b.checked ? new Date() : null;
          }
          if (b.status !== undefined) {
            update.status = b.status;
            update.statusAt = new Date();
          }

          if (Object.keys(update).length) {
            await User.updateOne(
              { usercode: b.code },
              { $set: update },
              { runValidators: true },
            );
          }

          const updated = await User.findOne({ usercode: b.code });
          send(
            res,
            200,
            JSON.stringify({
              ok: true,
              fullname: updated.fullname,
              phone: updated.phone,
              organization: updated.organization,
              role: updated.role,
              usetype: updated.usetype,
              faceid: updated.faceid,
              checked: updated.checked,
              status: updated.status || null,
            }),
            MIME[".json"],
          );
        } catch (e) {
          console.error("PUT /api/guests error:", e);
          send(res, 500, '{"ok":false}', MIME[".json"]);
        }
      });
      return;
    }
    if (req.method === "DELETE") {
      const c = url.searchParams.get("c") || "";
      User.deleteOne({ usercode: c })
        .then(() => {
          send(res, 200, '{"ok":true}', MIME[".json"]);
        })
        .catch((e) => {
          console.error("DELETE /api/guests error:", e);
          send(res, 500, '{"ok":false}', MIME[".json"]);
        });
      return;
    }
  }

  if (/^\/[a-z0-9]+(?:-[a-z0-9]+)+$/.test(p)) {
    User.findOne({ usercode: p.slice(1) })
      .then((exists) => {
        if (exists) {
          res.writeHead(302, { Location: "/event/?i=" + p.slice(1) });
          return res.end();
        }
        serveStatic();
      })
      .catch(() => serveStatic());
    return;
  }
  serveStatic();

  function serveStatic() {
    if (p === "/") p = "/index.html";
    if (p.endsWith("/")) p += "index.html";
    else if (
      !path.extname(p) &&
      fs.existsSync(path.join(ROOT, p, "index.html"))
    )
      p += "/index.html";
    const file = path.join(
      ROOT,
      path.normalize(p).replace(/^(\.\.[\/\\])+/, ""),
    );
    if (!file.startsWith(ROOT)) return send(res, 403, "forbidden");

    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) {
        try {
          return serveHtml(res, path.join(ROOT, "404.html"), 404);
        } catch (e) {
          return send(res, 404, "not found");
        }
      }
      const ext = path.extname(file).toLowerCase();
      if (ext === ".html") return serveHtml(res, file);
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control":
          ext === ".png" || ext === ".svg"
            ? "public, max-age=3600"
            : "no-store",
      });
      fs.createReadStream(file).pipe(res);
    });
  }
});

connectDB().then(() => {
  server.listen(PORT, HOST, () =>
    console.log("InMark site + Studio on http://" + HOST + ":" + PORT),
  );
});
