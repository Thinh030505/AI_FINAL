import requests
import json
import time
import os
import sys
from datetime import datetime

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_GW = "http://localhost:3000/api"
BASE_AI = "http://localhost:8000"

def run_phase8_audit():
    print("==================================================================")
    print("         PHASE 8 AUDIT & MULTIMODAL REGRESSION TEST SUITE        ")
    print("==================================================================")
    results = {}

    # 1. AI Health Verification
    print("\n[1/10] Verifying AI Service Health & Backend Health...")
    r_ai_health = requests.get(f"{BASE_AI}/health", timeout=10)
    assert r_ai_health.status_code == 200, f"AI Health check failed: {r_ai_health.text}"
    ai_h = r_ai_health.json()
    print(f"  ✓ AI Service: ocr={ai_h.get('ocr')}, yolo={ai_h.get('objectDetection')}, seg={ai_h.get('semanticSegmentation')}, vision={ai_h.get('vision')}")
    assert ai_h.get("ocr") is True
    assert ai_h.get("objectDetection") is True
    assert ai_h.get("semanticSegmentation") is True
    assert ai_h.get("vision") is True

    r_gw_health = requests.get(f"{BASE_GW}/health", timeout=10)
    assert r_gw_health.status_code == 200, f"Gateway health check failed: {r_gw_health.text}"
    gw_h = r_gw_health.json()
    print(f"  ✓ Gateway: database={gw_h.get('database')}, ai_service={gw_h.get('ai_service')}")
    assert gw_h.get("database") == "connected"
    assert gw_h.get("ai_service") == "connected"
    results["Health Checks"] = "PASS"

    # 2. Authentication: User A and User B
    print("\n[2/10] Verifying Auth (Login for User A & User B)...")
    res_a = requests.post(f"{BASE_GW}/auth/login", json={"email": "audit_user_a_test@example.com", "password": "Password123!"})
    assert res_a.status_code in [200, 201], f"User A login failed: {res_a.text}"
    token_a = res_a.json()["data"]["accessToken"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    res_b = requests.post(f"{BASE_GW}/auth/login", json={"email": "audit_user_b_test@example.com", "password": "Password123!"})
    assert res_b.status_code in [200, 201], f"User B login failed: {res_b.text}"
    token_b = res_b.json()["data"]["accessToken"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    print("  ✓ User A and User B authenticated successfully")
    results["Auth (Login)"] = "PASS"

    # 3. Smart Camera Upload Simulation (with source='camera' and capturedAt)
    print("\n[3/10] Testing Smart Camera Upload with Source Metadata...")
    now_iso = datetime.now().isoformat() + "Z"
    with open("D:/hocWeb/P_AI/test-images/street.jpg", "rb") as f:
        r_cam_up = requests.post(
            f"{BASE_GW}/images",
            headers=headers_a,
            files={"image": ("camera-capture-20260908-191500.jpg", f, "image/jpeg")},
            data={"source": "camera", "capturedAt": now_iso},
            timeout=30,
        )
    assert r_cam_up.status_code in [200, 201], f"Camera upload failed: {r_cam_up.text}"
    cam_img = r_cam_up.json()["data"]["image"]
    cam_img_id = cam_img["id"]
    print(f"  ✓ Camera image uploaded: ID={cam_img_id}")
    print(f"  ✓ Source: {cam_img.get('source')} | CapturedAt: {cam_img.get('capturedAt')}")
    assert cam_img.get("source") == "camera", "Source metadata not set to 'camera'"
    results["Camera Upload Metadata"] = "PASS"

    # 4. Unified Multimodal AI Analysis on Camera Capture
    print("\n[4/10] Running Full-Stack AI Analysis Pipeline on Camera Image...")
    t0 = time.time()
    r_cam_analysis = requests.post(
        f"{BASE_GW}/image-analysis",
        headers=headers_a,
        json={"imageId": cam_img_id},
        timeout=180,
    )
    analysis_duration = round(time.time() - t0, 2)
    assert r_cam_analysis.status_code in [200, 201], f"Analysis failed: {r_cam_analysis.text}"
    cam_res = r_cam_analysis.json()["data"]["analysis"]
    print(f"  ✓ Analysis completed in {analysis_duration}s (server time: {cam_res['totalProcessingTimeMs']}ms)")
    print(f"  ✓ Status: {cam_res['status']}")
    print(f"  ✓ YOLO Objects ({cam_res['objectDetection']['objectCount']}): {[d['label'] for d in cam_res['objectDetection']['detections']]}")
    print(f"  ✓ SegFormer Top Regions: {[r['label'] + ' (' + str(r['regionPercentage']) + '%)' for r in cam_res['segmentation']['regions'][:3]]}")
    print(f"  ✓ Scene Classification: {cam_res['fusedResult']['sceneType']} / {cam_res['fusedResult']['environment']}")
    print(f"  ✓ Gemini Vision Description: {cam_res['fusedResult']['description'][:120]}...")
    assert cam_res["status"] in ["success", "partial_success"]
    assert cam_res["objectDetection"]["objectCount"] > 0
    results["Unified Camera Analysis"] = "PASS"

    # 5. History Verification (Images & Analysis with Camera Badge attribution)
    print("\n[5/10] Verifying History Integration for Camera Assets...")
    r_imgs_hist = requests.get(f"{BASE_GW}/images", headers=headers_a)
    assert r_imgs_hist.status_code == 200
    images_list = r_imgs_hist.json()["data"]["images"]
    matching_cam_img = next((img for img in images_list if img["id"] == cam_img_id), None)
    assert matching_cam_img is not None, "Camera image not found in image history"
    assert matching_cam_img.get("source") == "camera", "Image source badge mismatch"
    print("  ✓ Camera asset found in /api/images with source='camera'")

    r_analysis_hist = requests.get(f"{BASE_GW}/image-analysis", headers=headers_a)
    assert r_analysis_hist.status_code == 200
    analyses_list = r_analysis_hist.json()["data"]["analyses"]
    matching_analysis = next((a for a in analyses_list if a["imageId"] == cam_img_id), None)
    assert matching_analysis is not None, "Analysis record not found in analysis history"
    assert matching_analysis.get("source") == "camera", "Analysis record source attribution mismatch"
    print("  ✓ Analysis record found in /api/image-analysis with source='camera'")
    results["History Integration"] = "PASS"

    # 6. Anti-IDOR Security Protection
    print("\n[6/10] Verifying Anti-IDOR Security (User B accessing User A image/analysis)...")
    r_idor_img = requests.get(f"{BASE_GW}/images/{cam_img_id}", headers=headers_b)
    assert r_idor_img.status_code in [403, 404], f"IDOR image check failed: status {r_idor_img.status_code}"
    r_idor_analysis = requests.get(f"{BASE_GW}/image-analysis/{cam_res['id']}", headers=headers_b)
    assert r_idor_analysis.status_code in [403, 404], f"IDOR analysis check failed: status {r_idor_analysis.status_code}"
    print(f"  ✓ Anti-IDOR confirmed: User B cannot access User A's camera assets (HTTP {r_idor_analysis.status_code})")
    results["Anti-IDOR Security"] = "PASS"

    # 7. Multi-Test: Printed Text & OCR Translation (doc_invoice.png)
    print("\n[7/10] Testing Document Text OCR & Translation Pipeline (doc_invoice.png)...")
    with open("D:/hocWeb/P_AI/test-images/doc_invoice.png", "rb") as f:
        r_doc_up = requests.post(f"{BASE_GW}/images", headers=headers_a, files={"image": ("doc_invoice.png", f, "image/png")})
    doc_id = r_doc_up.json()["data"]["image"]["id"]

    r_doc_analysis = requests.post(f"{BASE_GW}/image-analysis", headers=headers_a, json={"imageId": doc_id}, timeout=180)
    assert r_doc_analysis.status_code in [200, 201]
    doc_res = r_doc_analysis.json()["data"]["analysis"]
    ocr_text = doc_res["ocr"]["fullText"]
    print(f"  ✓ OCR extracted text length: {len(ocr_text)} chars | lineCount: {doc_res['ocr']['lineCount']}")
    print(f"  ✓ Sample text: {repr(ocr_text[:80])}")
    assert len(ocr_text) > 0, "No text detected in doc_invoice.png"

    # Test Translation endpoint
    r_trans = requests.post(
        f"{BASE_GW}/translation",
        headers=headers_a,
        json={"text": ocr_text[:120], "sourceLanguage": "auto", "targetLanguage": "vi"},
        timeout=30,
    )
    assert r_trans.status_code in [200, 201], f"Translation failed: {r_trans.text}"
    trans_data = r_trans.json()["data"]["translation"]
    print(f"  ✓ Translated ({trans_data['sourceLanguage']} -> {trans_data['targetLanguage']}): {trans_data['translatedText'][:80]}...")
    results["OCR & Translation Pipeline"] = "PASS"

    # 8. Multi-Test: Outdoor Scene Classification (beach.jpg)
    print("\n[8/10] Testing Outdoor Scene Understanding (beach.jpg)...")
    with open("D:/hocWeb/P_AI/test-images/beach.jpg", "rb") as f:
        r_beach_up = requests.post(f"{BASE_GW}/images", headers=headers_a, files={"image": ("beach.jpg", f, "image/jpeg")})
    beach_id = r_beach_up.json()["data"]["image"]["id"]

    r_beach_analysis = requests.post(f"{BASE_GW}/image-analysis", headers=headers_a, json={"imageId": beach_id}, timeout=180)
    assert r_beach_analysis.status_code in [200, 201]
    beach_res = r_beach_analysis.json()["data"]["analysis"]
    print(f"  ✓ Scene Type: {beach_res['fusedResult']['sceneType']}")
    print(f"  ✓ Dominant Regions: {beach_res['fusedResult']['dominantRegions']}")
    print(f"  ✓ Description: {beach_res['fusedResult']['description'][:100]}...")
    assert "outdoor" in beach_res["fusedResult"]["environment"].lower() or "beach" in beach_res["fusedResult"]["sceneType"].lower() or len(beach_res["segmentation"]["regions"]) > 0
    results["Outdoor Scene Understanding"] = "PASS"

    # 9. Multi-Test: Non-COCO / Low-Object Image (S15.jpg)
    print("\n[9/10] Testing Non-COCO / Character Recognition Image (S15.jpg)...")
    with open("D:/hocWeb/P_AI/test-images/S15.jpg", "rb") as f:
        r_s15_up = requests.post(f"{BASE_GW}/images", headers=headers_a, files={"image": ("S15.jpg", f, "image/jpeg")})
    s15_id = r_s15_up.json()["data"]["image"]["id"]

    r_s15_analysis = requests.post(f"{BASE_GW}/image-analysis", headers=headers_a, json={"imageId": s15_id}, timeout=180)
    assert r_s15_analysis.status_code in [200, 201]
    s15_res = r_s15_analysis.json()["data"]["analysis"]
    print(f"  ✓ S15 Objects: {s15_res['objectDetection']['objectCount']} | OCR text: {repr(s15_res['ocr']['fullText'])}")
    print(f"  ✓ Scene classification handled gracefully: {s15_res['fusedResult']['sceneType']}")
    results["Non-COCO Robustness"] = "PASS"

    # 10. Image Deletion & Resource Cleanup
    print("\n[10/10] Testing Asset Deletion & Clean Lifecycle...")
    # User B cannot delete User A's image
    r_del_unauth = requests.delete(f"{BASE_GW}/images/{cam_img_id}", headers=headers_b)
    assert r_del_unauth.status_code in [403, 404]
    print(f"  ✓ User B deletion rejected with HTTP {r_del_unauth.status_code}")

    # User A deletes test image
    r_del_s15 = requests.delete(f"{BASE_GW}/images/{s15_id}", headers=headers_a)
    assert r_del_s15.status_code == 200
    print("  ✓ User A deleted image successfully")
    results["Resource Deletion & Security"] = "PASS"

    print("\n==================================================================")
    print("                      AUDIT SUMMARY RESULTS                      ")
    print("==================================================================")
    all_passed = True
    for test_name, status in results.items():
        print(f"  {test_name.ljust(35)}: [{status}]")
        if status != "PASS":
            all_passed = False

    print("==================================================================")
    if all_passed:
        print(">>> ALL 10 PHASE 8 AUDIT AND REGRESSION TESTS PASSED! <<<")
    else:
        print(">>> SOME TESTS FAILED <<<")
    print("==================================================================")
    return all_passed

if __name__ == "__main__":
    success = run_phase8_audit()
    exit(0 if success else 1)
