# EvoNEST Setup Guide

## Initial Configuration

EvoNEST now features a user-friendly web interface for configuration. When you first access the system, you'll be guided through the setup process automatically.

## Configuration Overview

The configuration system is divided into two main areas:

### 1. Types Configuration (`/config/types`)

This section allows you to configure the different types of data your lab works with:

- **Sample Types** - Define categories of biological samples (e.g., "animal", "silk", "web")
- **Trait Types** - Configure measurements and characteristics with units (e.g., "diameter" in μm)
- **Sample Subtypes** - Specify subcategories for detailed classification
- **Equipment Types** - List measurement equipment used in your lab
- **Silk Types** - Define specific spider silk types for detailed classification

### 2. Main Settings (`/config/settings`)

Configure core system behavior and lab information:

- **Sample ID Generation** - Rules for automatic ID creation from species names
- **Lab Information** - Your laboratory details for location defaults

## Getting Started

### First-Time Setup

1. **Access the application** in your web browser
2. **Configuration wizard** will automatically appear if no configuration exists
3. **Follow the prompts** to set up your initial configuration
4. **Review and customize** the default settings to match your lab's needs

### Manual Configuration

:::details Navigation Steps
If you need to modify settings after initial setup:

1. **Types Configuration**: Go to `/config/types` to manage data types
2. **Main Settings**: Go to `/config/settings` to configure system behavior
:::

## Managing Configuration

### Adding New Items

:::details Step-by-Step Process
1. Click the **"Add Item"** button in any type section
2. Fill in the required fields:
   - **Value**: Internal system identifier (lowercase, no spaces)
   - **Label**: Display name for users
   - **Description**: Optional explanation
   - **Unit**: For trait types only (e.g., "μm", "g", "mm")
   - **Shortened**: Optional abbreviated form
:::

### Configuration Management

- **Set to Defaults**: Restore original configuration (overwrites custom changes)
- **Refresh**: Reload settings from database (useful for multi-user environments)
- **Delete**: Remove unwanted entries with confirmation

## Configuration Examples

:::details Sample ID Generation
With settings:
- Genus length: 3
- Species length: 4  
- Starting number: 1
- Number padding: 2

A sample from *Tegenaria ferruginea* would get ID: **TegFerr01**
:::

:::details Sample Types Configuration
```
Animal Samples:
- Value: "animal"
- Label: "Animal Sample"
- Description: "Whole animal specimens"

Silk Samples:
- Value: "silk" 
- Label: "Silk Sample"
- Description: "Spider silk specimens"
```
:::

:::details Trait Types with Units
```
Diameter Measurements:
- Value: "diameter"
- Label: "Diameter"
- Unit: "μm"
- Description: "Fiber diameter measurements"

Weight Measurements:
- Value: "weight"
- Label: "Weight" 
- Unit: "g"
- Description: "Sample weight measurements"
```
:::


---

This new system eliminates the need for manual `types.js` file editing and provides a much more user-friendly way to manage your EvoNEST configuration.