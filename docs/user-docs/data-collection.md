# Data Collection

Learn how to collect and input your research data into EvoNEST.

## Overview

EvoNEST provides three main methods for collecting research data: manual entry forms, attachments for photos and documents, and instrument data files that parsers read into experiments. CSV bulk import covers samples. This guide covers the workflows for entering sample, trait, and experiment data.

## Data entry methods

### Sample data entry

Create sample records through forms with required taxonomic and metadata fields.

**Getting Started:**

1. Navigate to any Samples page
2. Click **"Add Sample"**
3. Select sample type
4. Fill required fields and submit

**Required Fields:**

- **Family, Genus, Species** (taxonomic classification)
- **Type**
- **Responsible person** (from existing users)

**Auto-Generated Features:**

- **Sample IDs** generated automatically based on genus/species
- **Nomenclature** (scientific name)
- **Geographic coordinates** from location name, if provided
- **Parent-child relationships** for subsamples

**Form Tabs:**

- **General**: Basic sample information
- **Location**: Geographic data with GPS lookup
- **Notes**: Additional metadata

### Trait data entry

Record measurement data with optional file attachments.

**Basic Workflow:**

1. Navigate to any Traits page
2. Click **"Add Trait"**
3. Select the trait quantity from configured options
4. Enter measurement data
5. Optionally attach images
6. Submit with validation

**Form Structure:**

- **General**: Trait quantity and equipment selection
- **Details**: Responsible person and measurement date
- **Values**: Sample selection, measurements, and units

**Measurement Input:**

- **Single values**: Enter one measurement
- **Multiple values**: Enter comma, semicolon, or space-separated list
- **Automatic calculations**: System calculates average and standard deviation
- **Units**: Auto-populated from trait quantity configuration

**File Attachments:**

Images and files chosen on the trait form attach to the trait once it is saved. They show in the Files column of the sample's trait table and on the Files page. Add more later from the same column.

### Experiment data entry

Upload a data file from an instrument and let a parser read it into an experiment with its traits.

**Supported files:**

- Instrument output that a data format parser recognises, for example tensile testing machine files
- Plain CSV, TSV, and text files, stored as-is when no parser claims them

Photos, PDFs, and other documents are not experiments. Attach them to the sample, subsample, or trait they belong to.

**Upload process:**

1. Navigate to the Experiments page
2. Drag and drop the file or click upload
3. The parser extracts the specimen name, metadata, and any measurements
4. Review the auto-generated experiment name
5. Select the responsible person and sample
6. Add optional notes
7. Submit

**Processing:**

- Parsers extract specimen names, metadata, and trait measurements
- Files over 10MB require a manual file path entry
- Mechanical testing data is parsed into traits automatically

**Current limitations:**

- Only files with a matching parser are read into traits
- We are happy to add a parser for your instrument if you provide a template

## Bulk data import

Import multiple samples from CSV files with intelligent field mapping.

**CSV Import Process:**

1. Navigate to Samples → Import
2. Upload CSV file
3. Map CSV columns to EvoNEST fields
4. Review validation errors
5. Run import with progress tracking

**Special Mappings:**

- **Nomenclature**: Splits "Genus species" into separate fields
- **Responsible Person**: Accepts names, emails, or user IDs
- **Hierarchical Import**: Animals with multiple subsamples

**Field Validation:**

- Required fields checked automatically
- Data type validation (dates, numbers)
- User account verification
- Duplicate detection

**Current Import Limitations:**

- Only CSV format supported
- Limited to sample data (not traits or experiments)
- No custom field creation during import
- Hierarchical imports require specific column formats

## File management

EvoNEST handles file storage and organization automatically.

**File Storage:**

- Files saved to server filesystem
- Organized by type and entry ID
- Automatic backup in configured storage path

**File Linking:**

- Files automatically linked to samples, traits, or experiments
- Metadata stored in database
- Download functionality available

**File Size Limits:**

- Standard uploads: Up to 10MB
- Large files: Manual file path entry required
- Image compression: Automatic for web display

