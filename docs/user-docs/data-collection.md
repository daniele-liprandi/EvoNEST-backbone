# Data Collection

Learn how to collect and input your research data into EvoNEST.

## Overview

EvoNEST provides three main methods for collecting research data: manual entry forms, file uploads for experiments, and CSV bulk imports. This guide covers the actual workflows for entering sample, trait, and experiment data.

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
3. Select trait type from configured options
4. Enter measurement data
5. Optionally attach images
6. Submit with validation

**Form Structure:**

- **General**: Trait type and equipment selection
- **Details**: Responsible person and measurement date
- **Values**: Sample selection, measurements, and units

**Measurement Input:**

- **Single values**: Enter one measurement
- **Multiple values**: Enter comma, semicolon, or space-separated list
- **Automatic calculations**: System calculates average and standard deviation
- **Units**: Auto-populated from trait type configuration

**File Attachments:**

- **Image support**: JPG, PNG, TIFF formats
- **Automatic renaming**: Files renamed with sample name prefix
- **File linking**: Images automatically linked to trait records

### Experiment data entry

Upload and process experimental data files from testing equipment.

**Supported File Types:**

- **Documents**: PDF, TXT, DOC files
- **Images**: JPG, PNG, TIFF files  
- **Data files**: Custom parsers for tensile testing equipment

**File Upload Process:**

1. Navigate to Experiments page
2. Drag and drop files or click upload
3. System processes files and extracts metadata
4. Review auto-generated experiment names
5. Select responsible person and sample
6. Add optional notes
7. Submit for processing

**File Processing Features:**

- **Automatic parsing**: Extracts specimen names and metadata
- **Image compression**: Large images automatically compressed
- **File size handling**: Files >10MB require manual file path entry
- **Data extraction**: Mechanical testing data automatically parsed

**Current Limitations:**

- Only basic file type detection implemented
- We are happy to implement advanced data parsing of document if provided a template

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

