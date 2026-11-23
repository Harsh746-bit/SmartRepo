import os
import re
import secrets
import hashlib
import uuid
import calendar
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Optional, List

import jwt
from bson import ObjectId
from fastapi import (
    FastAPI, Depends, UploadFile, File, Form, HTTPException, Query, status, Request
)
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

import mongo
import extractor

app = FastAPI(
    title="Smart Repository Management System",
    description="Campus Academic Document Cloud with MongoDB Atlas",
    version="3.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def clean_path_middleware(request: Request, call_next):
    # Normalize duplicate consecutive slashes in request paths (e.g. //auth/login -> /auth/login)
    path = request.scope.get("path", "")
    if "//" in path:
        request.scope["path"] = re.sub(r"/+", "/", path)
    return await call_next(request)

# Upload directory on local filesystem or mounted persistent volume
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", Path(__file__).resolve().parent / "uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB

ALLOWED_EXTENSIONS = {
    ".pdf", ".docx", ".doc",
    ".pptx", ".ppt", ".txt",
    ".xlsx", ".xls", ".csv",
    ".jpg", ".jpeg", ".png"
}

CATEGORY_MAP = {
    ".pdf": "Documents",
    ".docx": "Documents",
    ".doc": "Documents",
    ".pptx": "Presentations",
    ".ppt": "Presentations",
    ".xlsx": "Spreadsheets",
    ".xls": "Spreadsheets",
    ".csv": "Spreadsheets",
    ".txt": "Notes",
    ".jpg": "Images",
    ".jpeg": "Images",
    ".png": "Images"
}


# Password hashing using PBKDF2
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        600000
    ).hex()
    return f"{salt}${password_hash}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        if not stored_hash or "$" not in stored_hash:
            return False
        salt, original_hash = stored_hash.split("$", 1)
        new_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            600000
        ).hex()
        return secrets.compare_digest(new_hash, original_hash)
    except Exception:
        return False


# JWT configuration
SECRET_KEY = os.getenv("SMARTREPO_SECRET_KEY", "smartrepo-mongodb-jwt-secret-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


def create_access_token(user_data: dict) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_data["email"],
        "id": str(user_data.get("_id") or user_data.get("id")),
        "role": user_data.get("role", "Student"),
        "name": user_data.get("full_name", ""),
        "exp": expire
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def format_file_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"


# Activity Logger Helper
def log_activity(
    action: str,
    user_email: str,
    user_name: str,
    user_role: str,
    document_id: str = "",
    document_name: str = "",
    details: str = ""
):
    db = mongo.get_mongo_db()
    if db is None:
        return
    try:
        db.activity_logs.insert_one({
            "action": action,
            "document_id": str(document_id),
            "document_name": document_name,
            "user_email": (user_email or "system@smartrepo.edu").strip().lower(),
            "user_name": (user_name or "System").strip(),
            "user_role": (user_role or "System").strip(),
            "details": details,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    except Exception as e:
        print("[WARN] Error logging activity:", e)


# Initialize Root Admin in MongoDB Atlas
def seed_default_accounts():
    db = mongo.get_mongo_db()
    if db is None:
        return

    # Seed Admin ONLY (Required for initial administrative control)
    admin = db.users.find_one({"email": "admin@smartrepo.edu"})
    if not admin:
        db.users.insert_one({
            "full_name": "System Administrator",
            "email": "admin@smartrepo.edu",
            "password_hash": hash_password("admin123"),
            "role": "Admin",
            "status": "Active",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        print("[INFO] Seeded root Admin in MongoDB Atlas: admin@smartrepo.edu / admin123")
    else:
        db.users.update_one(
            {"email": "admin@smartrepo.edu"},
            {"$set": {"role": "Admin", "status": "Active", "password_hash": hash_password("admin123")}}
        )

    # Clean up any legacy dummy teacher/student accounts so the database starts clean
    try:
        db.users.delete_many({"email": {"$in": ["teacher@smartrepo.edu", "student@smartrepo.edu"]}})
        db.documents.delete_many({"uploaded_by_email": {"$in": ["teacher@smartrepo.edu", "student@smartrepo.edu"]}})
    except Exception as e:
        print("[WARN] Error cleaning legacy dummy accounts:", e)


seed_default_accounts()


# =========================================================================
# General Endpoints
# =========================================================================

@app.get("/")
def home():
    return {
        "message": "Smart Repository Management System API (MongoDB Atlas)",
        "version": "3.0.0",
        "database": "MongoDB Atlas"
    }


@app.get("/health")
def health_check():
    db = mongo.get_mongo_db()
    db_status = "Connected" if db is not None else "Disconnected"
    return {
        "status": "OK",
        "database": db_status,
        "database_type": "MongoDB Atlas",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# =========================================================================
# Authentication Endpoints
# =========================================================================

@app.post("/auth/register")
def register_user(user_data: dict):
    db = mongo.get_mongo_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    full_name = str(user_data.get("full_name", "")).strip()
    email = str(user_data.get("email", "")).strip().lower()
    password = str(user_data.get("password", ""))
    role_input = str(user_data.get("role", "Student")).strip()

    role_map = {"student": "Student", "teacher": "Teacher", "faculty": "Teacher", "admin": "Admin"}
    role = role_map.get(role_input.lower(), "Student")

    if not full_name or len(full_name) > 150:
        raise HTTPException(status_code=400, detail="Please enter a valid full name.")

    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    if len(password) < 4:
        raise HTTPException(status_code=400, detail="Password must contain at least 4 characters.")

    if role == "Admin":
        raise HTTPException(
            status_code=403,
            detail="Admin accounts cannot be self-registered. Please sign in with existing admin credentials."
        )

    # Check whether email already exists
    if db.users.find_one({"email": email}):
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists. Please sign in instead."
        )

    new_user_doc = {
        "full_name": full_name,
        "email": email,
        "password_hash": hash_password(password),
        "role": role,
        "status": "Active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    result = db.users.insert_one(new_user_doc)
    new_user_doc["_id"] = result.inserted_id

    token = create_access_token(new_user_doc)

    log_activity(
        action="USER_REGISTER",
        user_email=email,
        user_name=full_name,
        user_role=role,
        details=f"New {role} account registered"
    )

    return {
        "message": f"Welcome to CampusConnect, {full_name}!",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(result.inserted_id),
            "full_name": full_name,
            "email": email,
            "role": role,
            "status": "Active"
        }
    }


@app.post("/auth/login")
def login(user_data: dict):
    db = mongo.get_mongo_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    email = str(user_data.get("email", "")).strip().lower()
    password = str(user_data.get("password", ""))
    role_input = str(user_data.get("role", "Student")).strip()
    full_name_input = str(user_data.get("full_name", "")).strip()

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    role_map = {"student": "Student", "teacher": "Teacher", "faculty": "Teacher", "admin": "Admin"}
    target_role = role_map.get(role_input.lower(), "Student")

    user = db.users.find_one({"email": email})

    if user:
        # Existing account: verify password
        if not verify_password(password, user.get("password_hash", "")):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password. Please verify your credentials."
            )

        if user.get("status", "Active") == "Suspended":
            raise HTTPException(
                status_code=403,
                detail="Your account has been suspended by an administrator."
            )
    else:
        # User not found in database:
        # Admin accounts cannot be auto-created; only registered administrator can log in
        if target_role == "Admin":
            raise HTTPException(
                status_code=401,
                detail="Invalid administrator credentials."
            )

        # Requirement: Don't take random dummy users; only when a user logs in, add them to database & admin page!
        if len(password) < 4:
            raise HTTPException(
                status_code=400,
                detail="Password must be at least 4 characters long."
            )

        if full_name_input:
            clean_name = full_name_input
        else:
            local_part = email.split("@")[0]
            tokens = [t.capitalize() for t in re.split(r"[._\-+0-9]+", local_part) if t]
            clean_name = " ".join(tokens) if tokens else f"{target_role} ({local_part})"

        new_user_doc = {
            "full_name": clean_name,
            "email": email,
            "password_hash": hash_password(password),
            "role": target_role,
            "status": "Active",
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        res = db.users.insert_one(new_user_doc)
        new_user_doc["_id"] = res.inserted_id
        user = new_user_doc
        print(f"[INFO] New {target_role} enrolled on login in MongoDB Atlas: {email} ({clean_name})")

        log_activity(
            action="USER_FIRST_LOGIN",
            user_email=email,
            user_name=clean_name,
            user_role=target_role,
            details=f"New {target_role} enrolled upon initial login"
        )

    access_token = create_access_token(user)

    return {
        "message": f"Welcome, {user['full_name']}!",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user["_id"]),
            "full_name": user["full_name"],
            "email": user["email"],
            "role": user["role"],
            "status": user.get("status", "Active")
        }
    }


# =========================================================================
# Document Helpers & Serializers
# =========================================================================

def serialize_document_for_client(d: dict, user_favorites: Optional[set] = None) -> dict:
    doc_id = str(d["_id"])
    file_sz = d.get("file_size", 0)
    is_fav = bool(user_favorites and doc_id in user_favorites)

    return {
        "id": doc_id,
        "filename": d.get("filename", ""),
        "original_filename": d.get("original_filename", ""),
        "category": d.get("category", "Uncategorized"),
        "content_type": d.get("content_type", ""),
        "file_size": file_sz,
        "file_size_formatted": format_file_size(file_sz),
        "uploaded_by_name": d.get("uploaded_by_name", "Anonymous"),
        "uploaded_by_email": d.get("uploaded_by_email", ""),
        "uploaded_by_role": d.get("uploaded_by_role", "Student"),
        "uploaded_at": d.get("uploaded_at", ""),
        "approval_status": d.get("approval_status", "Approved"),
        "rejection_reason": d.get("rejection_reason", ""),
        "download_count": d.get("download_count", 0),
        "preview_count": d.get("preview_count", 0),
        "keywords": d.get("keywords", [])[:8],
        "extracted_text_preview": (d.get("extracted_text", "")[:280] + "...") if d.get("extracted_text") else "",
        "is_deleted": bool(d.get("is_deleted", False)),
        "deleted_at": d.get("deleted_at"),
        "deleted_by_name": d.get("deleted_by_name"),
        "deleted_by_email": d.get("deleted_by_email"),
        "is_favorite": is_fav
    }


def get_user_favorite_set(db, user_email: Optional[str]) -> set:
    if not user_email or db is None:
        return set()
    favs = db.favorites.find({"user_email": user_email.strip().lower()})
    return {str(f.get("document_id")) for f in favs}


# =========================================================================
# Documents Endpoints (Active Documents, Upload, Download, Preview)
# =========================================================================

@app.get("/documents")
def get_documents(
    user_email: Optional[str] = Query(None),
    user_role: Optional[str] = Query(None),
    scope: Optional[str] = Query(None),
    category: Optional[str] = Query("All"),
    approval_status: Optional[str] = Query("All")
):
    db = mongo.get_mongo_db()
    if db is None:
        return []

    clean_email = (user_email or "").strip().lower()
    clean_role = (user_role or "").strip().capitalize()
    is_admin = clean_role == "Admin"

    user_favs = get_user_favorite_set(db, clean_email)

    # Base query: Exclude documents in the Recycle Bin (is_deleted == True)
    query = {"is_deleted": {"$ne": True}}

    if is_admin:
        if scope == "pending":
            query["approval_status"] = "Pending"
        elif scope == "approved":
            query["approval_status"] = "Approved"
        elif scope == "rejected":
            query["approval_status"] = "Rejected"
        elif approval_status and approval_status != "All":
            query["approval_status"] = approval_status
    elif clean_email:
        # STRICT ROLE-BASED ACCESS CONTROL FOR STUDENTS AND TEACHERS:
        if scope == "my":
            # "My Uploaded Documents" strictly shows only files uploaded by the authenticated user
            query["uploaded_by_email"] = clean_email
            if approval_status and approval_status != "All":
                query["approval_status"] = approval_status
        elif scope == "browse":
            # "Browse Repository" strictly shows approved documents
            query["approval_status"] = "Approved"
        else:
            # Default combined: own files (any status) OR approved files from other members
            query["$or"] = [
                {"uploaded_by_email": clean_email},
                {"approval_status": "Approved"}
            ]
            if approval_status and approval_status in ["Pending", "Rejected"]:
                # Cannot see other users' pending or rejected files
                query = {
                    "is_deleted": {"$ne": True},
                    "uploaded_by_email": clean_email,
                    "approval_status": approval_status
                }
            elif approval_status == "Approved":
                query["approval_status"] = "Approved"
    else:
        return []

    if category and category != "All":
        query["category"] = category

    docs_cursor = db.documents.find(query).sort("uploaded_at", -1)
    return [serialize_document_for_client(d, user_favs) for d in docs_cursor]


@app.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    uploaded_by_email: str = Form(...),
    uploaded_by_name: str = Form(...),
    uploaded_by_role: str = Form(...)
):
    db = mongo.get_mongo_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    # REQUIREMENT: Upload option is ONLY for Student and Teacher
    clean_role = uploaded_by_role.strip().capitalize()
    if clean_role == "Admin":
        raise HTTPException(
            status_code=403,
            detail="Upload option is reserved only for Students and Teachers. Administrators cannot upload files."
        )

    if not file.filename:
        raise HTTPException(status_code=400, detail="Please select a file to upload.")

    original_filename = Path(file.filename).name
    extension = Path(original_filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        allowed_list = ", ".join(sorted(ALLOWED_EXTENSIONS))
        raise HTTPException(
            status_code=400,
            detail=f"File extension '{extension}' is not supported. Supported: {allowed_list}"
        )

    content = await file.read(MAX_FILE_SIZE + 1)

    if not content:
        raise HTTPException(status_code=400, detail="Cannot upload an empty file.")

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File size exceeds the 25 MB limit.")

    file_hash = hashlib.sha256(content).hexdigest()
    clean_email = uploaded_by_email.strip().lower()

    # Extract text content and keywords upfront for deep content deduplication
    extracted_text = extractor.extract_text_from_file(content, original_filename)
    keywords = extractor.extract_keywords(extracted_text, original_filename)

    # Compute normalized text (alphanumeric only) and semantic content hash
    norm_text = re.sub(r'[^a-zA-Z0-9]+', '', extracted_text.lower())
    content_hash = hashlib.sha256(norm_text.encode('utf-8')).hexdigest() if len(norm_text) >= 50 else file_hash

    # =========================================================================
    # MULTI-TIER CONTENT DUPLICATE DETECTION (CROSS-USER & CROSS-FILENAME)
    # Note: Filenames ARE permitted to repeat across users/documents as long
    # as the content is different. Only duplicate content is intercepted.
    # =========================================================================

    # Tier 1: Exact Binary SHA-256 Checksum Matching across all active documents
    duplicate_binary_doc = db.documents.find_one({
        "sha256_hash": file_hash,
        "is_deleted": {"$ne": True}
    })

    if duplicate_binary_doc:
        is_same_user = duplicate_binary_doc.get("uploaded_by_email", "").lower() == clean_email
        existing_filename = duplicate_binary_doc.get("original_filename", "existing document")
        uploader_name = duplicate_binary_doc.get("uploaded_by_name", "another member")

        if is_same_user:
            dup_message = f"Duplicate file detected! You have already uploaded this exact file as '{existing_filename}'."
        else:
            dup_message = f"Duplicate content detected! An identical file with this SHA-256 checksum is already active in the repository (uploaded by {uploader_name} as '{existing_filename}')."

        log_activity(
            action="DUPLICATE_BLOCKED",
            user_email=clean_email,
            user_name=uploaded_by_name,
            user_role=clean_role,
            document_id=str(duplicate_binary_doc.get("_id", "")),
            document_name=original_filename,
            details=f"Blocked duplicate upload with identical SHA-256 binary hash. Matches '{existing_filename}'."
        )

        raise HTTPException(
            status_code=409,
            detail={
                "message": dup_message,
                "existing_filename": existing_filename,
                "uploader": uploader_name,
                "sha256_hash": file_hash
            }
        )

    # Tier 2: Deep Normalized Text Content Hash Matching (catches re-saved docs with different filenames)
    if len(norm_text) >= 50:
        duplicate_content_doc = db.documents.find_one({
            "content_hash": content_hash,
            "is_deleted": {"$ne": True}
        })

        if duplicate_content_doc:
            is_same_user = duplicate_content_doc.get("uploaded_by_email", "").lower() == clean_email
            existing_filename = duplicate_content_doc.get("original_filename", "existing document")
            uploader_name = duplicate_content_doc.get("uploaded_by_name", "another member")

            if is_same_user:
                dup_message = f"Duplicate content detected! You have already uploaded an identical document as '{existing_filename}'."
            else:
                dup_message = f"Duplicate content detected! An identical document with the same academic text has already been uploaded by {uploader_name} as '{existing_filename}'. Submitting identical content under a different filename is not permitted."

            log_activity(
                action="DUPLICATE_BLOCKED",
                user_email=clean_email,
                user_name=uploaded_by_name,
                user_role=clean_role,
                document_id=str(duplicate_content_doc.get("_id", "")),
                document_name=original_filename,
                details=f"Blocked duplicate text content upload. Matches '{existing_filename}'."
            )

            raise HTTPException(
                status_code=409,
                detail={
                    "message": dup_message,
                    "existing_filename": existing_filename,
                    "uploader": uploader_name,
                    "sha256_hash": file_hash
                }
            )

    # Tier 3: Substantial Text Similarity Matching (catches near-duplicates where only name/header was edited)
    if len(norm_text) >= 100:
        import difflib
        active_docs = list(db.documents.find(
            {"is_deleted": {"$ne": True}, "norm_text": {"$exists": True}},
            {"_id": 1, "original_filename": 1, "uploaded_by_name": 1, "uploaded_by_email": 1, "norm_text": 1}
        ))
        for existing in active_docs:
            ex_norm = existing.get("norm_text", "")
            if len(ex_norm) >= 100:
                len_diff = abs(len(norm_text) - len(ex_norm)) / max(len(norm_text), len(ex_norm))
                if len_diff > 0.25:
                    continue
                matcher = difflib.SequenceMatcher(None, norm_text[:3500], ex_norm[:3500])
                if matcher.quick_ratio() >= 0.88 and matcher.ratio() >= 0.88:
                    existing_filename = existing.get("original_filename", "existing document")
                    uploader_name = existing.get("uploaded_by_name", "another member")
                    sim_pct = round(matcher.ratio() * 100)
                    dup_message = f"Duplicate content detected! This document is {sim_pct}% identical in content to '{existing_filename}' uploaded by {uploader_name}. Submitting duplicate course materials under another name is not permitted."

                    log_activity(
                        action="DUPLICATE_BLOCKED",
                        user_email=clean_email,
                        user_name=uploaded_by_name,
                        user_role=clean_role,
                        document_id=str(existing.get("_id", "")),
                        document_name=original_filename,
                        details=f"Blocked duplicate content ({sim_pct}% identical text to '{existing_filename}')."
                    )

                    raise HTTPException(
                        status_code=409,
                        detail={
                            "message": dup_message,
                            "existing_filename": existing_filename,
                            "uploader": uploader_name,
                            "sha256_hash": file_hash
                        }
                    )

    # Tier 4: Check If Matching Content is in the User's Recycle Bin
    recycle_bin_doc = db.documents.find_one({
        "uploaded_by_email": clean_email,
        "$or": [
            {"sha256_hash": file_hash},
            {"content_hash": content_hash}
        ],
        "is_deleted": True
    })

    if recycle_bin_doc:
        re_filename = recycle_bin_doc.get("original_filename", original_filename)
        dup_message = f"Duplicate in Recycle Bin! A document matching this content ('{re_filename}') is currently in your Recycle Bin. Please restore it or permanently purge it from the Recycle Bin before re-uploading."
        log_activity(
            action="DUPLICATE_BLOCKED",
            user_email=clean_email,
            user_name=uploaded_by_name,
            user_role=clean_role,
            document_id=str(recycle_bin_doc.get("_id", "")),
            document_name=original_filename,
            details=f"Blocked re-upload of content currently sitting in Recycle Bin ('{re_filename}')."
        )
        raise HTTPException(
            status_code=409,
            detail={
                "message": dup_message,
                "existing_filename": re_filename,
                "uploader": uploaded_by_name,
                "sha256_hash": file_hash
            }
        )

    stored_filename = f"{uuid.uuid4().hex}{extension}"
    file_path = UPLOAD_DIR / stored_filename
    category = CATEGORY_MAP.get(extension, "Uncategorized")

    # Initial approval status:
    # Faculty materials are auto-approved; Student materials enter 'Pending' for campus moderation
    initial_status = "Approved" if clean_role == "Teacher" else "Pending"

    try:
        file_path.write_bytes(content)

        doc_data = {
            "filename": stored_filename,
            "original_filename": original_filename,
            "file_path": str(file_path),
            "content_type": file.content_type or "application/octet-stream",
            "file_size": len(content),
            "category": category,
            "sha256_hash": file_hash,
            "content_hash": content_hash,
            "norm_text": norm_text,
            "extracted_text": extracted_text,
            "keywords": keywords,
            "approval_status": initial_status,
            "rejection_reason": "",
            "download_count": 0,
            "preview_count": 0,
            "is_deleted": False,
            "deleted_at": None,
            "deleted_by_email": None,
            "deleted_by_name": None,
            "uploaded_by_email": clean_email,
            "uploaded_by_name": uploaded_by_name.strip(),
            "uploaded_by_role": clean_role,
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }

        res = db.documents.insert_one(doc_data)

        # Log upload activity
        log_activity(
            action="UPLOAD",
            user_email=clean_email,
            user_name=uploaded_by_name,
            user_role=clean_role,
            document_id=str(res.inserted_id),
            document_name=original_filename,
            details=f"Uploaded {format_file_size(len(content))} {category} ({initial_status})"
        )

    except Exception as e:
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Failed to store document: {str(e)}")
    finally:
        await file.close()

    return {
        "message": f"Document '{original_filename}' uploaded successfully ({initial_status})!",
        "document_id": str(res.inserted_id),
        "filename": original_filename,
        "category": category,
        "file_size": len(content),
        "file_size_formatted": format_file_size(len(content)),
        "approval_status": initial_status,
        "keywords_extracted": len(keywords)
    }


# =========================================================================
# Intelligent Deep Content Search & Semantic Keywords
# =========================================================================

@app.get("/documents/search")
def search_documents(
    q: Optional[str] = Query(""),
    author: Optional[str] = Query(""),
    category: Optional[str] = Query("All"),
    date_filter: Optional[str] = Query("All"), # "7d", "30d", "90d", "All"
    approval_status: Optional[str] = Query("All"),
    user_email: Optional[str] = Query(None),
    user_role: Optional[str] = Query(None)
):
    """
    Intelligent Search:
    - Searches filename, author, category, keywords, and deep inside extracted text.
    - Semantic synonym expansion (e.g. 'machine learning' expands to 'ML algorithms', 'ai', 'neural networks').
    - Ranks results by relevance score so the most relevant documents appear first.
    """
    db = mongo.get_mongo_db()
    if db is None:
        return []

    user_favs = get_user_favorite_set(db, user_email)

    # Base query: Exclude deleted documents
    query = {"is_deleted": {"$ne": True}}

    if user_role == "Admin":
        pass
    elif user_email:
        clean_email = user_email.strip().lower()
        query["$or"] = [
            {"uploaded_by_email": clean_email},
            {"approval_status": "Approved"}
        ]
    else:
        return []

    if category and category != "All":
        query["category"] = category

    if approval_status and approval_status != "All":
        query["approval_status"] = approval_status

    if author and author.strip():
        auth_term = author.strip()
        query["$and"] = query.get("$and", [])
        query["$and"].append({
            "$or": [
                {"uploaded_by_name": {"$regex": auth_term, "$options": "i"}},
                {"uploaded_by_email": {"$regex": auth_term, "$options": "i"}}
            ]
        })

    # Date filtering
    now = datetime.now(timezone.utc)
    if date_filter == "7d":
        since = (now - timedelta(days=7)).isoformat()
        query["uploaded_at"] = {"$gte": since}
    elif date_filter == "30d":
        since = (now - timedelta(days=30)).isoformat()
        query["uploaded_at"] = {"$gte": since}
    elif date_filter == "90d":
        since = (now - timedelta(days=90)).isoformat()
        query["uploaded_at"] = {"$gte": since}

    raw_docs = list(db.documents.find(query))

    clean_query = (q or "").strip()
    if not clean_query:
        # No query: return sorted by upload date
        raw_docs.sort(key=lambda d: d.get("uploaded_at", ""), reverse=True)
        return [serialize_document_for_client(d, user_favs) for d in raw_docs]

    # Expand terms with semantic synonyms and acronyms
    expanded_terms = extractor.expand_search_terms(clean_query)

    scored_results = []
    for d in raw_docs:
        score = extractor.score_document_match(d, expanded_terms, clean_query)
        if score > 0:
            client_doc = serialize_document_for_client(d, user_favs)
            client_doc["relevance_score"] = score

            # Find matching text excerpt for highlight snippet
            content = d.get("extracted_text", "")
            snippet = ""
            for term in expanded_terms:
                idx = content.lower().find(term.lower())
                if idx != -1:
                    start = max(0, idx - 60)
                    end = min(len(content), idx + len(term) + 90)
                    snippet = f"...{content[start:end]}..."
                    break
            client_doc["match_snippet"] = snippet or client_doc.get("extracted_text_preview", "")
            scored_results.append(client_doc)

    # Sort descending by relevance score
    scored_results.sort(key=lambda x: x["relevance_score"], reverse=True)
    return scored_results


# =========================================================================
# PDF Preview & Direct In-Website Viewer
# =========================================================================

@app.get("/documents/{document_id}/preview")
def preview_document(
    document_id: str,
    user_email: Optional[str] = Query(None),
    user_name: Optional[str] = Query(None),
    user_role: Optional[str] = Query(None)
):
    """
    Direct in-browser preview stream.
    Sets 'Content-Disposition: inline' so the browser displays the PDF directly
    in the web page's interactive previewer without triggering an automatic file download.
    """
    db = mongo.get_mongo_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    try:
        obj_id = ObjectId(document_id)
        doc = db.documents.find_one({"_id": obj_id})
    except Exception:
        doc = db.documents.find_one({"filename": document_id})

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # STRICT ROLE-BASED ACCESS CONTROL CHECK FOR PREVIEW
    clean_email = (user_email or "").strip().lower()
    clean_role = (user_role or "").strip().capitalize()
    is_admin = clean_role == "Admin"

    if not is_admin:
        doc_uploader = (doc.get("uploaded_by_email") or "").strip().lower()
        is_owner = bool(clean_email and doc_uploader == clean_email)
        is_approved = doc.get("approval_status") == "Approved"
        is_deleted = doc.get("is_deleted", False)

        if is_deleted:
            raise HTTPException(status_code=403, detail="This document has been moved to the Recycle Bin.")
        if not (is_owner or is_approved):
            raise HTTPException(
                status_code=403,
                detail="Access denied. This document is private or awaiting administrative approval."
            )

    file_path = Path(doc.get("file_path", ""))
    if not file_path.exists():
        file_path = UPLOAD_DIR / doc.get("filename", "")
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Physical file not found on server.")

    # Determine media type
    ext = Path(doc.get("original_filename", "")).suffix.lower()
    media_type = doc.get("content_type", "application/octet-stream")
    if ext == ".pdf":
        media_type = "application/pdf"
    elif ext in [".txt", ".csv", ".json", ".md"]:
        media_type = "text/plain; charset=utf-8"
    elif ext in [".jpg", ".jpeg"]:
        media_type = "image/jpeg"
    elif ext == ".png":
        media_type = "image/png"

    # Track preview count and record view history
    try:
        db.documents.update_one({"_id": doc["_id"]}, {"$inc": {"preview_count": 1}})
        if clean_email:
            db.recently_viewed.update_one(
                {"user_email": clean_email, "document_id": str(doc["_id"])},
                {
                    "$set": {
                        "user_email": clean_email,
                        "user_name": user_name or "User",
                        "user_role": clean_role or "Student",
                        "document_id": str(doc["_id"]),
                        "document_title": doc.get("original_filename", ""),
                        "category": doc.get("category", "Documents"),
                        "file_size": doc.get("file_size", 0),
                        "viewed_at": datetime.now(timezone.utc).isoformat()
                    }
                },
                upsert=True
            )
            log_activity(
                action="PREVIEW",
                user_email=clean_email,
                user_name=user_name or "User",
                user_role=user_role or "Student",
                document_id=str(doc["_id"]),
                document_name=doc.get("original_filename", ""),
                details=f"In-website preview opened ({doc.get('category', '')})"
            )
    except Exception as e:
        print("[WARN] Error updating preview metrics:", e)

    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        headers={
            "Content-Disposition": f"inline; filename=\"{doc.get('original_filename', 'document')}\"",
            "Cache-Control": "public, max-age=3600"
        }
    )


@app.get("/documents/{document_id}/info")
def get_document_info(
    document_id: str,
    user_email: Optional[str] = Query(None)
):
    """Returns comprehensive metadata for the document preview modal."""
    db = mongo.get_mongo_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    try:
        obj_id = ObjectId(document_id)
        doc = db.documents.find_one({"_id": obj_id})
    except Exception:
        doc = db.documents.find_one({"filename": document_id})

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    user_favs = get_user_favorite_set(db, user_email)
    client_doc = serialize_document_for_client(doc, user_favs)
    # Include full extracted text for in-app reader
    client_doc["full_extracted_text"] = doc.get("extracted_text", "")
    return client_doc


# =========================================================================
# Document Download & Activity Tracking
# =========================================================================

@app.get("/documents/{document_id}/download")
def download_document(
    document_id: str,
    user_email: Optional[str] = Query(None),
    user_name: Optional[str] = Query(None),
    user_role: Optional[str] = Query(None)
):
    db = mongo.get_mongo_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    try:
        obj_id = ObjectId(document_id)
        doc = db.documents.find_one({"_id": obj_id})
    except Exception:
        doc = db.documents.find_one({"filename": document_id})

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # STRICT ROLE-BASED ACCESS CONTROL CHECK FOR DOWNLOAD
    clean_email = (user_email or "").strip().lower()
    clean_role = (user_role or "").strip().capitalize()
    is_admin = clean_role == "Admin"

    if not is_admin:
        doc_uploader = (doc.get("uploaded_by_email") or "").strip().lower()
        is_owner = bool(clean_email and doc_uploader == clean_email)
        is_approved = doc.get("approval_status") == "Approved"
        is_deleted = doc.get("is_deleted", False)

        if is_deleted:
            raise HTTPException(status_code=403, detail="This document has been moved to the Recycle Bin.")
        if not (is_owner or is_approved):
            raise HTTPException(
                status_code=403,
                detail="Access denied. This document is private or awaiting administrative approval."
            )

    file_path = Path(doc.get("file_path", ""))
    if not file_path.exists():
        file_path = UPLOAD_DIR / doc.get("filename", "")
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Physical file not found on server.")

    # Increment download counter & record in audit trail & update recently viewed
    try:
        db.documents.update_one({"_id": doc["_id"]}, {"$inc": {"download_count": 1}})
        if clean_email:
            db.recently_viewed.update_one(
                {"user_email": clean_email, "document_id": str(doc["_id"])},
                {
                    "$set": {
                        "user_email": clean_email,
                        "user_name": user_name or "User",
                        "user_role": clean_role or "Student",
                        "document_id": str(doc["_id"]),
                        "document_title": doc.get("original_filename", ""),
                        "category": doc.get("category", "Documents"),
                        "file_size": doc.get("file_size", 0),
                        "viewed_at": datetime.now(timezone.utc).isoformat()
                    }
                },
                upsert=True
            )
        log_activity(
            action="DOWNLOAD",
            user_email=user_email or "guest@smartrepo.edu",
            user_name=user_name or "Anonymous",
            user_role=user_role or "Student",
            document_id=str(doc["_id"]),
            document_name=doc.get("original_filename", ""),
            details=f"Downloaded file ({format_file_size(doc.get('file_size', 0))})"
        )
    except Exception as e:
        print("[WARN] Error logging download activity:", e)

    return FileResponse(
        path=str(file_path),
        filename=doc.get("original_filename", "document"),
        media_type=doc.get("content_type", "application/octet-stream")
    )


# =========================================================================
# Recycle Bin, Soft Delete, Restore & Permanent Deletion
# =========================================================================

@app.delete("/documents/{document_id}")
def move_document_to_recycle_bin(
    document_id: str,
    user_email: Optional[str] = Query(None),
    user_name: Optional[str] = Query(None),
    user_role: Optional[str] = Query(None)
):
    """Soft deletes document by moving it to the Recycle Bin."""
    db = mongo.get_mongo_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    try:
        obj_id = ObjectId(document_id)
        doc = db.documents.find_one({"_id": obj_id})
    except Exception:
        doc = db.documents.find_one({"filename": document_id})

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    doc_name = doc.get("original_filename", "Document")
    clean_email = (user_email or doc.get("uploaded_by_email", "")).strip().lower()
    clean_name = (user_name or doc.get("uploaded_by_name", "User")).strip()

    now_iso = datetime.now(timezone.utc).isoformat()
    db.documents.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "is_deleted": True,
                "deleted_at": now_iso,
                "deleted_by_email": clean_email,
                "deleted_by_name": clean_name
            }
        }
    )

    log_activity(
        action="DELETE",
        user_email=clean_email,
        user_name=clean_name,
        user_role=user_role or "Student",
        document_id=str(doc["_id"]),
        document_name=doc_name,
        details="Document moved to Recycle Bin"
    )

    return {
        "message": f"Document '{doc_name}' moved to Recycle Bin.",
        "id": document_id
    }


@app.get("/documents/recycle-bin")
def get_recycle_bin(
    user_email: Optional[str] = Query(None),
    user_role: Optional[str] = Query(None)
):
    """Lists deleted documents located in the Recycle Bin."""
    db = mongo.get_mongo_db()
    if db is None:
        return []

    query = {"is_deleted": True}
    if user_role == "Admin":
        pass  # Admin sees all deleted documents
    elif user_email:
        clean_email = user_email.strip().lower()
        query["$or"] = [
            {"uploaded_by_email": clean_email},
            {"deleted_by_email": clean_email}
        ]
    else:
        return []

    docs = db.documents.find(query).sort("deleted_at", -1)
    return [serialize_document_for_client(d) for d in docs]


@app.post("/documents/{document_id}/restore")
def restore_document_from_recycle_bin(
    document_id: str,
    user_email: Optional[str] = Query(None),
    user_name: Optional[str] = Query(None),
    user_role: Optional[str] = Query(None)
):
    """Restores an accidentally deleted document back to the active repository."""
    db = mongo.get_mongo_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    try:
        obj_id = ObjectId(document_id)
        doc = db.documents.find_one({"_id": obj_id})
    except Exception:
        doc = db.documents.find_one({"filename": document_id})

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    doc_name = doc.get("original_filename", "Document")

    db.documents.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "is_deleted": False,
                "deleted_at": None,
                "deleted_by_email": None,
                "deleted_by_name": None
            }
        }
    )

    clean_email = (user_email or "user@smartrepo.edu").strip().lower()
    clean_name = (user_name or "User").strip()

    log_activity(
        action="RESTORE",
        user_email=clean_email,
        user_name=clean_name,
        user_role=user_role or "Student",
        document_id=str(doc["_id"]),
        document_name=doc_name,
        details="Restored document from Recycle Bin to active repository"
    )

    return {
        "message": f"Document '{doc_name}' restored successfully.",
        "id": document_id
    }


@app.delete("/documents/{document_id}/permanent")
def permanently_delete_document(
    document_id: str,
    user_email: Optional[str] = Query(None),
    user_name: Optional[str] = Query(None),
    user_role: Optional[str] = Query(None)
):
    """Permanently purges a document from both disk and MongoDB Atlas."""
    db = mongo.get_mongo_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    try:
        obj_id = ObjectId(document_id)
        doc = db.documents.find_one({"_id": obj_id})
    except Exception:
        doc = db.documents.find_one({"filename": document_id})

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    doc_name = doc.get("original_filename", "Document")

    # Unlink file from physical disk
    try:
        file_path = Path(doc.get("file_path", ""))
        if file_path.exists():
            file_path.unlink()
        else:
            fallback = UPLOAD_DIR / doc.get("filename", "")
            if fallback.exists():
                fallback.unlink()
    except Exception as e:
        print(f"[WARN] Error removing file on disk: {e}")

    # Remove document record and related favorites/views from MongoDB
    db.documents.delete_one({"_id": doc["_id"]})
    db.favorites.delete_many({"document_id": str(doc["_id"])})
    db.recently_viewed.delete_many({"document_id": str(doc["_id"])})

    clean_email = (user_email or "admin@smartrepo.edu").strip().lower()
    clean_name = (user_name or "Administrator").strip()

    log_activity(
        action="PERMANENT_DELETE",
        user_email=clean_email,
        user_name=clean_name,
        user_role=user_role or "Admin",
        document_id=str(doc["_id"]),
        document_name=doc_name,
        details="Document permanently purged from server and database"
    )

    return {
        "message": f"Document '{doc_name}' permanently deleted.",
        "id": document_id
    }


# =========================================================================
# Bookmarks, Favorites, Recently Viewed & Frequently Used
# =========================================================================

@app.post("/documents/{document_id}/favorite")
def toggle_document_favorite(document_id: str, payload: dict):
    """Bookmarks or un-bookmarks an important document for the user."""
    db = mongo.get_mongo_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    user_email = str(payload.get("user_email", "")).strip().lower()
    if not user_email:
        raise HTTPException(status_code=400, detail="User email is required.")

    existing_fav = db.favorites.find_one({
        "user_email": user_email,
        "document_id": document_id
    })

    if existing_fav:
        db.favorites.delete_one({"_id": existing_fav["_id"]})
        return {
            "is_favorite": False,
            "message": "Removed from My Favorites",
            "document_id": document_id
        }
    else:
        db.favorites.insert_one({
            "user_email": user_email,
            "document_id": document_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {
            "is_favorite": True,
            "message": "Added to My Favorites",
            "document_id": document_id
        }


@app.get("/documents/favorites")
def get_user_favorites(user_email: str = Query(...)):
    """Retrieves all bookmarked documents in the 'My Favorites' collection."""
    db = mongo.get_mongo_db()
    if db is None or not user_email:
        return []

    clean_email = user_email.strip().lower()
    fav_records = list(db.favorites.find({"user_email": clean_email}))
    doc_ids = []
    for f in fav_records:
        try:
            doc_ids.append(ObjectId(f["document_id"]))
        except Exception:
            pass

    if not doc_ids:
        return []

    docs = list(db.documents.find({"_id": {"$in": doc_ids}, "is_deleted": {"$ne": True}}))
    user_favs = {str(d["_id"]) for d in docs}
    return [serialize_document_for_client(d, user_favs) for d in docs]


@app.get("/documents/recent")
def get_recently_viewed_documents(user_email: str = Query(...)):
    """Retrieves recently previewed documents for the user."""
    db = mongo.get_mongo_db()
    if db is None or not user_email:
        return []

    clean_email = user_email.strip().lower()
    recent_records = list(
        db.recently_viewed.find({"user_email": clean_email}).sort("viewed_at", -1).limit(10)
    )

    doc_ids = []
    for r in recent_records:
        try:
            doc_ids.append(ObjectId(r["document_id"]))
        except Exception:
            pass

    if not doc_ids:
        return []

    docs = {str(d["_id"]): d for d in db.documents.find({"_id": {"$in": doc_ids}, "is_deleted": {"$ne": True}})}
    user_favs = get_user_favorite_set(db, clean_email)

    results = []
    for r in recent_records:
        d_id = str(r["document_id"])
        if d_id in docs:
            item = serialize_document_for_client(docs[d_id], user_favs)
            item["viewed_at"] = r.get("viewed_at")
            results.append(item)

    return results


@app.get("/documents/frequently-used")
def get_frequently_used_documents(user_email: Optional[str] = Query(None)):
    """Returns top utilized documents across campus for quick access."""
    db = mongo.get_mongo_db()
    if db is None:
        return []

    docs = db.documents.find({"is_deleted": {"$ne": True}}).sort([("download_count", -1), ("preview_count", -1)]).limit(6)
    user_favs = get_user_favorite_set(db, user_email)
    return [serialize_document_for_client(d, user_favs) for d in docs]


# =========================================================================
# Administrator Access Activity & System Management
# =========================================================================

@app.get("/admin/access-activity")
def get_admin_access_activity(
    user_email: Optional[str] = Query(None),
    user_role: Optional[str] = Query(None),
    limit: int = Query(50)
):
    """
    Repository-wide access activity monitor for administrators.
    Tracks which user accessed which document and when with role and user filtering.
    """
    db = mongo.get_mongo_db()
    if db is None:
        return []

    query = {}
    if user_email:
        query["user_email"] = user_email.strip().lower()
    if user_role and user_role != "All":
        query["user_role"] = user_role

    records = list(db.recently_viewed.find(query).sort("viewed_at", -1).limit(limit))
    return mongo.serialize_docs(records)


@app.get("/admin/duplicate-files")
def get_duplicate_files():
    """
    Returns files with duplicate SHA-256 hashes or blocked duplicate attempts.
    """
    db = mongo.get_mongo_db()
    if db is None:
        return {"duplicate_groups": [], "blocked_attempts": []}

    # Blocked attempts from activity logs
    blocked_attempts = list(db.activity_logs.find({"action": "DUPLICATE_BLOCKED"}).sort("timestamp", -1).limit(50))

    # Aggregated duplicate hashes in active documents
    pipeline = [
        {"$match": {"is_deleted": {"$ne": True}}},
        {"$group": {"_id": "$sha256_hash", "count": {"$sum": 1}, "docs": {"$push": "$$ROOT"}}},
        {"$match": {"count": {"$gt": 1}}}
    ]
    raw_groups = list(db.documents.aggregate(pipeline))
    duplicate_groups = []
    for g in raw_groups:
        duplicate_groups.append({
            "sha256_hash": g["_id"],
            "count": g["count"],
            "documents": [serialize_document_for_client(d) for d in g["docs"]]
        })

    return {
        "duplicate_groups": duplicate_groups,
        "blocked_attempts": mongo.serialize_docs(blocked_attempts)
    }


@app.get("/admin/storage-overview")
def get_storage_overview():
    """
    Storage breakdown across categories and physical uploads directory.
    """
    db = mongo.get_mongo_db()
    if db is None:
        return {"total_storage_bytes": 0, "categories": []}

    pipeline = [
        {"$match": {"is_deleted": {"$ne": True}}},
        {"$group": {
            "_id": "$category",
            "total_bytes": {"$sum": "$file_size"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"total_bytes": -1}}
    ]
    categories_agg = list(db.documents.aggregate(pipeline))
    total_bytes = sum(c["total_bytes"] for c in categories_agg)
    total_docs = sum(c["count"] for c in categories_agg)

    categories = []
    for c in categories_agg:
        categories.append({
            "category": c["_id"] or "Uncategorized",
            "bytes": c["total_bytes"],
            "formatted_size": format_file_size(c["total_bytes"]),
            "count": c["count"]
        })

    return {
        "total_storage_bytes": total_bytes,
        "total_storage_formatted": format_file_size(total_bytes),
        "total_documents": total_docs,
        "categories": categories
    }


# =========================================================================
# Administrator Review & Approval Workflow
# =========================================================================

@app.put("/admin/documents/{document_id}/approval")
def review_document_approval(document_id: str, payload: dict):
    """Admins approve or reject academic documents submitted by students/faculty."""
    db = mongo.get_mongo_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    new_status = str(payload.get("status", "")).strip().capitalize()
    if new_status not in ["Approved", "Rejected", "Pending"]:
        raise HTTPException(status_code=400, detail="Status must be 'Approved', 'Rejected', or 'Pending'.")

    reason = str(payload.get("reason", "")).strip()
    admin_email = str(payload.get("admin_email", "admin@smartrepo.edu")).strip().lower()
    admin_name = str(payload.get("admin_name", "System Administrator")).strip()

    try:
        obj_id = ObjectId(document_id)
        doc = db.documents.find_one({"_id": obj_id})
    except Exception:
        doc = db.documents.find_one({"filename": document_id})

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    db.documents.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "approval_status": new_status,
                "rejection_reason": reason if new_status == "Rejected" else ""
            }
        }
    )

    action_label = "APPROVE" if new_status == "Approved" else "REJECT" if new_status == "Rejected" else "RESET_APPROVAL"
    log_activity(
        action=action_label,
        user_email=admin_email,
        user_name=admin_name,
        user_role="Admin",
        document_id=str(doc["_id"]),
        document_name=doc.get("original_filename", ""),
        details=f"Document status set to '{new_status}'" + (f": {reason}" if reason else "")
    )

    return {
        "message": f"Document status updated to {new_status}.",
        "document_id": document_id,
        "approval_status": new_status,
        "rejection_reason": reason
    }


# =========================================================================
# Administrator Analytics Dashboard & Activity Trail
# =========================================================================

@app.get("/admin/analytics")
def get_admin_analytics():
    """
    Comprehensive Analytics for Admin Dashboard:
    - Total documents
    - Total users
    - Pending approvals
    - Duplicate files detected and blocked
    - Storage space used (bytes and formatted)
    - Most downloaded documents leaderboard
    - Monthly upload statistics
    """
    db = mongo.get_mongo_db()
    if db is None:
        return {
            "total_documents": 0,
            "total_users": 0,
            "pending_approvals": 0,
            "duplicate_files_detected": 0,
            "storage_used_bytes": 0,
            "storage_used_formatted": "0 B",
            "most_downloaded_documents": [],
            "monthly_upload_statistics": []
        }

    total_docs = db.documents.count_documents({"is_deleted": {"$ne": True}})
    total_users = db.users.count_documents({})
    pending_approvals = db.documents.count_documents({"approval_status": "Pending", "is_deleted": {"$ne": True}})
    duplicate_blocked = db.activity_logs.count_documents({"action": "DUPLICATE_BLOCKED"})

    # Storage calculation
    pipeline_storage = [
        {"$match": {"is_deleted": {"$ne": True}}},
        {"$group": {"_id": None, "total_bytes": {"$sum": "$file_size"}}}
    ]
    storage_res = list(db.documents.aggregate(pipeline_storage))
    storage_bytes = storage_res[0]["total_bytes"] if storage_res else 0

    # Most downloaded documents
    most_downloaded_cursor = db.documents.find({"is_deleted": {"$ne": True}}).sort("download_count", -1).limit(5)
    most_downloaded = []
    for d in most_downloaded_cursor:
        most_downloaded.append({
            "id": str(d["_id"]),
            "title": d.get("original_filename", ""),
            "author": d.get("uploaded_by_name", "Anonymous"),
            "category": d.get("category", "Documents"),
            "downloads": d.get("download_count", 0),
            "previews": d.get("preview_count", 0),
            "file_size_formatted": format_file_size(d.get("file_size", 0))
        })

    # Monthly upload statistics
    pipeline_monthly = [
        {"$match": {"is_deleted": {"$ne": True}}},
        {"$project": {"month": {"$substr": ["$uploaded_at", 0, 7]}}},
        {"$group": {"_id": "$month", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    monthly_res = list(db.documents.aggregate(pipeline_monthly))
    monthly_stats = []
    for m in monthly_res:
        raw_key = m.get("_id")
        if raw_key and len(raw_key) == 7:
            year, month_num = raw_key.split("-")
            month_name = calendar.month_abbr[int(month_num)]
            label = f"{month_name} {year}"
        else:
            label = raw_key or "Current"
        monthly_stats.append({"month": label, "count": m.get("count", 0)})

    if not monthly_stats:
        current_mo = datetime.now(timezone.utc).strftime("%b %Y")
        monthly_stats.append({"month": current_mo, "count": total_docs})

    return {
        "total_documents": total_docs,
        "total_users": total_users,
        "pending_approvals": pending_approvals,
        "duplicate_files_detected": duplicate_blocked,
        "storage_used_bytes": storage_bytes,
        "storage_used_formatted": format_file_size(storage_bytes),
        "most_downloaded_documents": most_downloaded,
        "monthly_upload_statistics": monthly_stats
    }


@app.get("/admin/activity")
def get_repository_activity(
    limit: int = Query(50),
    action: Optional[str] = Query(None)
):
    """Audit Trail: Let admins view full repository activity history."""
    db = mongo.get_mongo_db()
    if db is None:
        return []

    query = {}
    if action and action != "All":
        query["action"] = action

    logs_cursor = db.activity_logs.find(query).sort("timestamp", -1).limit(limit)
    results = []
    for log in logs_cursor:
        results.append({
            "id": str(log["_id"]),
            "action": log.get("action", ""),
            "document_id": log.get("document_id", ""),
            "document_name": log.get("document_name", ""),
            "user_email": log.get("user_email", ""),
            "user_name": log.get("user_name", ""),
            "user_role": log.get("user_role", ""),
            "details": log.get("details", ""),
            "timestamp": log.get("timestamp", "")
        })

    return results


# Repository Statistics (Legacy / general stats)
@app.get("/stats")
def get_stats(
    user_email: Optional[str] = Query(None),
    user_role: Optional[str] = Query(None)
):
    db = mongo.get_mongo_db()
    if db is None:
        return {
            "total_documents": 0,
            "total_categories": 0,
            "total_users": 0,
            "total_students": 0,
            "total_teachers": 0,
            "pending_approvals": 0,
            "storage_formatted": "0 B"
        }

    total_users = db.users.count_documents({})
    total_students = db.users.count_documents({"role": "Student"})
    total_teachers = db.users.count_documents({"role": "Teacher"})
    pending_approvals = db.documents.count_documents({"approval_status": "Pending", "is_deleted": {"$ne": True}})

    if user_role == "Admin":
        total_documents = db.documents.count_documents({"is_deleted": {"$ne": True}})
        total_categories = len(db.documents.distinct("category", {"is_deleted": {"$ne": True}}))
    elif user_email:
        clean_email = user_email.strip().lower()
        total_documents = db.documents.count_documents({"uploaded_by_email": clean_email, "is_deleted": {"$ne": True}})
        total_categories = len(db.documents.distinct("category", {"uploaded_by_email": clean_email, "is_deleted": {"$ne": True}}))
    else:
        total_documents = 0
        total_categories = 0

    return {
        "total_documents": total_documents,
        "total_categories": total_categories,
        "total_users": total_users,
        "total_students": total_students,
        "total_teachers": total_teachers,
        "pending_approvals": pending_approvals
    }


# =========================================================================
# Admin Control Panel Endpoints (View & Modify Teachers and Students)
# =========================================================================

@app.get("/admin/users")
def get_all_users():
    db = mongo.get_mongo_db()
    if db is None:
        return []

    users_cursor = db.users.find().sort("created_at", -1)
    results = []

    for u in users_cursor:
        email = u.get("email", "")
        doc_count = db.documents.count_documents({"uploaded_by_email": email, "is_deleted": {"$ne": True}})

        results.append({
            "id": str(u["_id"]),
            "full_name": u.get("full_name", ""),
            "email": email,
            "role": u.get("role", "Student"),
            "status": u.get("status", "Active"),
            "documents_count": doc_count,
            "created_at": u.get("created_at", "")
        })

    return results


@app.post("/admin/users")
def admin_create_user(user_data: dict):
    db = mongo.get_mongo_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    full_name = str(user_data.get("full_name", "")).strip()
    email = str(user_data.get("email", "")).strip().lower()
    password = str(user_data.get("password", "")).strip()
    role = str(user_data.get("role", "Student")).strip()
    status_val = str(user_data.get("status", "Active")).strip()

    if not full_name or not email or not password:
        raise HTTPException(status_code=400, detail="Name, email, and password are required.")

    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")

    if db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="A user with this email already exists.")

    new_doc = {
        "full_name": full_name,
        "email": email,
        "password_hash": hash_password(password),
        "role": role,
        "status": status_val,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    res = db.users.insert_one(new_doc)

    log_activity(
        action="ADMIN_CREATE_USER",
        user_email="admin@smartrepo.edu",
        user_name="System Administrator",
        user_role="Admin",
        details=f"Admin created {role} account for '{full_name}' ({email})"
    )

    return {
        "message": f"{role} '{full_name}' created successfully in MongoDB.",
        "user": {
            "id": str(res.inserted_id),
            "full_name": full_name,
            "email": email,
            "role": role,
            "status": status_val,
            "documents_count": 0,
            "created_at": new_doc["created_at"]
        }
    }


@app.put("/admin/users/{user_id}")
def admin_modify_user(user_id: str, payload: dict):
    db = mongo.get_mongo_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    try:
        obj_id = ObjectId(user_id)
        user = db.users.find_one({"_id": obj_id})
    except Exception:
        user = db.users.find_one({"email": user_id})

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    update_fields = {}

    if "full_name" in payload and payload["full_name"].strip():
        update_fields["full_name"] = payload["full_name"].strip()

    if "role" in payload:
        new_role = payload["role"].strip()
        if new_role in ["Student", "Teacher", "Admin"]:
            if user["email"] == "admin@smartrepo.edu" and new_role != "Admin":
                raise HTTPException(status_code=400, detail="Cannot demote the primary Administrator.")
            update_fields["role"] = new_role

    if "status" in payload:
        new_status = payload["status"].strip()
        if new_status in ["Active", "Suspended", "Pending"]:
            if user["email"] == "admin@smartrepo.edu" and new_status == "Suspended":
                raise HTTPException(status_code=400, detail="Cannot suspend the primary Administrator.")
            update_fields["status"] = new_status

    if "password" in payload and payload["password"].strip():
        update_fields["password_hash"] = hash_password(payload["password"].strip())

    if update_fields:
        db.users.update_one({"_id": user["_id"]}, {"$set": update_fields})

    updated_user = db.users.find_one({"_id": user["_id"]})

    log_activity(
        action="ADMIN_UPDATE_USER",
        user_email="admin@smartrepo.edu",
        user_name="System Administrator",
        user_role="Admin",
        details=f"Admin modified user '{updated_user['full_name']}' ({updated_user['email']})"
    )

    return {
        "message": f"User '{updated_user['full_name']}' updated successfully.",
        "user": {
            "id": str(updated_user["_id"]),
            "full_name": updated_user["full_name"],
            "email": updated_user["email"],
            "role": updated_user["role"],
            "status": updated_user.get("status", "Active")
        }
    }


@app.put("/admin/users/{user_id}/status")
def update_user_status(user_id: str, payload: dict):
    db = mongo.get_mongo_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    new_status = str(payload.get("status", "")).strip()
    if new_status not in ["Active", "Suspended", "Pending"]:
        raise HTTPException(status_code=400, detail="Status must be 'Active', 'Suspended', or 'Pending'.")

    try:
        obj_id = ObjectId(user_id)
        user = db.users.find_one({"_id": obj_id})
    except Exception:
        user = db.users.find_one({"email": user_id})

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user["email"] == "admin@smartrepo.edu" and new_status == "Suspended":
        raise HTTPException(status_code=400, detail="The root Administrator cannot be suspended.")

    db.users.update_one({"_id": user["_id"]}, {"$set": {"status": new_status}})

    log_activity(
        action="UPDATE_USER_STATUS",
        user_email="admin@smartrepo.edu",
        user_name="System Administrator",
        user_role="Admin",
        details=f"Changed status of '{user['full_name']}' to {new_status}"
    )

    return {
        "message": f"User status updated to {new_status}.",
        "user_id": user_id,
        "status": new_status
    }


@app.put("/admin/users/{user_id}/role")
def update_user_role(user_id: str, payload: dict):
    db = mongo.get_mongo_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    new_role = str(payload.get("role", "")).strip()
    if new_role not in ["Student", "Teacher", "Admin"]:
        raise HTTPException(status_code=400, detail="Role must be 'Student', 'Teacher', or 'Admin'.")

    try:
        obj_id = ObjectId(user_id)
        user = db.users.find_one({"_id": obj_id})
    except Exception:
        user = db.users.find_one({"email": user_id})

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user["email"] == "admin@smartrepo.edu" and new_role != "Admin":
        raise HTTPException(status_code=400, detail="The root Administrator's role cannot be changed.")

    db.users.update_one({"_id": user["_id"]}, {"$set": {"role": new_role}})

    log_activity(
        action="UPDATE_USER_ROLE",
        user_email="admin@smartrepo.edu",
        user_name="System Administrator",
        user_role="Admin",
        details=f"Changed role of '{user['full_name']}' to {new_role}"
    )

    return {
        "message": f"User role updated to {new_role}.",
        "user_id": user_id,
        "role": new_role
    }


@app.delete("/admin/users/{user_id}")
def delete_user(user_id: str):
    db = mongo.get_mongo_db()
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

    try:
        obj_id = ObjectId(user_id)
        user = db.users.find_one({"_id": obj_id})
    except Exception:
        user = db.users.find_one({"email": user_id})

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user["email"] == "admin@smartrepo.edu":
        raise HTTPException(status_code=400, detail="The main administrator account cannot be deleted.")

    user_name = user["full_name"]
    db.users.delete_one({"_id": user["_id"]})

    log_activity(
        action="ADMIN_DELETE_USER",
        user_email="admin@smartrepo.edu",
        user_name="System Administrator",
        user_role="Admin",
        details=f"Deleted user account '{user_name}' ({user.get('email')})"
    )

    return {
        "message": f"User account '{user_name}' has been deleted from MongoDB.",
        "id": user_id
    }
