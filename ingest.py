import os
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore

# Verify environmental properties are present
def verify_config():
    keys = ["OPENAI_API_KEY", "PINECONE_API_KEY", "PINECONE_INDEX_NAME"]
    for key in keys:
        if not os.environ.get(key):
            raise ValueError(f"Missing configuration variable: {key}")

def upload_course_material(file_path: str, domain_namespace: str):
    """
    Parses a training document and pushes embedded chunks to a Pinecone namespace.
    :param file_path: Path to the PDF or TXT file on your local machine.
    :param domain_namespace: Target namespace ('cloud-infrastructure' or 'project-management').
    """
    verify_config()
    print(f"📦 Starting extraction for: {file_path}...")

    # 1. Parse document text content based on file extension
    if file_path.lower().endswith('.pdf'):
        loader = PyPDFLoader(file_path)
    else:
        loader = TextLoader(file_path)
    raw_documents = loader.load()

    # 2. Slice texts into semantic chunks with overlapping context safety windows
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150,
        length_function=len
    )
    processed_chunks = text_splitter.split_documents(raw_documents)
    print(f"✂️ Sliced document into {len(processed_chunks)} semantic training fragments.")

    # 3. Initialize embeddings module
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    index_name = os.environ.get("PINECONE_INDEX_NAME")

    # 4. Stream chunks directly up to your isolated Pinecone cluster namespace
    print(f"🚀 Vectorizing and streaming chunks to Pinecone namespace: '{domain_namespace}'...")
    PineconeVectorStore.from_documents(
        documents=processed_chunks,
        embedding=embeddings,
        index_name=index_name,
        namespace=domain_namespace
    )
    print("✅ Ingestion successfully completed!")

if __name__ == "__main__":
    # Example execution configuration usage:
    # Run these in your terminal environment with your keys set
    os.environ["OPENAI_API_KEY"] = "your-openai-key"
    os.environ["PINECONE_API_KEY"] = "your-pinecone-key"
    os.environ["PINECONE_INDEX_NAME"] = "luqi-ai-index"

    # Upload cloud architecture training content
    # upload_course_material("aws_solutions_architect_guide.pdf", "cloud-infrastructure")
    
    # Upload Project Management content
    # upload_course_material("pmp_exam_prep_syllabus.txt", "project-management")
    pass
