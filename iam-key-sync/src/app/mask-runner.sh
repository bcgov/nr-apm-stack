#!/usr/bin/env bash

set -euo pipefail

MASKED="****"
SECRETS=()  # Make sure this is defined

# Function to apply masking to a line
mask_line() {
  local line="$1"
  if ((${#SECRETS[@]})); then
    for secret in "${SECRETS[@]}"; do
      # Escape sed characters
      esc_secret=$(printf '%s\n' "$secret" | sed -e 's/[]\/$*.^[]/\\&/g')
      line=$(echo "$line" | sed "s/${esc_secret}/${MASKED}/g")
    done
  fi
  echo "$line"
}

# Read and process lines from the input stream
process_stream() {
  while IFS= read -r line; do
    if [[ "$line" == ::add-mask::* ]]; then
      secret="${line#::add-mask::}"
      SECRETS+=("$secret")
      continue
    fi
    mask_line "$line"
  done
}

# Run the given command and filter both stdout and stderr
run_and_mask() {
  "$@" 2>&1 | process_stream
}

# Entry point
if [[ "$#" -lt 1 ]]; then
  echo "Usage: $0 <command> [args...]"
  exit 1
fi

run_and_mask "$@"
