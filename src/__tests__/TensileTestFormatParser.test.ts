/**
 * Tests for TensileTestFormatParser
 */

import { TensileTestFormatParser } from '../utils/file-management/readable-data-extractors/TensileTestFormatParser';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('TensileTestFormatParser', () => {
    let parser: TensileTestFormatParser;
    let testFileContent: string;

    beforeAll(() => {
        // Load the actual test file
        const testFilePath = resolve(process.cwd(), 'src/utils/file-management/test-data/tensile-test/B_4_IS_1.txt');
        testFileContent = readFileSync(testFilePath, 'utf-8');
    });

    beforeEach(() => {
        parser = new TensileTestFormatParser();
    });

    describe('canParse', () => {
        it('should detect EVOMECT150NanoTestDataFile format', () => {
            const canParse = parser.canParse(testFileContent, { filename: 'B_4_IS_1.txt' });
            expect(canParse).toBe(true);
        });

        it('should reject non-EVOMECT150 format', () => {
            const invalidContent = 'Some other file format';
            const canParse = parser.canParse(invalidContent, { filename: 'test.txt' });
            expect(canParse).toBe(false);
        });
    });

    describe('parse', () => {
        let result: any;

        beforeEach(() => {
            result = parser.parse(testFileContent, {
                filename: 'B_4_IS_1.txt',
                size: testFileContent.length
            });
        });

        it('should parse file successfully', () => {
            expect(result).toBeDefined();
            expect(result.format).toBe('EVOMECT150');
            expect(result.suggestedExperimentType).toBe('tensile_test');
            expect(result.parsingMetadata?.confidence).toBe(1.0);
        });

        it('should extract correct trait values from lines 6-17', () => {
            const traits = result.experimentData?.data?.traits;
            expect(traits).toBeDefined();

            // Check modulus (Line 16: Modulus 9.581 GPa) - converted to Pa, stored as camelCase
            expect(traits.modulus).toBe(9.581e9);

            // Check stressAtBreak (Line 12: StressAtBreak 1126.972 MPa) - converted to Pa
            expect(traits.stressAtBreak).toBe(1126.972e6);

            // Check strainAtBreak (Line 11: StrainAtBreak 0.322 mm/mm) - no conversion
            expect(traits.strainAtBreak).toBe(0.322);

            // Check offsetYieldStress (Line 15: OffsetYieldStress 279.674 MPa) - converted to Pa
            expect(traits.offsetYieldStress).toBe(279.674e6);

            // Check offsetYieldStrain (Line 14: OffsetYieldStrain 0.292 MPa) - converted to Pa
            expect(traits.offsetYieldStrain).toBe(0.292e6);

            // Check toughness (Line 13: Toughness 218.498 MPa) - converted to Pa
            expect(traits.toughness).toBe(218.498e6);

            // Check specimenDiameter (Line 8: SpecimenDiameter 0.991 um) - no conversion
            expect(traits.specimenDiameter).toBe(0.991);

            // Check strainRate (Line 9: StrainRate 1.000e-02 1/s) - no conversion
            expect(traits.strainRate).toBe(0.01);
        });

        it('should extract correct text fields', () => {
            const textFields = result.experimentData?.data?.textFields;
            expect(textFields).toBeDefined();

            // Check SpecimenName (Line 7: SpecimenName B_4_IS)
            expect(textFields.SpecimenName).toBe('B_4_IS');

            // Check TestMethod (Line 3: TestMethod,Standard Greifswald Tensile Silk Testing.msm)
            expect(textFields.TestMethod).toContain('Standard Greifswald Tensile Silk Testing');

            // Check TimeAtBeginningOfTheExperiment (Line 10: TimeAtBeginningOfTheExperiment 10:39:12 AM)
            expect(textFields.TimeAtBeginningOfTheExperiment).toContain('10:39:12 AM');
        });

        it('should convert traits to API format with correct units', () => {
            const apiTraits = result.experimentData?.traits;
            expect(apiTraits).toBeDefined();
            expect(Array.isArray(apiTraits)).toBe(true);
            expect(apiTraits.length).toBeGreaterThan(0);

            // Find specific traits and check their units (all pressure values converted to Pa)
            const modulusTrait = apiTraits.find((t: any) => t.type === 'modulus');
            expect(modulusTrait).toBeDefined();
            expect(modulusTrait?.unit).toBe('Pa');
            expect(modulusTrait?.measurement).toBe(9.581e9); // 9.581 GPa = 9.581e9 Pa

            const stressAtBreakTrait = apiTraits.find((t: any) => t.type === 'stressAtBreak');
            expect(stressAtBreakTrait).toBeDefined();
            expect(stressAtBreakTrait?.unit).toBe('Pa');
            expect(stressAtBreakTrait?.measurement).toBe(1126.972e6); // 1126.972 MPa = 1126.972e6 Pa

            const strainAtBreakTrait = apiTraits.find((t: any) => t.type === 'strainAtBreak');
            expect(strainAtBreakTrait).toBeDefined();
            expect(strainAtBreakTrait?.unit).toBe('mm/mm');
            expect(strainAtBreakTrait?.measurement).toBe(0.322); // No conversion

            const toughnessTrait = apiTraits.find((t: any) => t.type === 'toughness');
            expect(toughnessTrait).toBeDefined();
            expect(toughnessTrait?.unit).toBe('Pa');
            expect(toughnessTrait?.measurement).toBe(218.498e6); // 218.498 MPa = 218.498e6 Pa

            const specimenDiameterTrait = apiTraits.find((t: any) => t.type === 'specimenDiameter');
            expect(specimenDiameterTrait).toBeDefined();
            expect(specimenDiameterTrait?.unit).toBe('um');
            expect(specimenDiameterTrait?.measurement).toBe(0.991); // No conversion
        });

        it('should extract channel data', () => {
            const channelData = result.experimentData?.data?.channelData;
            expect(channelData).toBeDefined();
            expect(typeof channelData).toBe('object');
            
            // Check that we have the expected channels (note: names have trailing spaces removed)
            expect(channelData.EngineeringStrain).toBeDefined();
            expect(channelData.EngineeringStress).toBeDefined();
            expect(channelData.LoadOnSpecimen).toBeDefined();
            // Note: _Extension and _Time have underscores in the file
            const hasExtension = channelData._Extension || channelData.Extension;
            const hasTime = channelData._Time || channelData.Time;
            expect(hasExtension).toBeDefined();
            expect(hasTime).toBeDefined();

            // Check that channels contain arrays of data
            expect(Array.isArray(channelData.EngineeringStrain)).toBe(true);
            expect(channelData.EngineeringStrain.length).toBeGreaterThan(0);
        });

        it('should generate channel summary', () => {
            const summary = result.experimentData?.data?.summary;
            expect(summary).toBeDefined();
            expect(summary.channelCount).toBeGreaterThan(0);
            expect(summary.recordCount).toBeGreaterThan(0);
            expect(summary.channels).toBeDefined();
        });

        it('should store traits with camelCase keys in data.traits', () => {
            const traits = result.experimentData?.data?.traits;
            expect(traits).toBeDefined();
            
            // All keys should be camelCase, not PascalCase
            expect(traits.modulus).toBeDefined();
            expect(traits.stressAtBreak).toBeDefined();
            expect(traits.strainAtBreak).toBeDefined();
            expect(traits.offsetYieldStress).toBeDefined();
            expect(traits.offsetYieldStrain).toBeDefined();
            expect(traits.toughness).toBeDefined();
            expect(traits.specimenDiameter).toBeDefined();
            expect(traits.strainRate).toBeDefined();
            expect(traits.loadAtBreak).toBeDefined();
            
            // PascalCase keys should NOT exist
            expect(traits.Modulus).toBeUndefined();
            expect(traits.StressAtBreak).toBeUndefined();
            expect(traits.LoadAtBreak).toBeUndefined();
        });
    });

    describe('extractTraits', () => {
        it('should extract all expected traits', () => {
            const traits = parser.extractTraits(testFileContent);
            
            // Should extract 8 traits from the Variables section + 1 calculated trait
            expect(Object.keys(traits).length).toBe(9);
            
            // Check that all expected trait names are present
            expect(traits).toHaveProperty('Modulus');
            expect(traits).toHaveProperty('StressAtBreak');
            expect(traits).toHaveProperty('StrainAtBreak');
            expect(traits).toHaveProperty('OffsetYieldStress');
            expect(traits).toHaveProperty('OffsetYieldStrain');
            expect(traits).toHaveProperty('Toughness');
            expect(traits).toHaveProperty('SpecimenDiameter');
            expect(traits).toHaveProperty('StrainRate');
            expect(traits).toHaveProperty('LoadAtBreak');
        });

        it('should calculate LoadAtBreak correctly', () => {
            const traits = parser.extractTraits(testFileContent);
            
            // Given: SpecimenDiameter = 0.991 um (no conversion), StressAtBreak = 1126.972e6 Pa (converted from MPa)
            // Area = π × (0.991/2)² = π × 0.4955² ≈ 0.7713 um² = 0.7713e-12 m²
            // Force = Stress × Area = 1126.972e6 Pa × 0.7713e-12 m² = 0.000869 N
            
            expect(traits.LoadAtBreak).toBeDefined();
            expect(traits.LoadAtBreak).toBeCloseTo(0.000869, 6); // Allow ~0.000001 N tolerance
        });
    });

    describe('extractTextFields', () => {
        it('should extract SpecimenName correctly', () => {
            const textFields = parser.extractTextFields(testFileContent);
            expect(textFields.SpecimenName).toBe('B_4_IS');
        });

        it('should extract TestMethod correctly', () => {
            const textFields = parser.extractTextFields(testFileContent);
            expect(textFields.TestMethod).toContain('Standard Greifswald Tensile Silk Testing');
        });

        it('should extract TimeAtBeginningOfTheExperiment correctly', () => {
            const textFields = parser.extractTextFields(testFileContent);
            expect(textFields.TimeAtBeginningOfTheExperiment).toContain('10:39:12 AM');
        });
    });

    describe('validate', () => {
        it('should validate correct parsed data', () => {
            const result = parser.parse(testFileContent, {
                filename: 'B_4_IS_1.txt',
                size: testFileContent.length
            });

            const validation = parser.validate(result) as { success: boolean; errors: any[] };
            expect(validation.success).toBe(true);
            expect(validation.errors.length).toBe(0);
        });

        it('should reject data without experimentData', () => {
            const invalidResult = {
                format: 'EVOMECT150',
                suggestedExperimentType: 'tensile_test'
            };

            const validation = parser.validate(invalidResult) as { success: boolean; errors: any[] };
            expect(validation.success).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
        });
    });

    describe('generatedTraits', () => {
        it('should define correct trait names and units', () => {
            const generatedTraits = parser.generatedTraits;
            expect(generatedTraits).toBeDefined();
            expect(Array.isArray(generatedTraits)).toBe(true);

            const traitNames = generatedTraits.map((t: any) => t.name);
            expect(traitNames).toContain('modulus');
            expect(traitNames).toContain('stressAtBreak');
            expect(traitNames).toContain('strainAtBreak');
            expect(traitNames).toContain('offsetYieldStress');
            expect(traitNames).toContain('offsetYieldStrain');
            expect(traitNames).toContain('toughness');
            expect(traitNames).toContain('specimenDiameter');
            expect(traitNames).toContain('strainRate');
            expect(traitNames).toContain('loadAtBreak');

            // Check units are correct (pressure values in Pa)
            const modulus = generatedTraits.find((t: any) => t.name === 'modulus');
            expect(modulus?.unit).toBe('Pa');

            const stressAtBreak = generatedTraits.find((t: any) => t.name === 'stressAtBreak');
            expect(stressAtBreak?.unit).toBe('Pa');

            const strainAtBreak = generatedTraits.find((t: any) => t.name === 'strainAtBreak');
            expect(strainAtBreak?.unit).toBe('mm/mm');

            const specimenDiameter = generatedTraits.find((t: any) => t.name === 'specimenDiameter');
            expect(specimenDiameter?.unit).toBe('um');

            const loadAtBreak = generatedTraits.find((t: any) => t.name === 'loadAtBreak');
            expect(loadAtBreak?.unit).toBe('N');
        });
    });
});
