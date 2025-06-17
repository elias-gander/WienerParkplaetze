#!/bin/bash

# Check if the destination directory is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <destination_directory>"
    exit 1
fi

destination="$1"
folder_name="wiener-parkplaetze"  # Set your folder name here
target_path="$destination/$folder_name"

# If the target folder exists, remove it
if [ -d "$target_path" ]; then
    echo "Removing existing folder: $target_path"
    rm -rf "$target_path"
fi

# Create a new target folder
mkdir -p "$target_path"
echo "Created folder: $target_path"

# Define file patterns to include (modify as needed)
file_patterns=(
    "index.html"
    "script.js"
    "styles.css"
    "parkplaetze/*.geojson"
    "assets/explosion.gif"
    "assets/trees/*.png"
    "assets/vehicles/sampled_tiles/*.png"
    "notebook.html"
)

# Build rsync include/exclude parameters
include_args=()
for pattern in "${file_patterns[@]}"; do
    include_args+=("--include=$pattern")
done

# Rsync command: Only include specified files, while preserving folder structure
rsync -av --progress \
    --include='*/' \
    "${include_args[@]}" \
    --exclude='*' \
    --prune-empty-dirs \
    ./ "$target_path/"

echo "Files copied successfully"
