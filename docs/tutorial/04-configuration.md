# Module 4: Configuration

::: tip Learning Objectives
By the end of this module, you will have:
- ✅ Configured sample types for your laboratory
- ✅ Set up trait types with units
- ✅ Defined equipment and measurement tools
- ✅ Customized sample ID generation
- ✅ Configured lab information
:::

**Estimated Time:** 30-40 minutes

## Prerequisites

Before starting this module, make sure you've completed [Module 3: First Launch](/tutorial/03-first-launch) and have:
- ✅ EvoNEST running and accessible
- ✅ Logged in as admin
- ✅ Familiar with the navigation

## Overview

In this module, you'll set up the types and categories that define how you organize and measure your specimens.

## Understanding the configuration system

EvoNEST uses a **type system** to organize data:

### Types of types

| Type Category | Purpose | Examples |
|--------------|---------|----------|
| **Sample Types** | Categories of organisms | animal, plant, fungus |
| **Subsample Types** | Parts or tissues | muscle, bone, leaf, silk |
| **Trait Types** | Measurements | diameter, strength, weight |
| **Equipment Types** | Measurement tools | microscope, tensile tester |


## Step 1: Access configuration

1. **Hover the mouse on "Settings"** in the Navigation Menu

2. **Click "Types"**

## Step 2: Configure sample types

Sample types define the main categories of specimens you work with.

### Add your custom sample types

Let's add a type specific to your research. For this example, we'll add "Spider Silk":

1. **Find the "Sample Types" section**

2. **Click "Add Item"**

3. **Fill in the form:**
   - **Value:** `silk` (lowercase, no spaces - this is the internal ID)
   - **Label:** `Spider silk` (display name for users)
   - **Description:** `Spider silk samples for biomechanical analysis`
   - **Shortened:** `slk` (optional, for compact displays)

4. **Click "Add item"**

5. **Verify** the new type appears in the list

::: tip Naming Conventions
**Value field** (internal ID):
- Use lowercase
- No spaces (use underscores if needed: `spider_silk`)
- Keep it short and descriptive
- Once created and used, don't change it!

:::

### Practice: delete sample types which are not relevant to your research

Review the default sample types and remove any that don't apply to your work by pressing the delete button next to each type.

## Step 3: Configure subsample types

Subsamples are parts or derivatives of parent samples.

### Default subsample types

Review the defaults:

| Value | Label | Description |
|-------|-------|-------------|
| `muscle` | Muscle Tissue | Muscle tissue samples |
| `bone` | Bone | Bone tissue samples |
| `organ` | Organ | Organ samples |

### Add your subsample types

Example: Add "Drop-down dragline" for spider research:

1. **Go to "Subsample Types"** section

2. **Click "Add Item"**

3. **Fill in:**
   - **Value:** `dropdown_dragline`
   - **Label:** `Drop-down Dragline`
   - **Description:** `Drop-down dragline silk sample`

4. **Click "Add item"**


## Step 4: Configure trait types

Trait types define what you measure. 

### Add trait type with unit

Example: Add "Tensile strength" measurement:

1. **Go to "Trait Types"** section

2. **Click "Add Item"**

3. **Fill in:**
   - **Value:** `tensile_strength`
   - **Label:** `Strength`
   - **Unit:** `Pa` (pascals)
   - **Description:** `Maximum stress before failure`
   - **Shortened:** `strength` (optional)

4. **Save**

::: warning Units are important!
- Use SI standard units
:::

### Practice: add measurement types

Add trait types for your common measurements:

::: details Example: Biomechanics Measurements
- `youngs_modulus` → "Young's Modulus" → `Pa` → "Elastic modulus"
- `extensibility` → "Extensibility" → `%` → "Strain at failure"
- `toughness` → "Toughness" → `J/m³` → "Energy to break"
- `cross_section` → "Cross-sectional area" → `μm²` → "Fiber cross-section"
:::

## Step 5: Configure equipment types

Define the equipment used for measurements. This helps with metadata and method tracking.

### Add equipment

Example: Add "T150 Universal Testing Machine":

1. **Go to "Equipment Types"** section

2. **Click "Add Item"**

3. **Fill in:**
   - **Value:** `t150_universal_testing_machine`
   - **Label:** `T150 UTM`
   - **Description:** `500 mN load cell, used for fiber testing`

4. **Save**

## Step 6: Configure sample ID generation

EvoNEST can automatically generate sample IDs from taxonomy.

### How it works

With rules like:
- Genus: first 3 letters
- Species: first 3 letters
- Number: progressive counter

**Example:** *Tegenaria ferruginea* specimen #1 becomes: **Tegfer1**

### Set up ID rules

1. **Hover the mouse on "Settings"** in the Navigation Menu

2. **Click "Main"**

3. **Configure the rules:**

   | Setting | Recommended | Description |
   |---------|-------------|-------------|
   | **Genus Length** | 3 | Characters from genus name |
   | **Species Length** | 4 | Characters from species name |
   | **Starting Number** | 1 | First sample number |
   | **Number Padding** | 2 | Digits (01, 02, ..., 99) |

4. **Press "Save Settings"** at the bottom of the page

## Step 7: Configure lab information

Set default values for your laboratory.

### Lab details

1. **Go to "Lab Information"** section

2. **Fill in your details:**
   - **Lab Name:** Your laboratory name
   - **Lab Location:** Your laboratory address
   - **Lab Coordinates:** Latitude and Longitude

3. **Press "Save Settings"** at the bottom of the page


## Step 8: Review and save configuration

### Review your settings

1. **Go back through each section** and verify:
   - [ ] Sample types include your research organisms
   - [ ] Subsample types cover the tissues you work with
   - [ ] Trait types have correct units
   - [ ] Equipment is listed
   - [ ] Sample ID rules are set
   - [ ] Lab information is filled in


### Test your configuration

1. **Navigate to "Samples"**

2. **Click "Add Sample"** (don't create one yet, just look)

3. **Verify:**
   - Sample type dropdown shows your custom types
   - Subsample types appear in the subsample section
   - Form uses your ID generation rules

4. **Cancel** out of the form

::: tip Configuration Complete!
Your EvoNEST instance is now configured for your laboratory's specific needs!
:::


## Checkpoint: configuration complete?

Before moving to the next module, verify:

- [ ] Sample types configured (at least 2-3 custom types)
- [ ] Subsample types added (relevant to your work)
- [ ] Trait types with proper units (at least 3-5 types)
- [ ] Equipment list created (2-3 items)
- [ ] Sample ID generation rules set
- [ ] Lab information filled in
- [ ] All changes saved
- [ ] Tested that types appear in sample creation form

::: tip Ready to add data?
Perfect! Now you can start entering real samples and measurements.
:::

## Next steps

**Excellent work!** EvoNEST is now configured specifically for your laboratory's research needs.

In the next module, you'll:
- Create your first biological sample
- Record trait measurements
- Upload files and images
- Organize data into experiments
