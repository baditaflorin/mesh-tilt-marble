import { test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

test("tilt on A → B sees A's tilt swatch", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByPlaceholder("your name").fill("alice");
    await b.getByPlaceholder("your name").fill("bob");
    await a.waitForTimeout(600);

    await a.locator("[data-test-tilt-x]").fill("75");
    await b.waitForTimeout(500);

    const x = await b.locator('.maze-peer-tilt[data-peer-name="alice"]').getAttribute("data-x");
    const n = Number(x);
    if (!(n >= 0.7 && n <= 0.8)) throw new Error("expected alice x~0.75, got " + x);
  } finally {
    await cleanup();
  }
});
