# Module 5: Data Entry & Management

::: tip Learning Objectives
By the end of this module, you will have:

- ✅ Created your first biological sample
- ✅ Added subsamples (tissues/parts)
- ✅ Recorded trait measurements
- ✅ Uploaded files and images
- ✅ Created experiments with file uploads
- ✅ Used the data explorer
  :::

**Estimated Time:** 25-35 minutes

## Prerequisites

Before starting this module, make sure you've completed [Module 4: Configuration](/tutorial/04-configuration) and have:

- ✅ Sample and subsample types configured
- ✅ Trait types with units set up
- ✅ EvoNEST running and logged in

## Overview

Now for the practical part - adding real data to EvoNEST! In this hands-on module, you'll learn the complete workflow:

1. Create a parent sample (an animal specimen)
2. Add subsamples
3. Record trait measurements
4. Create experiments by uploading images
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

- **Trait Type:** Select `diameter`
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
   - **Trait Type:** `tensile_strength`
   - **Equipment:** `t150_utm`
   
   **Details tab:**
   - **Date:** Today
   
   **Values tab:**
   - **Sample:** `Aradia001_dl001`
   - **Detail:** `single fibre`
   - **Measurements:** `1100` (or list: `1100, 1050, 1150`)
   - **Unit:** `MPa`

3. **Click "Submit"**


## Step 4: Create an experiment with images

In EvoNEST, experiments are created by uploading files (images, documents, or data files) and linking them to samples.

::: tip Experiments and Data Parsing
**Advanced Feature:** EvoNEST can automatically parse data files (CSV, XLSX, instrument outputs) to extract trait measurements. When you upload structured data files, custom parsers can:
- Automatically extract measurements
- Create trait entries
- Link data to samples
- Generate statistics

**In this tutorial**, we'll use simple image uploads to learn the basics. If you're interested in creating custom parsers for your instrument data, see the [Data Format Parser Development Guide](/technical-docs/data-format-parser-development) and [File Processor Development Guide](/technical-docs/file-processor-development) after completing the tutorial.
:::

### 4.1 Download practice images

Let's use real images for this exercise:

1. **Download the spider specimen photo:**
   - Right-click and save: [Araneus diadematus specimen](https://upload.wikimedia.org/wikipedia/commons/1/16/Araneus_diadematus_MHNT_Femelle_Fronton.jpg)
   - Save as: `Aradia001_specimen.jpg`

2. **Download the silk microscopy image:**
   - Right-click and save: [Spider silk SEM image](https://spider-silkome-db-bucket.s3.amazonaws.com/mechanical_properties/semx2000s/000/000/084/original/IDV6054_MCH627_S2K449.jpg?1585109565)
   - Save as: `Aradia001_silk_SEM.jpg`

### 4.2 Navigate to Experiments

1. **Click "Experiments"** in the main navigation

2. **Click "Add Experiment"** or "New Experiment"

3. **The experiment form opens** with tabs

### 4.3 Upload specimen image as experiment

Let's create our first experiment - the specimen documentation.

**General tab:**

1. **Responsible:** `admin` (auto-filled)

2. **Import file:** Click or drag-and-drop the `Aradia001_specimen.jpg` image

3. **Experiment Type:** Select `image`
   - EvoNEST automatically detects it's an image file

4. **Experiment Name:** `Aradia001 - Specimen Photo`

5. **Optional notes:**
   ```
   Adult female Araneus diadematus specimen. 
   Collected from University Botanical Garden.
   ```

**Details tab:**

1. **Sample:** Select `Aradia001` (your parent sample)
   - This links the image to the specimen

**Image tab** (appears when type is "image"):

- Shows preview of your uploaded image
- **Sample Name:** Should show `Aradia001` (auto-linked)

**Click "Submit"** - Your first experiment is created!

::: tip What Are Experiments?
Experiments in EvoNEST store and organize research files:

**Basic file storage (this tutorial):**
- Images (specimen photos, microscopy, etc.)
- Documents (protocols, notes, reports)
- Linked to samples for organization

**Advanced data parsing (optional):**
- Upload structured data files (CSV, XLSX, instrument outputs)
- Automatic trait extraction via custom parsers
- Measurements automatically linked to samples
- Statistical analysis of parsed data

For simple documentation (images, PDFs), experiments work as file containers. For instrument data and measurements, you can develop custom parsers to automate trait extraction. See [Technical Documentation](/technical-docs/) to learn more.
:::

### 4.4 Create a second experiment - silk microscopy

Now let's add the silk SEM image:

1. **Click "Add Experiment"** again

2. **General tab:**
   - **Import file:** Upload `Aradia001_silk_SEM.jpg`
   - **Experiment Type:** `image`
   - **Experiment Name:** `Aradia001_dl001 - Silk SEM Microscopy`
   - **Notes:** `SEM image of dragline silk at 2000x magnification`

3. **Details tab:**
   - **Sample:** Select `Aradia001_dl001` (the dragline silk subsample)

4. **Click "Submit"**

### 4.5 View your experiments

1. **Go to "Experiments"** in the main navigation

2. **You should see** your two image experiments listed

3. **Click on an experiment** to view:
   - The full image
   - Linked sample information
   - Upload date and responsible user
   - Any notes you added

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
- Upload a specimen photo as an experiment

### Exercise 2: Time series data

Add measurements over time:

- Day 1: Initial diameter measurement
- Day 7: After conditioning
- Day 14: After stress testing

(Use same sample, different dates)

### Exercise 3: Multiple images

For one subsample, upload:

- Light microscopy image (experiment)
- SEM image (experiment)
- Field photo (experiment)
- Link all to the same sample

## Checkpoint: Data entry complete?

Before moving to the next module, verify:

- [ ] Created at least one parent sample
- [ ] Added at least one subsample
- [ ] Recorded at least 2 trait measurements
- [ ] Uploaded at least 2 images as experiments
- [ ] Linked experiments to the correct samples
- [ ] Used filters to explore data
- [ ] Edited an entry and checked the logbook
- [ ] Understand the sample → subsample → trait → experiment hierarchy

::: tip Data entry skills achieved!
You now have the core skills to use EvoNEST for your research data management!

**Ready for advanced features?** If you work with instrument data files (tensile testers, spectroscopy, chromatography, etc.), you can create custom parsers to automatically extract measurements from data files. See:
- [Data Format Parser Development](/technical-docs/data-format-parser-development) - Parse structured data files
- [File Processor Development](/technical-docs/file-processor-development) - Handle custom file formats
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
