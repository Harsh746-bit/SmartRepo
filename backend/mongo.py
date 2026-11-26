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

def init_db():
    global client, db
    try:
        client = pymongo.MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=6000,
            connectTimeoutMS=6000
        )
        client.admin.command('ping')
        db = client[DB_NAME]
        print("[INFO] Successfully connected to MongoDB Atlas database:", DB_NAME)

        # 1. Users
        db.users.create_index("email", unique=True)
        db.users.create_index("role")
        db.users.create_index("status")

        # 2. Teacher Requests
        db.teacher_requests.create_index("user_id")
        db.teacher_requests.create_index("email")
        db.teacher_requests.create_index("status")

        # 3. Documents
        db.documents.create_index("uploaded_by_email")
        db.documents.create_index("sha256_hash")
        db.documents.create_index("subject_id")
        db.documents.create_index([("subject_id", 1), ("sha256_hash", 1)])
        db.documents.create_index("is_faculty_material")

        # 4. Subjects
        db.subjects.create_index("subject_code", unique=True)
        db.subjects.create_index("teacher_email")
        db.subjects.create_index("department")

        # 5. Enrollments
        db.enrollments.create_index([("student_email", 1), ("subject_id", 1)], unique=True)
        db.enrollments.create_index("student_email")
        db.enrollments.create_index("subject_id")

        # 6. Assignments (CampusConnect 2.0)
        db.assignments.create_index("subject_id")
        db.assignments.create_index("teacher_email")
        db.assignments.create_index("status")
        db.assignments.create_index("deadline")

        # 7. Submissions (CampusConnect 2.0)
        db.submissions.create_index([("assignment_id", 1), ("student_email", 1)])
        db.submissions.create_index([("assignment_id", 1), ("sha256_hash", 1)])
        db.submissions.create_index([("subject_id", 1), ("sha256_hash", 1)])
        db.submissions.create_index("sha256_hash")
        db.submissions.create_index("student_email")
        db.submissions.create_index("verification_status")

        # 8. User RSA Keys (CampusConnect 2.0)
        db.user_keys.create_index("key_id", unique=True)
        db.user_keys.create_index([("user_email", 1), ("is_revoked", 1)])
        db.user_keys.create_index("user_email")

        # 9. Verification Logs & Activity
        db.verification_logs.create_index("submission_id")
        db.verification_logs.create_index([("timestamp", -1)])
        db.favorites.create_index([("user_email", 1), ("document_id", 1)])
        db.recently_viewed.create_index([("user_email", 1), ("viewed_at", -1)])
        db.activity_logs.create_index([("timestamp", -1)])

    except Exception as e:
        print("[WARN] MongoDB Atlas connection error:", e)

init_db()

def get_mongo_db():
    global client, db
    if db is not None:
        return db
    try:
        client = pymongo.MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            maxPoolSize=50,
            minPoolSize=5
        )
        db = client[DB_NAME]
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
