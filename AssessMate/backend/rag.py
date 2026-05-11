import os
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
import PyPDF2

load_dotenv()

# Initialize Embedding Model
# We use bge-small as requested for fast and accurate embeddings
embedder = SentenceTransformer('BAAI/bge-small-en-v1.5')

# Initialize ChromaDB Client using the provided credentials
chroma_client = chromadb.HttpClient(
    host=os.getenv("CHROMA_HOST", "api.trychroma.com"),
    ssl=True,
    headers={
        "x-chroma-token": os.getenv("CHROMA_API_KEY", "")
    },
    tenant=os.getenv("CHROMA_TENANT", "default_tenant"),
    database=os.getenv("CHROMA_DATABASE", "default_database")
)

# A wrapper to use SentenceTransformers with ChromaDB
class BGEEmbeddingFunction(chromadb.EmbeddingFunction):
    def __call__(self, input: chromadb.Documents) -> chromadb.Embeddings:
        embeddings = embedder.encode(input).tolist()
        return embeddings

bge_ef = BGEEmbeddingFunction()

def get_collection(name: str):
    """Get or create a ChromaDB collection"""
    return chroma_client.get_or_create_collection(name=name, embedding_function=bge_ef)

def process_and_store_document(file_path: str, class_level: str, subject: str, chapter: str, board: str = "CBSE"):
    """
    Reads a document from the Resources folder, chunks it by heading,
    and stores it in ChromaDB.
    """
    if not os.path.exists(file_path):
        return False
    
    content = ""
    if file_path.lower().endswith(".pdf"):
        try:
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        content += text + "\n\n"
        except Exception as e:
            print(f"Error reading PDF {file_path}: {e}")
            return False
    else:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
    
    # Simple double-newline chunking as proxy for heading-based chunking
    # For a production app, we would use Langchain's MarkdownHeaderTextSplitter
    chunks = [c.strip() for c in content.split("\n\n") if len(c.strip()) > 50]
    
    collection = get_collection("assessmate_knowledge")
    
    documents = []
    metadatas = []
    ids = []
    
    for i, chunk in enumerate(chunks):
        documents.append(chunk)
        metadatas.append({
            "board": board,
            "class": class_level,
            "subject": subject,
            "chapter": chapter
        })
        ids.append(f"{board}_{class_level}_{subject}_{chapter}_{i}")
        
    if documents:
        collection.upsert(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
    return True

def search_knowledge(query: str, class_level: str = "", subject: str = "", chapter: str = "", n_results: int = 5):
    """Retrieves relevant chunks from ChromaDB."""
    collection = get_collection("assessmate_knowledge")
    
    where_clause = {}
    if class_level:
        where_clause = {"class": {"$eq": class_level}}
        
    query_params = {
        "query_texts": [query],
        "n_results": n_results
    }
    
    if where_clause:
        query_params["where"] = where_clause
        
    results = collection.query(**query_params)
    
    if not results['documents']:
        return []
    return results['documents'][0]
