import re
from typing import List, Dict, Optional, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Baseline synthetic training samples for categorization
TRAINING_SAMPLES = [
    # Fees & Refund
    ("Institution refuses to refund 50000 caution deposit after course completion despite multiple requests", "Fees & Refund"),
    ("Demanding capitation fee and excess tuition fees above AICTE fee committee guidelines", "Fees & Refund"),
    ("Withheld original certificates and marksheets because examination fee not paid twice", "Fees & Refund"),
    ("Hostel and mess fee collected for entire semester during lockdown with zero refund provided", "Fees & Refund"),
    ("College charging illegal building development fee of 40000 rupees without receipt", "Fees & Refund"),
    
    # Infrastructure & Facilities
    ("Computer science labs lack working computers, only 10 working systems for 120 enrolled students", "Infrastructure & Facilities"),
    ("Library has outdated textbooks from 2005, no digital library access or internet facility", "Infrastructure & Facilities"),
    ("Chemistry and mechanical engineering laboratories lack required safety equipment, fire extinguishers missing", "Infrastructure & Facilities"),
    ("Hostel drinking water contaminated, sewage leakage near mess dining area causing health risk", "Infrastructure & Facilities"),
    ("No ramps or elevators for physically challenged students violating accessibility norms", "Infrastructure & Facilities"),

    # Faculty & Staff Irregularities
    ("Faculty members not paid AICTE 7th Pay Commission scale salaries for past 6 months", "Faculty & Staff Irregularities"),
    ("College using ghost faculty members who only appear during inspection days and do not teach", "Faculty & Staff Irregularities"),
    ("Underqualified adjunct lecturers taking core M.Tech subjects without PhD or required credentials", "Faculty & Staff Irregularities"),
    ("Management terminated senior professor without notice or inquiry committee after whistleblowing", "Faculty & Staff Irregularities"),
    ("Faculty forced to do non-academic marketing and admission promotion drives", "Faculty & Staff Irregularities"),

    # Approvals & Misrepresentation
    ("College running unapproved B.Tech Artificial Intelligence batch with false AICTE approval claim", "Approvals & Misrepresentation"),
    ("Admitted 180 students against approved intake of 120 in Computer Science department", "Approvals & Misrepresentation"),
    ("College website falsely claims NBA and NAAC A++ accreditation when accreditation expired in 2022", "Approvals & Misrepresentation"),
    ("Operating unauthorized off-campus center in rented commercial building without AICTE sanction", "Approvals & Misrepresentation"),
    ("Fraudulent land and building certificates submitted during annual extension approval", "Approvals & Misrepresentation"),

    # Harassment & Ragging
    ("Severe ragging incident in boys hostel block B by senior students, warden ignored complaint", "Harassment & Ragging"),
    ("Internal Complaints Committee non-functional, sexual harassment complaint by research scholar ignored", "Harassment & Ragging"),
    ("Department HOD threatening students with failing internal marks and attendance debarment", "Harassment & Ragging"),
    ("Caste discrimination by faculty during lab viva and project grading", "Harassment & Ragging"),
    ("Physical altercation and intimidation by campus security guards against student union representatives", "Harassment & Ragging"),

    # Academics & Examination
    ("Semester exam results delayed by 5 months preventing students from applying for campus jobs", "Academics & Examination"),
    ("Continuous internal assessment marks manipulated by college administration arbitrarily", "Academics & Examination"),
    ("Mandatory syllabus 40% untaught before end semester university practical examinations", "Academics & Examination"),
    ("Dean cancelled internship credits arbitrarily without prior intimation to students", "Academics & Examination"),
    ("Question paper leak during mid-term examination and administration refused re-examination", "Academics & Examination"),
]

BUREAU_MAPPING = {
    "Fees & Refund": ("FB", "Finance Bureau", 4),
    "Infrastructure & Facilities": ("ADMIN", "Administration Bureau", 5),
    "Faculty & Staff Irregularities": ("FDC", "Faculty Development Cell", 3),
    "Approvals & Misrepresentation": ("AB", "Approval Bureau", 1),
    "Harassment & Ragging": ("GRC", "Grievance Redressal Cell", 6),
    "Academics & Examination": ("PAP", "Policy & Academic Planning Bureau", 2),
    "Other": ("RB", "Regulation Bureau", 7),
}

CRITICAL_KEYWORDS = [
    "ragging", "suicide", "physical assault", "fir", "police", "sexual harassment",
    "threat", "violence", "extortion", "life threatening", "emergency"
]

class AICTEIntelligenceService:
    def __init__(self):
        self.categories = list(set([y for _, y in TRAINING_SAMPLES]))
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=1000, stop_words="english")
        texts = [x for x, _ in TRAINING_SAMPLES]
        labels = [y for _, y in TRAINING_SAMPLES]
        
        try:
            X = self.vectorizer.fit_transform(texts)
            self.classifier = LogisticRegression(C=1.0, max_iter=200)
            self.classifier.fit(X, labels)
            self.is_trained = True
        except Exception as e:
            print(f"Warning: ML classifier init failed: {e}. Falling back to keyword heuristics.")
            self.is_trained = False

    def predict_category(self, text: str) -> Tuple[str, float]:
        text_lower = text.lower()
        
        # Rule-based safety overrides for high-sensitivity categories
        if any(w in text_lower for w in ["ragging", "harassment", "caste", "assault", "icc"]):
            return ("Harassment & Ragging", 0.96)
        if any(w in text_lower for w in ["fee", "refund", "deposit", "capitation", "money", "receipt"]):
            return ("Fees & Refund", 0.94)
        if any(w in text_lower for w in ["intake", "unapproved", "approval", "sanction", "affiliation", "nba", "naac"]):
            return ("Approvals & Misrepresentation", 0.93)
        if any(w in text_lower for w in ["salary", "ghost faculty", "adjunct", "7th pay", "termination"]):
            return ("Faculty & Staff Irregularities", 0.92)
        if any(w in text_lower for w in ["lab", "computer", "library", "hostel water", "building", "fire extinguisher"]):
            return ("Infrastructure & Facilities", 0.91)
        if any(w in text_lower for w in ["exam", "results", "marks", "internship", "syllabus", "delay"]):
            return ("Academics & Examination", 0.90)

        # Scikit-learn ML fallback
        if self.is_trained:
            try:
                vec = self.vectorizer.transform([text])
                probs = self.classifier.predict_proba(vec)[0]
                best_idx = np.argmax(probs)
                category = self.classifier.classes_[best_idx]
                confidence = round(float(probs[best_idx]), 3)
                if confidence < 0.35:
                    return ("Other", 0.50)
                return (category, confidence)
            except Exception:
                pass
        
        return ("Other", 0.60)

    def suggest_bureau(self, category: str) -> Dict[str, any]:
        code, name, bureau_id = BUREAU_MAPPING.get(category, ("RB", "Regulation Bureau", 7))
        return {
            "bureau_code": code,
            "bureau_name": name,
            "bureau_id": bureau_id
        }

    def suggest_priority(self, severity: str, text: str) -> str:
        text_lower = text.lower()
        if any(k in text_lower for k in CRITICAL_KEYWORDS) or severity.upper() == "HIGH":
            return "URGENT"
        if severity.upper() == "LOW":
            return "LOW"
        return "NORMAL"

    def detect_duplicate(self, new_text: str, existing_complaints: List[Dict[str, str]]) -> Dict[str, any]:
        """
        Calculates cosine similarity between new_text and recent existing complaints from the same institution.
        """
        if not existing_complaints:
            return {"is_duplicate": False, "score": 0.0, "duplicate_ref": None}
        
        try:
            corpus = [new_text] + [c["description"] for c in existing_complaints]
            vec = TfidfVectorizer(stop_words="english", max_features=500)
            tfidf_matrix = vec.fit_transform(corpus)
            similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])[0]
            
            max_idx = int(np.argmax(similarities))
            max_score = float(similarities[max_idx])
            
            if max_score >= 0.60:
                matching_ref = existing_complaints[max_idx]["reference_id"]
                return {
                    "is_duplicate": True,
                    "score": round(max_score, 3),
                    "duplicate_ref": matching_ref
                }
        except Exception:
            pass

        return {"is_duplicate": False, "score": 0.0, "duplicate_ref": None}

    def generate_summary(self, text: str, category: str, severity: str) -> str:
        """
        Extractive concise summary highlighting issue, context and urgency.
        """
        sentences = [s.strip() for s in re.split(r'[.!?\n]', text) if len(s.strip()) > 15]
        if not sentences:
            return f"Complaint regarding {category} with {severity} severity."
        
        first_sentence = sentences[0]
        if len(first_sentence) > 140:
            first_sentence = first_sentence[:137] + "..."
            
        summary = f"[{category.upper()} | {severity}] {first_sentence}"
        if len(sentences) > 1:
            second_sentence = sentences[1]
            if len(second_sentence) > 100:
                second_sentence = second_sentence[:97] + "..."
            summary += f" Key detail: {second_sentence}"
            
        return summary

ai_service = AICTEIntelligenceService()
