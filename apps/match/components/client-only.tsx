"use client";
import dynamic from "next/dynamic";

// These read the anonymous viewer from localStorage on first render, so they skip SSR.
const Hold = () => <div className="min-h-[60dvh]" aria-busy />;
export const SetupForm = dynamic(() => import("./setup-form").then((m) => m.SetupForm), { ssr: false, loading: Hold });
export const LiveRoom = dynamic(() => import("./live-room").then((m) => m.LiveRoom), { ssr: false, loading: Hold });
export const LinkRoom = dynamic(() => import("./link-room").then((m) => m.LinkRoom), { ssr: false, loading: Hold });
