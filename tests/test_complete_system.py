import os
import sys
import asyncio
from pathlib import Path
from bson import ObjectId
import io

sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

import mongo
import main
from fastapi import HTTPException, UploadFile

async def run_full_suite():
    print("=====================================================================")
    print("  CAMPUSCONNECT FULL-SPECTRUM RBAC & SYSTEM VERIFICATION SUITE")
    print("=====================================================================")

    db = mongo.get_mongo_db()
    assert db is not None, "Failed to connect to MongoDB"
    print("✓ [DB CONNECT] Connected to MongoDB Atlas: smartrepo")

    # Test fixtures
    s1_email = "e2e_student_alice@smartrepo.edu"
    s2_email = "e2e_student_bob@smartrepo.edu"
    t1_email = "e2e_prof_turing@smartrepo.edu"
    t2_email = "e2e_prof_hopper@smartrepo.edu"
    admin_email = "admin@smartrepo.edu"

    all_test_emails = [s1_email, s2_email, t1_email, t2_email]

    # Pre-test cleanup
    db.users.delete_many({"email": {"$in": all_test_emails}})
    db.teacher_requests.delete_many({"email": {"$in": all_test_emails}})
    db.subjects.delete_many({"teacher_email": {"$in": all_test_emails}})
    db.enrollments.delete_many({"student_email": {"$in": all_test_emails}})
    db.documents.delete_many({"uploaded_by_email": {"$in": all_test_emails}})

    # =================================================================
    # Scenario 1: Public Registration & Unified Common Login
    # =================================================================
    print("\n[Scenario 1] Common Unified Login & Registration:")
    # 1.1 Admin self-registration must be blocked
    admin_reg_blocked = False
    try:
        main.register_user({
            "full_name": "Rogue Admin",
            "email": "rogue@smartrepo.edu",
            "password": "Password123!",
            "role": "Admin"
        })
    except HTTPException as e:
        if e.status_code == 403:
            admin_reg_blocked = True
    assert admin_reg_blocked, "Admin accounts must never be publicly self-registered"
    print("  ✓ Admin self-registration blocked with HTTP 403")

    # 1.2 Student Alice registers -> Immediately active with token
    alice_reg = main.register_user({
        "full_name": "Alice Wonderland",
        "email": s1_email,
        "password": "Password123!",
        "role": "Student"
    })
    assert alice_reg.get("access_token") is not None
    assert alice_reg.get("user", {}).get("status") == "Active"
    print("  ✓ Student Alice registered -> Status Active, JWT issued immediately")

    # 1.3 Alice logs in via common login (only email & password)
    alice_login = main.login({
        "email": s1_email,
        "password": "Password123!"
    })
    assert alice_login.get("access_token") is not None
    assert alice_login.get("user", {}).get("role") == "Student"
    print("  ✓ Student Alice logged in via unified login (no role parameter needed)")

    # 1.4 Student Bob registers -> Active
    main.register_user({
        "full_name": "Bob Builder",
        "email": s2_email,
        "password": "Password123!",
        "role": "Student"
    })
    print("  ✓ Student Bob registered -> Status Active")

    # 1.5 Teacher Turing registers -> Pending approval, no token
    turing_reg = main.register_user({
        "full_name": "Alan Turing",
        "email": t1_email,
        "password": "Password123!",
        "role": "Teacher"
    })
    assert turing_reg.get("access_token") is None
    assert turing_reg.get("pending_approval") is True
    print("  ✓ Teacher Turing registered -> Status Pending, token withheld")

    # 1.6 Teacher Turing attempts to log in -> Blocked with 403
    turing_blocked = False
    try:
        main.login({
            "email": t1_email,
            "password": "Password123!"
        })
    except HTTPException as e:
        if e.status_code == 403 and "pending" in e.detail.lower():
            turing_blocked = True
    assert turing_blocked, "Pending teacher login must be blocked"
    print("  ✓ Pending Teacher login blocked with HTTP 403")

    # 1.7 Admin retrieves teacher approval requests
    requests = main.get_teacher_requests(admin_email)
    assert any(r["email"] == t1_email for r in requests), "Teacher Turing request must appear in admin queue"
    turing_user = next(r for r in requests if r["email"] == t1_email)
    print("  ✓ Admin dashboard receives pending teacher approval request")

    # 1.8 Admin approves Teacher Turing
    approve_res = main.approve_teacher_request(turing_user["id"], {
        "admin_email": admin_email,
        "admin_name": "Administrator"
    })
    assert approve_res.get("status") == "Active"
    print("  ✓ Admin approved Teacher Turing registration")

    # 1.9 Teacher Turing logs in -> Success
    turing_login = main.login({
        "email": t1_email,
        "password": "Password123!"
    })
    assert turing_login.get("access_token") is not None
    assert turing_login.get("user", {}).get("role") == "Teacher"
    print("  ✓ Approved Teacher Turing logged in successfully")

    # Register and approve Teacher Grace Hopper
    main.register_user({
        "full_name": "Grace Hopper",
        "email": t2_email,
        "password": "Password123!",
        "role": "Teacher"
    })
    hopper_doc = db.users.find_one({"email": t2_email})
    main.approve_teacher_request(str(hopper_doc["_id"]), {"admin_email": admin_email})
    print("  ✓ Teacher Hopper registered and approved")

    # =================================================================
    # Scenario 2: Subject-Wise Repository Creation & Authorization
    # =================================================================
    print("\n[Scenario 2] Subject Repository Creation & Authorization:")
    # 2.1 Teacher Turing creates "Operating Systems" (CS-301)
    os_sub = main.create_subject({
        "subject_name": "Operating Systems",
        "subject_code": "CS-301",
        "description": "Kernel architecture, memory paging, and concurrency.",
        "teacher_email": t1_email,
        "teacher_name": "Alan Turing",
        "user_role": "Teacher",
        "allow_duplicate_submissions": False
    })
    os_sub_id = os_sub["subject"]["id"]
    assert os_sub["subject"]["allow_duplicate_submissions"] is False
    print(f"  ✓ Teacher Turing created subject CS-301 (id: {os_sub_id}, duplicate toggle: OFF)")

    # 2.2 Teacher Hopper creates "Compilers" (CS-302)
    comp_sub = main.create_subject({
        "subject_name": "Compiler Design",
        "subject_code": "CS-302",
        "description": "Grammars, LLVM IR, and code optimization.",
        "teacher_email": t2_email,
        "teacher_name": "Grace Hopper",
        "user_role": "Teacher",
        "allow_duplicate_submissions": False
    })
    comp_sub_id = comp_sub["subject"]["id"]
    print(f"  ✓ Teacher Hopper created subject CS-302 (id: {comp_sub_id})")

    # 2.3 Student cannot create a subject
    student_create_fail = False
    try:
        main.create_subject({
            "subject_name": "Student Hack",
            "subject_code": "CS-000",
            "teacher_email": s1_email,
            "user_role": "Student"
        })
    except HTTPException as e:
        if e.status_code == 403:
            student_create_fail = True
    assert student_create_fail
    print("  ✓ Student creation of subject rejected with HTTP 403")

    # 2.4 Teacher Hopper cannot modify Teacher Turing's CS-301 settings
    t2_mod_fail = False
    try:
        main.update_duplicate_setting(os_sub_id, {
            "allow_duplicate_submissions": True,
            "user_email": t2_email,
            "user_role": "Teacher"
        })
    except HTTPException as e:
        if e.status_code == 403:
            t2_mod_fail = True
    assert t2_mod_fail
    print("  ✓ Teacher Hopper blocked from modifying Teacher Turing's subject (HTTP 403)")

    # =================================================================
    # Scenario 3: Student Course Enrollment Enforcement
    # =================================================================
    print("\n[Scenario 3] Student Course Enrollment Enforcement:")
    # 3.1 Student Alice attempts to upload without enrolling -> Rejected
    test_pdf_content = b"%PDF-1.4 Mock lab report submission for process scheduling."
    upload_unauthorized = False
    try:
        f = UploadFile(filename="lab1_scheduling.pdf", file=io.BytesIO(test_pdf_content))
        await main.upload_document(
            file=f,
            uploaded_by_email=s1_email,
            uploaded_by_name="Alice Wonderland",
            uploaded_by_role="Student",
            subject_id=os_sub_id
        )
    except HTTPException as e:
        if e.status_code == 403 and "enroll" in e.detail.lower():
            upload_unauthorized = True
    assert upload_unauthorized, "Upload without prior enrollment must return HTTP 403"
    print("  ✓ Submission without prior enrollment strictly blocked with HTTP 403")

    # 3.2 Student Alice enrolls in CS-301
    enroll_alice = main.enroll_student_in_subject(os_sub_id, {
        "user_email": s1_email,
        "user_role": "Student"
    })
    assert "Successfully enrolled" in enroll_alice.get("message")
    print("  ✓ Student Alice enrolled in CS-301 Operating Systems")

    # 3.3 Duplicate enrollment attempt in CS-301 -> Blocked with 400
    dup_enroll_blocked = False
    try:
        main.enroll_student_in_subject(os_sub_id, {
            "user_email": s1_email,
            "user_role": "Student"
        })
    except HTTPException as e:
        if e.status_code == 400:
            dup_enroll_blocked = True
    assert dup_enroll_blocked
    print("  ✓ Duplicate enrollment in the same course rejected with HTTP 400")

    # 3.4 Student Alice submits document to CS-301 -> Success
    f = UploadFile(filename="lab1_scheduling.pdf", file=io.BytesIO(test_pdf_content))
    alice_up_res = await main.upload_document(
        file=f,
        uploaded_by_email=s1_email,
        uploaded_by_name="Alice Wonderland",
        uploaded_by_role="Student",
        subject_id=os_sub_id
    )
    doc_alice_id = alice_up_res["document_id"]
    print(f"  ✓ Student Alice uploaded document to CS-301 (doc_id: {doc_alice_id})")

    # =================================================================
    # Scenario 4: Configurable SHA-256 Duplicate File Detection
    # =================================================================
    print("\n[Scenario 4] Configurable SHA-256 Duplicate File Detection:")
    # Student Bob enrolls in CS-301
    main.enroll_student_in_subject(os_sub_id, {
        "user_email": s2_email,
        "user_role": "Student"
    })

    # 4.1 Toggle is OFF: Bob uploads exact same file to CS-301 -> Rejected 409
    dup_blocked = False
    try:
        f = UploadFile(filename="lab1_scheduling_copy.pdf", file=io.BytesIO(test_pdf_content))
        await main.upload_document(
            file=f,
            uploaded_by_email=s2_email,
            uploaded_by_name="Bob Builder",
            uploaded_by_role="Student",
            subject_id=os_sub_id
        )
    except HTTPException as e:
        if e.status_code == 409 and "Duplicate file detected" in e.detail:
            dup_blocked = True
    assert dup_blocked, "Identical file in same subject must be rejected when toggle is OFF"
    print("  ✓ Duplicate SHA-256 upload rejected with HTTP 409: 'Duplicate file detected! This document has already been submitted to this subject.'")

    # 4.2 Cross-subject duplicate: Alice enrolls in CS-302 and uploads exact same file -> Allowed
    main.enroll_student_in_subject(comp_sub_id, {
        "user_email": s1_email,
        "user_role": "Student"
    })
    f = UploadFile(filename="lab1_scheduling.pdf", file=io.BytesIO(test_pdf_content))
    cross_sub_res = await main.upload_document(
        file=f,
        uploaded_by_email=s1_email,
        uploaded_by_name="Alice Wonderland",
        uploaded_by_role="Student",
        subject_id=comp_sub_id
    )
    assert cross_sub_res.get("document_id") is not None
    print("  ✓ Cross-subject duplicate allowed: Identical file accepted in different subject CS-302")

    # 4.3 Teacher Turing turns ON duplicate submissions for CS-301
    main.update_duplicate_setting(os_sub_id, {
        "allow_duplicate_submissions": True,
        "user_email": t1_email,
        "user_role": "Teacher"
    })
    print("  ✓ Teacher Turing set 'Allow Duplicate Submissions' to ON for CS-301")

    # 4.4 Bob uploads exact same file to CS-301 with toggle ON -> Allowed
    f = UploadFile(filename="lab1_scheduling_copy.pdf", file=io.BytesIO(test_pdf_content))
    bob_dup_res = await main.upload_document(
        file=f,
        uploaded_by_email=s2_email,
        uploaded_by_name="Bob Builder",
        uploaded_by_role="Student",
        subject_id=os_sub_id
    )
    doc_bob_id = bob_dup_res["document_id"]
    assert doc_bob_id is not None
    print(f"  ✓ Duplicate upload accepted when toggle is ON (doc_id: {doc_bob_id})")

    # =================================================================
    # Scenario 5: Strict RBAC Document Isolation & IDOR Protection
    # =================================================================
    print("\n[Scenario 5] Strict RBAC Document Isolation & IDOR Defense:")
    # 5.1 Alice queries documents -> Sees only her documents, not Bob's
    alice_docs = main.get_documents(user_email=s1_email, user_role="Student")
    alice_doc_ids = [d["id"] for d in alice_docs]
    assert doc_alice_id in alice_doc_ids
    assert doc_bob_id not in alice_doc_ids, "Student Alice must never see Student Bob's files"
    print("  ✓ Student document listing strictly isolated to own uploads")

    # 5.2 Bob queries documents -> Sees only his documents, not Alice's
    bob_docs = main.get_documents(user_email=s2_email, user_role="Student")
    bob_doc_ids = [d["id"] for d in bob_docs]
    assert doc_bob_id in bob_doc_ids
    assert doc_alice_id not in bob_doc_ids, "Student Bob must never see Student Alice's files"
    print("  ✓ Student Bob document listing strictly isolated")

    # 5.3 IDOR attack: Bob tries to preview, get info, and download Alice's doc
    for action_name, test_fn in [
        ("preview", lambda: main.preview_document(document_id=doc_alice_id, user_email=s2_email, user_role="Student")),
        ("info", lambda: main.get_document_info(document_id=doc_alice_id, user_email=s2_email, user_role="Student")),
        ("download", lambda: main.download_document(document_id=doc_alice_id, user_email=s2_email, user_role="Student"))
    ]:
        blocked = False
        try:
            test_fn()
        except HTTPException as e:
            if e.status_code == 403:
                blocked = True
        assert blocked, f"Student IDOR on {action_name} must return 403"
    print("  ✓ Student IDOR attempts on preview, info, and download blocked with HTTP 403")

    # 5.4 Search Isolation: Bob searches "scheduling" -> Alice's document is NOT in results
    bob_search = main.search_documents(q="scheduling", user_email=s2_email, user_role="Student")
    bob_search_ids = [d["id"] for d in bob_search]
    assert doc_alice_id not in bob_search_ids, "Student search must never expose other students' documents"
    print("  ✓ Student search query strictly isolated to own documents")

    # 5.5 Teacher Turing (owns CS-301) can see both Alice's and Bob's submissions to CS-301
    turing_docs = main.get_documents(user_email=t1_email, user_role="Teacher", subject_id=os_sub_id)
    turing_doc_ids = [d["id"] for d in turing_docs]
    assert doc_alice_id in turing_doc_ids and doc_bob_id in turing_doc_ids
    print("  ✓ Teacher Turing can access all student submissions in CS-301")

    # 5.6 Teacher Hopper (does NOT own CS-301) cannot preview Alice's CS-301 doc
    hopper_blocked = False
    try:
        main.preview_document(document_id=doc_alice_id, user_email=t2_email, user_role="Teacher")
    except HTTPException as e:
        if e.status_code == 403:
            hopper_blocked = True
    assert hopper_blocked
    print("  ✓ Teacher Hopper blocked from accessing submissions in Turing's subject (HTTP 403)")

    # 5.7 Admin has global access to all documents
    admin_docs = main.get_documents(user_role="Admin")
    admin_doc_ids = [d["id"] for d in admin_docs]
    assert doc_alice_id in admin_doc_ids and doc_bob_id in admin_doc_ids
    print("  ✓ Admin has unrestricted system-wide access to all documents")

    # Clean up test accounts and files
    db.users.delete_many({"email": {"$in": all_test_emails}})
    db.teacher_requests.delete_many({"email": {"$in": all_test_emails}})
    db.subjects.delete_many({"teacher_email": {"$in": all_test_emails}})
    db.enrollments.delete_many({"student_email": {"$in": all_test_emails}})
    db.documents.delete_many({"uploaded_by_email": {"$in": all_test_emails}})
    print("\n✓ [CLEANUP] Test fixtures safely purged")

    print("\n=====================================================================")
    print("  🏆 100% OF ALL SPECIFICATION & RBAC SCENARIOS PASSED VERIFICATION! 🏆")
    print("=====================================================================")

if __name__ == "__main__":
    asyncio.run(run_full_suite())
