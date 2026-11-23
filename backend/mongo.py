import os
from datetime import datetime, timezone
import pymongo
from bson import ObjectId

# MongoDB Atlas Connection
MONGO_URI = os.getenv(
    "MONGODB_URI",
    "mongodb+srv://Part2006:Parth492006@cluster0.g3r2cw6.mongodb.net/?retryWrites=true&w=majority"
)
DB_NAME = "smartrepo"

client = None
db = None

try:
    client = pymongo.MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=6000,
        connectTimeoutMS=6000
    )
    # Ping database to verify connection
    client.admin.command('ping')
    db = client[DB_NAME]
    print("[INFO] Successfully connected to MongoDB Atlas database:", DB_NAME)

    # Initialize indexes
    db.users.create_index("email", unique=True)
    db.documents.create_index("uploaded_by_email")
    db.documents.create_index("sha256_hash")
except Exception as e:
    print("[WARN] MongoDB Atlas connection error:", e)


def get_mongo_db():
    global client, db
    if db is not None:
        try:
            # Check connection health
            client.admin.command('ping')
            return db
        except Exception:
            db = None

    try:
        client = pymongo.MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=8000,
            connectTimeoutMS=8000
        )
        client.admin.command('ping')
        db = client[DB_NAME]
        db.users.create_index("email", unique=True)
        db.documents.create_index("uploaded_by_email")
        db.documents.create_index("sha256_hash")
        db.documents.create_index("content_hash")
        db.documents.create_index("is_deleted")
        db.documents.create_index("approval_status")
        db.favorites.create_index([("user_email", 1), ("document_id", 1)])
        db.recently_viewed.create_index([("user_email", 1), ("viewed_at", -1)])
        db.activity_logs.create_index([("timestamp", -1)])
        print("[INFO] Connected to MongoDB Atlas database:", DB_NAME)
        return db
    except Exception as e:
        print("[WARN] MongoDB Atlas connection error in get_mongo_db():", e)
        return None


def serialize_doc(doc):
    if not doc:
        return None
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


def serialize_docs(cursor):
    return [serialize_doc(d) for d in cursor]
