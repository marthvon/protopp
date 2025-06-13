#!/bin/bash

if ! command -v terser &> /dev/null; then
  echo "Error: 'terser' is not installed. Run 'npm install -g terser'"
  exit 1
fi

cp -r src/* min

find "min" -type f -name "*.js" | while read -r file; do
  echo "Minifying $file"
  terser "$file" \
    --compress \
    --mangle \
    --ecma 2020 \
    --output "$file.tmp" \
    && mv "$file.tmp" "$file"
done

echo "✅ All .js files minified in min"
