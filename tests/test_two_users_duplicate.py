import sys
import os
import io
import asyncio
from pathlib import Path
from datetime import datetime, timezone
from bson import ObjectId

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
import mongo
import main
from fastapi import UploadFile, HTTPException

async def test_two_users():
    db = mongo.get_mongo_db()
    
    # 1. Create a subject with duplicate allowed = False
    sub_code = "TESTDUP" + str(int(datetime.now().timestamp()))[-4:]
    s_res = db.subjects.insert_one({
        "subject_code": sub_code,
        "subject_name": "Duplicate Test Subject",
        "description": "Testing cross-user duplicate block",
        "teacher_id": "t_dup_01",
        "teacher_name": "Prof Dup",
        "teacher_email": "prof_dup@test.edu",
        "allow_duplicate_submissions": False,
        "created_at": datetime.now(timezone.utc)
    })
    sub_id = str(s_res.inserted_id)

    # Enroll user1 and user2
    u1_email = "student1@test.edu"
    u2_email = "student2@test.edu"
    db.enrollments.insert_many([
        {"subject_id": sub_id, "student_email": u1_email, "student_name": "Student One"},
        {"subject_id": sub_id, "student_email": u2_email, "student_name": "Student Two"}
    ])

    # Create assignment
    asg_res = db.assignments.insert_one({
        "subject_id": sub_id,
        "title": "Assignment Dup Test",
        "instructions": "Submit work",
        "max_marks": 100.0,
        "deadline": "2028-12-31T23:59:59Z",
        "permitted_formats": [".pdf", ".docx", ".txt"],
        "allow_late": True,
        "allow_duplicate_submissions": False,
        "status": "Published",
        "created_at": datetime.now(timezone.utc)
    })
    asg_id = str(asg_res.inserted_id)

    # Student 1 submits File A
    file_bytes = b"%PDF-1.4\nUnique assignment content written by Student 1 for testing duplicates."
    f1 = UploadFile(filename="Student1_Work.pdf", file=io.BytesIO(file_bytes), headers={"content-type": "application/pdf"})
    
    sub1 = await main.submit_assignment(
        assignment_id=asg_id,
        file=f1,
        student_email=u1_email,
        student_name="Student One"
    )
    print("✓ Student 1 submitted successfully:", sub1["submission"]["id"])

    # Student 2 submits the SAME binary content with a DIFFERENT filename
    f2 = UploadFile(filename="Student2_DifferentName.pdf", file=io.BytesIO(file_bytes), headers={"content-type": "application/pdf"})
    u2_blocked = False
    try:
        await main.submit_assignment(
            assignment_id=asg_id,
            file=f2,
            student_email=u2_email,
            student_name="Student Two"
        )
        print("❌ FAIL: Student 2 was NOT blocked!")
    except HTTPException as e:
        print("✓ Student 2 blocked with status:", e.status_code, e.detail)
        u2_blocked = (e.status_code == 409)

    # Cleanup
    db.subjects.delete_one({"_id": ObjectId(sub_id)})
    db.enrollments.delete_many({"subject_id": sub_id})
    db.assignments.delete_one({"_id": ObjectId(asg_id)})
    db.submissions.delete_many({"assignment_id": asg_id})
    db.documents.delete_many({"subject_id": sub_id})

    assert u2_blocked, "Student 2 must be blocked when submitting identical file bytes!"
    print("Test passed!")

if __name__ == "__main__":
    asyncio.run(test_two_users())
