# Module 5: Data Entry & Management

::: tip Learning Objectives
By the end of this module, you will have:
- ✅ Created your first biological sample
- ✅ Added subsamples (tissues/parts)
- ✅ Recorded trait measurements
- ✅ Uploaded files and images
- ✅ Created an experiment
- ✅ Used the data explorer
:::

**Estimated Time:** 45-60 minutes

---

## Prerequisites

Before starting this module, make sure you've completed [Module 4: Configuration](/tutorial/04-configuration) and have:
- ✅ Sample types configured
- ✅ Trait types with units set up
- ✅ EvoNEST running and logged in

---

## Overview

Now for the fun part - adding real data to EvoNEST! In this hands-on module, you'll learn the complete workflow:

1. Create a parent sample (whole specimen)
2. Add subsamples (tissues or parts)
3. Record trait measurements
4. Upload images and documents
5. Organize data into an experiment

We'll use a practical example you can adapt to your own research.

---

## Exercise: Spider Silk Research Workflow

Let's work through a realistic example: documenting a spider specimen and measuring its silk properties.

**Scenario:** You've collected a garden spider (*Araneus diadematus*) and want to:
- Document the specimen
- Extract silk samples
- Measure silk diameter
- Test mechanical properties
- Organize everything in an experiment

---

## Step 1: Create a Parent Sample

The parent sample represents the whole organism.

### 1.1 Navigate to Samples

1. **Click "Samples"** in the main navigation

2. **Click "Add Sample"** or "Create Sample" button
   - Usually at the top-right of the samples table

3. **A form will appear** (might be a modal or new page)

### 1.2 Fill in Basic Information

Fill in the following fields:

**Identification:**
- **Sample Name:** Leave blank to auto-generate, or enter: `AranDiad01`
- **Sample Type:** Select `animal` (or your custom type)

**Taxonomy:**
- **Family:** `Araneidae`
- **Genus:** `Araneus`
- **Species:** `diadematus`

::: tip Auto-Generated IDs
If you set up ID generation in Module 4, leaving the name blank will auto-generate it from taxonomy: `AranDiad01`
:::

### 1.3 Add Collection Metadata

**Collection Information:**
- **Collection Date:** Click calendar icon, select today's date
- **Location:** `University Botanical Garden, Berlin`
- **Latitude:** `52.5200` (optional)
- **Longitude:** `13.4050` (optional)
- **Collector/Responsible:** Select `admin` (your username)

**Physical Location:**
- **Box:** `A1` (where you store the specimen)
- **Slot:** `001` (position in the box)

### 1.4 Add Notes and Additional Info

**Optional Fields:**
- **Sex:** `F` (if known)
- **Life Stage:** `adult`
- **Notes:**
  ```
  Adult female garden spider collected from rose bush.
  Specimen is alive and producing web. Will extract
  dragline silk for mechanical testing.
  ```

### 1.5 Upload a Photo (Optional)

If you have a photo:

1. **Find the "Upload Image"** or "Add Photo" section

2. **Click to browse** or drag-and-drop

3. **Select** your specimen photo

4. **Wait** for upload to complete (you'll see a thumbnail)

::: details Supported Image Formats
- JPEG/JPG
- PNG
- TIFF (for high-res scientific images)
- Maximum size typically 10-50MB
:::

### 1.6 Save the Sample

1. **Review** all fields

2. **Click "Create Sample"** or "Save"

3. **Success!** You should see:
   - Confirmation message
   - The new sample in the samples table
   - A sample ID (e.g., `AranDiad01`)

::: tip First Sample Created! 🎉
Congratulations! You've created your first sample in EvoNEST.
:::

---

## Step 2: Create Subsamples

Subsamples represent parts or derivatives of the parent sample.

### 2.1 Access Subsample Creation

**Method 1: From Sample Detail Page**
1. Click on your newly created sample (`AranDiad01`)
2. Find "Add Subsample" button
3. Click it

**Method 2: From Samples List**
1. Find your sample in the table
2. Click the "+" or "Add Subsample" action
3. Form opens

### 2.2 Create First Subsample - Dragline Silk

Fill in the subsample form:

**Identification:**
- **Name:** Leave blank to auto-generate as `AranDiad01_01`
- **Subsample Type:** Select `silk` or `dragline` (from your configured types)
- **Parent Sample:** Should auto-fill as `AranDiad01`

**Inherit from Parent:**
Most fields will copy from the parent:
- Family, Genus, Species (auto-filled)
- Location (auto-filled)
- Responsible (auto-filled)

**Subsample-Specific Info:**
- **Date:** Today (sample extraction date)
- **Box/Slot:** `A1` / `001a`
- **Notes:**
  ```
  Dragline silk collected using forced silking method.
  Approximately 50 meters collected on cardboard frame.
  ```

**Save** the subsample.

### 2.3 Create Second Subsample - Capture Spiral Silk

Let's add another subsample:

1. **Click "Add Subsample"** again

2. **Fill in:**
   - **Name:** `AranDiad01_02` (or auto-generate)
   - **Subsample Type:** `capture_spiral` or `silk`
   - **Date:** Today
   - **Box/Slot:** `A1` / `001b`
   - **Notes:** `Capture spiral silk from orb web`

3. **Save**

::: tip Multiple Subsamples
You can create as many subsamples as needed from one parent:
- Different tissues (muscle, bone, organs)
- Different silk types (dragline, capture spiral, egg sac)
- Replicates (multiple extractions)
- Time series (samples at different dates)
:::

### Verify Subsamples

1. **Go back to the parent sample detail page**

2. **You should see:**
   - List of associated subsamples
   - Links to each subsample
   - The hierarchical relationship

---

## Step 3: Record Trait Measurements

Now let's add measurements for your silk samples.

### 3.1 Navigate to Traits

1. **Click "Traits"** in the main navigation

2. **Click "Add Trait"** or "Record Measurement"

### 3.2 Record Fiber Diameter

Let's measure the diameter of the dragline silk.

**Basic Information:**
- **Trait Type:** Select `diameter` (or your measurement type)
- **Sample:** Select `AranDiad01_01` (the dragline silk subsample)
- **Date:** Today
- **Responsible:** `admin`

**Measurement Values:**

You have two options:

**Option A: Single Measurement**
- **Measurement:** `3.2`
- **Unit:** Should show `μm` (from your configuration)
- **Standard Deviation:** Leave blank if single measurement

**Option B: Multiple Measurements (Recommended)**
- **List Values:** Enter replicate measurements
  ```
  3.1, 3.3, 3.2, 3.4, 3.0
  ```
- EvoNEST will calculate:
  - **Mean:** 3.2 μm
  - **Standard Deviation:** 0.15 μm

**Additional Info:**
- **Equipment:** Select `light_microscope` (from your equipment list)
- **Detail/Method:**
  ```
  Measured using calibrated light microscope at 400x magnification.
  Five replicate measurements from different locations on the fiber.
  ```
- **Notes:** `Measurements taken at 20°C, 50% humidity`

**Save** the trait.

### 3.3 Record Tensile Strength

Add another measurement:

1. **Click "Add Trait"** again

2. **Fill in:**
   - **Trait Type:** `tensile_strength`
   - **Sample:** `AranDiad01_01`
   - **Measurement:** `1100` (or enter list values)
   - **Unit:** `MPa`
   - **Equipment:** `instron_5944`
   - **Notes:** `Gauge length 20mm, strain rate 1%/min`

3. **Save**

### 3.4 Practice: Add More Traits

Add measurements for your second subsample (`AranDiad01_02`):

::: details Practice Measurements
**For capture spiral silk:**
- Diameter: ~2.5 μm (thinner than dragline)
- Tensile strength: ~500 MPa (weaker than dragline)
- Extensibility: ~50% (more stretchy)
:::

---

## Step 4: Upload Files and Images

Attach documents, images, and data files to your samples or traits.

### 4.1 Upload to Sample

1. **Go to your sample** (`AranDiad01`)

2. **Find the "Files" or "Attachments" section**

3. **Click "Upload File"** or drag-and-drop

4. **Select a file:**
   - Photo of the spider
   - Field notes (PDF, DOCX)
   - Data sheets (XLSX, CSV)

5. **Add description:** `Field photo of specimen`

6. **Upload**

### 4.2 Upload to Trait

You can also attach files to specific measurements:

1. **Go to Traits** → Find your diameter measurement

2. **Click to view/edit** the trait

3. **Upload:**
   - Microscope image
   - Raw data file
   - Analysis spreadsheet

::: tip Supported File Types
**Images:** JPEG, PNG, TIFF, BMP
**Documents:** PDF, DOCX, TXT, MD
**Data:** XLSX, CSV, JSON, YAML
**Archives:** ZIP (for multiple files)
:::

---

## Step 5: Create an Experiment

Organize your samples and traits into a research project.

### 5.1 Navigate to Experiments

1. **Click "Experiments"** in the main navigation

2. **Click "Create Experiment"** or "New Experiment"

### 5.2 Fill in Experiment Details

**Basic Information:**
- **Experiment Name:** `Garden Spider Silk Mechanics - Spring 2024`
- **Experiment Type:** `biomechanics` (or your custom type)
- **Date:** Today (start date)
- **Responsible:** `admin`

**Description:**
```
Characterization of mechanical properties of dragline and capture
spiral silk from Araneus diadematus. Investigating the relationship
between silk diameter and tensile strength. Part of comparative
study on spider silk evolution.
```

**Objectives:**
```
1. Measure fiber diameters using light microscopy
2. Conduct tensile testing to determine strength and extensibility
3. Compare dragline vs capture spiral properties
4. Document specimen collection and silk extraction methods
```

### 5.3 Link Samples to Experiment

**Add Samples:**
1. **Find the "Samples" section** in the experiment form

2. **Click "Add Sample"** or select from dropdown

3. **Select:**
   - `AranDiad01` (parent sample)
   - `AranDiad01_01` (dragline silk)
   - `AranDiad01_02` (capture spiral silk)

4. All traits associated with these samples will be included

### 5.4 Upload Protocol/Methods (Optional)

**Add Files:**
1. **Find "Upload Document"** or "Attachments" section

2. **Upload:**
   - Research protocol (PDF)
   - Data collection sheets
   - Equipment calibration records
   - Ethics approval (if applicable)

### 5.5 Save the Experiment

1. **Review** all information

2. **Click "Create Experiment"** or "Save"

3. **Success!** Your experiment is created and linked to all relevant data

---

## Step 6: Use the Data Explorer

Learn to find and filter your data.

### 6.1 Explore Samples

1. **Go to "Samples"**

2. **Try the filters:**
   - **Family:** Type `Araneidae` → See only spider family
   - **Type:** Select `animal` → Filter by sample type
   - **Date Range:** Select this month → Recent samples
   - **Responsible:** Select your name → Your samples only

3. **Search:**
   - Type `Araneus` in search box
   - See matching samples

4. **Sort:**
   - Click column headers to sort
   - Click again to reverse order

### 6.2 Explore Traits

1. **Go to "Traits"**

2. **Filter by:**
   - **Trait Type:** `diameter` → See only diameter measurements
   - **Sample:** `AranDiad01_01` → Measurements for specific sample
   - **Equipment:** `light_microscope` → Filter by measurement tool
   - **Date Range:** This week

3. **View statistics:**
   - Min, max, mean, std dev (if configured)

### 6.3 View Experiment Summary

1. **Go to "Experiments"**

2. **Click on your experiment**

3. **You'll see:**
   - All linked samples
   - All associated traits
   - Attached files
   - Complete project overview

::: tip Data Explorer Features
**Advanced features to try:**
- **Export data** - Download filtered results as CSV/Excel
- **Bulk operations** - Select multiple items, apply actions
- **Visualizations** - Plot measurements (if available)
- **Print/PDF** - Generate reports
:::

---

## Step 7: Edit and Update Data

Learn to modify existing entries.

### Edit a Sample

1. **Go to Samples** → Find `AranDiad01`

2. **Click the sample name** or "Edit" button

3. **Make changes:**
   - Update notes
   - Add more photos
   - Correct typos
   - Add missing information

4. **Save**

5. **Check logbook:**
   - EvoNEST tracks all changes
   - View change history in the logbook section

### Edit a Trait

1. **Go to Traits** → Find a measurement

2. **Edit:**
   - Correct values
   - Add more replicates
   - Update equipment used

3. **Save**

::: warning Data Integrity
EvoNEST maintains a **logbook** (change history) for all edits:
- Who made the change
- When it was changed
- What was changed

This ensures transparency and traceability of your data.
:::

---

## Practice Exercises

Now it's your turn! Practice by adding more data:

### Exercise 1: Add Another Specimen

Create a second spider sample:
- Different species (e.g., *Latrodectus hesperus*)
- With subsamples
- With measurements
- In the same experiment

### Exercise 2: Time Series Data

Add measurements over time:
- Day 1: Initial diameter measurement
- Day 7: After conditioning
- Day 14: After stress testing

(Use same sample, different dates)

### Exercise 3: Replicates

For one subsample, add:
- 5 diameter measurements (replicates)
- 5 tensile strength measurements
- Calculate mean and std dev

---

## Checkpoint: Data Entry Complete?

Before moving to the next module, verify:

- [ ] Created at least one parent sample
- [ ] Added at least one subsample
- [ ] Recorded at least 2 trait measurements
- [ ] Uploaded at least one file/image
- [ ] Created an experiment linking samples and traits
- [ ] Used filters to explore data
- [ ] Edited an entry and checked the logbook
- [ ] Understand the sample → subsample → trait hierarchy

::: tip Data Entry Skills Achieved!
You now have the core skills to use EvoNEST for your research data management!
:::

---

## Best Practices for Data Entry

### Consistency is Key

- **Use standard taxonomic names** - Check against databases (GBIF, WoRMS)
- **Consistent units** - Always use the same units for each trait type
- **Detailed notes** - Future you will thank past you
- **Regular backups** - Learn more in [Module 6: Backup & Maintenance](/tutorial/06-backup-maintenance)

### Metadata Matters

Always record:
- **When** - Dates for collection, measurements, analysis
- **Where** - Location, equipment, lab conditions
- **Who** - Responsible person, collector, measurer
- **How** - Methods, equipment settings, protocols

### File Organization

- **Name files descriptively** - `AranDiad01_microscope_400x.jpg`
- **Include scale bars** in images
- **Document units** in spreadsheets
- **Use version control** for protocols

### Quality Control

- **Enter replicates** - Multiple measurements improve accuracy
- **Check for typos** - Review before saving
- **Verify units** - Double-check mm vs μm, g vs kg
- **Use logbook** - Document why you made changes

---

## Next Steps

Congratulations on completing the data entry module! You now know how to manage research data in EvoNEST.

### Continue Learning

- **[Module 6: Backup & Maintenance](/tutorial/06-backup-maintenance)** - Protect your data with automated backups
- **[Troubleshooting](/tutorial/troubleshooting)** - Fix common problems
- **[User Documentation](/user-docs/)** - Explore advanced features
- **[Data Import Guide](/user-docs/data-import)** - Import existing data
- **[Data Analysis Guide](/user-docs/data-analysis)** - Analyze your data

