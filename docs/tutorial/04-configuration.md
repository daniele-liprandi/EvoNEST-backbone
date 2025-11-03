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


## Step 1: access configuration

1. **Hover the mouse on "Settings"** in the Navigation Menu

2. **Click "Types"**

## Step 2: configure sample types

Sample types define the main categories of specimens you work with.

### Add your custom sample types

Let's add a type specific to your research. For this example, we'll add "Spider Silk":

1. **Find the "Sample Types" section**

2. **Click "Add Item"** or "Add Type"

3. **Fill in the form:**
   - **Value:** `silk` (lowercase, no spaces - this is the internal ID)
   - **Label:** `Spider Silk` (display name for users)
   - **Description:** `Spider silk samples for biomechanical analysis`
   - **Shortened:** `Silk` (optional, for compact displays)

4. **Click "Save"** or "Add"

5. **Verify** the new type appears in the list

::: tip Naming Conventions
**Value field** (internal ID):
- Use lowercase
- No spaces (use underscores if needed: `spider_silk`)
- Keep it short and descriptive
- Once created and used, don't change it!

**Label field** (display name):
- Use proper capitalization
- Can include spaces
- This is what users will see
:::

### Practice: delete sample types which are not relevant to your research

Review the default sample types and remove any that don't apply to your work by pressing the delete button next to each type.

## Step 3: configure subsample types

Subsamples are parts or derivatives of parent samples.

### Default subsample types

Review the defaults:

| Value | Label | Description |
|-------|-------|-------------|
| `muscle` | Muscle Tissue | Muscle tissue samples |
| `bone` | Bone | Bone tissue samples |
| `organ` | Organ | Organ samples |

### Add your subsample types

Example: Add "Venom Gland" for spider research:

1. **Go to "Subsample Types"** section

2. **Click "Add Item"**

3. **Fill in:**
   - **Value:** `venom_gland`
   - **Label:** `Venom Gland`
   - **Description:** `Venom-producing gland tissue`

4. **Save**

### Practice: add more subsample types

::: details Common Subsample Types
**Animal tissues:**
- `liver`, `kidney`, `heart`, `brain`, `skin`, `blood`

**Plant parts:**
- `leaf`, `root`, `stem`, `flower`, `seed`, `bark`

**Specialized:**
- `silk_gland`, `spinnerets`, `egg_sac`, `molt`
:::

## Step 4: configure trait types (with units!)

Trait types define what you measure. **Units are crucial** for proper data analysis.

### Default trait types

Review defaults:

| Value | Label | Unit | Description |
|-------|-------|------|-------------|
| `diameter` | Fiber Diameter | μm | Diameter measurements |
| `length` | Length | mm | Length measurements |
| `weight` | Weight | g | Weight measurements |

### Add trait type with unit

Example: Add "Tensile Strength" measurement:

1. **Go to "Trait Types"** section

2. **Click "Add Item"**

3. **Fill in:**
   - **Value:** `tensile_strength`
   - **Label:** `Tensile Strength`
   - **Unit:** `MPa` (megapascals)
   - **Description:** `Maximum stress before failure`
   - **Shortened:** `Strength` (optional)

4. **Save**

::: warning Units Are Important!
- Always specify units for quantitative traits
- Use standard abbreviations (SI units preferred)
- Be consistent across your lab
- Common units: `μm`, `mm`, `g`, `kg`, `MPa`, `GPa`, `°C`, `%`
:::

### Practice: add measurement types

Add trait types for your common measurements:

::: details Example: Biomechanics Measurements
- `youngs_modulus` → "Young's Modulus" → `GPa` → "Elastic modulus"
- `extensibility` → "Extensibility" → `%` → "Strain at failure"
- `toughness` → "Toughness" → `MJ/m³` → "Energy to break"
- `cross_section` → "Cross-Sectional Area" → `μm²` → "Fiber cross-section"
:::

::: details Example: Ecological Measurements
- `body_mass` → "Body Mass" → `g` → "Individual body weight"
- `abundance` → "Abundance" → `count` → "Population count"
- `ph` → "pH" → `pH` → "Acidity/alkalinity"
- `temperature` → "Temperature" → `°C` → "Environmental temperature"
:::

::: details Example: Qualitative Traits
Not all traits are quantitative:
- `color` → "Color" → (no unit) → "Visual color"
- `sex` → "Sex" → (no unit) → "Biological sex"
- `life_stage` → "Life Stage" → (no unit) → "Developmental stage"
:::

## Step 5: configure equipment types

Define the equipment used for measurements. This helps with metadata and method tracking.

### Add equipment

Example: Add "Instron Tensile Tester":

1. **Go to "Equipment Types"** section

2. **Click "Add Item"**

3. **Fill in:**
   - **Value:** `instron_5944`
   - **Label:** `Instron 5944 Tensile Tester`
   - **Description:** `500N load cell, used for fiber testing`

4. **Save**

### Practice: add your lab equipment

::: details Equipment Examples
**Microscopy:**
- `sem` → "Scanning Electron Microscope"
- `light_microscope` → "Olympus Light Microscope"

**Measurement:**
- `balance_analytical` → "Analytical Balance (0.1mg)"
- `caliper_digital` → "Digital Caliper"

**Sensors:**
- `thermometer_digital` → "Digital Thermometer"
- `ph_meter` → "pH Meter"
:::

## Step 6: configure sample iD generation

EvoNEST can automatically generate sample IDs from taxonomy.

### How it works

With rules like:
- Genus: first 3 letters
- Species: first 4 letters
- Number: padded to 2 digits

**Example:** *Tegenaria ferruginea* specimen #1 becomes: **TegFerr01**

### Set up iD rules

1. **Go to "Main Settings"** or "Sample ID Generation"

2. **Configure the rules:**

   | Setting | Recommended | Description |
   |---------|-------------|-------------|
   | **Genus Length** | 3 | Characters from genus name |
   | **Species Length** | 4 | Characters from species name |
   | **Starting Number** | 1 | First sample number |
   | **Number Padding** | 2 | Digits (01, 02, ..., 99) |

3. **Test it:**
   - Try: *Latrodectus hesperus* → `LatHesp01`
   - Try: *Nephila clavipes* → `NepClav01`

4. **Save** the configuration

::: tip ID Customization
You can also:
- **Manual IDs** - Enter custom IDs instead of auto-generated
- **Prefix/Suffix** - Add lab codes (e.g., `LAB_TegFerr01`)
- **Different Rules** - Use different lengths if needed
:::

## Step 7: configure lab information

Set default values for your laboratory.

### Lab details

1. **Go to "Lab Information"** section

2. **Fill in your details:**
   - **Lab Name:** Your laboratory name
   - **Institution:** University or organization
   - **Default Location:** Where you usually collect specimens
   - **Default Coordinates:** Latitude/Longitude (optional)
   - **Contact Information:** Lab contact email

3. **Save**

::: tip Why Set Lab Info?
- Pre-fills location fields when creating samples
- Provides context for collaborators
- Appears in exported data
- Useful for multi-lab setups
:::

## Step 8: review and save configuration

### Review your settings

1. **Go back through each section** and verify:
   - [ ] Sample types include your research organisms
   - [ ] Subsample types cover the tissues you work with
   - [ ] Trait types have correct units
   - [ ] Equipment is listed
   - [ ] Sample ID rules are set
   - [ ] Lab information is filled in

2. **Look for a "Save Configuration"** or "Apply Settings" button

3. **Save all changes**

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

## Step 9: export configuration (optional)

It's good practice to backup your configuration.

### Export config

1. **Look for "Export Configuration"** button (might be in Settings)

2. **Download** the configuration file (usually `config.json` or `types.json`)

3. **Save it** somewhere safe (e.g., in your project folder or cloud storage)

### Why export?

- **Backup** - Restore if you accidentally delete types
- **Share** - Give to other labs using similar workflows
- **Version control** - Track changes over time
- **Documentation** - Reference for publications

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

::: tip Ready to Add Data?
Perfect! Now you can start entering real samples and measurements.
:::

## Common configuration scenarios

### Scenario 1: multi-species research lab

```
Sample Types: animal, plant, algae, fungi
Subsample Types: tissue, blood, DNA, RNA
Trait Types:
  - body_mass (g)
  - length (mm)
  - abundance (count)
```

### Scenario 2: biomechanics lab

```
Sample Types: spider_silk, spider_web, insect_cuticle
Subsample Types: dragline, capture_spiral, egg_sac_silk
Trait Types:
  - diameter (μm)
  - tensile_strength (MPa)
  - extensibility (%)
  - toughness (MJ/m³)
Equipment: instron_5944, SEM, light_microscope
```

### Scenario 3: ecology field station

```
Sample Types: animal, plant, water, sediment
Subsample Types: leaf, root, water_filtered
Trait Types:
  - ph (pH)
  - temperature (°C)
  - dissolved_oxygen (mg/L)
  - chlorophyll (μg/L)
Equipment: ph_meter, dissolved_oxygen_sensor, spectrophotometer
```

## Next steps

**Excellent work!** EvoNEST is now configured specifically for your laboratory's research needs.

In the next module, you'll:
- Create your first biological sample
- Record trait measurements
- Upload files and images
- Organize data into experiments
