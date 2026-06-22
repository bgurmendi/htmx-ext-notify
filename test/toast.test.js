const { test, before, after } = require("node:test");
const assert = require("node:assert");
const { chromium } = require("playwright");
const { startServer } = require("./server");
const { captureConsole, disableAnimations, shoot } = require("./artifacts");
const { createCoverageReport, startCoverage, stopCoverage } = require("./coverage");

let server;
let baseURL;
let browser;
let mcr;

before(async () => {
  server = await startServer();
  baseURL = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    headless: process.env.HEADED !== "1",
    slowMo: process.env.HEADED === "1" ? Number(process.env.SLOWMO ?? 1000) : undefined,
  });
  mcr = createCoverageReport();
});

after(async () => {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  await mcr.generate();
});

async function newPage(testName) {
  const page = await browser.newPage();
  captureConsole(page, testName);
  page.on("pageerror", (err) => {
    throw err;
  });
  await startCoverage(page);
  return page;
}

async function closePage(page) {
  await stopCoverage(page, mcr);
  await page.close();
}

test("hx-toast attribute shows a success notification after a successful request", async (t) => {
  const page = await newPage(t.name);
  await page.goto(`${baseURL}/demo.html`);
  await disableAnimations(page);

  await page.locator('button:has-text("Save (success)")').click();
  await shoot(page, t.name, "after-save");

  const notification = page.locator('.hx-toast[data-hx-toast-type="success"]');
  await assert.doesNotReject(notification.waitFor({ timeout: 2000 }));

  assert.strictEqual(await notification.getAttribute("role"), "status");
  assert.match(await notification.locator(".hx-toast-title").innerText(), /Saved/);
  assert.match(await notification.locator(".hx-toast-message").innerText(), /Document saved/);

  await closePage(page);
});

test("hx-toast-fail attribute shows an error notification after a failed request", async (t) => {
  const page = await newPage(t.name);
  await page.goto(`${baseURL}/demo.html`);
  await disableAnimations(page);

  await page.locator('button:has-text("Save (failure)")').click();
  await shoot(page, t.name, "after-save-error");

  const notification = page.locator('.hx-toast[data-hx-toast-type="error"]');
  await assert.doesNotReject(notification.waitFor({ timeout: 2000 }));

  assert.strictEqual(await notification.getAttribute("role"), "alert");
  assert.match(await notification.locator(".hx-toast-title").innerText(), /Error/);
  assert.match(
    await notification.locator(".hx-toast-message").innerText(),
    /Unable to save the document/,
  );

  await closePage(page);
});

test("HX-Trigger response header with an hx-toast event creates a notification", async (t) => {
  const page = await newPage(t.name);
  await page.goto(`${baseURL}/demo.html`);
  await disableAnimations(page);

  await page.locator('button:has-text("Response with")').first().click();
  await shoot(page, t.name, "after-trigger");

  const notification = page.locator('.hx-toast[data-hx-toast-type="success"]');
  await assert.doesNotReject(notification.waitFor({ timeout: 2000 }));

  assert.match(await notification.locator(".hx-toast-title").innerText(), /Import complete/);
  assert.match(
    await notification.locator(".hx-toast-message").innerText(),
    /42 new records were imported/,
  );

  await closePage(page);
});

test("HX-Toast response headers create a notification without any hx-toast attribute", async (t) => {
  const page = await newPage(t.name);
  await page.goto(`${baseURL}/demo.html`);
  await disableAnimations(page);

  await page.locator('button:has-text("Response with HX-Toast")').click();
  await shoot(page, t.name, "after-header-toast");

  const notification = page.locator('.hx-toast[data-hx-toast-type="info"]');
  await assert.doesNotReject(notification.waitFor({ timeout: 2000 }));

  assert.match(await notification.locator(".hx-toast-title").innerText(), /Information/);
  assert.match(
    await notification.locator(".hx-toast-message").innerText(),
    /A new version is available/,
  );

  await closePage(page);
});

test("htmx.toast(...) JS API creates a notification for each type", async (t) => {
  const page = await newPage(t.name);
  await page.goto(`${baseURL}/demo.html`);
  await disableAnimations(page);

  const types = ["Success", "Error", "Warning", "Info"];

  for (const type of types) {
    await page.locator(`button:has-text("${type}")`).first().click();
    const notification = page.locator(`.hx-toast[data-hx-toast-type="${type.toLowerCase()}"]`);
    await assert.doesNotReject(
      notification.waitFor({ timeout: 2000 }),
      `${type} notification should appear`,
    );
  }

  await shoot(page, t.name, "all-types");

  await closePage(page);
});

test("custom timeout dismisses a notification automatically, persistent ones stay", async (t) => {
  const page = await newPage(t.name);
  await page.goto(`${baseURL}/demo.html`);
  await disableAnimations(page);

  await page.locator('button:has-text("Short timeout (2s)")').click();
  await page.locator('button:has-text("Persistent (timeout 0)")').click();

  const shortLived = page.locator('.hx-toast:has-text("Saved with short timeout")');
  const persistent = page.locator('.hx-toast:has-text("This notification does not close on its own")');

  await assert.doesNotReject(shortLived.waitFor({ timeout: 2000 }));
  await assert.doesNotReject(persistent.waitFor({ timeout: 2000 }));
  await shoot(page, t.name, "both-visible");

  await assert.doesNotReject(
    shortLived.waitFor({ state: "detached", timeout: 3000 }),
    "short-lived notification should auto-dismiss",
  );
  assert.strictEqual(await persistent.count(), 1, "persistent notification should remain");
  await shoot(page, t.name, "short-lived-gone");

  await closePage(page);
});

test("notification with an hx-get action performs a request into the target", async (t) => {
  const page = await newPage(t.name);
  await page.goto(`${baseURL}/demo.html`);
  await disableAnimations(page);

  await page.locator('button:has-text("Action with hx-get")').click();

  const notification = page.locator('.hx-toast:has-text("Import complete")');
  await assert.doesNotReject(notification.waitFor({ timeout: 2000 }));
  await shoot(page, t.name, "notification-with-action");

  await notification.locator(".hx-toast-action").click();

  await assert.doesNotReject(
    page.locator("#imports-result").locator("text=Imported records: 42").waitFor({ timeout: 2000 }),
  );
  await shoot(page, t.name, "action-result");

  await closePage(page);
});

test("notification with an action link renders an anchor pointing to actionHref", async (t) => {
  const page = await newPage(t.name);
  await page.goto(`${baseURL}/demo.html`);
  await disableAnimations(page);

  await page.locator('button:has-text("Action with link")').click();

  const notification = page.locator('.hx-toast:has-text("Import complete")');
  await assert.doesNotReject(notification.waitFor({ timeout: 2000 }));

  const action = notification.locator("a.hx-toast-action");
  assert.strictEqual(await action.count(), 1, "action should render as an <a> element");
  assert.match(await action.innerText(), /View/);

  await closePage(page);
});

test("notification with rich HTML renders markup in the message", async (t) => {
  const page = await newPage(t.name);
  await page.goto(`${baseURL}/demo.html`);
  await disableAnimations(page);

  await page.locator('button:has-text("Notification with HTML")').click();

  const notification = page.locator('.hx-toast:has-text("News")');
  await assert.doesNotReject(notification.waitFor({ timeout: 2000 }));
  await shoot(page, t.name, "html-notification");

  assert.strictEqual(await notification.locator(".hx-toast-message strong").count(), 1);
  assert.strictEqual(await notification.locator(".hx-toast-message a").count(), 1);

  await closePage(page);
});

test("the close button dismisses a single notification", async (t) => {
  const page = await newPage(t.name);
  await page.goto(`${baseURL}/demo.html`);
  await disableAnimations(page);

  await page.locator('button:has-text("Simple message")').click();

  const notification = page.locator('.hx-toast:has-text("Simple notification")');
  await assert.doesNotReject(notification.waitFor({ timeout: 2000 }));
  await shoot(page, t.name, "before-close");

  await notification.locator("[data-hx-toast-dismiss]").click();

  await assert.doesNotReject(notification.waitFor({ state: "detached", timeout: 2000 }));
  await shoot(page, t.name, "after-close");

  await closePage(page);
});

test("multiple notifications stack and the 'dismiss all' button clears them all", async (t) => {
  const page = await newPage(t.name);
  await page.goto(`${baseURL}/demo.html`);
  await disableAnimations(page);

  await page.locator("#burst-btn").click();

  await assert.doesNotReject(async () => {
    await page.waitForFunction(() => document.querySelectorAll(".hx-toast").length === 5, {
      timeout: 3000,
    });
  });
  await shoot(page, t.name, "stack-of-five");

  const dismissAll = page.locator(".hx-toast-dismiss-all");
  await assert.doesNotReject(dismissAll.waitFor({ timeout: 2000 }));

  await dismissAll.click();

  await assert.doesNotReject(async () => {
    await page.waitForFunction(() => document.querySelectorAll(".hx-toast").length === 0, {
      timeout: 2000,
    });
  });
  await shoot(page, t.name, "all-dismissed");

  await closePage(page);
});

test("saving the click-to-edit form shows a server-triggered notification", async (t) => {
  const page = await newPage(t.name);
  await page.goto(`${baseURL}/demo.html`);
  await disableAnimations(page);

  await page.locator('#contact-card button:has-text("Click to edit")').click();
  await page.locator("#contact-card form").waitFor();
  await shoot(page, t.name, "edit-form");

  await page.locator("#firstName").fill("Ada");
  await page.locator("#contact-card button:has-text(\"Save\")").click();

  const notification = page.locator('.hx-toast:has-text("Contact updated successfully")');
  await assert.doesNotReject(notification.waitFor({ timeout: 2000 }));
  await shoot(page, t.name, "saved");

  assert.match(await page.locator("#contact-card").innerText(), /Ada/);

  await closePage(page);
});
