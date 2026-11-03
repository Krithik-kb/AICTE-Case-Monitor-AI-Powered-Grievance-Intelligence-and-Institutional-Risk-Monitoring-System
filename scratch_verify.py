import urllib.request
import urllib.error
import json
import sys

BASE_API = "http://127.0.0.1:8000"
BASE_WEB = "http://localhost:3000"

def test_request(method, url, headers=None, data=None):
    if headers is None:
        headers = {}
    req = urllib.request.Request(url, method=method)
    for k, v in headers.items():
        req.add_header(k, v)
    if data is not None:
        if isinstance(data, dict):
            body = json.dumps(data).encode("utf-8")
            req.add_header("Content-Type", "application/json")
        elif isinstance(data, str):
            body = data.encode("utf-8")
        else:
            body = data
        req.data = body
    
    try:
        with urllib.request.urlopen(req) as resp:
            resp_body = resp.read().decode("utf-8")
            return resp.status, resp_body
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")
    except Exception as e:
        return 0, str(e)

print("=== 1. VERIFYING PUBLIC USER RESTRICTIONS & ENDPOINTS ===")

# A. Public can fetch public institutions list
status, body = test_request("GET", f"{BASE_API}/api/public/institutions?limit=5")
print(f"GET /api/public/institutions -> Status: {status}")
assert status == 200, f"Expected 200, got {status}: {body}"
insts_resp = json.loads(body)
insts = insts_resp.get("items", [])
print(f"  Successfully retrieved {len(insts)} public institutions. Sample: {insts[0]['name']}")
sample_inst_id = insts[0]['id']

# B. Public CANNOT fetch executive dashboard summary without auth
status, body = test_request("GET", f"{BASE_API}/api/dashboard/summary")
print(f"GET /api/dashboard/summary (No Auth) -> Status: {status}")
assert status == 401, f"Expected 401 Unauthorized for public access to dashboard summary, got {status}"
print("  Blocked! Public cannot access executive dashboard data.")

# C. Public CANNOT fetch internal complaints desk without auth
status, body = test_request("GET", f"{BASE_API}/api/complaints")
print(f"GET /api/complaints (No Auth) -> Status: {status}")
assert status == 401, f"Expected 401 Unauthorized for public access to complaints desk, got {status}"
print("  Blocked! Public cannot access internal complaints data.")

# D. Public can lodge a grievance
new_grievance = {
    "complainant_name": "Rohan Deshmukh",
    "complainant_email": "rohan.deshmukh@example.com",
    "complainant_phone": "9876543210",
    "apaar_id": "2026-9812-4501",
    "institution_id": sample_inst_id,
    "state": "Maharashtra",
    "district": "Pune",
    "category": "FACULTY_HARASSMENT",
    "severity": "HIGH",
    "description": "The department is withholding end-semester hall tickets demanding an unauthorized lab maintenance fee despite previous AICTE notifications.",
    "is_anonymous": False,
    "evidence_files": [
        {
            "name": "fee_receipt_demand.pdf",
            "type": "application/pdf",
            "size_kb": 245
        }
    ]
}

status, body = test_request("POST", f"{BASE_API}/api/public/submit", data=new_grievance)
print(f"POST /api/public/submit -> Status: {status}")
assert status == 200, f"Expected 200, got {status}: {body}"
resp_data = json.loads(body)
reference_id = resp_data.get("reference_id")
print(f"  Grievance submitted successfully! Reference ID: {reference_id}")
print(f"  Assigned Bureau: {resp_data.get('assigned_bureau')}")

# E. Public can track grievance using Ref ID
status, body = test_request("GET", f"{BASE_API}/api/public/track/{reference_id}")
print(f"GET /api/public/track/{reference_id} -> Status: {status}")
assert status == 200, f"Expected 200, got {status}: {body}"
track_data = json.loads(body)
print(f"  Tracking verified! Status: {track_data.get('status')}, Timeline Events: {len(track_data.get('timeline', []))}")
print(f"  Institution: {track_data.get('institution_name')}, APAAR Verified: {track_data.get('is_apaar_verified')}")

print("\n=== 2. VERIFYING OFFICIAL & ADMIN CONTROL ===")

# A. Admin Login
login_payload = {
    "email": "admin@aicte.gov.in",
    "password": "AdminPassword@2026"
}
status, body = test_request("POST", f"{BASE_API}/api/auth/login", data=login_payload)
print(f"POST /api/auth/login (Admin) -> Status: {status}")
assert status == 200, f"Expected 200, got {status}: {body}"
admin_token = json.loads(body)["access_token"]
print("  Admin token acquired.")

admin_headers = {"Authorization": f"Bearer {admin_token}"}

# B. Admin accesses Executive Dashboard Summary
status, body = test_request("GET", f"{BASE_API}/api/dashboard/summary", headers=admin_headers)
print(f"GET /api/dashboard/summary (Admin Auth) -> Status: {status}")
assert status == 200, f"Expected 200, got {status}: {body}"
dash_data = json.loads(body)
print(f"  Total complaints monitored: {dash_data['metrics']['total_complaints']}")
print(f"  Priority queue items: {len(dash_data['priority_queue'])}")
print(f"  Bureaus tracked: {len(dash_data['bureau_distribution'])}")

# C. Bureau Officer Login
officer_payload = {
    "email": "officer.ab@aicte.gov.in",
    "password": "OfficerPassword@2026"
}
status, body = test_request("POST", f"{BASE_API}/api/auth/login", data=officer_payload)
print(f"POST /api/auth/login (Bureau Officer) -> Status: {status}")
assert status == 200, f"Expected 200, got {status}: {body}"
officer_token = json.loads(body)["access_token"]
print("  Bureau Officer token acquired.")

officer_headers = {"Authorization": f"Bearer {officer_token}"}

# D. Officer accesses Complaints Desk
status, body = test_request("GET", f"{BASE_API}/api/complaints?limit=10", headers=officer_headers)
print(f"GET /api/complaints (Officer Auth) -> Status: {status}")
assert status == 200, f"Expected 200, got {status}: {body}"
complaints_data = json.loads(body)
print(f"  Complaints retrieved: {len(complaints_data.get('items', []))}")

# E. Officer accesses SLA overview
status, body = test_request("GET", f"{BASE_API}/api/sla/overview", headers=officer_headers)
print(f"GET /api/sla/overview (Officer Auth) -> Status: {status}")
assert status == 200, f"Expected 200, got {status}: {body}"
sla_data = json.loads(body)
print(f"  SLA Compliance rate: {sla_data.get('summary', {}).get('overall_sla_compliance_rate')}%")

print("\n=== 3. VERIFYING WEB FRONTEND ROUTES ===")
for path in ["/public", "/track", "/login"]:
    status, _ = test_request("GET", f"{BASE_WEB}{path}")
    print(f"GET {BASE_WEB}{path} -> Status: {status}")
    assert status == 200, f"Expected 200 for {path}, got {status}"

print("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<")
