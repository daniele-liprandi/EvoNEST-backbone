# Sample Management

EvoNEST provides tools for organizing, viewing, and maintaining samples in your database. The system handles different sample types (animals, subsamples, plants, etc.) with type-specific features for each. Creating ad-hoc cards for your own samples is easy: you can get more information by contacting the EvoNEST team or you can just do it yourself by visiting the [Developer documentation](/developer-docs/index).

## Getting Started

### Accessing Samples

1. Navigate to **Samples** in the main menu
2. Choose your view:
   - **General** - All samples in one table
   - **By Type** - Filtered views (animal, subsample, silk, etc.)
   - **Maintenance** - Specialized views for live animal care

### Sample Overview Tables

**Features:**

- Sort by any column (name, date, species, etc.)
- Filter by sample type, status, or taxonomic information
- Export to CSV, XLSX, or JSON formats
- Bulk operations (when applicable)

**Available Data:**

- Basic identification (name, ID, family/genus/species)
- Collection details (date, location, responsible person)
- Current status and recent changes
- Storage information (box, slot, collection)

## Individual Sample Management

### Sample Details Page

Access by clicking any sample name. Each sample has a details page with cards for different functions:

**Core Information Card:**

- Edit sample name and notes
- View unique ID and basic metadata
- See collection location and date

**Edit Fields Card:**

- Modify taxonomic information (family, genus, species)
- Change responsible person
- Update basic sample details

**Hierarchy Card:**

- View parent-child relationships
- Link subsamples to parent animals
- Navigate between related samples

**Gallery Card:**

- View images associated with the sample
- Delete unwanted images
- Full-screen image viewing

**Position Card:**

- Edit geographic coordinates (latitude/longitude)
- Quick link to OpenStreetMap

### Type-Specific Features

**Animal Samples:**

- Sex selection (male, female, unknown)
- Life status (alive, preserved, lost)
- Life stage (egg, juvenile, sub-adult, adult)
- Extraction tracking (silk extraction success/failure)

**Subsamples:**

- Sample subtype selection (from configured categories)
- Storage location (box and slot)
- Parent animal linkage

**Silk Samples:**

- Silk type selection (dragline, flagelliform, etc.)
- Storage tracking

**Plant Samples:**

- Growth stage tracking
- Watering management with charts
- Fertilizer application tracking

**Preserved Samples:**

- Preservation method (ethanol, formalin, freezing, drying)
- Preservation date
- Storage details (collection, box, slot)
- Preservation notes

## Maintenance Features

### Live Animal Care

Navigate to **Samples > Maintenance** for specialized animal management:

**QR Code Feeding:**

1. Click "Scan QR" button
2. Scan animal QR codes to quickly record feeding
3. System automatically increments feeding counter
4. Prevents duplicate scans in same session

**Alive Animals Table:**

- Feeding status with visual progress bars
- Quick feeding buttons
- Molting and egg sac tracking buttons
- Life stage and status management

**Preserved Animals Table:**

- Preservation method and date
- Storage location management
- Preservation notes

**Position Management:**

- Geographic coordinate editing
- Location tracking for field samples

### Status Tracking

**Feeding System (Live Animals):**

- Visual progress bars showing days since last feeding
- One-click feeding buttons
- Automatic logbook entries
- Feeding count tracking

**Life Stage Progression:**

- Molting button with automatic counting
- Egg sac production tracking
- Life stage transitions

**Health Monitoring:**

- Extraction success/failure tracking
- General status updates

## Sample Creation

### Manual Creation

1. Use the **Add Sample** button in any samples view
2. Fill required fields (family, genus, species, type, responsible person)
3. Optional fields include location, dates, and notes
4. System auto-generates sample names if not provided

### Custom ID Creation

Create samples with specific IDs:

1. Navigate to `/sample/new/[your-custom-id]`
2. ID must be at least 6 characters
3. Fill sample details
4. Automatic redirect to sample page once created

## Data Export

**Export Options:**

- **CSV** - For spreadsheet analysis
- **XLSX** - For Excel compatibility
- **JSON** - For programmatic use

**Export Features:**

- Respects current table filters
- Exports all columns (even if hidden)
- Maintains data relationships

**How to Export:**

1. Apply any desired filters to the table
2. Click download button in table toolbar
3. Choose format (CSV/XLSX/JSON)
4. File downloads automatically

## Label Generation

### QR Code Labels

Each sample can generate printable labels:

1. Open individual sample page
2. Scroll to "Label maker" card
3. Configure options:
   - Label width (default 300px)
   - Include genus name
   - Include species name
   - Include sample name
4. Generated label shows as image for printing

**QR Code Features:**

- Encodes compressed sample ID
- Compatible with mobile scanning
- Automatic feeding when scanned in maintenance mode

## Storage Management

### Physical Storage Tracking

**Storage Fields:**

- **Collection** - Storage collection/facility
- **Box** - Physical box identifier
- **Slot** - Position within box

**Storage Features:**

- Editable directly in tables (for maintenance pages)
- Filterable and sortable
- Bulk editing capabilities

### Preservation Tracking

**Preservation Methods:**

- Ethanol
- Formalin  
- Freezing
- Drying
- Other (with notes)

**Preservation Data:**

- Date of preservation
- Method used
- Detailed notes
- Storage location after preservation

## Current Limitations

**Missing Features:**

- No batch operations for status changes
- Cannot import samples with parent-child relationships in single step
- No advanced search across multiple fields simultaneously
- No sample templates or protocols
- Limited bulk editing capabilities

**Storage Limitations:**

- Storage location is free text (no validation against actual storage systems)
- No storage capacity tracking
- No automatic storage suggestions

**Data Limitations:**

- QR codes work only with EvoNEST system
- Cannot export/import sample hierarchies easily
- No integration with external label printing systems
- Limited customization of label formats

## Troubleshooting

**Common Issues:**

**Sample not appearing in tables:**

- Check if filters are applied
- Verify sample type matches current view
- Refresh page if data seems stale

**Cannot edit sample fields:**

- Ensure you have appropriate permissions
- Some fields may be read-only depending on sample status
- Check if sample is being edited by another user

**QR scanning not working:**

- Ensure camera permissions are granted
- Try different lighting conditions
- Verify QR code is from EvoNEST system

**Export not including all data:**

- Exports include only filtered data
- Clear filters to export complete dataset
- Check that all desired columns are visible

For more help:

- **[Data Import Guide](/user-docs/data-import)** - Adding samples in bulk
- **[Traits Management](/user-docs/traits-management)** - Managing measurements
- **[Data Export](/user-docs/data-export)** - Advanced export options
