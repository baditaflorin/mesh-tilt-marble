import { useEffect, useMemo, useState } from "react";
import {
  ArmGate,
  useConfetti,
  useFlashOnChange,
  useNamedPeer,
  usePerPeerValue,
  useTilt,
  type MeshConfig,
  type YRoom,
} from "@baditaflorin/mesh-common";

type Props = { room: YRoom | null; config: MeshConfig };
type Tilt = { x: number; y: number; ts: number };

const WALLS: Array<[number, number, number, number]> = [
  [0.25, 0, 0.25, 0.6],
  [0.5, 0.4, 0.5, 1],
  [0.75, 0, 0.75, 0.6],
  [0, 0.5, 0.4, 0.5],
  [0.6, 0.25, 1, 0.25],
];
const GOAL = { x: 0.9, y: 0.9, r: 0.07 };
const START = { x: 0.1, y: 0.1 };

export function Feature({ room, config }: Props) {
  if (!room)
    return (
      <div className="maze-screen">
        <h1>tilt marble</h1>
        <p>Connecting…</p>
      </div>
    );
  return <Body room={room} config={config} />;
}

function Body({ room, config }: { room: YRoom; config: MeshConfig }) {
  const { name, setName, nameOf } = useNamedPeer(config, room);
  const tilts = usePerPeerValue<Tilt>(room, "tilts", { x: 0, y: 0, ts: 0 });
  const { burst } = useConfetti();

  const marble = useMemo(() => room.doc.getMap<number>("marble"), [room]);
  const [, bump] = useState(0);

  useEffect(() => {
    const cb = () => bump((n) => n + 1);
    marble.observe(cb);
    return () => marble.unobserve(cb);
  }, [marble]);

  // Owner = lexicographically smallest peerId among peers who've written tilts.
  // Ensures single-writer physics without racing; promotes if owner leaves.
  const tiltPeerIds = tilts.entries.map(([k]) => k);
  const candidates = [room.peerId, ...tiltPeerIds].sort();
  const owner = candidates[0];
  const isOwner = room.peerId === owner;

  const mx = (marble.get("x") as number) ?? START.x;
  const my = (marble.get("y") as number) ?? START.y;
  const wins = (marble.get("wins") as number) ?? 0;
  const flash = useFlashOnChange(Math.round((mx + my) * 1000));

  useEffect(() => {
    if (!isOwner) return;
    const id = setInterval(() => {
      const entries: Array<[string, Tilt]> = [];
      room.doc.getMap<Tilt>("tilts").forEach((v, k) => entries.push([k, v]));
      if (entries.length === 0) return;
      let ax = 0;
      let ay = 0;
      for (const [, v] of entries) {
        ax += v.x;
        ay += v.y;
      }
      ax /= entries.length;
      ay /= entries.length;
      const px = (marble.get("x") as number) ?? START.x;
      const py = (marble.get("y") as number) ?? START.y;
      let vx = ((marble.get("vx") as number) ?? 0) * 0.92 + ax * 0.004;
      let vy = ((marble.get("vy") as number) ?? 0) * 0.92 + ay * 0.004;
      let nx = px + vx;
      let ny = py + vy;
      for (const [x1, y1, x2, y2] of WALLS) {
        if (x1 === x2) {
          if (
            (px - x1) * (nx - x1) < 0 &&
            ny >= Math.min(y1, y2) - 0.02 &&
            ny <= Math.max(y1, y2) + 0.02
          ) {
            nx = px;
            vx = -vx * 0.3;
          }
        } else if (y1 === y2) {
          if (
            (py - y1) * (ny - y1) < 0 &&
            nx >= Math.min(x1, x2) - 0.02 &&
            nx <= Math.max(x1, x2) + 0.02
          ) {
            ny = py;
            vy = -vy * 0.3;
          }
        }
      }
      if (nx < 0.02) {
        nx = 0.02;
        vx = -vx * 0.3;
      }
      if (nx > 0.98) {
        nx = 0.98;
        vx = -vx * 0.3;
      }
      if (ny < 0.02) {
        ny = 0.02;
        vy = -vy * 0.3;
      }
      if (ny > 0.98) {
        ny = 0.98;
        vy = -vy * 0.3;
      }
      const dx = nx - GOAL.x;
      const dy = ny - GOAL.y;
      const won = Math.hypot(dx, dy) < GOAL.r;
      room.doc.transact(() => {
        if (won) {
          marble.set("x", START.x);
          marble.set("y", START.y);
          marble.set("vx", 0);
          marble.set("vy", 0);
          marble.set("wins", wins + 1);
        } else {
          marble.set("x", nx);
          marble.set("y", ny);
          marble.set("vx", vx);
          marble.set("vy", vy);
        }
        marble.set("ts", Date.now());
      });
    }, 60);
    return () => clearInterval(id);
  }, [isOwner, marble, room, wins]);

  useEffect(() => {
    if (wins > 0) burst({ origin: "center", count: 60, hueRange: [180, 260] });
  }, [wins, burst]);

  const reset = () => {
    room.doc.transact(() => {
      marble.set("x", START.x);
      marble.set("y", START.y);
      marble.set("vx", 0);
      marble.set("vy", 0);
      marble.set("ts", Date.now());
    });
  };

  const writeTest = (val: string, axis: "x" | "y") => {
    const n = Number(val) / 100;
    tilts.setMy({
      x: axis === "x" ? n : tilts.my.x,
      y: axis === "y" ? n : tilts.my.y,
      ts: Date.now(),
    });
  };

  return (
    <div className="maze-screen">
      <h1>tilt marble</h1>
      <p className="maze-status">
        {tilts.size} tilting · wins: {wins}
      </p>
      <input
        className="maze-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="your name"
        maxLength={48}
      />

      <ArmGate label="tap to enable motion">
        {(armed) => <TiltWriter armed={armed} tilts={tilts} />}
      </ArmGate>

      <svg
        className={`maze-svg ${flash ? "maze-flash" : ""}`}
        viewBox="0 0 400 400"
        aria-label="maze"
      >
        <rect className="maze-bg" x="0" y="0" width="400" height="400" />
        {WALLS.map(([x1, y1, x2, y2], i) => (
          <line
            key={i}
            className="maze-wall"
            x1={x1 * 400}
            y1={y1 * 400}
            x2={x2 * 400}
            y2={y2 * 400}
          />
        ))}
        <circle className="maze-goal" cx={GOAL.x * 400} cy={GOAL.y * 400} r={GOAL.r * 400} />
        <circle className="maze-marble" cx={mx * 400} cy={my * 400} r="10" />
      </svg>

      <div className="maze-test-row">
        <label>
          test x
          <input
            type="range"
            min="-100"
            max="100"
            defaultValue="0"
            data-test-tilt-x=""
            onInput={(e) => writeTest((e.target as HTMLInputElement).value, "x")}
          />
        </label>
        <label>
          test y
          <input
            type="range"
            min="-100"
            max="100"
            defaultValue="0"
            data-test-tilt-y=""
            onInput={(e) => writeTest((e.target as HTMLInputElement).value, "y")}
          />
        </label>
      </div>

      <div className="maze-peer-tilts">
        {tilts.entries.map(([pid, v]) => (
          <div
            key={pid}
            className="maze-peer-tilt"
            data-peer-name={nameOf(pid) ?? pid.slice(0, 6)}
            data-x={v.x.toFixed(3)}
            data-y={v.y.toFixed(3)}
          >
            <span className="maze-peer-name">{nameOf(pid) ?? pid.slice(0, 6)}</span>
            <span className="maze-peer-arrow">→</span>
          </div>
        ))}
      </div>

      <button className="maze-btn" type="button" onClick={reset}>
        reset
      </button>
    </div>
  );
}

function TiltWriter({
  armed,
  tilts,
}: {
  armed: boolean;
  tilts: ReturnType<typeof usePerPeerValue<Tilt>>;
}) {
  const t = useTilt({ armed });
  useEffect(() => {
    if (!armed || !t.ready) return;
    tilts.setMy({ x: t.x, y: t.y, ts: Date.now() });
  }, [armed, t.x, t.y, t.ready, tilts]);
  return <p className="maze-arm-hint">motion enabled</p>;
}
