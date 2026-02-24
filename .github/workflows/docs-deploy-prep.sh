#!/bin/bash

directory_path="./workflow-cli/configuration-opensearch/state_management_policy"

# Loop over each file in the directory
find "$directory_path" -type f -name "*.json" -print0 | while IFS= read -r -d $'\0' file; do
  # Use jq to process the JSON data in the file
  jq '.policy.description' > ./docs/commonschema.md
done