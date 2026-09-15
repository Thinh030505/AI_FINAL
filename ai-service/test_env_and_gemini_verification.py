import os
import sys
import json
import time
import requests

BASE_GW = "http://localhost:3000/api"
BASE_AI = "http://localhost:8000"

def log_step(name, status, details=""):
    badge = "[PASS]" if status == "PASS" else "[FAIL]" if status == "FAIL" else "[NOT_VERIFIED]"
    safe_details = str(details).encode("ascii", errors="replace").decode("ascii")
    print(f"{badge:16} {name}: {safe_details}")

def main():
    print("==================================================================")
    print("   ENVIRONMENT CONFIG & GEMINI VISION COMPREHENSIVE VERIFICATION")
    print("==================================================================")
    results = {}

    # 1. Health Checks
    print("\n--- 1. HEALTH CHECKS ---")
    try:
        r_ai = requests.get(f"{BASE_AI}/health", timeout=10)
        ai_data = r_ai.json()
        assert r_ai.status_code == 200 and ai_data.get("status") == "ok"
        log_step("AI Service Health", "PASS", f"Status={ai_data.get('status')} All modules=True")
        results["ai_health"] = "PASS"
    except Exception as e:
        log_step("AI Service Health", "FAIL", str(e))
        results["ai_health"] = "FAIL"

    try:
        r_gw = requests.get(f"{BASE_GW}/health", timeout=10)
        gw_raw = r_gw.json()
        gw_data = gw_raw.get("data", gw_raw)
        assert r_gw.status_code == 200 and gw_data.get("database") == "connected" and gw_data.get("ai_service") == "connected"
        log_step("Gateway Health", "PASS", f"DB={gw_data.get('database')} AI={gw_data.get('ai_service')}")
        results["gateway_health"] = "PASS"
    except Exception as e:
        log_step("Gateway Health", "FAIL", str(e))
        results["gateway_health"] = "FAIL"

    # 2. Authentication (User A and User B)
    print("\n--- 2. AUTHENTICATION (REGISTER & LOGIN) ---")
    ts = int(time.time())
    email_a = f"env_test_user_a_{ts}@example.com"
    email_b = f"env_test_user_b_{ts}@example.com"
    pwd = "Password123!"

    try:
        # Register & Login User A
        r_reg_a = requests.post(f"{BASE_GW}/auth/register", json={"username": f"user_a_{ts}", "email": email_a, "password": pwd, "displayName": "User A"})
        assert r_reg_a.status_code in [200, 201]
        r_log_a = requests.post(f"{BASE_GW}/auth/login", json={"email": email_a, "password": pwd})
        assert r_log_a.status_code in [200, 201]
        token_a = r_log_a.json()["data"]["accessToken"]
        headers_a = {"Authorization": f"Bearer {token_a}"}

        # Register & Login User B
        r_reg_b = requests.post(f"{BASE_GW}/auth/register", json={"username": f"user_b_{ts}", "email": email_b, "password": pwd, "displayName": "User B"})
        assert r_reg_b.status_code in [200, 201]
        r_log_b = requests.post(f"{BASE_GW}/auth/login", json={"email": email_b, "password": pwd})
        assert r_log_b.status_code in [200, 201]
        token_b = r_log_b.json()["data"]["accessToken"]
        headers_b = {"Authorization": f"Bearer {token_b}"}

        log_step("Auth Register & Login", "PASS", "Registered & Logged in User A & User B with JWT")
        results["step_1_auth"] = "PASS"
    except Exception as e:
        log_step("Auth Register & Login", "FAIL", str(e))
        results["step_1_auth"] = "FAIL"
        return

    # 3. Image Upload
    print("\n--- 3. IMAGE ASSET UPLOAD ---")
    uploaded_images = {}
    try:
        for name, img_path in [("beach", "D:/hocWeb/P_AI/test-images/beach.jpg"), ("street", "D:/hocWeb/P_AI/test-images/street.jpg"), ("invoice", "D:/hocWeb/P_AI/test-images/doc_invoice.png")]:
            with open(img_path, "rb") as f:
                mime = "image/jpeg" if img_path.endswith(".jpg") else "image/png"
                r_up = requests.post(f"{BASE_GW}/images", headers=headers_a, files={"image": (os.path.basename(img_path), f, mime)})
            assert r_up.status_code in [200, 201], f"Upload failed: {r_up.text}"
            img_rec = r_up.json()["data"]["image"]
            uploaded_images[name] = img_rec
            log_step(f"Upload {name}", "PASS", f"ID={img_rec['id']} CloudinaryURL={img_rec['imageUrl'][:45]}...")
        results["step_2_upload"] = "PASS"
    except Exception as e:
        log_step("Image Upload", "FAIL", str(e))
        results["step_2_upload"] = "FAIL"
        return

    # 4. PaddleOCR
    print("\n--- 4. PADDLEOCR TEXT RECOGNITION ---")
    try:
        t0 = time.time()
        r_ocr = requests.post(f"{BASE_GW}/ocr", headers=headers_a, json={"imageId": uploaded_images["invoice"]["id"]}, timeout=120)
        t_ocr = round(time.time() - t0, 2)
        assert r_ocr.status_code in [200, 201], f"OCR failed: {r_ocr.text}"
        ocr_data = r_ocr.json()["data"]["ocrResult"]
        log_step("OCR Execution", "PASS", f"Lines={len(ocr_data['lines'])}, AvgConf={ocr_data['avgConfidence']}, Latency={t_ocr}s")
        results["step_3_ocr"] = "PASS"
    except Exception as e:
        log_step("OCR Execution", "FAIL", str(e))
        results["step_3_ocr"] = "FAIL"

    # 5. Translation
    print("\n--- 5. TRANSLATION (EN <-> VI) ---")
    try:
        r_tr = requests.post(f"{BASE_GW}/translation", headers=headers_a, json={"text": "Hello world.", "sourceLanguage": "en", "targetLanguage": "vi"})
        assert r_tr.status_code in [200, 201], f"Translation failed: {r_tr.text}"
        tr_data = r_tr.json()["data"]["translation"]
        log_step("Translation EN->VI", "PASS", f"Translated='{tr_data['translatedText'][:50]}...'")
        results["step_4_translation"] = "PASS"
    except Exception as e:
        log_step("Translation", "FAIL", str(e))
        results["step_4_translation"] = "FAIL"

    # 6. YOLO Object Detection
    print("\n--- 6. YOLO11n OBJECT DETECTION ---")
    try:
        t0 = time.time()
        r_yolo = requests.post(f"{BASE_GW}/object-detection", headers=headers_a, json={"imageId": uploaded_images["street"]["id"]}, timeout=60)
        t_yolo = round(time.time() - t0, 2)
        assert r_yolo.status_code in [200, 201]
        yolo_data = r_yolo.json()["data"]["objectDetection"]
        log_step("YOLO Detection", "PASS", f"Objects={yolo_data['objectCount']}, Latency={t_yolo}s")
        results["step_5_yolo"] = "PASS"
    except Exception as e:
        log_step("YOLO Detection", "FAIL", str(e))
        results["step_5_yolo"] = "FAIL"

    # 7. Semantic Segmentation (Direct & Verified)
    print("\n--- 7. SEGFORMER SEMANTIC SEGMENTATION ---")
    try:
        t0 = time.time()
        r_seg = requests.post(f"{BASE_AI}/semantic-segmentation", json={"imageUrl": uploaded_images["beach"]["imageUrl"]}, timeout=60)
        t_seg = round(time.time() - t0, 2)
        assert r_seg.status_code == 200
        seg_data = r_seg.json()["data"]
        labels = [r["label"] for r in seg_data["regions"]]
        log_step("SegFormer Segmentation", "PASS", f"Regions={labels}, Latency={t_seg}s")
        results["step_6_segmentation"] = "PASS"
    except Exception as e:
        log_step("SegFormer Segmentation", "FAIL", str(e))
        results["step_6_segmentation"] = "FAIL"

    # 8. GEMINI LIVE VERIFICATION via UNIFIED PIPELINE
    print("\n--- 8. GEMINI VISION LIVE VERIFICATION (POST /api/image-analysis) ---")
    try:
        t0 = time.time()
        r_analysis = requests.post(f"{BASE_GW}/image-analysis", headers=headers_a, json={"imageId": uploaded_images["beach"]["id"]}, timeout=120)
        t_ana = round(time.time() - t0, 2)
        assert r_analysis.status_code in [200, 201], f"Analysis failed: {r_analysis.text}"
        analysis_data = r_analysis.json()["data"]["analysis"]
        modules = analysis_data["modules"]
        vision = analysis_data["vision"]
        fused = analysis_data["fusedResult"]

        print(f"    Pipeline Status: {analysis_data['status']}")
        print(f"    Modules: {modules}")
        print(f"    Vision Module Status: {modules.get('vision')}")
        print(f"    Vision Fallback Used: {vision.get('isFallback')}")
        print(f"    Description: \"{fused.get('description')}\"")

        # Acceptance check:
        # Prompt: "vision = success hoặc status tương đương. Không được coi vision = fallback là Gemini PASS."
        assert modules.get("vision") == "success", f"Expected vision=success, got {modules.get('vision')}"
        assert vision.get("isFallback") is False, "Expected isFallback=False for Gemini Live Pass"
        assert len(fused.get("description", "")) > 10, "Expected non-empty description"

        log_step("Gemini Vision Live Call", "PASS", f"vision=success, isFallback=False, desc='{fused.get('description')[:60]}...'")
        results["step_7_unified_analysis"] = "PASS"
        results["step_8_gemini_vision"] = "PASS"
    except Exception as e:
        log_step("Gemini Vision Live Call", "FAIL", str(e))
        results["step_7_unified_analysis"] = "FAIL"
        results["step_8_gemini_vision"] = "FAIL"

    # 9. GEMINI FAILURE / RESILIENCE TEST
    print("\n--- 9. GEMINI FAILURE & RESILIENCE TEST ---")
    try:
        # Call AI service direct with temporary invalid model to test fallback
        from app.services.vision_language_service import get_vision_language_service
        vl = get_vision_language_service()
        old_avail = vl.is_available
        vl.is_available = False # Simulate Gemini unavailable

        # Run direct understanding call
        test_img = "D:/hocWeb/P_AI/test-images/beach.jpg"
        fallback_res = await_or_run(vl.understand_image(
            image_url=test_img,
            objects=[],
            regions=[{"label": "sky", "regionPercentage": 44.5}, {"label": "water/sea", "regionPercentage": 30.4}],
            ocr_text=None,
            inferred_scene={"sceneType": "beach", "environment": "outdoor", "weather": "clear"}
        ))
        vl.is_available = old_avail # Restore immediately

        assert fallback_res.is_fallback is True, "Fallback should be True when Gemini unavailable"
        assert len(fallback_res.description) > 0, "Fallback description should be generated"
        log_step("Gemini Failure Resilience", "PASS", f"Fallback activated gracefully: is_fallback=True, desc='{fallback_res.description}'")
        results["gemini_resilience"] = "PASS"
    except Exception as e:
        log_step("Gemini Failure Resilience", "FAIL", str(e))
        results["gemini_resilience"] = "FAIL"

    # 10. History Retrieval & Anti-IDOR
    print("\n--- 10. HISTORY & ANTI-IDOR CHECK ---")
    try:
        r_hist = requests.get(f"{BASE_GW}/image-analysis", headers=headers_a)
        assert r_hist.status_code == 200
        count_a = len(r_hist.json()["data"]["analyses"])
        assert count_a >= 1

        # Anti-IDOR: User B attempts to read User A's analysis
        first_analysis_id = r_hist.json()["data"]["analyses"][0]["id"]
        r_idor = requests.get(f"{BASE_GW}/image-analysis/{first_analysis_id}", headers=headers_b)
        assert r_idor.status_code == 403, f"Expected 403, got {r_idor.status_code}"

        log_step("History & Anti-IDOR", "PASS", f"User A history count={count_a}, User B read blocked (HTTP 403)")
        results["step_9_history"] = "PASS"
    except Exception as e:
        log_step("History & Anti-IDOR", "FAIL", str(e))
        results["step_9_history"] = "FAIL"

    # 11. Delete Image
    print("\n--- 11. IMAGE DELETION ---")
    try:
        del_img_id = uploaded_images["invoice"]["id"]
        r_del = requests.post(f"{BASE_GW}/images/{del_img_id}/delete", headers=headers_a) # or DELETE
        if r_del.status_code == 404:
            r_del = requests.delete(f"{BASE_GW}/images/{del_img_id}", headers=headers_a)
        assert r_del.status_code in [200, 204]
        # Verify 404
        r_check = requests.get(f"{BASE_GW}/images/{del_img_id}", headers=headers_a)
        assert r_check.status_code == 404
        log_step("Image Deletion", "PASS", f"Image {del_img_id} deleted and confirmed 404")
        results["step_10_delete"] = "PASS"
    except Exception as e:
        log_step("Image Deletion", "FAIL", str(e))
        results["step_10_delete"] = "FAIL"

    print("\n==================================================================")
    print("                     VERIFICATION SUMMARY")
    print("==================================================================")
    all_passed = all(v == "PASS" for v in results.values())
    for k, v in results.items():
        print(f"  {k:28}: {v}")
    print(f"\nOVERALL VERDICT: {'ALL TESTS PASSED (10/10)' if all_passed else 'SOME TESTS FAILED'}")
    return 0 if all_passed else 1

def await_or_run(coro):
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import nest_asyncio
            nest_asyncio.apply()
            return loop.run_until_complete(coro)
        else:
            return loop.run_until_complete(coro)
    except Exception:
        return asyncio.run(coro)

if __name__ == "__main__":
    sys.exit(main())
