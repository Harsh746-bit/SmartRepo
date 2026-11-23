import io
import re
import zipfile
from pathlib import Path
from typing import List, Set

SYNONYM_MAP = {
    "machine learning": ["ml", "ml algorithms", "machine learning", "deep learning", "neural networks", "ai"],
    "ml": ["machine learning", "ml algorithms", "deep learning", "neural networks", "ai"],
    "ai": ["artificial intelligence", "machine learning", "ml", "deep learning"],
    "artificial intelligence": ["ai", "machine learning", "ml", "deep learning"],
    "deep learning": ["dl", "neural networks", "deep learning", "machine learning", "ml"],
    "data structures": ["dsa", "data structures", "algorithms", "trees", "graphs", "arrays"],
    "dsa": ["data structures", "algorithms", "dsa", "trees", "graphs"],
    "algorithms": ["algo", "algorithms", "dsa", "sorting", "searching"],
    "database": ["dbms", "database", "sql", "nosql", "mongodb", "rdbms"],
    "dbms": ["database", "dbms", "sql", "nosql", "queries"],
    "operating system": ["os", "operating system", "kernel", "linux", "unix", "process"],
    "os": ["operating system", "os", "kernel", "linux"],
    "computer networks": ["cn", "computer networks", "networking", "tcp", "ip", "osi"],
    "cn": ["computer networks", "networking", "tcp", "ip", "protocols"],
    "software engineering": ["se", "software engineering", "sdlc", "agile", "scrum"],
    "se": ["software engineering", "se", "agile", "sdlc"],
    "cloud": ["cloud computing", "aws", "azure", "devops", "docker"],
    "web": ["web development", "fullstack", "react", "javascript", "html", "css", "api"],
    "cybersecurity": ["security", "cybersecurity", "encryption", "cryptography", "infosec"],
}


def extract_text_from_file(content: bytes, filename: str) -> str:
    """Extract readable text from PDF, DOCX, PPTX, TXT, and CSV files."""
    ext = Path(filename).suffix.lower()
    text = ""

    try:
        if ext == ".pdf":
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(content))
            pages_text = []
            for i, page in enumerate(reader.pages):
                page_content = page.extract_text() or ""
                if page_content.strip():
                    pages_text.append(f"--- Page {i+1} ---\n{page_content}")
            text = "\n".join(pages_text)

        elif ext == ".docx":
            with zipfile.ZipFile(io.BytesIO(content)) as z:
                if "word/document.xml" in z.namelist():
                    xml = z.read("word/document.xml").decode("utf-8", errors="ignore")
                    matches = re.findall(r"<w:t[^>]*>(.*?)</w:t>", xml)
                    text = " ".join(matches)

        elif ext == ".pptx":
            with zipfile.ZipFile(io.BytesIO(content)) as z:
                slides_text = []
                for name in sorted(z.namelist()):
                    if name.startswith("ppt/slides/slide") and name.endswith(".xml"):
                        xml = z.read(name).decode("utf-8", errors="ignore")
                        matches = re.findall(r"<a:t[^>]*>(.*?)</a:t>", xml)
                        if matches:
                            slides_text.append(" ".join(matches))
                text = "\n".join(slides_text)

        elif ext in [".txt", ".csv", ".json", ".md"]:
            try:
                text = content.decode("utf-8")
            except UnicodeDecodeError:
                text = content.decode("latin-1", errors="ignore")

        elif ext in [".jpg", ".jpeg", ".png"]:
            text = f"Image file: {filename}"

    except Exception as e:
        print(f"[WARN] Error extracting text from {filename}: {e}")
        text = ""

    # Clean whitespace
    text = re.sub(r"\s+", " ", text).strip()
    # Cap stored text length to 120,000 chars for database efficiency
    return text[:120000]


def extract_keywords(text: str, filename: str) -> List[str]:
    """Generate search keywords from filename and extracted text."""
    words = re.findall(r"[a-zA-Z]{3,}", f"{filename} {text[:3000]}".lower())
    common_stopwords = {
        "the", "and", "for", "with", "that", "this", "from", "have", "are", "was",
        "were", "will", "would", "can", "could", "should", "your", "page", "file"
    }
    filtered = [w for w in words if w not in common_stopwords]
    # Unique top keywords
    seen = set()
    keywords = []
    for w in filtered:
        if w not in seen:
            seen.add(w)
            keywords.append(w)
            if len(keywords) >= 40:
                break
    return keywords


def expand_search_terms(query: str) -> Set[str]:
    """Expand user search query with synonyms, acronyms, and related variants."""
    q_clean = query.strip().lower()
    terms = {q_clean}

    # Add individual words
    words = [w for w in re.findall(r"[a-zA-Z0-9]+", q_clean) if len(w) > 1]
    terms.update(words)

    # Check phrase in synonyms
    for phrase, variants in SYNONYM_MAP.items():
        if phrase in q_clean or q_clean in phrase:
            terms.update(variants)
        for w in words:
            if w == phrase or w in variants:
                terms.update(variants)
                terms.add(phrase)

    return terms


def score_document_match(doc: dict, query_terms: Set[str], raw_query: str) -> int:
    """Calculate relevance score for sorting search results."""
    score = 0
    raw_lower = raw_query.lower()
    filename_lower = doc.get("original_filename", "").lower()
    author_lower = f"{doc.get('uploaded_by_name', '')} {doc.get('uploaded_by_email', '')}".lower()
    category_lower = doc.get("category", "").lower()
    content_lower = doc.get("extracted_text", "").lower()
    keywords = [k.lower() for k in doc.get("keywords", [])]

    # Exact raw query matches
    if raw_lower in filename_lower:
        score += 120
    if raw_lower in author_lower:
        score += 80
    if raw_lower in category_lower:
        score += 60
    if raw_lower in content_lower:
        score += 50

    # Term matches
    for term in query_terms:
        if not term:
            continue
        if term in filename_lower:
            score += 40
        if term in author_lower:
            score += 30
        if term in keywords:
            score += 25
        if term in category_lower:
            score += 20
        if term in content_lower:
            score += 15

    return score
