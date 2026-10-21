// next/font/google only works under Next's compiler; in component tests a font is just a class name.
const font = () => ({ className: "", variable: "", style: { fontFamily: "sans-serif" } });
export const Anton = font;
export const IBM_Plex_Mono = font;
export const IBM_Plex_Sans = font;
