#!/bin/bash
# Create minimal PNG files for icons

# Base64 of a minimal blue 1x1 PNG
BLUE_PNG="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

for size in 16 48 128; do
    echo "$BLUE_PNG" | base64 -d > "icon${size}.png"
done

echo "Created icon files"
