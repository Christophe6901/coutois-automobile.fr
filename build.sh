#!/bin/bash
# Build script for Netlify
# Aggregates individual vehicle JSON files from data/vehicles/ into data/vehicles.json

echo "🔧 Building vehicles.json from individual files..."

VEHICLES_DIR="data/vehicles"
OUTPUT_FILE="data/vehicles.json"

# Check if directory exists and has files
if [ -d "$VEHICLES_DIR" ] && [ "$(ls -A $VEHICLES_DIR/*.json 2>/dev/null)" ]; then
  # Combine all JSON files into an array
  echo "[" > "$OUTPUT_FILE"
  FIRST=true
  for f in "$VEHICLES_DIR"/*.json; do
    if [ "$FIRST" = true ]; then
      FIRST=false
    else
      echo "," >> "$OUTPUT_FILE"
    fi
    cat "$f" >> "$OUTPUT_FILE"
  done
  echo "]" >> "$OUTPUT_FILE"
  
  COUNT=$(ls -1 "$VEHICLES_DIR"/*.json 2>/dev/null | wc -l)
  echo "✅ $COUNT véhicule(s) agrégé(s) dans $OUTPUT_FILE"
else
  echo "⚠️ Aucun véhicule trouvé dans $VEHICLES_DIR, création d'un fichier vide"
  echo "[]" > "$OUTPUT_FILE"
fi

echo "🚀 Build terminé"
