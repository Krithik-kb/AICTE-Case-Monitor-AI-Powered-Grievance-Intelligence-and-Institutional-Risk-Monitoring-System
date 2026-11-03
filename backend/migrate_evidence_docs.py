import sqlite3
import random
from datetime import datetime, timezone, timedelta

CATEGORY_DOCUMENTS = {
    "Fees & Refund": [
        ("Fee_Receipt_Tuition_Term1.pdf", 420, "application/pdf"),
        ("Admission_Cancellation_Refund_Request.pdf", 185, "application/pdf"),
        ("Bank_Payment_Transaction_Challan.pdf", 310, "application/pdf")
    ],
    "Infrastructure & Facilities": [
        ("Computer_Lab_Shortage_Inspection_Photo.jpg", 1450, "image/jpeg"),
        ("Hostel_Sanitation_Deficiency_Record.pdf", 280, "application/pdf"),
        ("Library_Resource_Audit_Report.pdf", 390, "application/pdf")
    ],
    "Faculty & Staff Irregularities": [
        ("Salary_Discrepancy_Pay_Slip_Statement.pdf", 240, "application/pdf"),
        ("Faculty_Service_Agreement_Extract.pdf", 510, "application/pdf"),
        ("Teacher_Workload_Log_Sheet.pdf", 330, "application/pdf")
    ],
    "Approvals & Misrepresentation": [
        ("Course_Admission_Brochure_Prospectus.pdf", 2150, "application/pdf"),
        ("AICTE_Mandatory_Disclosure_Discrepancy.pdf", 480, "application/pdf"),
        ("University_Affiliation_Status_Letter.pdf", 295, "application/pdf")
    ],
    "Harassment & Ragging": [
        ("Anti_Ragging_Affidavit_Copy.pdf", 195, "application/pdf"),
        ("Internal_Complaints_Committee_Letter.pdf", 260, "application/pdf"),
        ("Formal_Representation_to_Principal.pdf", 340, "application/pdf")
    ],
    "Academics & Examination": [
        ("Exam_Admit_Card_Withheld_Notice.pdf", 175, "application/pdf"),
        ("Continuous_Internal_Evaluation_Marklist.pdf", 380, "application/pdf"),
        ("Academic_Council_Appeal_Letter.pdf", 290, "application/pdf")
    ],
    "Other": [
        ("Student_Identity_Proof_DigiLocker.pdf", 210, "application/pdf"),
        ("Official_Grievance_Petition_Scan.pdf", 620, "application/pdf")
    ]
}

def migrate_evidence_documents():
    conn = sqlite3.connect('aicte_monitor.db')
    cursor = conn.cursor()

    # Verify table structure
    cursor.execute('PRAGMA table_info(documents)')
    cols = [r[1] for r in cursor.fetchall()]
    print("Documents table columns:", cols)

    # Fetch complaints
    cursor.execute('SELECT id, reference_id, category, submission_date FROM complaints')
    complaints = cursor.fetchall()
    print(f"Total complaints found in database: {len(complaints)}")

    # Clear existing synthetic documents if any to avoid duplicates
    cursor.execute('DELETE FROM documents')
    conn.commit()

    total_docs_created = 0
    now = datetime.now(timezone.utc)

    for cid, ref_id, cat, sub_date in complaints:
        # Give ~70% of complaints between 1 to 3 supporting evidence documents
        if random.random() < 0.70:
            doc_pool = CATEGORY_DOCUMENTS.get(cat, CATEGORY_DOCUMENTS["Other"])
            num_docs = random.choice([1, 1, 2, 2, 3])
            selected = random.sample(doc_pool, min(num_docs, len(doc_pool)))

            for idx, (doc_name, doc_size, doc_type) in enumerate(selected):
                filename = f"{ref_id}_{idx+1}_{doc_name}"
                file_path = f"evidence/{ref_id}/{doc_name}"
                created_at = sub_date or now.isoformat()
                
                cursor.execute('''
                    INSERT INTO documents (
                        complaint_id, filename, original_name, file_path, 
                        file_size_kb, file_type, is_public, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?)
                ''', (cid, filename, doc_name, file_path, doc_size, doc_type, created_at))
                total_docs_created += 1

    conn.commit()
    print(f"Successfully seeded {total_docs_created} evidence documents across {len(complaints)} complaints.")
    conn.close()

if __name__ == '__main__':
    migrate_evidence_documents()
