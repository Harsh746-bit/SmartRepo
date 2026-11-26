"""
CampusConnect 2.0 - Cryptographic Engine & Digital Signature Utilities
Provides RSA-PSS with SHA-256 digital signature operations,
institutional signing of submission receipts, and official PDF certificate generation.
"""

import os
import io
import json
import base64
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from typing import Tuple, Optional, Dict, Any

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding, utils
from cryptography.hazmat.primitives.serialization import (
    load_pem_public_key,
    load_pem_private_key,
    Encoding,
    PublicFormat,
    PrivateFormat,
    NoEncryption
)

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)

# Institutional Keys Directory
KEYS_DIR = Path(os.getenv("KEYS_DIR", Path(__file__).resolve().parent / "keys"))
KEYS_DIR.mkdir(parents=True, exist_ok=True)

INSTITUTIONAL_PRIV_PATH = KEYS_DIR / "institutional_private_key.pem"
INSTITUTIONAL_PUB_PATH = KEYS_DIR / "institutional_public_key.pem"


def get_institutional_keys() -> Tuple[rsa.RSAPrivateKey, rsa.RSAPublicKey]:
    """
    Load or automatically generate the backend institutional RSA key pair (3072-bit).
    Persisted in KEYS_DIR for signing canonical submission receipts.
    """
    if INSTITUTIONAL_PRIV_PATH.exists() and INSTITUTIONAL_PUB_PATH.exists():
        try:
            with open(INSTITUTIONAL_PRIV_PATH, "rb") as f:
                priv = load_pem_private_key(f.read(), password=None)
            with open(INSTITUTIONAL_PUB_PATH, "rb") as f:
                pub = load_pem_public_key(f.read())
            return priv, pub
        except Exception as e:
            print(f"[WARN] Error loading institutional keys: {e}. Regenerating...")

    # Generate new 3072-bit RSA institutional key pair
    priv = rsa.generate_private_key(
        public_exponent=65537,
        key_size=3072
    )
    pub = priv.public_key()

    # Save to disk
    with open(INSTITUTIONAL_PRIV_PATH, "wb") as f:
        f.write(priv.private_bytes(
            encoding=Encoding.PEM,
            format=PrivateFormat.PKCS8,
            encryption_algorithm=NoEncryption()
        ))
    with open(INSTITUTIONAL_PUB_PATH, "wb") as f:
        f.write(pub.public_bytes(
            encoding=Encoding.PEM,
            format=PublicFormat.SubjectPublicKeyInfo
        ))

    return priv, pub


def get_institutional_public_key_pem() -> str:
    """Return institutional public key as PEM string."""
    _, pub = get_institutional_keys()
    return pub.public_bytes(
        encoding=Encoding.PEM,
        format=PublicFormat.SubjectPublicKeyInfo
    ).decode("utf-8")


def calculate_sha256(content: bytes) -> str:
    """Compute 256-bit SHA-256 hash strictly from binary content."""
    return hashlib.sha256(content).hexdigest()


def sign_data_with_institutional_key(canonical_payload: str) -> str:
    """
    Sign canonical receipt data string using the institutional private key.
    Uses RSA-PSS with SHA-256 and salt length = 32.
    Returns base64 encoded signature.
    """
    priv, _ = get_institutional_keys()
    data_bytes = canonical_payload.encode("utf-8")
    sig = priv.sign(
        data_bytes,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=32
        ),
        hashes.SHA256()
    )
    return base64.b64encode(sig).decode("utf-8")


def verify_institutional_signature(canonical_payload: str, signature_b64: str) -> bool:
    """Verify an institutional signature over canonical payload."""
    try:
        _, pub = get_institutional_keys()
        sig = base64.b64decode(signature_b64)
        pub.verify(
            sig,
            canonical_payload.encode("utf-8"),
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.AUTO
            ),
            hashes.SHA256()
        )
        return True
    except Exception:
        return False


def verify_user_signature(
    public_key_pem: str,
    signature_b64: str,
    file_bytes: bytes,
    original_sha256_hex: str
) -> Tuple[bool, str]:
    """
    Cryptographically verify a user's RSA-PSS SHA-256 digital signature.
    Tests across all valid candidate representations:
    1. Pre-calculated SHA-256 hex string bytes: sha256_hex.encode('utf-8')
    2. Raw file content bytes: file_bytes
    3. Raw 32-byte digest: bytes.fromhex(sha256_hex)
    4. Prehashed digest: utils.Prehashed(hashes.SHA256())
    
    Returns (is_valid: bool, reason: str).
    """
    if not public_key_pem or not signature_b64:
        return False, "Missing public key or digital signature"

    try:
        pub = load_pem_public_key(public_key_pem.encode("utf-8") if isinstance(public_key_pem, str) else public_key_pem)
    except Exception as e:
        return False, f"Invalid public key PEM format: {e}"

    try:
        sig_bytes = base64.b64decode(signature_b64)
    except Exception as e:
        return False, f"Invalid base64 signature encoding: {e}"

    hex_bytes = original_sha256_hex.encode("utf-8")
    raw_hash_bytes = None
    try:
        raw_hash_bytes = bytes.fromhex(original_sha256_hex)
    except Exception:
        pass

    # Candidate 1: Signed hex string (Standard Web Crypto signing of hash string)
    try:
        pub.verify(
            sig_bytes,
            hex_bytes,
            padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.AUTO),
            hashes.SHA256()
        )
        return True, "Valid signature (verified against SHA-256 hex digest)"
    except Exception:
        pass

    # Candidate 2: Signed file content directly
    if file_bytes:
        try:
            pub.verify(
                sig_bytes,
                file_bytes,
                padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.AUTO),
                hashes.SHA256()
            )
            return True, "Valid signature (verified against binary file content)"
        except Exception:
            pass

    # Candidate 3: Signed raw 32-byte hash
    if raw_hash_bytes:
        try:
            pub.verify(
                sig_bytes,
                raw_hash_bytes,
                padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.AUTO),
                hashes.SHA256()
            )
            return True, "Valid signature (verified against raw 32-byte SHA-256 digest)"
        except Exception:
            pass

        # Candidate 4: Prehashed digest
        try:
            pub.verify(
                sig_bytes,
                raw_hash_bytes,
                padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.AUTO),
                utils.Prehashed(hashes.SHA256())
            )
            return True, "Valid signature (verified with prehashed digest)"
        except Exception:
            pass

    return False, "Digital signature verification failed. Signature does not match document content or public key."


def generate_key_pair(key_size: int = 3072) -> Tuple[str, str]:
    """Helper to generate an RSA key pair, returning (private_key_pem, public_key_pem)."""
    priv = rsa.generate_private_key(public_exponent=65537, key_size=key_size)
    pub = priv.public_key()
    priv_pem = priv.private_bytes(
        encoding=Encoding.PEM,
        format=PrivateFormat.PKCS8,
        encryption_algorithm=NoEncryption()
    ).decode("utf-8")
    pub_pem = pub.public_bytes(
        encoding=Encoding.PEM,
        format=PublicFormat.SubjectPublicKeyInfo
    ).decode("utf-8")
    return priv_pem, pub_pem


def generate_verification_certificate_pdf(data: Dict[str, Any]) -> bytes:
    """
    Generate an official institutional Certificate of Cryptographic Authenticity & Integrity in PDF format.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "CertTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0a192f"),
        alignment=1  # Center
    )

    subtitle_style = ParagraphStyle(
        "CertSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#2563eb"),
        alignment=1
    )

    institution_style = ParagraphStyle(
        "CertInst",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1e293b"),
        alignment=1
    )

    badge_valid_style = ParagraphStyle(
        "BadgeValid",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#047857"),
        alignment=1
    )

    label_style = ParagraphStyle(
        "TableLabel",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#475569")
    )

    val_style = ParagraphStyle(
        "TableValue",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#0f172a")
    )

    mono_style = ParagraphStyle(
        "TableMono",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0f172a")
    )

    story = []

    # Header section
    story.append(Paragraph("CAMPUSCONNECT ACADEMIC REPOSITORY", institution_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("OFFICIAL CERTIFICATE OF CRYPTOGRAPHIC INTEGRITY", title_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Verified Academic Assignment Submission & RSA Digital Signature Record", subtitle_style))
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#2563eb"), spaceAfter=14))

    # Status Banner
    status = data.get("verification_status", "VALID")
    status_bg = colors.HexColor("#d1fae5") if status == "VALID" else (colors.HexColor("#fee2e2") if status == "TAMPERED" else colors.HexColor("#fef3c7"))
    status_text = "VERIFIED CRYPTOGRAPHIC INTEGRITY — AUTHENTIC SUBMISSION" if status == "VALID" else f"VERIFICATION STATUS: {status}"

    status_table = Table([[Paragraph(f"<b>{status_text}</b>", badge_valid_style)]], colWidths=[540])
    status_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), status_bg),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#10b981") if status == "VALID" else colors.HexColor("#ef4444")),
    ]))
    story.append(status_table)
    story.append(Spacer(1, 14))

    # Core Parameters Table
    submission_id = str(data.get("submission_id", data.get("id", "N/A")))
    student_name = data.get("student_name", "N/A")
    student_email = data.get("student_email", "N/A")
    assignment_title = data.get("assignment_title", data.get("assignment_name", "N/A"))
    subject_info = f"{data.get('subject_name', 'N/A')} ({data.get('subject_code', 'N/A')})"
    original_filename = data.get("original_filename", "N/A")
    submitted_at = data.get("submitted_at", "N/A")
    verified_at = data.get("verified_at", datetime.now(timezone.utc).isoformat())
    sha256_hash = data.get("sha256_hash", "N/A")
    current_hash = data.get("current_hash", sha256_hash)
    public_key_id = data.get("public_key_id", "N/A")
    signature_algo = data.get("signature_algorithm", "RSA-PSS with SHA-256 (3072-bit)")

    param_rows = [
        [Paragraph("Submission ID", label_style), Paragraph(submission_id, mono_style)],
        [Paragraph("Student Name", label_style), Paragraph(f"<b>{student_name}</b> ({student_email})", val_style)],
        [Paragraph("Subject Course", label_style), Paragraph(subject_info, val_style)],
        [Paragraph("Assignment Title", label_style), Paragraph(assignment_title, val_style)],
        [Paragraph("Submitted Document", label_style), Paragraph(original_filename, val_style)],
        [Paragraph("Submission Timestamp", label_style), Paragraph(str(submitted_at), mono_style)],
        [Paragraph("Verification Timestamp", label_style), Paragraph(str(verified_at), mono_style)],
        [Paragraph("Cryptographic Fingerprint (SHA-256)", label_style), Paragraph(f"<b>{sha256_hash}</b>", mono_style)],
        [Paragraph("Current Verified Disk Hash", label_style), Paragraph(f"<b>{current_hash}</b>", mono_style)],
        [Paragraph("Digital Signature Algorithm", label_style), Paragraph(signature_algo, val_style)],
        [Paragraph("Student Public Key ID", label_style), Paragraph(public_key_id, mono_style)],
        [Paragraph("Hash Match Status", label_style), Paragraph("MATCH — File is exactly identical to signed original" if sha256_hash == current_hash else "MISMATCH — Content modification detected", val_style)],
    ]

    param_table = Table(param_rows, colWidths=[180, 360])
    param_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f8fafc")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(param_table)
    story.append(Spacer(1, 14))

    # Institutional Digital Receipt & Signature
    story.append(Paragraph("<b>INSTITUTIONAL NON-REPUDIATION ATTESTATION</b>", ParagraphStyle(
        "AttestHeader", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=10, textColor=colors.HexColor("#0a192f")
    )))
    story.append(Spacer(1, 4))

    receipt_sig = data.get("receipt_signature", "")
    if not receipt_sig:
        canonical_receipt = f"{submission_id}|{student_email}|{assignment_title}|{sha256_hash}|{submitted_at}"
        receipt_sig = sign_data_with_institutional_key(canonical_receipt)

    receipt_rows = [
        [
            Paragraph("Institutional Seal", label_style),
            Paragraph("Authenticated and signed by CampusConnect Institutional Authority", val_style)
        ],
        [
            Paragraph("Institutional RSA Signature", label_style),
            Paragraph(f"<font size=6>{receipt_sig}</font>", mono_style)
        ]
    ]
    receipt_table = Table(receipt_rows, colWidths=[180, 360])
    receipt_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(receipt_table)
    story.append(Spacer(1, 16))

    # Footer notice
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#94a3b8"), spaceAfter=8))
    footer_text = "This digital certificate serves as official proof of submission, student authorship, and cryptographic tamper-evidence in accordance with the CampusConnect 2.0 Security Framework."
    story.append(Paragraph(footer_text, ParagraphStyle(
        "CertFooter", parent=styles["Normal"], fontName="Helvetica-Oblique", fontSize=8, leading=10, textColor=colors.HexColor("#64748b"), alignment=1
    )))

    doc.build(story)
    return buf.getvalue()
