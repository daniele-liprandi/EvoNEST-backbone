# Module 5: Data Entry & Management

::: tip Learning Objectives
By the end of this module, you will have:

- ✅ Created your first biological sample
- ✅ Added subsamples (tissues/parts)
- ✅ Recorded trait measurements
- ✅ Attached photos and files to samples
- ✅ Used the data explorer
  :::

**Estimated Time:** 25-35 minutes

## Prerequisites

Before starting this module, make sure you've completed [Module 4: Configuration](/tutorial/04-configuration) and have:

- ✅ Sample and subsample types configured
- ✅ Trait quantities with units set up
- ✅ EvoNEST running and logged in

## Overview

Now for the practical part - adding real data to EvoNEST! In this hands-on module, you'll learn the complete workflow:

1. Create a parent sample (an animal specimen)
2. Add subsamples
3. Record trait measurements
4. Attach photos and files to your samples
5. Explore and manage your data

We'll use a practical example you can adapt to your own research.

## Exercise: Spider silk research workflow

Let's work through a realistic example: documenting a spider specimen and measuring its silk properties.

**Scenario:** You've collected a garden spider (_Araneus diadematus_) and want to:

- Document the specimen
- Extract silk samples
- Measure silk diameter

## Step 1: Create a parent sample

The parent sample represents the whole organism.

### 1.1 Navigate to Samples

1. **Click "Samples"** in the main navigation

2. **Click "Add New Sample"**

3. **A form will appear**

### 1.2 Fill in General tab

The form has multiple tabs. Start with the **General** tab:

- **Sample Type:** Select `animal` (or your custom type)
- **Notes:** (optional) Add any general observations

### 1.3 Fill in Details tab

Click the **Details** tab:

**Collection Information:**

- **Responsible:** Select `admin` (your username)
- **Location:** Insert any address you like, e.g., `Torino Botanical Garden, Italy`
- **Latitude:** and **Longitude:** are going to get auto-filled using the address
- **Collection Date:** Click calendar icon, select any past date, or leave it as today
- **Parent Sample:** Leave blank (this is a parent sample)

::: tip Location Helpers
Use the "Use current location" button to auto-fill coordinates, or "Use lab location" to use configured lab coordinates.
:::

### 1.4 Fill in Animal tab

Click the **Animal** tab for taxonomy:

- **Genus:** `Araneus`
- **Species:** `diadematus`

The form validates taxonomy and auto-fills the family and nomenclature field.

- **Sex:** `Female`


### 1.6 Review auto-generated name

At the bottom of the form, you'll see:

- **Sample Name:** Auto-generated as `Aradia001` (based on genus + species)

::: tip Auto-Generated IDs
The name changes depending on what you set as naming rules in Module 4.
:::

### 1.7 Submit the sample

1. **Review** all tabs

2. **Click "Submit"** button at the bottom

3. **Success!** You should see:
   - Confirmation message
   - The new sample in the samples table
   - A sample ID (e.g., `Aradia001`)

::: tip First Sample Created! 🎉
Congratulations! You've created your first sample in EvoNEST.
:::

## Step 2: Create subsamples

Subsamples represent parts or derivatives of the parent sample.

### 2.1 Access Subsample Creation

**Method 1: From Sample Detail Page**

1. Click on your newly created sample (`Aradia001`)
2. Find "Add Subsample" button
3. Click it

**Method 2: From Samples List**

1. Find your sample in the table
2. Click the "+" or "Add Subsample" action
3. Form opens

### 2.2 Create first subsample - dragline silk

The subsample form also has tabs. Fill them in order:

**General tab:**

- **Type:** Select `silk` (from your configured types)

**Details tab:**

- **Responsible:** `admin` (auto-filled)
- **Location:** Use any address, or lab location
- **Date:** Leave it as today or edit it
- **Parent Sample:** Select `Aradia001`

When you select the parent, taxonomy fields auto-fill.

**Subsample tab:**

- **Subsample Type:** write `dragline` (from your configured types)
- **Include Subsample Shortened:** Check this to add subsample type code to the name
- **Box:** `1`
- **Slot:** `1`

The **Name** field at the bottom auto-generates as `Aradia001_dl001` (with dragline shortcode `dl`).

**Click "Submit"** to save.

### 2.3 Create second subsample  of the same type

If you now press again `Submit`, you can create a second subsample of the same type. The name should auto-generate as `Aradia001_dl002`.

3. **Click "Submit"**

::: tip Multiple Subsamples
You can create as many subsamples as needed from one parent:

- Different tissues (muscle, bone, organs)
- Different silk types (dragline, capture spiral, egg sac)
- Replicates (multiple extractions)
- Time series (samples at different dates)
  :::

### Verify subsamples

1. **Click on the parent sample name (`Aradia001`)**

2. **You should see:**
   - A detailed page with all the sample info
   - On the right, a list of associated subsamples

## Step 3: Record trait measurements

Now let's add measurements for your silk samples.

### 3.1 Navigate to Traits

1. **Click "Traits"** in the main navigation

2. **Click "Add Trait"** or "Record Measurement"

### 3.2 Record fibre diameter

The trait form is organized in tabs. Let's fill them:

**General tab:**

- **Quantity:** Select `diameter`
- **Equipment:** Select `light_microscope` (or add custom equipment)

**Details tab:**

- **User:** `admin` (auto-filled)
- **Date of measurement:** Today

**Values tab:**

- **Sample:** Select `Aradia001_dl001` (the dragline silk subsample)
- **Detail of the sample measured:** `all` or `mid-section`
- **Measurements:** Enter replicate values (separate them via comma):
  ```
  3.1, 3.3, 3.2, 3.4, 3.0
  ```
- **Unit:** `μm` 

EvoNEST automatically calculates:
- **Mean:** 3.2 μm
- **Standard Deviation:** 0.15 μm

**Click "Submit"** to save.

### 3.3 Record tensile strength

1. **Click "Add Trait"** again

2. Fill in the tabs:

   **General tab:**
   - **Quantity:** `tensile_strength`
   - **Equipment:** `t150_utm`
   
   **Details tab:**
   - **Date:** Today
   
   **Values tab:**
   - **Sample:** `Aradia001_dl001`
   - **Detail:** `single fibre`
   - **Measurements:** `1100` (or list: `1100, 1050, 1150`)
   - **Unit:** `MPa`

3. **Click "Submit"**


## Step 4: Attach photos and files to a sample

Photos, PDFs, field notes, and other files attach to a sample, subsample, or trait. An attachment is one file linked to one record. It shows in a gallery on that record's page and in the Files table alongside every other attachment in the NEST.

Experiments are separate. An experiment holds a raw data file from an instrument, and a parser reads that file into trait measurements. This module stays with attachments. The [Data Format Parser Development Guide](/technical-docs/data-format-parser-development) covers experiments and parsing once you have a data file to work with.

### 4.1 Download two practice images

Download the spider specimen photo, [Araneus diadematus specimen](https://upload.wikimedia.org/wikipedia/commons/1/16/Araneus_diadematus_MHNT_Femelle_Fronton.jpg), and save it as `Aradia001_specimen.jpg`.

Download the silk microscopy image, [spider silk SEM image](https://spider-silkome-db-bucket.s3.amazonaws.com/mechanical_properties/semx2000s/000/000/084/original/IDV6054_MCH627_S2K449.jpg?1585109565), and save it as `Aradia001_silk_SEM.jpg`.

### 4.2 Attach the specimen photo to the parent sample

1. Open the `Aradia001` sample page. Go to Samples, then click the sample name.

2. Find the Attachments card in the right sidebar.

3. Click Upload and choose `Aradia001_specimen.jpg`.

4. The image appears in the gallery. Click the pencil icon next to its caption and type `Adult female, collected from Torino Botanical Garden`, then press Enter.

### 4.3 Attach the microscopy image to the subsample

1. Open the `Aradia001_dl001` subsample page.

2. In the Attachments card, click Upload and choose `Aradia001_silk_SEM.jpg`.

3. Caption it `SEM of dragline silk, 2000x magnification`.

### 4.4 See every file in one place

1. Click Files in the main navigation.

2. The table lists every attachment in the NEST, each with its target record, kind (`image`, `document`, `data`), and category.

3. Filter by kind or by the sample name to narrow the list. Use the Download button on a row to retrieve the original file.

::: tip What attaches where
Samples and subsamples take specimen photos, habitat shots, and collection permits.

Traits take measurement screenshots and calibration records, added from the Files column in the sample's trait table.

Experiments take raw instrument output such as CSV, XLSX, or machine-specific formats. A parser turns that output into traits. See the [Data Format Parser Development Guide](/technical-docs/data-format-parser-development).
:::

## Step 5: Explore your data

Learn to find and filter your data.

### 5.1 Explore samples

1. **Go to "Samples" → "Animal"**

2. **Try the table filters:**

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

### 5.2 Explore traits

1. **Go to "Traits" → "Analysis"**

2. **Select Trait "Fibre Diameter"**

3. **View statistics:**
   - Min, max, mean, std dev (if configured)

## Step 6: Edit and update data

Learn to modify existing entries.

### Edit a sample

1. **Go to the Animal table or the General table of Samples** → Find `Aradia001`

2. **Click the sample name** to open the sample page

3. **Make changes** in the relevant tabs:

   - Update notes
   - Set the life stage of the animal
   - Correct taxonomy in Animal tab

5. **Check logbook:**
   - EvoNEST tracks all changes
   - View change history in the logbook section

### Edit a trait

1. **In the same page, click the button "See Sample Traits"**

3. **Make changes** directly in the table:

::: warning Data Integrity
EvoNEST maintains a **logbook** (change history) for all edits:

- Who made the change
- When it was changed
- What was changed

This ensures transparency and traceability of your data.
:::

## Practice exercises

Now it's your turn! Practice by adding more data:

### Exercise 1: Add another specimen

Create a second spider sample:

- Different species (e.g., _Latrodectus hesperus_)
- With subsamples
- With measurements
- Attach a specimen photo to the sample

### Exercise 2: Time series data

Add measurements over time:

- Day 1: Initial diameter measurement
- Day 7: After conditioning
- Day 14: After stress testing

(Use same sample, different dates)

### Exercise 3: Multiple images

Attach three images to one subsample:

- Light microscopy image
- SEM image
- Field photo

Give each a caption so the gallery stays readable.

## Checkpoint: Data entry complete?

Before moving to the next module, verify:

- [ ] Created at least one parent sample
- [ ] Added at least one subsample
- [ ] Recorded at least 2 trait measurements
- [ ] Attached at least 2 images to samples
- [ ] Checked the images on the Files page
- [ ] Used filters to explore data
- [ ] Edited an entry and checked the logbook
- [ ] Understand the sample → subsample → trait hierarchy

::: tip Data entry skills achieved!
You now have the core skills to use EvoNEST for your research data management!

**Ready for advanced features?** If you work with instrument data files (tensile testers, spectroscopy, chromatography, etc.), you can write parsers that read those files into trait measurements. See:
- [Data Format Parser Development](/technical-docs/data-format-parser-development) - Parse structured data files into experiments and traits
- [File Handling & Attachments](/technical-docs/file-processor-development) - How uploads are routed, and how to give an entity a file gallery
- [Technical Documentation](/technical-docs/) - Technical guides and API reference
:::

## Next steps

Congratulations on completing the data entry module! You now know how to manage research data in EvoNEST.

### Continue learning

- **[Module 6: Backup & Maintenance](/tutorial/06-backup-maintenance)** - Protect your data with automated backups
- **[Troubleshooting](/tutorial/troubleshooting)** - Fix common problems
- **[User Documentation](/user-docs/)** - Explore advanced features
- **[Data Import Guide](/user-docs/data-import)** - Import existing data
- **[Data Analysis Guide](/user-docs/data-analysis)** - Analyze your data
