import { NextResponse } from 'next/server';
import sharp from 'sharp';

// The QR image is fetched from an external service. Restrict it to the known
// providers so the parameter cannot be pointed at internal hosts (SSRF).
const ALLOWED_IMAGE_HOSTS = new Set([
  'barcodeapi.org',
  'api.qrserver.com',
]);

const DOWNLOAD_TIMEOUT_MS = 8000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MIN_LABEL_WIDTH = 100;
const MAX_LABEL_WIDTH = 1000;

function parseAllowedUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !ALLOWED_IMAGE_HOSTS.has(url.hostname)) {
    return null;
  }
  return url;
}

/**
 * @swagger
 * /api/modifyImage:
 *   get:
 *     summary: Generate labeled QR code image
 *     description: Downloads a QR code image from a URL and adds text labels to the right side of the image
 *     tags:
 *       - Utilities
 *     parameters:
 *       - in: query
 *         name: qrcodeurl
 *         required: true
 *         schema:
 *           type: string
 *           format: uri
 *         description: URL of the QR code image to modify
 *         example: "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=Sample"
 *       - in: query
 *         name: labelwidth
 *         required: false
 *         schema:
 *           type: integer
 *           default: 400
 *           minimum: 100
 *           maximum: 1000
 *         description: Width of the label area in pixels
 *         example: 400
 *       - in: query
 *         name: label1
 *         required: false
 *         schema:
 *           type: string
 *           maxLength: 50
 *         description: First label text (truncated if longer than 12 characters)
 *         example: "Sample ID: 001"
 *       - in: query
 *         name: label2
 *         required: false
 *         schema:
 *           type: string
 *           maxLength: 50
 *         description: Second label text (truncated if longer than 12 characters)
 *         example: "Date: 2024-03-15"
 *       - in: query
 *         name: label3
 *         required: false
 *         schema:
 *           type: string
 *           maxLength: 50
 *         description: Third label text (truncated if longer than 12 characters)
 *         example: "Location: Lab A"
 *     responses:
 *       200:
 *         description: Modified image with labels
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Type:
 *             schema:
 *               type: string
 *             example: "image/png"
 *       500:
 *         description: Failed to process image
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to process image"
 */

const downloadImage = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'error' });
    if (!response.ok) {
      throw new Error(`image host returned ${response.status}`);
    }
    if (!(response.headers.get('content-type') || '').startsWith('image/')) {
      throw new Error('response is not an image');
    }
    const declared = Number(response.headers.get('content-length'));
    if (Number.isFinite(declared) && declared > MAX_IMAGE_BYTES) {
      throw new Error('image exceeds size limit');
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      throw new Error('image exceeds size limit');
    }
    return buffer;
  } finally {
    clearTimeout(timeout);
  }
};

const escapeXml = (value) =>
  String(value).replace(/[<>&"']/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c])
  );

const truncateLabel = (label) => {
  if (label.length > 12) {
    return label.slice(0, 5) + '...' + label.slice(-6);
  }
  return label;
};

const addLabelsToImage = async (imageBuffer, labelWidth, labels) => {
  const lw = Number(labelWidth);
  const { width, height } = await sharp(imageBuffer).metadata();

  const truncatedLabels = labels.map(truncateLabel);
  const lineHeight = 50;
  const startY = (height - lineHeight * truncatedLabels.length) / 2 + lineHeight / 2;

  const textElements = truncatedLabels
    .map((label, i) =>
      `<text x="${lw / 2}" y="${startY + i * lineHeight}" font-family="Arial" font-size="30" text-anchor="middle" fill="#000000">${escapeXml(label)}</text>`
    )
    .join('');

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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const qrcodeurl = searchParams.get('qrcodeurl');
  const rawLabelWidth = Number(searchParams.get('labelwidth')) || 400;
  const labelWidth = Math.min(MAX_LABEL_WIDTH, Math.max(MIN_LABEL_WIDTH, rawLabelWidth));
  const label1 = searchParams.get('label1') || '';
  const label2 = searchParams.get('label2') || '';
  const label3 = searchParams.get('label3') || '';
  const labels = [label1, label2, label3].filter(Boolean);

  const imageUrl = parseAllowedUrl(qrcodeurl);
  if (!imageUrl) {
    return NextResponse.json(
      { error: 'qrcodeurl must be an https URL on an allowed image host' },
      { status: 400 }
    );
  }

  try {
    const imageBuffer = await downloadImage(imageUrl);
    const modifiedImageBuffer = await addLabelsToImage(imageBuffer, labelWidth, labels);

    return new NextResponse(modifiedImageBuffer, {
      headers: { 'Content-Type': 'image/png' },
    });
  } catch (error) {
    return new NextResponse(JSON.stringify({ error: 'Failed to process image' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
