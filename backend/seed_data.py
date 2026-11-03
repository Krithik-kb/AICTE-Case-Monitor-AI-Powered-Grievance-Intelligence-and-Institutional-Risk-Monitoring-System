import os
import random
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.models.models import (
    Institution, Bureau, User, Complaint, CaseAction, AuditLog, 
    InspectionRecord, LegalCase, ApprovalHistory, Document,
    UserRole, ComplaintSeverity, ComplaintStatus, ActionType
)
from app.core.security import get_password_hash
from app.services.sla_service import calculate_sla_deadline
from app.services.ai_service import ai_service

# Indian States & Cities
INDIAN_STATES_DATA = [
    ("Delhi", "New Delhi"),
    ("Maharashtra", "Pune"),
    ("Maharashtra", "Mumbai Suburban"),
    ("Maharashtra", "Nagpur"),
    ("Karnataka", "Bengaluru Urban"),
    ("Karnataka", "Mysuru"),
    ("Tamil Nadu", "Chennai"),
    ("Tamil Nadu", "Coimbatore"),
    ("Tamil Nadu", "Tiruchirappalli"),
    ("Uttar Pradesh", "Noida"),
    ("Uttar Pradesh", "Lucknow"),
    ("Uttar Pradesh", "Kanpur Nagar"),
    ("Telangana", "Hyderabad"),
    ("Telangana", "Warangal"),
    ("West Bengal", "Kolkata"),
    ("West Bengal", "Howrah"),
    ("Gujarat", "Ahmedabad"),
    ("Gujarat", "Vadodara"),
    ("Kerala", "Thiruvananthapuram"),
    ("Kerala", "Ernakulam"),
    ("Rajasthan", "Jaipur"),
    ("Rajasthan", "Kota"),
    ("Madhya Pradesh", "Bhopal"),
    ("Madhya Pradesh", "Indore"),
    ("Punjab", "Mohali"),
    ("Punjab", "Ludhiana"),
    ("Odisha", "Bhubaneswar"),
    ("Andhra Pradesh", "Visakhapatnam"),
    ("Andhra Pradesh", "Vijayawada"),
    ("Haryana", "Gurugram"),
    ("Haryana", "Faridabad"),
    ("Bihar", "Patna"),
    ("Assam", "Guwahati"),
    ("Jharkhand", "Ranchi"),
    ("Uttarakhand", "Dehradun"),
    ("Himachal Pradesh", "Shimla"),
    ("Goa", "North Goa"),
    ("Jammu and Kashmir", "Srinagar"),
    ("Chandigarh", "Chandigarh"),
    ("Puducherry", "Puducherry"),
]

BUREAUS_DATA = [
    {
        "code": "AB",
        "name": "Approval Bureau",
        "description": "Processes new institute approvals, course extensions, intake variations, and affiliation compliance.",
        "lead_officer_name": "Dr. Rameshwar Singh (Advisor-I)",
        "contact_email": "ab.head@aicte-india.org"
    },
    {
        "code": "PAP",
        "name": "Policy & Academic Planning Bureau",
        "description": "Formulates model curriculum, examination reforms, academic calendars, and credit transfer regulations.",
        "lead_officer_name": "Prof. Sunita Deshmukh (Advisor-II)",
        "contact_email": "pap.head@aicte-india.org"
    },
    {
        "code": "FDC",
        "name": "Faculty Development Cell",
        "description": "Monitors faculty pay scale implementation, service conditions, teacher training schemes (ATAL), and qualifications.",
        "lead_officer_name": "Dr. Pradeep Narang (Director)",
        "contact_email": "fdc.head@aicte-india.org"
    },
    {
        "code": "FB",
        "name": "Finance Bureau",
        "description": "Oversees institutional fee regulation adherence, non-refund of security deposits, and unauthorized capitation fees.",
        "lead_officer_name": "Shri M. K. Venkataraman (Chief Finance Officer)",
        "contact_email": "finance.bureau@aicte-india.org"
    },
    {
        "code": "ADMIN",
        "name": "Administration Bureau",
        "description": "Audits physical infrastructure, lab machinery, library resources, fire safety, and barrier-free access.",
        "lead_officer_name": "Col. B. S. Rathore (Registrar & Admin Officer)",
        "contact_email": "admin.bureau@aicte-india.org"
    },
    {
        "code": "GRC",
        "name": "Grievance Redressal Cell",
        "description": "Expedites anti-ragging complaints, sexual harassment inquiries (ICC), and student-faculty victimisation matters.",
        "lead_officer_name": "Dr. Ananya Mukherjee (Chief Grievance Officer)",
        "contact_email": "grievance.cell@aicte-india.org"
    },
    {
        "code": "RB",
        "name": "Regulation Bureau",
        "description": "Handles statutory legal disputes, high court writ petitions, RTI escalations, and punitive actions.",
        "lead_officer_name": "Adv. S. Ramanathan (Legal Advisor)",
        "contact_email": "regulation.bureau@aicte-india.org"
    },
    {
        "code": "EGOV",
        "name": "e-Governance Cell",
        "description": "Manages AICTE centralized web portals, portal glitch tickets, DigiLocker verification, and student database sync.",
        "lead_officer_name": "Dr. H. K. Bansal (Head, IT)",
        "contact_email": "egov.cell@aicte-india.org"
    }
]

INSTITUTION_NAMES = [
    ("Apex Institute of Technology and Management", "Engineering & Tech", "NAAC A++", 960),
    ("Vidyapeeth College of Engineering & Research", "Engineering & Tech", "NAAC A+", 720),
    ("Himalayan National Institute of Science", "Central University", "NAAC A++", 1200),
    ("Surya Global Academy of Management & Technology", "Private Autonomous", "NAAC A", 540),
    ("Pragati Polytechnic & Technical Campus", "Polytechnic", "NBA Accredited", 480),
    ("Aryabhatta Institute of Advanced Computing", "Affiliated Engineering College", "NAAC B++", 420),
    ("Bharat Institute of Aeronautical & Marine Sciences", "Deemed University", "NAAC A", 600),
    ("Kaveri Valley College of Pharmacy and Bio-Tech", "Pharmacy & Tech", "NAAC A+", 360),
    ("Indus Institute of Management Studies", "Management", "NAAC A", 300),
    ("Saraswati College of Polytechnic & Vocational Studies", "Polytechnic", "Unaccredited", 240),
    ("Deccan Horizon College of Architecture & Planning", "Architecture", "NAAC B", 180),
    ("Chanakya Institute of Engineering Studies", "Private Autonomous", "NAAC A", 660),
    ("Subhash Chandra Bose Memorial Technical University", "State University", "NAAC A+", 1500),
    ("Tagore Institute of Engineering and Technology", "Affiliated Engineering College", "NAAC B+", 480),
    ("Zenith Institute of Data Sciences & Cyber Security", "Private Autonomous", "NAAC A++", 420),
    ("Ganga Valley Institute of Technology", "Affiliated Engineering College", "NAAC B", 360),
    ("Brahmaputra Engineering College & Research Foundation", "State University", "NAAC A", 840),
    ("Nalanda Modern Institute of Engineering", "Affiliated Engineering College", "NAAC B+", 540),
    ("Thiruvalluvar Institute of Technology", "Affiliated Engineering College", "NAAC A", 780),
    ("Konark Technological Institute", "Affiliated Engineering College", "NAAC B++", 480),
    ("Malwa Institute of Science & Technology", "Affiliated Engineering College", "NAAC B", 360),
    ("Satpura National College of Engineering", "Affiliated Engineering College", "NAAC A", 600),
    ("Aravali Institute of Technical Education", "Private Autonomous", "NAAC B++", 450),
    ("Dronacharya College of Engineering & Management", "Affiliated Engineering College", "NAAC A", 540),
    ("Shivalik Hills Institute of Technology", "Affiliated Engineering College", "NAAC B", 300),
    ("Godavari Institute of Engineering", "Affiliated Engineering College", "NAAC A+", 720),
    ("Vindhya Regional Engineering College", "Affiliated Engineering College", "NAAC B+", 420),
    ("Kalinga Institute of Information Technology & Sciences", "Deemed University", "NAAC A++", 1100),
    ("Rani Laxmibai Memorial Technical Campus", "Affiliated Engineering College", "NAAC B+", 360),
    ("Maharaja Agrasen Institute of Management & Science", "Private Autonomous", "NAAC A", 600),
    ("Chhatrapati Shivaji Institute of Technology", "Affiliated Engineering College", "NAAC A", 660),
    ("Sir C.V. Raman Institute of Technology", "Affiliated Engineering College", "NAAC A+", 780),
    ("Ramanujan College of Computer Applications", "Affiliated Engineering College", "NAAC A", 480),
    ("Visvesvaraya Modern Engineering College", "Affiliated Engineering College", "NAAC A++", 900),
    ("Homi Bhabha Memorial Institute of Nuclear & Mechanical Studies", "Central University", "NAAC A++", 600),
    ("Meghnad Saha Engineering College", "Affiliated Engineering College", "NAAC B++", 480),
    ("Birsa Munda Institute of Mining & Metallurgy", "State University", "NAAC A", 540),
    ("Swami Vivekananda Institute of Science & Humanities", "Affiliated Engineering College", "NAAC B+", 420),
    ("Ashoka Global Institute of Technology", "Private Autonomous", "NAAC A", 600),
    ("Gateway Institute of Engineering & Research", "Affiliated Engineering College", "NAAC B", 360),
]

CATEGORIES_TEMPLATES = {
    "Fees & Refund": [
        ("Institution refuses to refund caution deposit of Rs {amount} after student withdrew admission within designated AICTE time limit.", "HIGH"),
        ("College demanding capitation fee of Rs {amount} disguised as voluntary infrastructure donation fund.", "HIGH"),
        ("Tuition fee collected 30% higher than state fee regulatory committee sanctioned ceiling without approval.", "MEDIUM"),
        ("Withholding original B.Tech degree certificates and grade sheets demanding unjustified library fine of Rs {amount}.", "MEDIUM"),
        ("Hostel mess advance fee of Rs {amount} not adjusted or refunded despite online classes during semester.", "LOW")
    ],
    "Infrastructure & Facilities": [
        ("Computer Science department has only {num} working systems for over 180 enrolled students, internet offline.", "HIGH"),
        ("Core Electrical Engineering laboratory instruments non-functional, students forced to copy lab records.", "MEDIUM"),
        ("Hostel building has severe ceiling seepage, contaminated drinking water supply causing waterborne illness.", "HIGH"),
        ("No wheelchair ramps, elevators, or accessible restrooms for persons with disabilities in academic block.", "MEDIUM"),
        ("Campus fire safety certificate expired 2 years ago, fire extinguishers uninspected and empty.", "HIGH")
    ],
    "Faculty & Staff Irregularities": [
        ("Assistant Professors not paid 7th Central Pay Commission salaries for {months} consecutive months.", "HIGH"),
        ("College listed {num} ghost faculty members on AICTE portal who do not take classes and work in industry.", "HIGH"),
        ("Underqualified post-graduates assigned to teach core PhD coursework without doctoral credentials.", "MEDIUM"),
        ("Senior faculty member dismissed summarily without formal disciplinary inquiry or committee hearing.", "MEDIUM"),
        ("Staff forced to surrender signed blank bank cheques as security deposit to college management.", "HIGH")
    ],
    "Approvals & Misrepresentation": [
        ("College admitted {num} students in Artificial Intelligence specialization exceeding sanctioned intake of 60.", "HIGH"),
        ("Marketing brochures and college website falsely display NBA Tier-1 accreditation which expired in 2021.", "HIGH"),
        ("Operating unapproved off-campus satellite study centre in commercial complex without AICTE council sanction.", "HIGH"),
        ("B.Vocational course degrees issued without statutory university affiliation or council clearance.", "MEDIUM"),
        ("Submitting falsified land ownership certificates and building blueprints during annual EOA inspection.", "HIGH")
    ],
    "Harassment & Ragging": [
        ("Severe ragging incident in boys hostel block C by third year seniors; campus anti-ragging squad inactive.", "HIGH"),
        ("Female student lodged formal sexual harassment complaint against department HOD, ICC has not convened in 45 days.", "HIGH"),
        ("Professor openly making discriminatory caste-based remarks during lab evaluations and viva examinations.", "HIGH"),
        ("Student union representatives threatened with expulsion and police action for organising fee protest.", "MEDIUM"),
        ("Mental harassment and threatening of detention marks by project guide demanding personal monetary gifts.", "HIGH")
    ],
    "Academics & Examination": [
        ("End semester examination results delayed by {months} months, causing students to lose multinational placement offers.", "HIGH"),
        ("Continuous internal assessment marks arbitrarily reduced for students who declined optional paid coaching.", "MEDIUM"),
        ("Over 45% of syllabus in Data Structures remained untaught prior to final university board examination.", "MEDIUM"),
        ("Mandatory industrial internship credits cancelled retrospectively without academic council notification.", "LOW"),
        ("Examination question paper contained questions outside sanctioned syllabus curriculum, re-exam refused.", "LOW")
    ],
    "Other": [
        ("College transport bus service charges increased by 100% mid-year without student consultation.", "LOW"),
        ("Canteen food hygiene issues reported repeatedly with unhygienic preparation conditions.", "LOW"),
        ("Grievance redressal portal on college website has been non-functional and showing error 404 for months.", "MEDIUM"),
        ("Unfair library book borrowing quotas imposed restricting access to competitive exam preparation materials.", "LOW")
    ]
}

def seed_database():
    print("[AICTE Case Monitor] Starting database initialization & synthetic data seeding...")
    # Drop and recreate tables to ensure clean seed
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Check if already seeded with at least 300 complaints
        existing_count = db.query(Complaint).count()
        if existing_count >= 300:
            print(f"[AICTE Case Monitor] Database already populated with {existing_count} complaints. Skipping full reseed.")
            return

        print("[AICTE Case Monitor] Populating Bureaus...")
        bureaus = []
        for b_data in BUREAUS_DATA:
            existing = db.query(Bureau).filter(Bureau.code == b_data["code"]).first()
            if not existing:
                bureau = Bureau(**b_data)
                db.add(bureau)
                db.flush()
                bureaus.append(bureau)
            else:
                bureaus.append(existing)
        db.commit()

        print("[AICTE Case Monitor] Populating Demo Users...")
        # Demo Users
        users_to_seed = [
            {
                "email": "admin@aicte.gov.in",
                "password": "AdminPassword@2026",
                "full_name": "Dr. Arvind Kumar (Central Admin)",
                "role": UserRole.ADMIN.value,
                "bureau_id": None,
                "designation": "Member Secretary / Chief Administrator"
            },
            {
                "email": "officer.ab@aicte.gov.in",
                "password": "OfficerPassword@2026",
                "full_name": "Smt. Ritu Sharma (Approval Bureau Officer)",
                "role": UserRole.BUREAU_OFFICER.value,
                "bureau_id": bureaus[0].id, # Approval Bureau
                "designation": "Senior Evaluation Officer"
            },
            {
                "email": "officer.grc@aicte.gov.in",
                "password": "OfficerPassword@2026",
                "full_name": "Dr. Ananya Mukherjee (Grievance Cell Officer)",
                "role": UserRole.BUREAU_OFFICER.value,
                "bureau_id": bureaus[5].id, # Grievance Redressal Cell
                "designation": "Deputy Director, Grievances"
            },
            {
                "email": "viewer@aicte.gov.in",
                "password": "ViewerPassword@2026",
                "full_name": "Shri Rajesh Verma (Public Ombudsman / Viewer)",
                "role": UserRole.VIEWER.value,
                "bureau_id": None,
                "designation": "AICTE Transparency & Monitoring Auditor"
            }
        ]

        seeded_users = []
        for u_data in users_to_seed:
            existing = db.query(User).filter(User.email == u_data["email"]).first()
            if not existing:
                u = User(
                    email=u_data["email"],
                    hashed_password=get_password_hash(u_data["password"]),
                    full_name=u_data["full_name"],
                    role=u_data["role"],
                    bureau_id=u_data["bureau_id"],
                    designation=u_data["designation"]
                )
                db.add(u)
                db.flush()
                seeded_users.append(u)
            else:
                seeded_users.append(existing)
        db.commit()

        print("[AICTE Case Monitor] Populating 40 Fictional Institutions...")
        institutions = []
        for idx, (name, inst_type, grade, intake) in enumerate(INSTITUTION_NAMES):
            state_pair = INDIAN_STATES_DATA[idx % len(INDIAN_STATES_DATA)]
            code = f"1-{10000000 + idx * 739}"
            
            # Base monitoring score
            base_score = 88.0 - (idx % 7) * 3.5
            risk_level = "LOW"
            if base_score < 70:
                risk_level = "HIGH"
            elif base_score < 80:
                risk_level = "MODERATE"

            inst = Institution(
                code=code,
                name=f"[SYNTHETIC] {name}",
                state=state_pair[0],
                district=state_pair[1],
                institution_type=inst_type,
                approved_intake=intake,
                nirf_rank=None if idx > 25 else (idx * 5 + 12),
                accreditation_grade=grade,
                address=f"Campus Plot #{101 + idx}, Institutional Area, Sector {12 + (idx%8)}, {state_pair[1]}, {state_pair[0]}",
                contact_email=f"registrar.inst{idx+1}@fictional-aicte.edu.in",
                contact_phone=f"+91 11 {28000000 + idx * 111}",
                monitoring_score=round(base_score, 1),
                monitoring_risk_level=risk_level
            )
            db.add(inst)
            db.flush()
            institutions.append(inst)

            # Add related Inspection Record for first 20 institutions
            if idx < 20:
                insp = InspectionRecord(
                    institution_id=inst.id,
                    inspection_type="Surprise Grievance Verification" if idx % 2 == 0 else "Annual Quality Audit",
                    inspection_date=datetime.now(timezone.utc) - timedelta(days=random.randint(20, 180)),
                    committee_lead=f"Prof. K. N. Rao (AICTE Expert Committee #{idx+1})",
                    findings_summary=f"Inspected lab facilities, teacher payroll records, and student feedback registers. Deficiencies noted in 2 faculty cadres.",
                    status="COMPLIANT" if idx % 3 != 0 else "DEFICIENCIES_NOTED",
                    deficiency_items="Cadre ratio deficiency; library book shortage" if idx % 3 == 0 else "None",
                    recommendations="Issue standard 30-day compliance notice to governing board."
                )
                db.add(insp)

            # Add Legal Case for some institutions
            if idx in [2, 5, 11, 19, 24, 33]:
                legal = LegalCase(
                    institution_id=inst.id,
                    case_number=f"WP(C)-{2400 + idx}/2025",
                    court_name="High Court of Delhi" if idx % 2 == 0 else "High Court of Judicature at Bombay",
                    case_type="Writ Petition (Civil)",
                    status="PENDING" if idx % 2 == 0 else "DISPOSED",
                    summary="Petition challenging regulatory reduction of intake for 2025-26 academic session.",
                    filing_date=datetime.now(timezone.utc) - timedelta(days=random.randint(60, 300)),
                    next_hearing_date=datetime.now(timezone.utc) + timedelta(days=random.randint(10, 45)) if idx % 2 == 0 else None
                )
                db.add(legal)

            # Add Approval History
            for yr in ["2024-25", "2025-26"]:
                appr = ApprovalHistory(
                    institution_id=inst.id,
                    academic_year=yr,
                    approval_status="APPROVED" if idx % 5 != 0 else "EXTENSION_GRANTED",
                    approved_courses_count=random.randint(4, 12),
                    total_sanctioned_intake=intake,
                    deficiency_count=0 if idx % 4 != 0 else 2,
                    remarks="Extension of approval granted under clause 1.4 of Approval Process Handbook."
                )
                db.add(appr)

        db.commit()

        print("[AICTE Case Monitor] Generating 340+ Synthetic Complaints with Realistic SLA & Case Actions...")
        statuses = [
            ComplaintStatus.SUBMITTED.value,
            ComplaintStatus.UNDER_REVIEW.value,
            ComplaintStatus.INVESTIGATION.value,
            ComplaintStatus.ACTION_TAKEN.value,
            ComplaintStatus.RESOLVED.value,
            ComplaintStatus.REJECTED.value,
        ]

        categories_list = list(CATEGORIES_TEMPLATES.keys())
        
        # Track repeat complaints count per institution
        inst_repeat_counter = {}

        now = datetime.now(timezone.utc)

        # Generate 340 complaints
        total_to_generate = 340
        for i in range(1, total_to_generate + 1):
            inst = random.choice(institutions)
            cat = random.choice(categories_list)
            template_tuple = random.choice(CATEGORIES_TEMPLATES[cat])
            
            # Format text
            raw_text = template_tuple[0].format(
                amount=random.choice([25000, 45000, 60000, 85000, 120000]),
                num=random.choice([8, 12, 16, 24, 75]),
                months=random.choice([3, 4, 6, 8])
            )
            severity = template_tuple[1]
            
            # Randomize severity variation slightly
            if random.random() < 0.2:
                severity = random.choice(["HIGH", "MEDIUM", "LOW"])

            # Map to assigned bureau
            bureau_sugg = ai_service.suggest_bureau(cat)
            bureau_obj = next((b for b in bureaus if b.code == bureau_sugg["bureau_code"]), bureaus[0])
            
            # Submission date across past 120 days
            days_ago = random.randint(1, 110)
            submission_date = now - timedelta(days=days_ago, hours=random.randint(1, 23), minutes=random.randint(1, 59))
            
            # Calculate deadline
            sla_deadline = calculate_sla_deadline(submission_date, severity)

            # Determine status
            # Some old ones are resolved, some are overdue, some recently submitted
            if days_ago < 3:
                status = random.choice([ComplaintStatus.SUBMITTED.value, ComplaintStatus.UNDER_REVIEW.value])
                resolved_at = None
            elif days_ago > 30 and random.random() < 0.65:
                status = random.choice([ComplaintStatus.RESOLVED.value, ComplaintStatus.ACTION_TAKEN.value])
                resolved_at = submission_date + timedelta(days=random.randint(2, 14))
            elif days_ago > 10 and random.random() < 0.40:
                # Deliberate overdue pending cases
                status = random.choice([ComplaintStatus.UNDER_REVIEW.value, ComplaintStatus.INVESTIGATION.value])
                resolved_at = None
            else:
                status = random.choice(statuses)
                resolved_at = submission_date + timedelta(days=random.randint(2, 12)) if status == ComplaintStatus.RESOLVED.value else None

            # Repeat complaint logic for select institutions
            inst_repeat_counter[inst.id] = inst_repeat_counter.get(inst.id, 0) + 1
            is_repeat = inst_repeat_counter[inst.id] > 3 and random.random() < 0.45
            repeat_num = inst_repeat_counter[inst.id] if is_repeat else 0

            ref_id = f"AICTE-2026-{10000 + i}"

            # AI Predictions & Metadata
            ai_cat, ai_conf = ai_service.predict_category(raw_text)
            ai_priority = ai_service.suggest_priority(severity, raw_text)
            ai_summary = ai_service.generate_summary(raw_text, cat, severity)

            complaint = Complaint(
                reference_id=ref_id,
                institution_id=inst.id,
                complainant_name=None if i % 4 == 0 else f"Complainant #{100 + i}",
                complainant_email=None if i % 4 == 0 else f"student{i}@fictional-domain.in",
                complainant_phone=None if i % 4 == 0 else f"+91 98765{i:05d}",
                is_anonymous=(i % 4 == 0),
                apaar_id=f"2026-{1000 + (i % 8999):04d}-{random.randint(1000, 9999)}" if (i % 4 != 0 and i % 3 != 0) else None,
                is_apaar_verified=(i % 4 != 0 and i % 3 != 0),
                state=inst.state,
                district=inst.district,
                category=cat,
                severity=severity,
                priority=ai_priority,
                assigned_bureau_id=bureau_obj.id,
                status=status,
                submission_date=submission_date,
                sla_deadline=sla_deadline,
                resolved_at=resolved_at,
                description=f"[SYNTHETIC RECORD] {raw_text}",
                is_repeat_complaint=is_repeat,
                repeat_count=repeat_num,
                ai_category_suggested=ai_cat,
                ai_category_confidence=ai_conf,
                ai_bureau_suggested=bureau_obj.name,
                ai_priority_suggested=ai_priority,
                ai_is_duplicate=(i % 17 == 0),
                ai_duplicate_reference_id=f"AICTE-2026-{10000 + max(1, i - 3)}" if (i % 17 == 0) else None,
                ai_duplicate_score=0.78 if (i % 17 == 0) else None,
                ai_summary=ai_summary
            )
            db.add(complaint)
            db.flush()

            # Seed supporting evidence documents for ~65% of complaints
            if (i % 3 != 0):
                doc_templates = [
                    (f"Payment_Receipt_{cat[:4].upper()}_{i}.pdf", random.randint(120, 850), "application/pdf"),
                    (f"Undertaking_Certificate_{i}.pdf", random.randint(180, 420), "application/pdf"),
                    (f"Inspection_Evidence_{i}.jpg", random.randint(650, 1900), "image/jpeg")
                ]
                selected_docs = random.sample(doc_templates, random.choice([1, 1, 2]))
                for d_idx, (d_name, d_size, d_type) in enumerate(selected_docs):
                    doc = Document(
                        complaint_id=complaint.id,
                        filename=f"{ref_id}_{d_idx+1}_{d_name}",
                        original_name=d_name,
                        file_path=f"evidence/{ref_id}/{d_name}",
                        file_size_kb=d_size,
                        file_type=d_type,
                        is_public=True,
                        created_at=submission_date
                    )
                    db.add(doc)

            # Create Initial Case Action (Submission)
            act_submission = CaseAction(
                complaint_id=complaint.id,
                user_id=None,
                action_type=ActionType.SUBMISSION.value,
                old_status=None,
                new_status=ComplaintStatus.SUBMITTED.value,
                comment=f"Complaint lodged via AICTE Centralized Monitoring Portal. Reference ID {ref_id} assigned.",
                is_public=True,
                created_at=submission_date
            )
            db.add(act_submission)

            # If under review or beyond, add assignment & review actions
            if status != ComplaintStatus.SUBMITTED.value:
                assign_time = submission_date + timedelta(hours=random.randint(4, 18))
                act_assign = CaseAction(
                    complaint_id=complaint.id,
                    user_id=seeded_users[1].id,
                    action_type=ActionType.ASSIGNMENT.value,
                    old_status=ComplaintStatus.SUBMITTED.value,
                    new_status=ComplaintStatus.UNDER_REVIEW.value,
                    comment=f"Assigned to {bureau_obj.name} ({bureau_obj.code}) for verification of allegations.",
                    is_public=True,
                    created_at=assign_time
                )
                db.add(act_assign)

            if status in [ComplaintStatus.INVESTIGATION.value, ComplaintStatus.ACTION_TAKEN.value, ComplaintStatus.RESOLVED.value]:
                inv_time = submission_date + timedelta(days=random.randint(1, 4))
                act_inv = CaseAction(
                    complaint_id=complaint.id,
                    user_id=seeded_users[1].id,
                    action_type=ActionType.NOTE_ADDED.value,
                    old_status=ComplaintStatus.UNDER_REVIEW.value,
                    new_status=status,
                    comment=f"Formal inquiry notice issued to Registrar of {inst.name}. Explanation sought within 7 working days.",
                    is_public=True,
                    created_at=inv_time
                )
                db.add(act_inv)

            if status == ComplaintStatus.RESOLVED.value and resolved_at:
                act_res = CaseAction(
                    complaint_id=complaint.id,
                    user_id=seeded_users[0].id,
                    action_type=ActionType.RESOLUTION.value,
                    old_status=ComplaintStatus.ACTION_TAKEN.value,
                    new_status=ComplaintStatus.RESOLVED.value,
                    comment="Institution compliance report verified by Bureau Committee. Corrective refund/action completed to satisfaction of complainant.",
                    is_public=True,
                    created_at=resolved_at
                )
                db.add(act_res)

        # Audit logs for initialization
        log = AuditLog(
            user_id=seeded_users[0].id,
            user_email=seeded_users[0].email,
            action="INITIALIZE_SEED",
            entity_name="Database",
            entity_id="ALL",
            details=f"Synthetic seed script completed with {total_to_generate} complaints and 40 institutions.",
            ip_address="127.0.0.1"
        )
        db.add(log)

        db.commit()
        print(f"[AICTE Case Monitor] Seed successfully finished! Total complaints: {db.query(Complaint).count()}")

    except Exception as e:
        db.rollback()
        print(f"[AICTE Case Monitor] Error during seed: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
