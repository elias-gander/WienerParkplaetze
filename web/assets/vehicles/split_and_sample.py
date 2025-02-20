from PIL import Image
import os
import random

# Define tile dimensions and scaling
TILE_WIDTH = 64
TILE_HEIGHT = 64
SCALED_WIDTH = 256
SCALED_HEIGHT = 256
ROWS = 12
COLS = 16

# Define the rotation angles for each column
ROTATIONS = [315, 337.5, 0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5]

# Get all PNG images in the current directory
image_files = [f for f in os.listdir('.') if f.endswith('.png')]

# Process each image
for image_file in image_files:
    # Load the image
    img = Image.open(image_file)
    img_width, img_height = img.size

    # Create an output directory named after the image (without extension)
    output_directory = os.path.join('all_tiles', os.path.splitext(image_file)[0])
    os.makedirs(output_directory, exist_ok=True)

    # Iterate over the tiles
    for row in range(ROWS):
        for col in range(COLS):
            # Calculate the tile position
            left = col * TILE_WIDTH
            top = row * TILE_HEIGHT
            right = left + TILE_WIDTH
            bottom = top + TILE_HEIGHT
            
            # Crop the tile from the image
            tile = img.crop((left, top, right, bottom))

            # Scale the tile to 128x128 without interpolation (using NEAREST)
            scaled_tile = tile.resize((SCALED_WIDTH, SCALED_HEIGHT), Image.NEAREST)

            # Get the rotation degree for the current column
            rotation_degree = ROTATIONS[col]
            rounded_rotation = round(rotation_degree)

            # Create the filename
            filename = f"vehicle{row + 1}_{rounded_rotation}.png"
            
            # Save the scaled tile image
            scaled_tile.save(os.path.join(output_directory, filename))

print("All images have been processed and saved successfully.")

# Sampling images from the folder structure
output_base = 'all_tiles'
sampled_output = 'sampled_tiles'
os.makedirs(sampled_output, exist_ok=True)

# Collect all available vehicle models
vehicle_models = [d for d in os.listdir(output_base) if os.path.isdir(os.path.join(output_base, d))]

# Ensure sampling process
for vehicle_num in range(5):
    for i, rotation in enumerate(ROTATIONS):
        rounded_rotation = round(rotation)
        chosen_model = random.choice(vehicle_models)
        model_path = os.path.join(output_base, chosen_model)
        
        available_files = [f for f in os.listdir(model_path) if f.endswith(f'_{rounded_rotation}.png')]
        if available_files:
            chosen_file = random.choice(available_files)
            src_path = os.path.join(model_path, chosen_file)
            dst_path = os.path.join(sampled_output, f'vehicle{vehicle_num}_{rounded_rotation}.png')
            Image.open(src_path).save(dst_path)

print("Sampled images have been saved successfully.")
