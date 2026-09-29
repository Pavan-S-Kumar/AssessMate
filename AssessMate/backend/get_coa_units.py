from rag import get_collection
collection = get_collection("assessmate_knowledge")
data = collection.get(where={"course": "Computer Organization and Architecture"})
units = set()
for meta in data['metadatas']:
    units.add((meta['unit'], meta['topic']))
    
for u, t in sorted(list(units)):
    print(f"{u}: {t}")
