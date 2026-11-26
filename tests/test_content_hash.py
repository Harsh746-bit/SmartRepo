import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
import re
import hashlib
import extractor

def compute_content_fingerprints(content: bytes, filename: str):
    # 1. Binary SHA-256
    binary_hash = hashlib.sha256(content).hexdigest()

    # 2. Extract readable text
    text = extractor.extract_text_from_file(content, filename)
    
    # 3. Normalized text (remove punctuation, whitespace, lowercased)
    norm_text = re.sub(r'[^a-zA-Z0-9]+', '', text.lower()) if text else ""
    
    # If substantial text exists (>= 30 alphanumeric characters), hash the normalized text
    content_hash = hashlib.sha256(norm_text.encode('utf-8')).hexdigest() if len(norm_text) >= 30 else binary_hash

    return {
        "binary_hash": binary_hash,
        "text": text,
        "norm_text": norm_text,
        "content_hash": content_hash
    }

if __name__ == "__main__":
    t1 = "Computer Graphics Lab 2. Implement 3D rotating cube using OpenGL."
    t2 = "Computer Graphics Lab 2. Implement 3D rotating cube using OpenGL."
    
    # Simulate docx with different authors
    import io, zipfile
    def make_docx(text, author):
        b = io.BytesIO()
        with zipfile.ZipFile(b, 'w') as z:
            z.writestr('word/document.xml', f'<w:document><w:body><w:p><w:t>{text}</w:t></w:p></w:body></w:document>')
            z.writestr('docProps/core.xml', f'<coreProperties><dc:creator>{author}</dc:creator></coreProperties>')
        return b.getvalue()

    f1 = make_docx(t1, "Parth")
    f2 = make_docx(t2, "Harsh")

    res1 = compute_content_fingerprints(f1, "Parth gathadi.docx")
    res2 = compute_content_fingerprints(f2, "Harsh Bhanarkar.docx")

    print("Binary Hash 1:", res1["binary_hash"][:16])
    print("Binary Hash 2:", res2["binary_hash"][:16])
    print("Binary Hashes Match?", res1["binary_hash"] == res2["binary_hash"])
    print("Content Hash 1:", res1["content_hash"][:16])
    print("Content Hash 2:", res2["content_hash"][:16])
    print("Content Hashes Match?", res1["content_hash"] == res2["content_hash"])
