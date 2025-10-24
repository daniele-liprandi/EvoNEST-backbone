# Data Import Guide

EvoNEST provides CSV import capabilities to help you quickly migrate existing data or perform bulk uploads. This guide covers both standard and hierarchical import methods.

## Prerequisites

Before importing data, ensure you have:

- **Admin or import permissions** in your EvoNEST instance
- **CSV files** with your sample data
- **Basic understanding** of your data structure and relationships. For a successfull merging to happen, fields have to have the same values they have in EvoNEST (for example, sex is distinguished in EvoNEST by using "male" and "female", thus "ff", "mm" or others expression would cause problems during field recognition)
- **Required field mappings** identified (family, genus, species, type, responsible person)

## Import Methods

EvoNEST supports two import methods:

1. **Standard Import**: For simple, flat data structures
2. **Hierarchical Import**: For parent-child relationships (e.g., animals with subsamples)

## Standard Import

Use standard import when your data doesn't have parent-child relationships, or when each row represents an independent sample.

### Step 1: Prepare your CSV file

Your CSV should contain columns for sample information. Required fields include:

```csv
name,family,genus,species,type,responsible,location,date
Sample001,Araneidae,Araneus,diadematus,animal,john.doe@example.com,Berlin,2024-01-15
Sample002,Araneidae,Nephila,clavipes,silk,jane.smith@example.com,Hamburg,2024-01-20
```

#### Required fields

- **family**: Taxonomic family
- **genus**: Taxonomic genus  
- **species**: Taxonomic species
- **type**: Sample type (animal, silk, subsample, other)
- **responsible**: Person responsible (name, email, or user ID)

#### Optional fields

- **name**: Sample identifier (auto-generated if not provided)
- **location**: Collection location
- **date**: Collection date
- **notes**: Additional notes
- **lat/lon**: Geographic coordinates

### Step 2: Access the import tool

1. Navigate to **Samples** in the main menu
2. Click **Import** button
3. Select **Choose CSV File**

### Step 3: Upload and map fields

1. **Upload your CSV**: Click "Select CSV File" and choose your file
2. **Review automatic mapping**: EvoNEST will automatically suggest field mappings based on column names
3. **Adjust mappings**: Use the dropdown menus in each column header to map CSV columns to EvoNEST fields
4. **Use special mappings** for complex fields:
   - **Nomenclature**: Automatically splits "Genus species" format into separate genus and species fields
   - **Responsible Person**: Accepts names, emails, or user IDs and automatically resolves to user accounts

### Step 4: Validate and import

1. **Review validation errors**: Any issues will be highlighted in red
2. **Fix mapping issues**: Ensure all required fields are mapped
3. **Click Import**: Start the import process
4. **Monitor progress**: Watch the progress bar and status updates

## Hierarchical Import

Use hierarchical import when you have animals with multiple subsamples, where several rows share the same specimen but represent different samples (e.g., draglines, silk samples, etc.).

### When to use hierarchical import

Perfect for data like:
- **Subsamples**: One or more organisms with multiple subsamples of different types
- **Temporal sampling**: One individual sampled at different time points

### Step 1: Prepare your hierarchical CSV

Your CSV needs special identifier columns:

```csv
animal_id,sample_id,family,genus,species,responsible,sample_type,notes
MACN-Ar-001,SAMPLE-001-1,Araneidae,Micrathena,plana,researcher@lab.com,dragline,First dragline
MACN-Ar-001,SAMPLE-001-2,Araneidae,Micrathena,plana,researcher@lab.com,dragline,Second dragline
MACN-Ar-001,SAMPLE-001-3,Araneidae,Micrathena,plana,researcher@lab.com,dragline,Third dragline
MACN-Ar-002,SAMPLE-002-1,Araneidae,Nephila,clavipes,researcher@lab.com,silk,Web sample
```

#### Key requirements:
- **animal_id**: Unique identifier for each animal/specimen (multiple rows can share this)
- **sample_id**: Unique identifier for each individual sample
- **Consistent animal data**: All rows with the same animal_id should have identical animal-level information (family, genus, species, etc.)

### Step 2: Upload and enable hierarchical mode

1. **Upload your CSV** as normal
2. **Map the special fields**:
   - Map your animal identifier column to **"Animal ID (Specimen Identifier)"**
   - Map your sample identifier column to **"Subsample ID (Sample Identifier)"**
3. **Hierarchical mode activates automatically** when both special mappings are detected

### Step 3: Review hierarchical detection

When hierarchical mode is active, you'll see:

```
✓ Hierarchical Import Mode Detected
Will import X animals first, then Y subsamples.
```

The system will:
- **Identify unique animals** from your data (one per unique animal_id)
- **Count total subsamples** (all rows in your CSV)
- **Show the import plan** clearly

### Step 4: Complete the hierarchical import

The import happens in two phases:

#### Phase 1: Animal Import
- **Creates or finds animals**: Each unique animal_id becomes one animal record
- **Handles duplicates**: If an animal with the same name already exists, the existing record is used
- **Uses first row data**: For animals with multiple rows, data from the first occurrence is used

#### Phase 2: Subsample Import  
- **Creates all subsamples**: Each row becomes a subsample record
- **Links to parents**: Each subsample is automatically linked to its parent animal
- **Preserves relationships**: Parent-child relationships are maintained

## Special Field Mappings

EvoNEST provides intelligent field mappings for common data formats:

### Nomenclature Mapping
Automatically splits scientific names:
```
Input: "Homo sapiens"
Output: genus="Homo", species="sapiens"

Input: "Quercus robur subsp. pedunculiflora"  
Output: genus="Quercus", species="robur subsp. pedunculiflora"
```

### Responsible Person Mapping
Automatically resolves to user accounts:
```
Input: "John Doe" → Finds user with name "John Doe"
Input: "john.doe@lab.com" → Finds user with email "john.doe@lab.com"  
Input: "user_id_12345" → Finds user with ID "user_id_12345"
```

### Custom Fields
Create custom fields on-the-fly:
- Select **"Use as custom field"** for any unmapped column
- The field will be created and data preserved
- Useful for project-specific metadata

## Validation and Error Handling

### Common validation errors:

#### Missing Required Fields
```
❌ Missing mappings for required fields: family, genus, species
```
**Solution**: Map all required fields using the dropdown menus

#### Data Type Mismatches  
```
❌ Row 5: Invalid date value "not-a-date"
```
**Solution**: Check your data format matches expected types

#### User Not Found
```
❌ Row 3: User "unknown@email.com" not found
```
**Solution**: Ensure responsible persons exist as users in EvoNEST

#### Hierarchical Import Issues
```
❌ Parent animal "SPECIMEN-001" not found for subsample "SAMPLE-001-1"
```
**Solution**: Ensure animal_id values are consistent and animals import successfully

### Tips for successful imports:

1. **Test with small files first**: Start with 5-10 rows to verify mappings
2. **Check required fields**: Ensure family, genus, species, type, and responsible are mapped
3. **Verify user accounts**: All responsible persons should exist in EvoNEST
4. **Use consistent naming**: Keep animal_id values identical across related rows
5. **Review progress**: Watch for error messages during import

## Advanced Features

### Batch Import Strategies

For large datasets:

1. **Split large files**: Break files into smaller chunks (< 1000 rows)
2. **Import animals first**: In hierarchical data, you can import animals separately, then subsamples
3. **Use consistent IDs**: Maintain consistent naming schemes across batches

### Data Migration from Other Systems

When migrating from other systems:

1. **Export to CSV**: Most systems can export to CSV format
2. **Map field names**: Create a mapping document for your field names
3. **Clean data**: Remove or fix invalid entries before import
4. **Test incrementally**: Import small batches and verify results

### Integration with External Databases

EvoNEST imports can be enhanced with:

1. **GBIF integration**: Verify taxonomic names against GBIF database
2. **Geographic validation**: Validate coordinates against known ranges
3. **Collection protocols**: Link to standardized collection methods

## Example Workflows

### Workflow 1: Spider Dragline Study

```csv
animal_id,sample_id,family,genus,species,responsible,collection_date,dragline_type
MACN-Ar-47148,MJR-2847-1,Araneidae,Micrathena,plana,ramirez@museo.com,2024-12-15,major ampullate
MACN-Ar-47148,MJR-2847-2,Araneidae,Micrathena,plana,ramirez@museo.com,2024-12-15,minor ampullate
MACN-Ar-47148,MJR-2847-3,Araneidae,Micrathena,plana,ramirez@museo.com,2024-12-15,flagelliform
```

**Result**: 1 animal (Micrathena plana) with 3 dragline subsamples

### Workflow 2: Museum Collection Import

```csv
name,family,genus,species,type,responsible,collection_date,location
BMNH-001,Araneidae,Araneus,diadematus,animal,curator@bmnh.ac.uk,2024-01-10,London
BMNH-002,Salticidae,Salticus,scenicus,animal,curator@bmnh.ac.uk,2024-01-11,Edinburgh
```

**Result**: 2 independent animal records

## Troubleshooting

### Import Fails to Start
- **Check file format**: Ensure file is CSV with proper encoding (UTF-8)
- **Verify file size**: Large files (>10MB) may need to be split
- **Check permissions**: Ensure you have import permissions

### Partial Import Success
- **Review error log**: Check which records failed and why
- **Fix data issues**: Correct invalid entries and re-import failed records
- **Check relationships**: In hierarchical imports, ensure parent records exist

### Performance Issues
- **Reduce batch size**: Import smaller files more frequently
- **Check server resources**: Large imports may require server optimization
- **Schedule imports**: Run large imports during off-peak hours

## Getting Help

If you encounter issues with data import:

- **Check the [FAQ section](/user-docs/faq)** for common import questions
- **Review [Troubleshooting Guide](/user-docs/troubleshooting)** for technical issues
- **Visit our [GitHub Issues](https://github.com/yourusername/EvoNext/issues)** for bug reports
- **Contact your system administrator** for permission-related issues

For more information on managing your imported data, see:
- **[Sample Management](/user-docs/sample-management)** - Organizing and editing samples
- **[Data Export](/user-docs/data-export)** - Exporting data for analysis
- **[Visualization](/user-docs/visualization)** - Creating charts and graphs from your data