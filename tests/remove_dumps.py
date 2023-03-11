import os

files = os.listdir("./")
for file in files:
    if file.startswith("dump_worker") and file.endswith(".json"):
        os.remove("./" + file)

