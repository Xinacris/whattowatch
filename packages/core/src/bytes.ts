// Tiny binary helpers. No Buffer, so this runs the same in Node, browsers and Hermes.

export class Writer {
  private bytes: number[] = [];
  byte(n: number): this { this.bytes.push(n & 0xff); return this; }
  varint(n: number): this {
    let v = Math.max(0, Math.floor(n));
    while (v >= 0x80) { this.bytes.push((v % 0x80) | 0x80); v = Math.floor(v / 0x80); }
    this.bytes.push(v);
    return this;
  }
  string(s: string): this {
    const enc = new TextEncoder().encode(s);
    this.varint(enc.length);
    for (const b of enc) this.bytes.push(b);
    return this;
  }
  done(): Uint8Array { return Uint8Array.from(this.bytes); }
}

export class Reader {
  private i = 0;
  constructor(private readonly bytes: Uint8Array) {}
  byte(): number {
    const b = this.bytes[this.i++];
    if (b === undefined) throw new RangeError("ran out of bytes");
    return b;
  }
  varint(): number {
    let result = 0;
    let mul = 1;
    for (let n = 0; n < 8; n++) {
      const b = this.byte();
      result += (b & 0x7f) * mul;
      if (b < 0x80) return result;
      mul *= 0x80;
    }
    throw new RangeError("varint too long");
  }
  string(): string {
    const len = this.varint();
    if (this.i + len > this.bytes.length) throw new RangeError("string past end");
    const s = new TextDecoder().decode(this.bytes.subarray(this.i, this.i + len));
    this.i += len;
    return s;
  }
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function toBase64Url(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const [a = 0, b = 0, c = 0] = [bytes[i], bytes[i + 1], bytes[i + 2]];
    const n = (a << 16) | (b << 8) | c;
    const chars = [n >> 18, (n >> 12) & 63, (n >> 6) & 63, n & 63].map((k) => B64[k]);
    out += chars.slice(0, Math.min(4, bytes.length - i + 1)).join("");
  }
  return out;
}

export function fromBase64Url(s: string): Uint8Array {
  const clean = s.replace(/=+$/, "");
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    const chunk = clean.slice(i, i + 4);
    const vals = [...chunk].map((ch) => {
      const v = B64.indexOf(ch);
      if (v < 0) throw new RangeError("bad base64url");
      return v;
    });
    const n = ((vals[0] ?? 0) << 18) | ((vals[1] ?? 0) << 12) | ((vals[2] ?? 0) << 6) | (vals[3] ?? 0);
    const bytesHere = Math.max(0, chunk.length - 1);
    for (let k = 0; k < bytesHere; k++) out.push((n >> (16 - 8 * k)) & 0xff);
  }
  return Uint8Array.from(out);
}
