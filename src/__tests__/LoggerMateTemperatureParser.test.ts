/**
 * The LoggerMate temperature parser accepts its own output.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { LoggerMateTemperatureParser } from '../utils/file-management/readable-data-extractors/LoggerMateTemperatureParser';

describe('LoggerMateTemperatureParser', () => {
  test('parses the example file and validates the result', () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const parser = new LoggerMateTemperatureParser();
    const file = resolve(process.cwd(), 'public/parser-examples/loggermate/WirelessTemperatureData.txt');
    const parsed = parser.parse(readFileSync(file, 'utf-8'), { filename: 'WirelessTemperatureData.txt' });

    expect(parsed.experimentData.technique).toBe('temperature_monitoring');
    expect(parser.validate(parsed)).toEqual({ success: true, errors: [] });
  });
});
