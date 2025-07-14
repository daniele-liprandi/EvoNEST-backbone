#!/bin/bash

# Path to the directory containing JSON files
json_dir="import/jsonready"

# Iterate over all JSON files in the specified directory
for file in "$json_dir"/*.json; do
    # Use the filename (without extension) as the collection name
    collection=$(basename "$file" .json)

    # Run mongoimport for each file
    mongoimport --db "evonest" --collection "$collection" --file "$file" --jsonArray -u "root" -p "pass"  --authenticationDatabase=admin
done 
