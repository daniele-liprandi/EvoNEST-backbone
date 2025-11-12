# Module 4: Configuration

::: tip Learning Objectives
By the end of this module, you will have:

- ✅ Created new NEST databases
- ✅ Added new researchers to EvoNEST
- ✅ Configured sample types for your laboratory
- ✅ Set up trait types with units
- ✅ Defined equipment and measurement tools
- ✅ Customized sample ID generation
- ✅ Configured lab information
  :::

**Estimated Time:** 25-35 minutes

## Prerequisites

Before starting this module, make sure you've completed [Module 3: First Launch](/tutorial/03-first-launch) and have:

- ✅ EvoNEST running and accessible
- ✅ Logged in as admin
- ✅ Familiar with the navigation

## Overview

In this module, you'll set up NESTS and their settings, and the types and categories that define how you organize and measure your specimens.

::: warning Administrator Responsibilities
As here we are installing EvoNEST from scratch, you are by default an administrator. This means you have additional capabilities for managing users and NESTs (databases). These administrative functions are covered in this section.
:::

## Step 1: Creating new NESTs

As an administrator, you can create new NESTs - separate database instances for different labs, research groups, or projects. Each NEST contains its own independent data.

**To create a new NEST:**

1. **Navigate to "Users"**
2. **Locate the "Database Management" section** (visible only to administrators)
3. **Enter a database name** in the input field (e.g., "building_02", "projEU")
4. **Click "Add"**
5. The new NEST will be available for user assignment

::: tip Database Naming

- Use lowercase names without spaces
- Choose descriptive names (e.g., "evolution_lab", "biomech_project")
- Database names are permanent once created and in use
  :::

**To navigate to a different NEST:**

1. **Go to the Users table**
2. **Give the user "admin" access to the new NEST** by clicking the Database button on the last column, 'Actions'
3. **Click the database selector** in the top-right corner of the interface, currently showing 'admin'
4. **Select the desired NEST** from the dropdown menu

You will be automatically switched to the Home of the selected NEST, which will be asking to run the configuration steps for the first time.

## Step 2: Creating new NEST users

**NEST users** are researcher accounts tracked within the database for data attribution, change logging, and ownership. These are used to track who created or modified samples, experiments, and traits.

::: danger NEST Users vs Login Users

In the current version of EvoNEST, NEST users and login authentication users are separate entities.

- **NEST users**: Database-level accounts for attribution and audit trails (name, email, role, institution)
- **Login users**: Separate authentication credentials that allow access to EvoNEST

Creating a NEST user does NOT automatically create login credentials. For information on setting up login authentication methods, see the relative section in the [Technical Documentation](https://daniele-liprandi.github.io/EvoNEST-backbone/developer-docs/).
:::

**To create a new NEST user:**

1. **Navigate to "Settings" → "Users"**
2. **Click "Add New Users"** (visible only to administrators)
3. **Fill in the user details:**

   | Field           | Required | Description                               |
   | --------------- | -------- | ----------------------------------------- |
   | **Name**        | Yes      | Full name of the researcher               |
   | **Email**       | Yes      | Email address                             |
   | **Role**        | Yes      | User role                                 |
   | **Institution** | No       | Affiliated university or organization     |
   | **Databases**   | Yes      | Select which NEST(s) this user can access |

4. **Click "Submit"**

::: warning User Roles
User roles are currently only for informational purposes. All users have the same permissions within EvoNEST, except some exclusive administrator functions. However, it is a good practice to assign roles to be ready for future permission management features.
:::

::: tip Multi-NEST Access
Users can be assigned to multiple NESTs. They can switch between NESTs they have access to using the database selector in the interface.
:::

## Step 3: Set up the Main settings

EvoNEST can automatically generate sample IDs from taxonomy, and quickly fill the sample location with your lab position.

### Set up the ID generation

1. **Hover the mouse on "Settings"** in the Navigation Menu

2. **Click "Main"**

3. **Configure the rules:**

   | Setting             | Recommended | Description                  |
   | ------------------- | ----------- | ---------------------------- |
   | **Genus Length**    | 3           | Characters from genus name   |
   | **Species Length**  | 3           | Characters from species name |
   | **Starting Number** | 1           | First sample number          |
   | **Number Padding**  | 3           | Digits (001, 002, ..., 999)  |

:::tip ID Generation Example
For the first sample of _Tegenaria ferruginea_, the ID would be:

- Genus: `Teg` (first 3 letters)
- Species: `fer` (first 3 letters)
- Starting Number: 1
- Number Padding: 3
  Resulting ID: `Tegfer001`

:::

### Lab details

1. **Go to "Lab Information"** section

2. **Fill in your details:**

   - **Lab Name:** Your laboratory name
   - **Lab Location:** Your laboratory address
   - **Lab Coordinates:** Latitude and Longitude

3. **Press "Save Settings"** at the bottom of the page

## Step 4: Access types configuration

1. **Hover the mouse on "Settings"** in the Navigation Menu

2. **Click "Types"**

## Step 5: Configure sample types

Sample types define the main categories of specimens you work with.

### Add your custom sample types

Let's add a type specific to your research. For this example, we'll add "Spider Silk":

1. **Find the "Sample Types" section**

2. **Click "Add Item"**

3. **Fill in the form:**

   - **Value:** `silk` (lowercase, no spaces - this is the internal ID)
   - **Label:** `Spider silk` (display name for users)
   - **Description:** `Spider silk samples`
   - **Shortened:** `slk`

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

## Step 6: Configure subsample types

Subsamples are parts or derivatives of parent samples.

### Add your subsample types

Example: Add "Drop-down dragline" for spider research:

1. **Go to "Subsample Types"** section

2. **Click "Add Item"**

3. **Fill in:**

   - **Value:** `dragline`
   - **Label:** `Drop-down Dragline`
   - **Description:** `Drop-down dragline silk sample` (optional)
   - **Shortened:** `dl`

4. **Click "Add item"**

## Step 7: Configure trait types

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
   - **Shortened:** `strength`

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
- `cross_section` → "Cross-sectional area" → `μm²` → "Fibre cross-section"
  :::

## Step 8: Configure equipment types

Define the equipment used for measurements. This helps with metadata and method tracking.

### Add equipment

Example: Add "T150 Universal Testing Machine":

1. **Go to "Equipment Types"** section

2. **Click "Add Item"**

3. **Fill in:**

   - **Value:** `t150`
   - **Label:** `T150 UTM`
   - **Description:** `500 mN load cell, used for fibre testing`

4. **Save**

### Test your configuration

1. **Navigate to "Samples"**

2. **Click "Add Sample"** (don't create one yet, just look)

3. **Verify:**

   - Sample type dropdown shows your custom types
   - When inserting a subsample (any non-animal sample), and writing the subsample type in the form, the correct subsample type shortcode appears in the animal ID
   - Form uses your ID generation rules

4. **Cancel** out of the form

::: tip Configuration Complete!
Your EvoNEST instance is now configured for your laboratory's specific needs!
:::

## Checkpoint: configuration complete?

Before moving to the next module, verify:

- [ ] Understood how to create new NESTs and switch between them
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
- Organise data into experiments
