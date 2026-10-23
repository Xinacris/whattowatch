"use client";
import { forwardRef, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { motion } from "@wtw/tokens";
import type { Vote } from "@wtw/core";

export interface SwipeHandle { fling(vote: Vote): void }

interface Props { onCommit(vote: Vote): void; onTap(): void; children(drag: { x: number; y: number }): ReactNode; label: string }

const FLY: Record<Vote, { x: number; y: number; r: number }> = {
  like: { x: 1.4, y: 0.1, r: 24 },
  nope: { x: -1.4, y: 0.1, r: -24 },
  rewatch: { x: 0, y: -1.4, r: 0 },
  seen: { x: 0, y: -1.4, r: 0 },
};

function decide(dx: number, dy: number, vx: number, vy: number): Vote | null {
  const { commitDistance: d, commitVelocity: v } = motion;
  if (-dy > d && Math.abs(dy) > Math.abs(dx)) return "rewatch";
  if (dx > d || (vx > v && dx > 30)) return "like";
  if (dx < -d || (vx < -v && dx < -30)) return "nope";
  if (vy < -v && dy < -30) return "rewatch";
  return null;
}

/** Follows the finger, tilts with the drag, springs back if you chicken out, flies off if you don't. */
export const SwipeCard = forwardRef<SwipeHandle, Props>(function SwipeCard({ onCommit, onTap, children, label }, ref) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [mode, setMode] = useState<"rest" | "drag" | "fly">("rest");
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const flying = useRef<Vote | null>(null);

  function fling(vote: Vote) {
    if (flying.current) return;
    flying.current = vote;
    const w = typeof window === "undefined" ? 800 : window.innerWidth;
    const f = FLY[vote];
    setMode("fly");
    setPos({ x: f.x * w, y: f.y * w });
    window.setTimeout(() => onCommit(vote), motion.flyOutMs);
  }
  useImperativeHandle(ref, () => ({ fling }));

  const rotate = mode === "fly" && flying.current ? FLY[flying.current].r : pos.x * motion.rotatePerPx;
  const transition = mode === "drag" ? "none" : mode === "fly" ? `transform ${motion.flyOutMs}ms cubic-bezier(.4,0,1,1)` : "transform 420ms cubic-bezier(.2,1.5,.4,1)";

  return (
    <div
      role="group"
      aria-label={label}
      className="absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
      style={{ transform: `translate3d(${pos.x}px, ${pos.y}px, 0) rotate(${rotate}deg)`, transition }}
      onDragStart={(e) => e.preventDefault()} // native image drag would steal the pointer
      onPointerDown={(e) => {
        if (flying.current) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { x: e.clientX, y: e.clientY, t: performance.now() };
        setMode("drag");
      }}
      onPointerMove={(e) => {
        if (!start.current) return;
        setPos({ x: e.clientX - start.current.x, y: e.clientY - start.current.y });
      }}
      onPointerUp={(e) => {
        const s = start.current;
        start.current = null;
        if (!s) return;
        const dx = e.clientX - s.x, dy = e.clientY - s.y;
        const dt = Math.max(1, performance.now() - s.t) / 1000;
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) { setMode("rest"); setPos({ x: 0, y: 0 }); onTap(); return; }
        const vote = decide(dx, dy, dx / dt, dy / dt);
        if (vote) { fling(vote); return; }
        setMode("rest");
        setPos({ x: 0, y: 0 });
      }}
      onPointerCancel={() => { start.current = null; setMode("rest"); setPos({ x: 0, y: 0 }); }}
    >
      {children(pos)}
    </div>
  );
});
