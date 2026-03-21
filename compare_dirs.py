import os

dir1 = "d:/disc_E/vscode_pyhton/python/MOBILE-LLM/2025-l3t1/trunk/L3T1"
dir2 = "d:/disc_E/vscode_pyhton/python/MOBILE-LLM/2025-l3t1/branches/hammouche_anis/L3T1"

print(f"Comparing:")
print(f"Trunk: {dir1}")
print(f"Branch: {dir2}")

if not os.path.exists(dir1): print(f"ERROR: Trunk not found")
if not os.path.exists(dir2): print(f"ERROR: Branch not found")

def get_files(d):
    files = {}
    if not os.path.exists(d): return files
    for root, _, filenames in os.walk(d):
        if '.svn' in root or '.git' in root or 'node_modules' in root: continue
        for f in filenames:
            rel = os.path.relpath(os.path.join(root, f), d)
            # Normalize path separators
            rel = rel.replace('\\', '/')
            path = os.path.join(root, f)
            files[rel] = os.path.getmtime(path)
    return files

f1 = get_files(dir1)
f2 = get_files(dir2)

print(f"Trunk files: {len(f1)}")
print(f"Branch files: {len(f2)}")

common = set(f1.keys()) & set(f2.keys())
newer_in_branch = []
newer_in_trunk = []

for f in common:
    t1 = f1[f]
    t2 = f2[f]
    if t2 > t1 + 2: # Branch is newer (2s buffer)
        newer_in_branch.append(f)
    elif t1 > t2 + 2:
        newer_in_trunk.append(f)

print(f"Found {len(newer_in_branch)} files newer in Branch.")
for f in newer_in_branch:
    print(f"BRANCH NEWER: {f}")

print(f"Found {len(newer_in_trunk)} files newer in Trunk.")
for f in newer_in_trunk:
    print(f"TRUNK NEWER: {f}")

unique_branch = set(f2.keys()) - set(f1.keys())
print(f"Found {len(unique_branch)} unique files in Branch.")
# for f in unique_branch: print(f"UNIQUE BRANCH: {f}")

unique_trunk = set(f1.keys()) - set(f2.keys())
print(f"Found {len(unique_trunk)} unique files in Trunk.")
# for f in unique_trunk: print(f"UNIQUE TRUNK: {f}")
