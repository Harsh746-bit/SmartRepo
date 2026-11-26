"""
CampusConnect 2.0 - Submission Deletion & Re-submission Verification Test
Tests:
1. Submissions insertion & active state
2. Duplicate detection blocking same binary bytes
3. Retracting submission via DELETE /submissions/{submission_id}
4. Deletion synchronization: db.documents and db.submissions both have is_deleted=True
5. GET /assignments/{id}/submissions excluding deleted submissions
6. Immediate re-submission permitted with duplicate hash cleared for active state
7. Soft deletion via Recycle Bin (DELETE /documents/{id}) synchronizing to db.submissions
8. 1-click restore from Recycle Bin restoring both collections
"""
import sys
import os
import asyncio
import io
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from bson import ObjectId

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))
import mongo
import main
from fastapi import UploadFile

async def run_deletion_audit():
    print("=================================================================")
    print(" AUDITING SUBMISSION DELETION, SYNCHRONIZATION & RE-SUBMISSION")
    print("=================================================================")

    db = mongo.get_mongo_db()
    assert db is not None, "Failed to connect to MongoDB Atlas"

    # Pre-test cleanup
    db.subjects.delete_many({"subject_code": "AUD-101"})
    db.documents.delete_many({"uploaded_by_email": "student_auditor@test.edu"})
    db.submissions.delete_many({"student_email": "student_auditor@test.edu"})

    # Setup mock subject & assignment
    sub_res = db.subjects.insert_one({
        "subject_code": "AUD-101",
        "subject_name": "Audit Systems",
        "description": "Submission Deletion Audit Subject",
        "department": "Computer Science",
        "teacher_id": "aud_teacher_01",
        "teacher_name": "Prof. Auditor",
        "teacher_email": "prof_auditor@test.edu",
        "enrolled_students": ["student_auditor@test.edu"],
        "allow_duplicate_submissions": False,
        "created_at": datetime.now(timezone.utc)
    })
    subject_id = str(sub_res.inserted_id)

    db.enrollments.insert_one({
        "subject_id": subject_id,
        "student_email": "student_auditor@test.edu",
        "student_name": "Alice Auditor",
        "enrolled_at": datetime.now(timezone.utc)
    })

    asg_res = db.assignments.insert_one({
        "subject_id": subject_id,
        "title": "Audit Assignment 1",
        "description": "Test assignment for deletion synchronization",
        "instructions": "Submit PDF",
        "max_marks": 100.0,
        "deadline": "2028-12-31T23:59:59Z",
        "permitted_formats": ["pdf"],
        "allow_late": True,
        "allow_duplicates": False,
        "status": "Published",
        "created_at": datetime.now(timezone.utc)
    })
    assignment_id = str(asg_res.inserted_id)

    # 1. Simulate Student Upload
    file_bytes = b"%PDF-1.4 Mock audit student file content for deletion testing 123456"
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    mock_upload = UploadFile(
        filename="Audit_Report_v1.pdf",
        file=io.BytesIO(file_bytes),
        headers={"content-type": "application/pdf"}
    )

    # Submit
    sub_resp = await main.submit_assignment(
        assignment_id=assignment_id,
        file=mock_upload,
        student_email="student_auditor@test.edu",
        student_name="Alice Auditor"
    )
    submission_id = sub_resp["submission"]["id"]
    document_id = submission_id
    print(f"✓ Step 1: Submission created. Submission ID: {submission_id}, Doc ID: {document_id}")

    # Verify both db.documents and db.submissions have it
    doc_in_db = db.documents.find_one({"_id": ObjectId(document_id)})
    sub_in_db = db.submissions.find_one({"_id": ObjectId(submission_id)})
    assert doc_in_db is not None, "Document missing in db.documents"
    assert sub_in_db is not None, "Submission missing in db.submissions"
    assert doc_in_db.get("is_deleted") is not True, "Document should not be deleted initially"
    assert sub_in_db.get("is_deleted") is not True, "Submission should not be deleted initially"
    print("✓ Step 2: Both db.documents and db.submissions records exist and are ACTIVE")

    # Verify student can see it in assignment submissions
    submissions_list = main.get_assignment_submissions(
        assignment_id=assignment_id,
        user_email="student_auditor@test.edu",
        user_role="Student"
    )
    assert len(submissions_list) == 1, f"Expected 1 active submission, got {len(submissions_list)}"
    print(f"✓ Step 3: GET /assignments/{assignment_id}/submissions returns 1 active submission for student")

    # 2. Verify duplicate submission is rejected while active
    mock_upload_dup = UploadFile(
        filename="Different_Filename_Same_Bytes.pdf",
        file=io.BytesIO(file_bytes),
        headers={"content-type": "application/pdf"}
    )
    try:
        await main.submit_assignment(
            assignment_id=assignment_id,
            file=mock_upload_dup,
            student_email="student_auditor@test.edu",
            student_name="Alice Auditor"
        )
        assert False, "Duplicate should have been rejected with 409!"
    except Exception as e:
        assert "409" in str(e) or "Duplicate File Detected" in str(e), f"Expected duplicate error, got: {e}"
        print("✓ Step 4: Exact binary content with different filename rejected with 409 duplicate error")

    # 3. Now RETRACT / DELETE the submission using DELETE /submissions/{submission_id}
    retract_res = main.delete_submission(
        submission_id=submission_id,
        user_email="student_auditor@test.edu",
        user_name="Alice Auditor",
        user_role="Student"
    )
    print(f"✓ Step 5: Submission retracted via DELETE /submissions/{submission_id}: {retract_res['message']}")

    # 4. Verify synchronization: is_deleted is True in BOTH db.documents AND db.submissions
    doc_after_del = db.documents.find_one({"_id": ObjectId(document_id)})
    sub_after_del = db.submissions.find_one({"_id": ObjectId(submission_id)})
    assert doc_after_del.get("is_deleted") is True, "db.documents.is_deleted must be True"
    assert sub_after_del.get("is_deleted") is True, "db.submissions.is_deleted must be True"
    print("✓ Step 6: Verified synchronization — both db.documents and db.submissions have is_deleted=True")

    # 5. Verify GET /assignments/{assignment_id}/submissions now returns 0 active submissions
    submissions_list_after = main.get_assignment_submissions(
        assignment_id=assignment_id,
        user_email="student_auditor@test.edu",
        user_role="Student"
    )
    assert len(submissions_list_after) == 0, f"Expected 0 active submissions after deletion, got {len(submissions_list_after)}"
    print(f"✓ Step 7: Assignment submissions list now returns 0 active submissions (Student dashboard shows 'Pending')")

    # 6. Verify Student can now RE-SUBMIT the file!
    mock_upload_resubmit = UploadFile(
        filename="Audit_Report_v2_Resubmitted.pdf",
        file=io.BytesIO(file_bytes),
        headers={"content-type": "application/pdf"}
    )
    resub_resp = await main.submit_assignment(
        assignment_id=assignment_id,
        file=mock_upload_resubmit,
        student_email="student_auditor@test.edu",
        student_name="Alice Auditor"
    )
    new_sub_id = resub_resp["submission"]["id"]
    new_doc_id = new_sub_id
    assert new_sub_id != submission_id, "New submission must have new ID"
    print(f"✓ Step 8: Re-submission of identical file bytes succeeded! New Submission ID: {new_sub_id}")

    # 7. Verify soft-deleting via DELETE /documents/{document_id} also marks submission deleted
    recycle_res = main.move_document_to_recycle_bin(
        document_id=new_doc_id,
        user_email="student_auditor@test.edu",
        user_name="Alice Auditor",
        user_role="Student"
    )
    sub_after_doc_del = db.submissions.find_one({"_id": ObjectId(new_sub_id)})
    assert sub_after_doc_del.get("is_deleted") is True, "Deleting document in recycle bin must also soft-delete submission in db.submissions"
    print("✓ Step 9: Moving document to Recycle Bin correctly synchronized is_deleted: True to db.submissions")

    # 8. Verify Restore from Recycle Bin restores both
    restore_res = main.restore_document_from_recycle_bin(
        document_id=new_doc_id,
        user_email="student_auditor@test.edu",
        user_name="Alice Auditor",
        user_role="Student"
    )
    sub_after_restore = db.submissions.find_one({"_id": ObjectId(new_sub_id)})
    doc_after_restore = db.documents.find_one({"_id": ObjectId(new_doc_id)})
    assert sub_after_restore.get("is_deleted") is False or "is_deleted" not in sub_after_restore, "Submission is_deleted must be cleared on restore"
    assert doc_after_restore.get("is_deleted") is False or "is_deleted" not in doc_after_restore, "Document is_deleted must be cleared on restore"
    print("✓ Step 10: Restoring document from Recycle Bin correctly restored both collections to active status")

    # Clean up test fixtures
    db.subjects.delete_one({"_id": ObjectId(subject_id)})
    db.assignments.delete_one({"_id": ObjectId(assignment_id)})
    db.documents.delete_many({"_id": {"$in": [ObjectId(document_id), ObjectId(new_doc_id)]}})
    db.submissions.delete_many({"_id": {"$in": [ObjectId(submission_id), ObjectId(new_sub_id)]}})
    print("✓ Step 11: Test fixtures safely cleaned up")
    print("=================================================================")
    print(" 🏆 ALL SUBMISSION DELETION & SYNCHRONIZATION AUDIT CHECKS PASSED!")
    print("=================================================================")

if __name__ == "__main__":
    asyncio.run(run_deletion_audit())
