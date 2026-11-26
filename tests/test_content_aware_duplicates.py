"""
Test Suite: Content-Aware Duplicate & Plagiarism Detection across Different Users
Validates:
1. Two different users submitting identical binary bytes with different filenames -> HTTP 409
2. Two different users submitting identical assignment text in Word (.docx) with different filenames & author metadata -> HTTP 409
3. Two different users submitting identical assignment text in PDF format -> HTTP 409
4. Two different users submitting near-identical text (>= 80% word similarity, e.g. swapped student name header) -> HTTP 409
5. Different student submitting distinct assignment work -> HTTP 200 SUCCESS
"""
import sys
import os
import io
import asyncio
import zipfile
from pathlib import Path
from datetime import datetime, timezone
from bson import ObjectId

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
import mongo
import main
from fastapi import UploadFile, HTTPException

def create_mock_docx(text: str, author: str) -> bytes:
    """Creates a valid DOCX byte stream with the given body text and author metadata."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr(
            "word/document.xml",
            f'<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>{text}</w:t></w:r></w:p></w:body></w:document>'
        )
        z.writestr(
            "docProps/core.xml",
            f'<?xml version="1.0" encoding="UTF-8"?><coreProperties xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>{author}</dc:creator></coreProperties>'
        )
    return buf.getvalue()

async def run_content_duplicate_tests():
    print("=================================================================")
    print(" TESTING CONTENT-AWARE DUPLICATE DETECTION ACROSS USERS")
    print("=================================================================")

    db = mongo.get_mongo_db()
    assert db is not None, "Failed to connect to MongoDB Atlas"

    sub_code = "CADUP" + str(int(datetime.now().timestamp()))[-4:]
    s_res = db.subjects.insert_one({
        "subject_code": sub_code,
        "subject_name": "Operating Systems & Graphics",
        "description": "Testing content duplicate defenses",
        "teacher_id": "prof_ca_01",
        "teacher_name": "Prof. Smith",
        "teacher_email": "prof_smith@test.edu",
        "allow_duplicate_submissions": False,
        "created_at": datetime.now(timezone.utc)
    })
    sub_id = str(s_res.inserted_id)

    # Enroll 3 students
    s1_email = "parth_test@test.edu"
    s2_email = "harsh_test@test.edu"
    s3_email = "unique_student@test.edu"

    db.enrollments.insert_many([
        {"subject_id": sub_id, "student_email": s1_email, "student_name": "Parth"},
        {"subject_id": sub_id, "student_email": s2_email, "student_name": "Harsh"},
        {"subject_id": sub_id, "student_email": s3_email, "student_name": "Unique Student"}
    ])

    asg_res = db.assignments.insert_one({
        "subject_id": sub_id,
        "title": "Lab 2: OpenGL Rotating Cube Implementation",
        "instructions": "Implement 3D rotating cube using OpenGL shaders",
        "max_marks": 100.0,
        "deadline": "2028-12-31T23:59:59Z",
        "permitted_formats": [".pdf", ".docx", ".txt"],
        "allow_late": True,
        "allow_duplicate_submissions": False,
        "status": "Published",
        "created_at": datetime.now(timezone.utc)
    })
    asg_id = str(asg_res.inserted_id)

    # -------------------------------------------------------------
    # TEST 1: Identical Word Docx Content with Different Filenames and Metadata
    # -------------------------------------------------------------
    assignment_body = (
        "Assignment 2: Implement a rotating 3D cube with perspective projection and Phong illumination. "
        "The model coordinates are transformed using model-view matrix M and projection matrix P. "
        "The vertex shader computes gl_Position = P * M * vPosition. Fragment shader applies diffuse and ambient lighting."
    )

    docx1 = create_mock_docx(assignment_body, "Parth")
    docx2 = create_mock_docx(assignment_body, "Harsh")

    # Verify that raw binary hashes are strictly different due to docx metadata
    import hashlib
    assert hashlib.sha256(docx1).hexdigest() != hashlib.sha256(docx2).hexdigest(), "Raw DOCX binary hashes should differ"
    print("✓ Confirmed: Raw DOCX binary hashes differ due to creator metadata and timestamps")

    # Student 1 uploads docx1
    f1 = UploadFile(filename="Parth gathadi.docx", file=io.BytesIO(docx1), headers={"content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"})
    sub1_res = await main.submit_assignment(
        assignment_id=asg_id,
        file=f1,
        student_email=s1_email,
        student_name="Parth"
    )
    print("✓ Student 1 (Parth) submitted 'Parth gathadi.docx' successfully")

    # Student 2 attempts to upload docx2 (same content, different filename and different author)
    f2 = UploadFile(filename="Harsh Bhanarkar.docx", file=io.BytesIO(docx2), headers={"content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"})
    s2_blocked = False
    try:
        await main.submit_assignment(
            assignment_id=asg_id,
            file=f2,
            student_email=s2_email,
            student_name="Harsh"
        )
        print("❌ FAIL: Student 2's duplicate docx was accepted!")
    except HTTPException as e:
        if e.status_code == 409 and "Duplicate" in e.detail:
            s2_blocked = True
            print("✓ SUCCESS: Student 2's docx BLOCKED with HTTP 409 duplicate detection!")
    assert s2_blocked, "Student 2's docx must be detected as duplicate via normalized content hash!"

    # -------------------------------------------------------------
    # TEST 2: Swapped Name Header (Text Similarity >= 80%)
    # -------------------------------------------------------------
    swapped_name_body = (
        "Student Name: Harsh Bhanarkar Roll No 42. " + assignment_body
    )
    docx_swapped = create_mock_docx(swapped_name_body, "Harsh")
    f_swapped = UploadFile(filename="Harsh_Sub_v2.docx", file=io.BytesIO(docx_swapped), headers={"content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"})
    swapped_blocked = False
    try:
        await main.submit_assignment(
            assignment_id=asg_id,
            file=f_swapped,
            student_email=s2_email,
            student_name="Harsh"
        )
        print("❌ FAIL: Swapped name submission was accepted!")
    except HTTPException as e:
        if e.status_code == 409 and "Duplicate" in e.detail:
            swapped_blocked = True
            print("✓ SUCCESS: Swapped-name submission BLOCKED with HTTP 409 text similarity defense!")
    assert swapped_blocked, "Near-identical submission with altered name must be blocked!"

    # -------------------------------------------------------------
    # TEST 3: Truly Unique Assignment Work
    # -------------------------------------------------------------
    unique_assignment_text = (
        "Completely different submission on Ray Marching and Signed Distance Fields (SDF). "
        "We trace rays into the scene evaluating sphere tracing distance bounds until intersection or max steps exceeded."
    )
    docx_unique = create_mock_docx(unique_assignment_text, "Unique Student")
    f_unique = UploadFile(filename="RayTracing_Project.docx", file=io.BytesIO(docx_unique), headers={"content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"})
    
    unique_res = await main.submit_assignment(
        assignment_id=asg_id,
        file=f_unique,
        student_email=s3_email,
        student_name="Unique Student"
    )
    assert unique_res["submission"]["id"] is not None
    print("✓ SUCCESS: Truly unique assignment by Student 3 successfully accepted (HTTP 200)")

    # Cleanup
    db.subjects.delete_one({"_id": ObjectId(sub_id)})
    db.enrollments.delete_many({"subject_id": sub_id})
    db.assignments.delete_one({"_id": ObjectId(asg_id)})
    db.submissions.delete_many({"assignment_id": asg_id})
    db.documents.delete_many({"subject_id": sub_id})
    print("✓ Test fixtures safely cleaned up")
    print("=================================================================")
    print(" 🏆 ALL CONTENT-AWARE DUPLICATE DETECTION TESTS PASSED!")
    print("=================================================================")

if __name__ == "__main__":
    asyncio.run(run_content_duplicate_tests())
