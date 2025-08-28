#!/usr/bin/env python3
"""
Thingi10K Metadata Extraction Script
====================================

This script extracts metadata from the Thingi10K dataset to create a searchable
mapping from numeric file IDs (e.g., 36082.stl) to human-readable names and tags.

Usage:
    python3 extract_thingi10k_metadata.py

Output:
    - thingi10k_metadata.json: Complete mapping with names/tags
    - search_index.json: Optimized search index for the web app
"""

import json
import os
import sys
from pathlib import Path

def install_thingi10k():
    """Install the thingi10k package if not available."""
    try:
        import thingi10k
        return True
    except ImportError:
        print("📦 Installing thingi10k package...")
        import subprocess
        result = subprocess.run([sys.executable, "-m", "pip", "install", "thingi10k"], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ thingi10k package installed successfully")
            return True
        else:
            print(f"❌ Failed to install thingi10k: {result.stderr}")
            return False

def extract_metadata(dataset_path):
    """Extract metadata from Thingi10K dataset."""
    
    # Install package if needed
    if not install_thingi10k():
        return False
    
    import thingi10k
    
    print("🔍 Initializing Thingi10K dataset (downloading metadata if needed)...")
    
    # Initialize thingi10k (downloads only metadata, not full meshes)
    try:
        thingi10k.init()  # This downloads only npz + metadata (~few GB)
        print("✅ Thingi10K metadata initialized")
    except Exception as e:
        print(f"❌ Failed to initialize thingi10k: {e}")
        return False
    
    print("📋 Building metadata mapping...")
    
    # Build mapping from file_id.stl -> metadata
    metadata_mapping = {}
    search_index = []
    
    # Check which files actually exist in the user's dataset
    raw_meshes_path = Path(dataset_path) / "raw_meshes"
    if not raw_meshes_path.exists():
        print(f"❌ Dataset path not found: {raw_meshes_path}")
        return False
    
    existing_files = set()
    for file_path in raw_meshes_path.glob("*.stl"):
        existing_files.add(file_path.stem)  # Get filename without extension
    for file_path in raw_meshes_path.glob("*.obj"):
        existing_files.add(file_path.stem)
    
    print(f"📁 Found {len(existing_files)} model files in dataset")
    
    # Extract metadata for each entry
    processed_count = 0
    for entry in thingi10k.dataset():
        file_id = str(entry['file_id'])
        
        # Only include files that actually exist in the user's dataset
        if file_id not in existing_files:
            continue
            
        name = entry.get("name", "").strip()
        tags = entry.get("tags", [])
        
        # Skip entries without meaningful names
        if not name or name.lower() in ['untitled', 'thing', '']:
            continue
            
        # Create metadata entry
        stl_filename = f"{file_id}.stl"
        obj_filename = f"{file_id}.obj"
        
        # Check which file format exists
        file_format = None
        if (raw_meshes_path / stl_filename).exists():
            file_format = "stl"
            actual_filename = stl_filename
        elif (raw_meshes_path / obj_filename).exists():
            file_format = "obj"
            actual_filename = obj_filename
        else:
            continue
            
        metadata_entry = {
            "name": name,
            "tags": tags if isinstance(tags, list) else [],
            "file_id": file_id,
            "filename": actual_filename,
            "format": file_format,
            "path": str(raw_meshes_path / actual_filename)
        }
        
        metadata_mapping[actual_filename] = metadata_entry
        
        # Add to search index with searchable text
        search_text = f"{name} {' '.join(tags)}".lower()
        search_index.append({
            "id": file_id,
            "name": name,
            "tags": tags,
            "filename": actual_filename,
            "format": file_format,
            "searchText": search_text,
            "path": str(raw_meshes_path / actual_filename)
        })
        
        processed_count += 1
        if processed_count % 100 == 0:
            print(f"📊 Processed {processed_count} entries...")
    
    print(f"✅ Processed {processed_count} models with metadata")
    
    # Save complete metadata mapping
    metadata_file = "thingi10k_metadata.json"
    with open(metadata_file, "w") as f:
        json.dump(metadata_mapping, f, indent=2)
    print(f"💾 Saved complete metadata to {metadata_file}")
    
    # Save optimized search index
    search_file = "search_index.json"
    with open(search_file, "w") as f:
        json.dump(search_index, f, indent=2)
    print(f"🔍 Saved search index to {search_file}")
    
    # Print some sample entries
    print("\n📋 Sample metadata entries:")
    for i, entry in enumerate(search_index[:5]):
        print(f"  {i+1}. {entry['name']} (ID: {entry['id']}) - Tags: {entry['tags'][:3]}")
    
    return True

def main():
    """Main execution function."""
    dataset_path = "/Volumes/Untitled/Thingi10K"
    
    print("🚀 Thingi10K Metadata Extraction Script")
    print("=" * 50)
    print(f"📂 Dataset path: {dataset_path}")
    
    if not os.path.exists(dataset_path):
        print(f"❌ Dataset path not found: {dataset_path}")
        print("Please ensure the Thingi10K dataset is mounted and accessible.")
        return 1
    
    if extract_metadata(dataset_path):
        print("\n✅ Metadata extraction completed successfully!")
        print("📝 Files created:")
        print("   • thingi10k_metadata.json - Complete metadata mapping")
        print("   • search_index.json - Optimized search index for web app")
        return 0
    else:
        print("\n❌ Metadata extraction failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())
