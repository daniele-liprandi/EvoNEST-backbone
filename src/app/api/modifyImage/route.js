import { NextResponse } from 'next/server';
import { createCanvas, loadImage } from 'canvas';
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

const addLabelsToImage = async (imageBuffer, labelWidth, labels) => {
  const image = await loadImage(imageBuffer);
  const lw = Number(labelWidth);
  const canvas = createCanvas(image.width + lw, image.height);
  const ctx = canvas.getContext('2d');

  // Draw the original image
  ctx.drawImage(image, 0, 0);

  // Draw the label area
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(image.width, 0, lw, image.height);

  // Draw the label text
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.font = '30px Arial';

  // Calculate vertical positions for the labels
  const totalLabels = labels.length;
  const lineHeight = 50; // Adjust as needed
  const startY = (image.height - (lineHeight * totalLabels)) / 2 + lineHeight / 2;

  labels.forEach((label, index) => {
    // if a label is longer than 12 characters, cut the label to 12 characters by cutting off the middle
    if (label.length > 12) {
      label = label.slice(0, 5) + '...' + label.slice(-6);
    }
    ctx.fillText(label, image.width + lw / 2, startY + index * lineHeight);
  });

  // Return the modified image as a buffer
  return canvas.toBuffer('image/png');
};


export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const qrcodeurl = searchParams.get('qrcodeurl');
  const labelWidth = searchParams.get('labelwidth') || 400;
  const label1 = searchParams.get('label1') || '';
  const label2 = searchParams.get('label2') || '';
  const label3 = searchParams.get('label3') || '';
  const labels = [label1, label2, label3].filter(Boolean);

  const completeurl = `${qrcodeurl}`;

  try {
    // Download the QR code image
    const imageBuffer = await downloadImage(completeurl);

    // Add labels to the image
    const modifiedImageBuffer = await addLabelsToImage(imageBuffer, labelWidth, labels);

    // Return the modified image
    return new NextResponse(modifiedImageBuffer, {
      headers: {
        'Content-Type': 'image/png',
      },
    });
  } catch (error) {
    return new NextResponse(JSON.stringify({ error: 'Failed to process image' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
