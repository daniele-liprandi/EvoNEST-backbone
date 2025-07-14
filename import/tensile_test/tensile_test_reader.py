import pandas as pd
import os
import plotly.express as px


def extract_numeric_value(value):
    """Extracts numeric value from a string containing a number and unit."""
    # Check if the first character is a digit, if not return None
    if not value[0].isdigit():
        return None
    else:
        # Extract all numeric parts from the string
        num_part = ''.join([char for char in value if char.isdigit() or char == '.' or char == '-'])
        # Convert the numeric part to float, if it's empty return None
        return float(num_part) if num_part else None

def parse_csv(file_path):
    # Open the file and read all lines
    with open(file_path, 'r') as file:
        lines = file.readlines()

    # Dictionary to store attributes found in the file
    attributes = {}
    variables_section = False  # Flag to track if we are in the Variables section
    for line in lines:
        # Check for the start of the Variables section
        if line.strip() == "Variables":
            variables_section = True
            continue
        # Process lines within the Variables section
        if variables_section:
            if line.strip() == "":
                break
            key, value = line.strip().split(maxsplit=1)
            attributes[key] = value

    # Flag to track if we are in the Channel Data section
    channel_data_section = False
    channel_data = []
    for line in lines:
        # Check for the start of the Channel Data section
        if "Channel Data" in line:
            channel_data_section = True
            continue
        # Process lines within the Channel Data section
        if channel_data_section and not line.strip().startswith('"'):
            channel_data.append(line.strip().split(','))

    # Extracting headers and units from the Channel Data section
    headers = lines[lines.index('Channel Data\n') + 2].strip().split(',')
    units = lines[lines.index('Channel Data\n') + 3].strip().split(',')
    headers_with_units = [f"{header.strip().strip('\"')} ({unit.strip().strip('\"')})" for header, unit in zip(headers, units)]
    df = pd.DataFrame(channel_data, columns=headers_with_units)


    # Convert all values in DataFrame to numeric, ignore errors
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    # Process and store attributes in the DataFrame
    for key, value in attributes.items():
        try:
            numeric_value = extract_numeric_value(value)
            df[key] = numeric_value  # Store numeric value
            df[key + " Unit"] = value.replace(str(numeric_value), '').strip()  # Store unit separately
        except:
            df[key] = value

    # HACK
    df['SpecimenName'] = df['SpecimenName Unit']

    # Extract type of sample from the SpecimenName, between _dl, _bl, _gf, _PMS, _ac,_mc
    #df['SpecimenType'] = df['SpecimenName'].str.extract(r'_(dl|bl|gf|PMS|ac)')
    
    # _dl stands for dragline, _bl stands for bridgingline, _gf stands for gumfoot, _mc stands for manually collected
    # define a dictionary based on this and update SpecimenType
    specimen_type_dict = {'dl': 'Dragline', 'bl': 'Bridging line', 'gf': 'Gumfoot', 'ac': 'Aciniform', 'PMS':'PMS'}
    #df['SpecimenType'] = df['SpecimenType'].map(specimen_type_dict)
    
    # Extract type of sample from the SpecimenName, between 2 types of dl _N2, _N4
    #df['SpecimenType'] = df['SpecimenName'].str.extract(r'_(N2|N4)')
    
    # _dl stands for dragline, _bl stands for bridgingline, _gf stands for gumfoot, _mc stands for manually collected
    # define a dictionary based on this and update SpecimenType
    specimen_type_dict = {'N2': 'Simple dragline', 'N4': 'Bundle dragline'}
    #df['SpecimenType'] = df['SpecimenName'].map(specimen_type_dict)
    

    # Convert specific attribute columns to numeric
    #for col in ["OffsetYieldStrain", "StrainAtBreak", "StressAtBreak", "SpecimenDiameter", "Modulus"]:
    df[col] = pd.to_numeric(df[col], errors='coerce')

    # Add the 'Species' column based on the first 6 characters of 'SpecimenName'
    #if 'SpecimenName' in df.columns:
    df['Species'] = df['SpecimenName'].str[:6]

    # Add a column to identify the file
    df['File'] = os.path.basename(file_path)

    return df

# Process all files in a folder
folder_path = '230424_selected_sample' # Path to the folder containing the data files
all_data = pd.DataFrame()  # DataFrame to store data from all files
for file in os.listdir(folder_path):
    if file.endswith('.txt'):  # Process only .txt files
        file_path = os.path.join(folder_path, file)
        file_data = parse_csv(file_path)
        all_data = pd.concat([all_data, file_data], ignore_index=True)

# Custom function to extract the first character of each name
def extract_first_character(name):
    return name[0]

# Apply the custom function to extract the first character of each name
all_data['FirstLetter'] = all_data['SpecimenName'].apply(extract_first_character)

# Sort unique values of 'FirstLetter'
sorted_first_letters = sorted(all_data['FirstLetter'].unique())

 
# Generate a line plot where we color the lines based on the Species
# To generate a scatter plot, substitute px.line with px.scatter
# px.scatter supports continuous colormaps (e.g. you can use "Modulus"
# or "Toughness" as a color)
figscatter = px.line(all_data, 
                 x= "Engineering Strain  (mm/mm)", 
                 y= "Engineering Stress  (MPa)", 
                 color="SpecimenName",
                 color_discrete_sequence=px.colors.qualitative.Alphabet,  # Use the Alphabet color scheme
                 category_orders={"SpecimenName": sorted(all_data['SpecimenName'].unique())},  # Preserve the order of SpecimenName
                 hover_data=['SpecimenName', 'Modulus', 'Toughness', 'Species', 'File', 'SpecimenType'],
                 #title=f"<b>Engineering Stress vs Engineering Strain</b>",
                 )

figscatter.update_traces(line=dict(width=4))



figscatter.update_layout(
    font=dict(color="Black",size=30),

    #template="plotly_white"
    )       
#figscatter.update_xaxes(tickfont_family="Arial Black")    
#figscatter.update_yaxes(tickfont_family="Arial Black")



figscatter.update_xaxes(minor=dict(ticklen=6, tickcolor="black", showgrid=True), range=[0,0.7])
figscatter.update_yaxes(minor=dict(ticklen=6, tickcolor="black", showgrid=True), range=[0,2000])
#figscatter.update_layout(legend=dict(yanchor="top",y=0.99,xanchor="left",x=0.01))     



# on apphub, only the first show per code is working.
#figscatter.show()

# Save all data to excel
# all_data.to_excel("total_data.xlsx")

# Create a summarized DataFrame containing unique specimens
summarised_data = all_data.drop_duplicates(subset=['SpecimenName'], keep='last')

# Save statistical summary to excel
summarised_data.to_excel("summarised_data.xlsx")

# Generate a violin plot with Modulus values grouped by Species
if 'Modulus' in summarised_data.columns and 'Species' in summarised_data.columns:
    # Create the violin plot
    fig = px.violin(summarised_data, 
                    y="Modulus", 
                    x="Species", 
                    box=True, 
                    points="all",
                    color='Species',
                    hover_data=summarised_data.columns,
                    )


    # Update the layout of the plot
    fig.update_layout(
    #title="Plot Title",
    yaxis_title="Modulus (GPa)",
    xaxis_title="Species",
    legend_title="Species",
    font=dict(color="Black",size=20,)
    
    )

    # Update the font of the x and y axes
    fig.update_yaxes(minor=dict(ticklen=6, tickcolor="black", showgrid=True))
    fig.update_yaxes(minor=dict(ticklen=6, tickcolor="black", showgrid=True))

    # Save the plot to a html file called 'modulus_violin_plot.html'
    # fig.write_html("modulus_violin_plot.html")
    #fig.show()

# Generate a violin plot with Modulus values grouped by SpecimenType
if 'Modulus' in summarised_data.columns and 'SpecimenType' in summarised_data.columns:
    # Create the violin plot
    fig = px.violin(summarised_data, 
                    y="Modulus", 
                    x="SpecimenType", 
                    box=True, 
                    points="all",
                    color='SpecimenType',
                    hover_data=summarised_data.columns,
                    )


    # Update the layout of the plot
    fig.update_layout(
    #title="Plot Title",
    yaxis_title="Modulus (GPa)",
    xaxis_title="Silk Type",
    legend_title="Silk Type",
    font=dict(color="Black",size=20,)
    
    )

    # Update the font of the x and y axes
    fig.update_yaxes(minor=dict(ticklen=6, tickcolor="black", showgrid=True))
    fig.update_yaxes(minor=dict(ticklen=6, tickcolor="black", showgrid=True))

    # Save the plot to a html file called 'stress_specimentype_violin_plot.html'
    # fig.write_html("stress_specimentype_violin_plot.html")
    #fig.show()

else:
    print("Required columns 'Modulus' and/or 'SpecimenType' are not in the DataFrame.")

# Generate all the possible violin plots having on the x-axis the SpecimenType and on the y-axis Modulus, Toughness, StressAtBreak, StrainAtBreak
# and save them to separate html files with the corresponding names (e.g. modulus_violin_plot.html, toughness_violin_plot.html, etc.)
#for column in ['Toughness', 'StressAtBreak', 'StrainAtBreak']:
for column in ['StrainAtBreak']:
    if column in summarised_data.columns:
        # Create the violin plot
        fig = px.violin(summarised_data, 
                        y=column, 
                        x="SpecimenType", 
                        box=True, 
                        points="all",
                        color='SpecimenType',
                        hover_data=summarised_data.columns,
                        )


        # Update the layout of the plot
        fig.update_layout(
        #title="Plot Title",
        yaxis_title=f"{column} (MPa)",
        xaxis_title="Silk Type",
        legend_title="Silk Type",
        font=dict(color="Black",size=20,)
        
        )

        # Update the font of the x and y axes
        fig.update_yaxes(minor=dict(ticklen=6, tickcolor="black", showgrid=True))
        fig.update_yaxes(minor=dict(ticklen=6, tickcolor="black", showgrid=True))

        # Save the plot to a html file
        fig.write_html(f"./plots/{column.lower()}_specimentype_violin_plot.html")
        fig.show()

    else:
        print(f"Required column '{column}' is not in the DataFrame.")


statistics = summarised_data.describe().loc[['mean','std']]
#statistics.to_excel("results/Phopha_dl_230424.xlsx")
#print(statistics)