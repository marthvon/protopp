#!/bin/bash
cd "$(dirname "$0")"
mkdir -p min
node scripts/build.js
