import os

root_dir = "d:/disc_E/vscode_pyhton/python/MOBILE-LLM/2025-l3t1/trunk/L3T1"

suspicious = []
for root, _, filenames in os.walk(root_dir):
    if '.svn' in root or '.git' in root: continue
    for f in filenames:
        if f.endswith('.mine') or '.r' in f[-4:] or f.endswith('.orig') or 'conflict' in f.lower():
            suspicious.append(os.path.join(root, f))

print(f"Suspicious files in {root_dir}:")
for f in suspicious:
    print(f)
