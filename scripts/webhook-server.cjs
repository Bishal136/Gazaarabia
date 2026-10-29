const http = require("http");
const crypto = require("crypto");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const PORT = process.env.WEBHOOK_PORT || 9000;
const SECRET = process.env.GITHUB_WEBHOOK_SECRET || "35c11b1027fbf5e5eede89eb993c9c0eaa392978f54f9892";
const DEPLOY_SCRIPT = process.env.DEPLOY_SCRIPT || path.join(__dirname, "deploy-webhook.sh");

let isDeploying = false;

function verifySignature(secret, body, signature) {
  if (!signature || !signature.startsWith("sha256=")) {
    return false;
  }
  const expectedSig = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, "utf8"), Buffer.from(expectedSig, "utf8"));
  } catch (err) {
    return false;
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Health check
  if (req.method === "GET" && (url.pathname === "/health" || url.pathname === "/")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ status: "healthy", isDeploying, timestamp: new Date().toISOString() }));
  }

  // Webhook listener
  if (req.method === "POST") {
    let chunks = [];

    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => {
      const rawBody = Buffer.concat(chunks);
      const signature = req.headers["x-hub-signature-256"];
      const githubEvent = req.headers["x-github-event"];

      // Verify HMAC Signature
      if (!verifySignature(SECRET, rawBody, signature)) {
        console.warn(`[${new Date().toISOString()}] Unauthorized webhook attempt from ${req.socket.remoteAddress}`);
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Invalid signature" }));
      }

      // Handle ping event
      if (githubEvent === "ping") {
        console.log(`[${new Date().toISOString()}] Received ping event from GitHub`);
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ status: "ok", message: "pong" }));
      }

      // Handle push event
      if (githubEvent === "push") {
        try {
          const payload = JSON.parse(rawBody.toString("utf8"));
          const branch = payload.ref;

          if (branch !== "refs/heads/main") {
            console.log(`[${new Date().toISOString()}] Ignored push to branch ${branch}`);
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ status: "ignored", reason: `Not main branch (${branch})` }));
          }

          if (isDeploying) {
            console.log(`[${new Date().toISOString()}] Deploy already in progress. Skipping duplicate trigger.`);
            res.writeHead(200, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ status: "busy", message: "Deployment already in progress" }));
          }

          isDeploying = true;
          console.log(`[${new Date().toISOString()}] Pushed to main by ${payload.pusher?.name || "unknown"}. Starting deployment...`);

          // Respond immediately to GitHub so connection does not time out
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "accepted", message: "Deployment triggered successfully" }));

          // Run deploy script asynchronously
          const deploy = spawn("bash", [DEPLOY_SCRIPT], {
            detached: true,
            stdio: "ignore",
            env: process.env,
          });

          deploy.on("close", (code) => {
            isDeploying = false;
            console.log(`[${new Date().toISOString()}] Deploy process exited with code ${code}`);
          });

          deploy.on("error", (err) => {
            isDeploying = false;
            console.error(`[${new Date().toISOString()}] Deploy process error:`, err);
          });

          deploy.unref();
          return;
        } catch (err) {
          console.error("Failed to parse push payload:", err);
          res.writeHead(400, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: "Invalid JSON payload" }));
        }
      }

      // Other events
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ignored", event: githubEvent }));
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[${new Date().toISOString()}] GitHub Webhook listener running on http://127.0.0.1:${PORT}`);
});
