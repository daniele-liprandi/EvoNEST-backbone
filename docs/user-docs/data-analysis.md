# Data Analysis

EvoNEST provides two tools for analyzing trait data: a statistical analysis dashboard and a visual data explorer. Both work with existing trait measurements in your database.

## Trait Analysis Dashboard

The analysis dashboard calculates basic statistics (mean, standard deviation, min, max, median, count) for trait measurements. You can group results by species, sample types, or other categories.

### Getting Started

1. Navigate to **Traits > Analysis** in the main menu
2. Select a trait type from the dropdown (e.g., "stressAtBreak", "diameter")
3. Choose how to group your data (species, sample subtypes, etc.)
4. Apply filters if needed
5. Results appear automatically in a table below

### Core Functionality

**Select Trait Type:**

1. Use the "Select Trait" dropdown
2. Available options depend on what trait types exist in your database
3. Common types include: stressAtBreak, toughness, modulus, loadAtBreak, strainAtBreak, diameter

**Group Data:**

1. Use the "Group By" dropdown to choose grouping method:
   - **Sum of all** - Single result combining all selected data
   - **All full species** - Groups by genus + species combinations
   - **Full species + subsample type** - Groups by species and sample subtypes
   - **All families** - Groups by taxonomic family
   - **All genera** - Groups by genus only
   - **All species** - Groups by species only
   - **All sample subtypes** - Groups by sample subtypes only

**Apply Filters:**

1. **Sample Subtypes Filter:**
   - Check/uncheck specific sample subtypes to include
   - Use "Select All" or "Clear All" buttons
   - Toggle the switch to activate/deactivate this filter
   
2. **N Fibres Filter:**
   - Filter by number of fibres in samples
   - Only appears if nfibres data exists in your database
   - Same controls as sample subtypes filter

**View Results:**

- Statistics table shows: Name, Mean, Standard Deviation, Min, Max, Median, Count
- Units are automatically converted (Pa to GPa for stress measurements, etc.)
- Processing time and record counts shown at bottom
- Results update automatically when you change settings

### Analysis Limitations

- No data export functionality
- Cannot save analysis configurations
- Limited to predefined statistical measures
- No custom grouping options
- Filter options depend entirely on existing data in database
- No visualization charts in analysis dashboard

## Trait Explorer (Visual Analysis)

The explorer provides interactive data visualization using Graphic Walker. You can create charts, scatter plots, and other visualizations from your trait data.

### Setup

1. Navigate to **Traits > Walker** in the main menu
2. Wait for data to load (may take several seconds)
3. Use the drag-and-drop interface to create visualizations
4. Graphic Walker interface will appear with your trait data

### Visual Analysis Features

**Available Data Fields:**

- **value** - The actual measurement value
- **type** - Trait type (stressAtBreak, diameter, etc.)
- **unit** - Measurement unit
- **sample** - Sample name
- **family, genus, species** - Taxonomic information
- **sample type/sub type** - Sample classification
- **Detail of sample** - Additional sample information
- **n fibres** - Number of fibres (when available)

**Creating Visualizations:**

1. Drag fields from the left panel to chart areas
2. Drop numerical fields (like "value") into measure areas
3. Drop categorical fields (like "species") into dimension areas
4. Chart updates automatically when you change field assignments
5. Use the chart type selector to switch between visualizations

**Chart Types Available:**

- Bar charts
- Scatter plots  
- Line charts
- Histograms
- Box plots
- Tables

### Explorer Limitations

- No ability to save or share visualizations
- Cannot export charts as images
- Limited to data fields provided by the system
- Interface may be slow with large datasets
- No custom calculated fields
- Graphic Walker documentation not integrated (external tool)

## Troubleshooting

**Analysis Dashboard Issues:**

- **No results appear:** Check if selected trait type has data in database
- **Filters show no options:** Database may not have the expected field values
- **"Processing..." never finishes:** Database connection issue or very large dataset

**Explorer Issues:**

- **"Loading traits data..." never finishes:** Database connection problem
- **"No traits data available":** No trait records in database
- **Interface very slow:** Try with smaller date ranges or fewer records

**General Data Issues:**

- Both tools require existing trait measurements in the database
- Sample information must be properly linked to trait records
- Missing taxonomic data will show as "Unknown" in groupings