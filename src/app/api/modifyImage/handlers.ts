import { Effect } from "effect";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { currentSession, ValidationError, InternalError } from "@/lib/effect";

// The QR image is fetched from an external service. Restrict it to the known
// providers so the parameter cannot be pointed at internal hosts (SSRF).
const ALLOWED_IMAGE_HOSTS = new Set(["barcodeapi.org", "api.qrserver.com"]);

const DOWNLOAD_TIMEOUT_MS = 8_000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIN_LABEL_WIDTH = 100;
const MAX_LABEL_WIDTH = 1000;

const parseAllowedUrl = (raw: string | null): URL | null => {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !ALLOWED_IMAGE_HOSTS.has(url.hostname)) return null;
  return url;
};

const downloadImage = async (url: URL): Promise<Buffer> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: "error" });
    if (!response.ok) throw new Error(`image host returned ${response.status}`);
    if (!(response.headers.get("content-type") || "").startsWith("image/")) {
      throw new Error("response is not an image");
    }
    const declared = Number(response.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) {
      throw new Error("image exceeds size limit");
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_IMAGE_BYTES) throw new Error("image exceeds size limit");
    return buffer;
  } finally {
    clearTimeout(timeout);
  }
};

const escapeXml = (value: string) =>
  String(value).replace(
    /[<>&"']/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c] as string,
  );

const truncateLabel = (label: string) =>
  label.length > 12 ? label.slice(0, 5) + "..." + label.slice(-6) : label;

const addLabelsToImage = async (imageBuffer: Buffer, labelWidth: number, labels: string[]) => {
  const lw = Number(labelWidth);
  const { width = 0, height = 0 } = await sharp(imageBuffer).metadata();

  const truncatedLabels = labels.map(truncateLabel);
  const lineHeight = 50;
  const startY = (height - lineHeight * truncatedLabels.length) / 2 + lineHeight / 2;

  const textElements = truncatedLabels
    .map(
      (label, i) =>
        `<text x="${lw / 2}" y="${startY + i * lineHeight}" font-family="Arial" font-size="30" text-anchor="middle" fill="#000000">${escapeXml(label)}</text>`,
    )
    .join("");

  const svgLabel = `<svg width="${lw}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${lw}" height="${height}" fill="#ffffff"/>
    ${textElements}
  </svg>`;

  return sharp(imageBuffer)
    .extend({ right: lw, background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .composite([{ input: Buffer.from(svgLabel), left: width, top: 0 }])
    .png()
    .toBuffer();
};

export const labelQrImage = (request: Request) =>
  Effect.gen(function* () {
    yield* currentSession;

    const params = new URL(request.url).searchParams;
    const imageUrl = parseAllowedUrl(params.get("qrcodeurl"));
    if (!imageUrl) {
      return yield* Effect.fail(
        new ValidationError({ message: "qrcodeurl must be an https URL on an allowed image host" }),
      );
    }

    const rawLabelWidth = Number(params.get("labelwidth")) || 400;
    const labelWidth = Math.min(MAX_LABEL_WIDTH, Math.max(MIN_LABEL_WIDTH, rawLabelWidth));
    const labels = [params.get("label1"), params.get("label2"), params.get("label3")].filter(
      (l): l is string => !!l,
    );

    const png = yield* Effect.tryPromise({
      try: async () => addLabelsToImage(await downloadImage(imageUrl), labelWidth, labels),
      catch: (cause) => new InternalError({ message: "Failed to process image", cause }),
    });

    return new NextResponse(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
  });
