import { Anton, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

export const anton = Anton({ weight: "400", subsets: ["latin", "latin-ext"], variable: "--font-anton", display: "swap" });
export const plexMono = IBM_Plex_Mono({ weight: ["400", "600", "700"], subsets: ["latin", "latin-ext"], variable: "--font-plex-mono", display: "swap" });
export const plexSans = IBM_Plex_Sans({ weight: ["400", "600"], subsets: ["latin", "latin-ext"], variable: "--font-plex-sans", display: "swap" });

export const fontVars = `${anton.variable} ${plexMono.variable} ${plexSans.variable}`;
