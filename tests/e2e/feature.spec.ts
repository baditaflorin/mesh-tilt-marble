import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

const START_CX = 0.1 * 400; // 40 — marble starts here
const START_CY = 0.1 * 400; // 40

/** Read the SHARED marble's rendered position from a peer's SVG. Both peers
 *  derive cx/cy from the same Y.Map("marble") — equal values prove sync. */
async function marblePos(page: import("@playwright/test").Page) {
  const c = page.locator("circle.maze-marble");
  const cx = Number(await c.getAttribute("cx"));
  const cy = Number(await c.getAttribute("cy"));
  return { cx, cy };
}

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

/**
 * THE advertised promise: "Tilt your phone; the group's average vector
 * navigates a SHARED marble." This drives the REAL `deviceorientation` sensor
 * on peer A (after arming the gate, exactly as a phone would) and the headless
 * slider fallback on peer B, with DIFFERENT tilt vectors, then asserts that
 * BOTH peers render the marble at the SAME position — i.e. the marble is
 * driven by shared averaged state, not computed locally per-peer.
 */
test("group-average tilt navigates the SHARED marble identically on both peers", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByPlaceholder("your name").fill("alice");
    await b.getByPlaceholder("your name").fill("bob");
    await a.waitForTimeout(600);

    // Both marbles start at the same shared START position.
    const a0 = await marblePos(a);
    const b0 = await marblePos(b);
    expect(a0).toEqual({ cx: START_CX, cy: START_CY });
    expect(b0).toEqual({ cx: START_CX, cy: START_CY });

    // Peer A: drive the REAL sensor. Arm the motion gate (user gesture), then
    // dispatch a synthetic DeviceOrientationEvent. beta/gamma map to y/x via
    // useTilt (deg/45). gamma=18,beta=18 → tilt ≈ (0.4, 0.4) toward the goal.
    await a.getByRole("button", { name: /enable motion/i }).click();
    await expect(a.locator(".maze-arm-hint")).toHaveText(/motion enabled/i);
    await a.evaluate(() => {
      const fire = () =>
        window.dispatchEvent(
          new DeviceOrientationEvent("deviceorientation", {
            alpha: 0,
            beta: 18,
            gamma: 18,
            absolute: true,
          } as DeviceOrientationEventInit),
        );
      fire();
      // Re-fire a few times so the listener (mounted async after arm) catches it.
      const iv = window.setInterval(fire, 50);
      window.setTimeout(() => window.clearInterval(iv), 1500);
    });

    // Peer B: drive the headless fallback slider with a smaller positive tilt.
    await b.locator("[data-test-tilt-x]").fill("20");
    await b.locator("[data-test-tilt-y]").fill("20");

    // The owner peer integrates the AVERAGE of both tilts on a 60ms tick and
    // writes the marble into shared state. Wait for the marble to leave START.
    await expect
      .poll(async () => (await marblePos(a)).cx, { timeout: 8000 })
      .toBeGreaterThan(START_CX + 1);

    // Settle, then snapshot both peers at the same time.
    await a.waitForTimeout(400);
    const aPos = await marblePos(a);
    const bPos = await marblePos(b);

    // The marble actually moved toward the goal (positive average tilt).
    expect(aPos.cx).toBeGreaterThan(START_CX);
    expect(aPos.cy).toBeGreaterThan(START_CY);

    // THE cross-peer assertion: A's marble and B's marble are the SAME marble.
    // If position were computed locally from each peer's own tilt, alice's
    // (0.4,0.4) and bob's (0.2,0.2) would diverge. Because it derives from the
    // shared averaged state, both peers render within ~2px (one tick of skew).
    expect(Math.abs(aPos.cx - bPos.cx)).toBeLessThanOrEqual(2);
    expect(Math.abs(aPos.cy - bPos.cy)).toBeLessThanOrEqual(2);
  } finally {
    await cleanup();
  }
});
