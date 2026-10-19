"use client";

export const linkUrl = (token: string) => `${window.location.origin}/match/link?d=${token}`;

/** Native share sheet on touch screens, clipboard elsewhere. False if cancelled or blocked. */
export async function shareUrl(url: string): Promise<boolean> {
  try {
    if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ url, title: "WhatToWatch" });
    else await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
