import { logoMark } from "@wtw/tokens/logo";

/**
 * The cassette, as one even-odd path generated from packages/tokens/assets/logo.svg: window, reels
 * and label strip are cut out, so it takes the colour of the text around it. 0.86em = Anton's cap
 * height, so next to the wordmark it stands exactly as tall as the capitals.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox={logoMark.viewBox} className={`h-[0.86em] w-auto shrink-0 fill-current ${className}`} aria-hidden="true" focusable="false" data-testid="logo">
      <path fillRule="evenodd" d={logoMark.d} />
    </svg>
  );
}
