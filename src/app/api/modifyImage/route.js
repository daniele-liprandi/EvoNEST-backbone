import { NextResponse } from 'next/server';
import sharp from 'sharp';
import https from 'https';

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

const downloadImage = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const data = [];
      response.on('data', (chunk) => data.push(chunk));
      response.on('end', () => resolve(Buffer.concat(data)));
      response.on('error', (err) => reject(err));
    });
  });
};

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
      `<text x="${lw / 2}" y="${startY + i * lineHeight}" font-family="Arial" font-size="30" text-anchor="middle" fill="#000000">${label}</text>`
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
  const labelWidth = searchParams.get('labelwidth') || 400;
  const label1 = searchParams.get('label1') || '';
  const label2 = searchParams.get('label2') || '';
  const label3 = searchParams.get('label3') || '';
  const labels = [label1, label2, label3].filter(Boolean);

  try {
    const imageBuffer = await downloadImage(qrcodeurl);
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
