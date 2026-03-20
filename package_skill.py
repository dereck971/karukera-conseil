#!/usr/bin/env python3
"""Package masse-batiment-3d skill into .skill file"""
import zipfile
import os

skill_dir = os.path.join(os.path.dirname(__file__), "masse-batiment-3d")
output_path = os.path.join(os.path.dirname(__file__), "masse-batiment-3d.skill")

with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(skill_dir):
        for f in files:
            filepath = os.path.join(root, f)
            arcname = os.path.relpath(filepath, os.path.dirname(skill_dir))
            zf.write(filepath, arcname)

print(f"Packaged: {output_path}")
print(f"Files included:")
with zipfile.ZipFile(output_path, 'r') as zf:
    for info in zf.infolist():
        print(f"  {info.filename} ({info.file_size} bytes)")
