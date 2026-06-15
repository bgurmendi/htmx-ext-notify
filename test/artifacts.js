const fs = require("node:fs");
const path = require("node:path");

const ARTIFACTS_ROOT = path.join(__dirname, "artifacts");

function dirFor(testName) {
  const safe = testName.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
  const dir = path.join(ARTIFACTS_ROOT, safe);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Wires up console/page-error capture for a test, writing everything to
// <artifacts>/<test-name>/console.log so failures can be inspected after
// the fact alongside the screenshots taken with shoot().
function captureConsole(page, testName) {
  const dir = dirFor(testName);
  const logPath = path.join(dir, "console.log");
  fs.writeFileSync(logPath, "");

  const append = (line) => fs.appendFileSync(logPath, line + "\n");

  page.on("console", (msg) => append(`[console:${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => append(`[pageerror] ${err.message}`));
}

// The demo uses CSS animations for sliding and fading notifications in
// and out. Without this, a screenshot taken right after an action can land
// mid-transition, which is confusing to look at. Force everything to
// complete instantly.
function disableAnimations(page) {
  return page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });
}

// Takes a screenshot at a specific point in a test, numbered so the order
// of the steps is clear from the file listing.
async function shoot(page, testName, label) {
  await page.waitForTimeout(350);

  const dir = dirFor(testName);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".png"));
  const seq = String(files.length + 1).padStart(2, "0");
  await page.screenshot({ path: path.join(dir, `${seq}-${label}.png`) });
}

module.exports = { captureConsole, disableAnimations, shoot };
