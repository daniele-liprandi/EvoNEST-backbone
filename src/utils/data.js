import fs from 'fs';
import stream from 'stream';
import { promisify } from 'util';
import { parse } from '@fast-csv/parse';

const pipeline = promisify(stream.pipeline);

export const downloadCSV = async (url, localPath) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch CSV: ${response.statusText}`);
  await pipeline(response.body, fs.createWriteStream(localPath));
};



export const convertCSVtoJSON = async (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(parse({ headers: true }))
      .on('data', (row) => results.push(row))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

