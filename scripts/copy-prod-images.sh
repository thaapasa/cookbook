#!/usr/bin/env bash
# Copies recipe images from production to the local images directory.
# Requires Tailscale, so that the deploy host "pomeranssi" resolves.
set -euo pipefail

cd "$(dirname "$0")/.."

remote='deployer@pomeranssi:data/cookbook/images'
target="${IMAGES_DIR:-data/images}"

mkdir -p "$target"
echo "Copying images from $remote to $target"
scp -r "$remote/." "$target/"
echo "Done: $(find "$target" -type f | wc -l | tr -d ' ') files in $target"
