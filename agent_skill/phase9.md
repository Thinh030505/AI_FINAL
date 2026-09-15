SUPER PROMPT — PHASE 9

AI PERFORMANCE, ADAPTIVE ROUTING & ACCURACY OPTIMIZATION

Dành cho Antigravity Agent

Project root:

D:\hocWeb\P_AI

Bạn là Senior AI Systems Engineer + Performance Engineer + FastAPI Engineer.

Mục tiêu Phase 9:

giảm latency thật

chỉ chạy model cần thiết

chạy song song khi an toàn

tối ưu Gemini input

benchmark YOLO runtime

hỗ trợ Fast / Balanced / Accurate

giữ nguyên Phase 1–8

Không làm social, tracking, face recognition, train model mới, đổi stack.

1. BASELINE TRƯỚC KHI SỬA

Đo:

YOLO latency

SegFormer latency

OCR latency

Gemini latency

Fusion latency

Total latency

RAM

Test ít nhất:
Beach, Street, Receipt, Person+Phone, Office, Text-heavy, Low-text, Object-poor.

Tạo bảng before.

2. TIMING TỪNG STAGE

Unified response phải có:

{
"timings": {
"qualityCheckMs": 0,
"routingMs": 0,
"objectDetectionMs": 0,
"segmentationMs": 0,
"ocrMs": 0,
"visionMs": 0,
"fusionMs": 0,
"totalMs": 0
}
}

Module bị skip:
status = "skipped"
không gọi failed.

3. IMAGE QUALITY CHECK

Tạo image_quality_service.py

Kiểm tra nhẹ:

resolution

blur score bằng Laplacian variance

brightness

orientation

Không dùng model nặng.

Nếu mờ/tối:
trả warning nhưng không block trừ khi decode fail.

4. AI ROUTER

Tạo ai_router_service.py

Modes:
auto
fast
balanced
accurate

Default:
balanced

Router không được dùng model nặng chỉ để quyết định model nặng khác.

5. CONDITIONAL OCR

Không chạy PaddleOCR cho mọi ảnh.

Beach / landscape / portrait / road ít chữ:
OCR = skipped

Receipt / document / sign / menu / text-heavy:
OCR = run

Frontend có forceOcr tùy chọn.

6. CONDITIONAL SEGMENTATION

Document / receipt thuần chữ:
SegFormer có thể skipped

Outdoor / indoor / street / beach / room:
SegFormer run

7. PARALLEL EXECUTION

Benchmark:
sequential vs asyncio.to_thread / ThreadPoolExecutor

YOLO + SegFormer chạy song song nếu thread-safe.
OCR chỉ parallel nếu kiểm chứng an toàn.

Không hy sinh stability.

8. REUSE IMAGE DATA

Mỗi analysis:

fetch Cloudinary image 1 lần

decode 1 lần

reuse bytes/PIL/ndarray

không download lại riêng cho từng model

9. GEMINI OPTIMIZATION

Không gửi ảnh 4K nguyên bản nếu không cần.

Benchmark bản resize:
768
1024
1280
original

Ưu tiên longest side khoảng 1024–1280 nếu quality vẫn tốt.

Prompt Gemini phải ngắn và structured:

{
"sceneType": "",
"environment": "",
"importantObjects": [],
"backgroundElements": [],
"description": ""
}

Description chỉ 1–2 câu.

Gửi summarized evidence:
YOLO labels
top SegFormer regions
OCR text ngắn gọn

Không gửi raw box/line data khổng lồ.

10. YOLO RUNTIME BENCHMARK

Benchmark current PyTorch .pt với:

ONNX Runtime

OpenVINO

Nếu environment phù hợp.

Không đổi mặc định nếu không nhanh hơn.

Có thể thêm:
YOLO_RUNTIME=auto|pytorch|onnx|openvino

Fallback về PyTorch nếu optimized runtime không có.

Không export model mỗi startup.

11. DEVICE AUTO-DETECTION

CUDA available -> GPU
else -> CPU

Không bắt buộc cài CUDA.

12. ANALYSIS MODES

FAST:

YOLO11n

Gemini resized

OCR conditional

SegFormer conditional

BALANCED:

YOLO11n

SegFormer nếu scene-like

OCR nếu text-likely

Gemini

Fusion

ACCURATE:

full pipeline hơn

có thể higher imgsz / optional YOLO11s CHỈ nếu benchmark chứng minh lợi ích

Không tự đổi model accuracy mode nếu chưa benchmark.

13. API

NestJS DTO:

mode?: "auto" | "fast" | "balanced" | "accurate"
forceOcr?: boolean

Backward compatible:
mode=balanced nếu thiếu.

Unified result:

{
"modules": {
"objectDetection": "success",
"segmentation": "success",
"ocr": "skipped",
"vision": "success"
}
}

Allowed:
success
failed
fallback
skipped

14. DATABASE

Có thể lưu:
analysisMode
routingDecision
timings

Không lưu massive debug.

15. CAMERA UI

CameraPage thêm selector:

[ Fast ] [ Balanced ] [ Accurate ]

Default:
Balanced

Hiển thị sau result:
Total
YOLO
Segmentation
OCR
Gemini

Nếu skipped:
hiện "Skipped by adaptive routing".

16. KHÔNG FAKE PROGRESS

Nếu frontend không có status realtime:
không hiện "YOLO complete" trước khi backend trả thật.

Có thể chỉ hiện:
Analyzing image...

Job/SSE không bắt buộc Phase 9 nếu thay đổi quá lớn.

17. MODEL LOAD

Verify:
YOLO load once
SegFormer load once
PaddleOCR load once
Gemini client reuse

Không reload per request.

18. MEMORY & CONCURRENCY

Đo RSS:
before models
after models
after 10 analyses

Không để RAM tăng vô hạn.

Thêm MAX_CONCURRENT_ANALYSES.
CPU default hợp lý 1 hoặc 2.

Không để nhiều full pipeline gây OOM.

19. TIMEOUT REVIEW

Đồng bộ:
Frontend Axios
NestJS HttpModule
FastAPI/Gemini

Không để frontend timeout trước AI.

20. ROUTER TESTS

Beach:
YOLO run
SegFormer run
OCR skipped
Gemini run

Receipt:
OCR run
SegFormer skipped
YOLO optional
Gemini run

Street sign:
YOLO run
SegFormer run
OCR run
Gemini run

Portrait:
YOLO run
OCR skipped
SegFormer optional
Gemini run

Router lỗi -> fallback balanced.

21. BEFORE / AFTER BENCHMARK

Bắt buộc:

| Image | Mode | Before | After | Improvement |

Không fake số.

Mục tiêu tham khảo, không hard-fail:
Balanced beach/street <5–8s CPU nếu khả thi
Fast <3–5s nếu khả thi
Document OCR có thể lâu hơn.

22. ACCURACY REGRESSION

Optimization không được làm giảm quality nghiêm trọng.

Compare:

objects

regions

OCR

scene

Gemini description

trên Beach, Street, Receipt, Office, Person+Phone.

23. SECURITY

Không:

bypass ownership

arbitrary URL

log secrets

log raw image

expose Gemini key

24. REGRESSION PHASE 1–8

Test lại:
Auth
Upload
OCR
Translation
YOLO
SegFormer
Gemini
Fusion
Camera
History
Delete
Health

25. BUILD

Frontend:
cd D:\hocWeb\P_AI\frontend
npm run build

Backend:
cd D:\hocWeb\P_AI\backend
npm run build

AI:
cd D:\hocWeb\P_AI\ai-service
..venv\Scripts\Activate.ps1
python -m uvicorn app.main --host 0.0.0.0 --port 8000

26. ACCEPTANCE CRITERIA

[ ] baseline benchmark
[ ] per-stage timings
[ ] quality check
[ ] adaptive router
[ ] conditional OCR
[ ] conditional SegFormer
[ ] safe parallelization benchmarked
[ ] image fetch/decode reused
[ ] Gemini input optimized
[ ] Gemini prompt optimized
[ ] YOLO runtime benchmark
[ ] Fast/Balanced/Accurate modes
[ ] camera mode selector
[ ] skipped module status
[ ] memory/concurrency controlled
[ ] before/after benchmark proves improvement
[ ] accuracy remains acceptable
[ ] Phase 1–8 regression PASS
[ ] frontend build PASS
[ ] backend build PASS
[ ] AI startup PASS

27. REPORT

Tạo:

docs/PHASE_9_AI_PERFORMANCE_ROUTING_REPORT.md

Report:

Baseline

Bottlenecks

Router Design

Conditional OCR/Segmentation

Parallelization

YOLO Runtime Benchmark

Gemini Optimization

Memory/Concurrency

API/UI Changes

Before/After Benchmark

Accuracy Comparison

Regression

Limitations

Final Status

Final status chỉ:
COMPLETE
PARTIAL
FAILED

Không COMPLETE nếu chưa benchmark thật.

28. THỨ TỰ THỰC HIỆN

Read code

Baseline

Timing

Quality check

Router

Conditional OCR

Conditional Segmentation

Parallelize safe modules

Reuse image data

Gemini optimization

YOLO runtime benchmark

Analysis modes

Frontend selector

Memory/concurrency

Accuracy regression

Performance regression

Builds

E2E

Report

Quy tắc cuối:

Mọi optimization phải có:
BEFORE
AFTER
EVIDENCE

Mục tiêu:
Làm hệ thống nhanh hơn bằng orchestration tốt, không phải chỉ thêm model mạnh hơn.