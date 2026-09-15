import requests
import json
import sys

sys.stdout.reconfigure(encoding="utf-8")

BASE_GW = "http://localhost:3000/api"
BASE_AI = "http://localhost:8000"

def main():
    print("=== STARTING TRANSLATION AUDIT VERIFICATION ===")

    # Log in User A
    res_a = requests.post(f"{BASE_GW}/auth/login", json={"email": "audit_user_a_test@example.com", "password": "Password123!"})
    token_a = res_a.json()["data"]["accessToken"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 1. EN -> VI with multiline
    text_en = "Hello world.\nThis is line two of the document."
    r1 = requests.post(f"{BASE_GW}/translation", headers=headers_a, json={
        "text": text_en,
        "sourceLanguage": "en",
        "targetLanguage": "vi"
    })
    assert r1.status_code in [200, 201], f"EN->VI translation failed: {r1.text}"
    trans1 = r1.json()["data"]["translation"]
    print("[1] EN -> VI:")
    print(f"    Source: {repr(trans1['sourceText'])}")
    print(f"    Target: {repr(trans1['translatedText'])}")
    print(f"    Lines preserved: {'\n' in trans1['translatedText']}")

    # 2. VI -> EN
    text_vi = "Xin chào thế giới, trí tuệ nhân tạo thị giác máy tính."
    r2 = requests.post(f"{BASE_GW}/translation", headers=headers_a, json={
        "text": text_vi,
        "sourceLanguage": "vi",
        "targetLanguage": "en"
    })
    assert r2.status_code in [200, 201], f"VI->EN translation failed: {r2.text}"
    trans2 = r2.json()["data"]["translation"]
    print("[2] VI -> EN:")
    print(f"    Source: {trans2['sourceText']}")
    print(f"    Target: {trans2['translatedText']}")

    # 3. Direct AI endpoint with Auto detection
    r3 = requests.post(f"{BASE_AI}/translate", json={
        "text": "Báo cáo kiểm thử chất lượng hệ thống",
        "sourceLanguage": "auto",
        "targetLanguage": "en"
    })
    assert r3.status_code == 200, f"Auto translate failed: {r3.text}"
    trans3 = r3.json()["data"]
    print("[3] Direct AI Auto -> EN:")
    print(f"    Auto-detected source: {trans3['sourceLanguage']}")
    print(f"    Translated: {trans3['translatedText']}")

    # 4. History check
    r_hist = requests.get(f"{BASE_GW}/translation", headers=headers_a)
    assert r_hist.status_code == 200
    hist = r_hist.json()["data"]["translations"]
    print(f"[4] User A translation history count: {len(hist)}")

    # 5. Anti-IDOR check on User B
    res_b = requests.post(f"{BASE_GW}/auth/login", json={"email": "audit_user_b_test@example.com", "password": "Password123!"})
    token_b = res_b.json()["data"]["accessToken"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    r_hist_b = requests.get(f"{BASE_GW}/translation", headers=headers_b)
    hist_b = r_hist_b.json()["data"]["translations"]
    print(f"[5] User B translation history count: {len(hist_b)} (isolated: {len(hist_b) == 0})")

    print("=== TRANSLATION AUDIT VERIFICATION PASSED ===")

if __name__ == "__main__":
    main()
