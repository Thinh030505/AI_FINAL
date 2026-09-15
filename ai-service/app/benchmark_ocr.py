import os
import sys
import time
import unicodedata
import httpx
import numpy as np
import cv2

# Ensure ai-service root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

def lev_distance(s1, s2):
    if len(s1) < len(s2):
        return lev_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]

def calculate_cer(ref: str, hyp: str) -> float:
    ref_nfc = unicodedata.normalize('NFC', ref.strip())
    hyp_nfc = unicodedata.normalize('NFC', hyp.strip())
    if len(ref_nfc) == 0:
        return 0.0 if len(hyp_nfc) == 0 else 1.0
    dist = lev_distance(ref_nfc, hyp_nfc)
    return dist / float(len(ref_nfc))

def calculate_wer(ref: str, hyp: str) -> float:
    ref_words = unicodedata.normalize('NFC', ref.strip()).split()
    hyp_words = unicodedata.normalize('NFC', hyp.strip()).split()
    if len(ref_words) == 0:
        return 0.0 if len(hyp_words) == 0 else 1.0
    dist = lev_distance(ref_words, hyp_words)
    return dist / float(len(ref_words))

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

# Benchmark dataset of ground-truth test samples
BENCHMARK_DATASET = [
    # Vietnamese UI & Document Samples
    {'name': 'vi_01_ui', 'url': 'https://res.cloudinary.com/drs7hwuzh/image/upload/v1787713900/ocr-ai/uploads/qomzkfxm1sfymlxb16xf.png', 'gt': 'hiển thị thông tin hồ sơ'},
    {'name': 'vi_02_receipt', 'url': 'https://res.cloudinary.com/drs7hwuzh/image/upload/v1787714975/ocr-ai/uploads/p7bhi8oir7j2bvra9htb.png', 'gt': 'Lập phiếu tiếp nhận\nLưu hồ sơ'},
    {'name': 'vi_03_button', 'url': 'https://res.cloudinary.com/drs7hwuzh/image/upload/v1787713458/ocr-ai/uploads/xuyp2gvxbug6hxgurnmw.png', 'gt': 'Nộp hồ sơ'},
    {'name': 'vi_04_digit', 'url': 'https://res.cloudinary.com/drs7hwuzh/image/upload/v1787713136/ocr-ai/uploads/zpau5x1oh0qltvkwupau.png', 'gt': '1'},
    {'name': 'vi_05_doc', 'url': 'https://res.cloudinary.com/drs7hwuzh/image/upload/v1787714877/ocr-ai/uploads/fsnhznad1fwpqbscjfng.png', 'gt': 'AUTHENTIC\nTRANG CHỦ\nGIÀY PICKLEBALL\nVỢT PICKLEBALL\nGIÀY\nPHỤ KIỆN\nSHOES\nTIN TỨC & SỰ KIỆN\nSALE\nGiày Yonex PC Fusion Rev 5 White STFR5WH\n3,900,000 đ\nKích thước : 43\n41\n42\n43\nGọi ngay Hotline để có giá tốt\nHN: 0984918486 Địa chỉ: 72 T\nHCM: 0786665444 Địa chỉ: 56\nCSKH: 0785499555 Hỗ trợ 24/7\nTổng đài hoạt động từ 10h00'},
]

def run_benchmark():
    print("=== STARTING OCR ACCURACY BENCHMARK EVALUATION ===")
    from app.services.preprocessing_service import PreprocessingService
    from app.services.ocr_service import get_ocr_service

    ocr_service = get_ocr_service()

    total_cer = 0.0
    total_wer = 0.0
    total_latency_ms = 0
    evaluated_count = 0

    for sample in BENCHMARK_DATASET:
        try:
            start_t = time.time()
            r = httpx.get(sample['url'], headers=HEADERS, timeout=15.0, follow_redirects=True)
            img_bytes = r.content
            img_np = PreprocessingService.preprocess_image_bytes(img_bytes)

            def pass2_f():
                return PreprocessingService.preprocess_image_bytes(img_bytes, mode="contrast")

            ocr_data = ocr_service.run_smart_ocr(img_np, pass2_f)
            elapsed = int((time.time() - start_t) * 1000)

            hyp_text = ocr_data.fullText
            gt_text = sample['gt']

            cer = calculate_cer(gt_text, hyp_text)
            wer = calculate_wer(gt_text, hyp_text)

            total_cer += cer
            total_wer += wer
            total_latency_ms += elapsed
            evaluated_count += 1

            print(f"Sample [{sample['name']}] - CER: {cer:.4f}, WER: {wer:.4f}, Latency: {elapsed}ms")

        except Exception as e:
            print(f"Sample [{sample['name']}] FAILED: {e}")

    if evaluated_count > 0:
        avg_cer = total_cer / evaluated_count
        avg_wer = total_wer / evaluated_count
        avg_latency = total_latency_ms / evaluated_count

        print("\n=== BENCHMARK SUMMARY ===")
        print(f"Evaluated Samples: {evaluated_count}")
        print(f"Average CER (Character Error Rate): {avg_cer:.4f} ({avg_cer*100:.2f}%)")
        print(f"Average WER (Word Error Rate):      {avg_wer:.4f} ({avg_wer*100:.2f}%)")
        print(f"Average Latency:                    {avg_latency:.2f} ms")

if __name__ == "__main__":
    run_benchmark()
