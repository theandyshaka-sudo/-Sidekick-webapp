// Runs after `expo export -p web`. The SPA build generates a minimal index.html and ignores
// app/+html.tsx, so we inject the PWA install tags (Add to Home Screen) + a noindex (keep the
// demo link-only) directly into the exported dist/index.html.
import fs from "node:fs";

const file = "dist/index.html";
let html = fs.readFileSync(file, "utf8");

const inject = `
    <meta name="robots" content="noindex, nofollow" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" href="/icon.png" />
    <meta name="theme-color" content="#D97706" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="SideKick" />
`;

if (!html.includes('rel="manifest"')) {
  // Give the viewport a notch-safe area for the standalone (installed) experience.
  html = html.replace(
    'content="width=device-width, initial-scale=1, shrink-to-fit=no"',
    'content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"'
  );
  html = html.replace("</head>", inject + "  </head>");
  fs.writeFileSync(file, html);
  console.log("postbuild-head: injected PWA + noindex tags into dist/index.html");
} else {
  console.log("postbuild-head: tags already present, skipping");
}
