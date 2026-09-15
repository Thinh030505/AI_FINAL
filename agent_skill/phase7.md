SUPER PROMPT — PHASE 7

ADVANCED IMAGE UNDERSTANDING, SEMANTIC SEGMENTATION & AI FUSION

Dành cho Antigravity Agent

0. VAI TRÒ

Bạn là Senior AI Engineer + Full-stack Architect triển khai Phase 7 cho dự án tại:

D:\hocWeb\P_AI

Kiến trúc hiện tại phải được giữ nguyên:

React 18 + TypeScript + Vite
|
v
NestJS 10 API Gateway
|
+--> MongoDB Atlas
+--> Cloudinary
|
v
FastAPI AI Service
|
+--> PaddleOCR
+--> Translation
+--> YOLO11 Object Detection

Phase 7 phải mở rộng khả năng hiểu ảnh, không rewrite project.

1. VẤN ĐỀ HIỆN TẠI

YOLO11 phát hiện tốt các object cụ thể như person, umbrella, chair, car, bottle, phone...
nhưng không thể mô tả đầy đủ các vùng môi trường như:

sky
sea
sand
beach
road
grass
wall
building
water
mountain
floor

Mục tiêu Phase 7 là bổ sung:

Semantic Segmentation

Scene Understanding

Vision-Language Understanding

AI Result Fusion

Unified Analysis UI

Benchmark và kiểm thử độ chính xác

2. MỤC TIÊU ĐẦU RA

Với một ảnh bãi biển, hệ thống phải có thể trả:

Objects:

umbrella 92%

chair 86%

Scene Regions:

sky 34%

sea/water 28%

sand/ground 31%

OCR:

text nếu có

Scene:

beach

outdoor

Description:

mô tả ngắn gọn, bám sát nội dung ảnh

3. NGUYÊN TẮC KIẾN TRÚC BẮT BUỘC

Luồng chính:

Frontend React
|
v
NestJS API Gateway
|
v
FastAPI AI Service

Frontend KHÔNG gọi FastAPI trực tiếp.
FastAPI KHÔNG ghi MongoDB trực tiếp.

NestJS tiếp tục chịu trách nhiệm:

JWT

ownership

persistence

public API

orchestration

4. KHÔNG ĐƯỢC PHÁ MODULE CŨ

Phải giữ nguyên:

Auth
JWT
Users
Images
Cloudinary
OCR
Translation
YOLO Object Detection
History
Health Check

Không rename endpoint cũ.
Không đổi port.
Không đổi database.
Không đổi Cloudinary.
Không chuyển stack.

5. PHẠM VI PHASE 7

Bao gồm:

Semantic Segmentation
Scene Analysis
Vision-Language Understanding
AI Fusion
Unified Frontend
History
Benchmark

Không bao gồm:

SAM
CLIP Search
Face Recognition
Tracking
Video AI
Realtime webcam
Social Feed
Like
Comment
Follow
Chat
Recommendation
Custom YOLO training
Train model from scratch

6. SEMANTIC SEGMENTATION MODEL

Ưu tiên:

SegFormer

Model nhẹ khuyến nghị:

nvidia/segformer-b0-finetuned-ade-512-512

Dataset pretrained:

ADE20K

Yêu cầu:

chạy được CPU

GPU chỉ là optional

model load một lần lúc startup

không load lại mỗi request

7. DEPENDENCIES

Chỉ thêm package còn thiếu, ví dụ:

transformers
torch
Pillow
numpy

Trước khi thay đổi version phải kiểm tra compatibility với:

PaddleOCR
PaddlePaddle
Ultralytics
OpenCV
Python hiện tại

Không downgrade/upgrade bừa.
Không phá Phase 4 OCR hoặc Phase 6 YOLO.

8. FASTAPI SEGMENTATION SERVICE

Tạo service riêng, ví dụ:

app/services/segmentation_service.py

Không nhét toàn bộ logic vào main.py.

Internal endpoint:

POST /semantic-segmentation

Input:

{
"imageUrl": "https://..."
}

Output chuẩn hóa:

{
"model": "segformer-b0-ade20k",
"imageWidth": 1280,
"imageHeight": 720,
"processingTimeMs": 420,
"regions": [
{
"label": "sky",
"pixelCount": 152330,
"regionPercentage": 34.12
},
{
"label": "sea",
"pixelCount": 112002,
"regionPercentage": 25.10
},
{
"label": "sand",
"pixelCount": 126022,
"regionPercentage": 28.24
}
]
}

Không gọi regionPercentage là confidence.

9. REGION FILTERING

Tạo config:

MIN_REGION_PERCENTAGE=1.0

Không hard-code rải rác.

Bỏ qua vùng cực nhỏ gây noise.

Sort:

regionPercentage DESC

10. LABEL NORMALIZATION

Tạo mapping canonical rõ ràng.

Ví dụ:

sea/ocean/water -> water/sea
earth/ground -> ground
sand -> sand
sky -> sky
road -> road
grass -> grass
building -> building

Không dịch label trong AI core.

11. SEGMENTATION VISUALIZATION

Hỗ trợ overlay nếu hợp lý.

Có thể dùng:

overlay PNG

class map

lightweight mask

Không trả tensor/numpy raw.
Không trả base64 ảnh rất lớn nếu không cần.
Không overwrite ảnh gốc.
Cleanup temporary file nếu có.

12. SCENE INFERENCE

Tạo service riêng:

scene_inference_service.py

Có thể dùng rule-based heuristic trước.

Ví dụ:

sea + sand + sky -> beach
road + car + building -> street
grass + tree + sky -> park
desk + laptop + chair -> workspace

Ghi rõ đây là heuristic.
Không gọi nó là deep learning model.

13. VISION-LANGUAGE MODEL

Tích hợp một adapter Vision LLM.

Ưu tiên Gemini Vision nếu project có credentials.

Nếu chưa có API key:

KHÔNG hard-code key

thêm ENV vào .env.example

Vision module được phép unavailable

YOLO + Segmentation + OCR vẫn phải hoạt động

Không để toàn pipeline fail chỉ vì Vision API lỗi.

14. STRUCTURED VISION PROMPT

Không dùng prompt mơ hồ "Describe this image".

Dùng structured prompt yêu cầu JSON:

Analyze the image and return JSON only.

Fields:

sceneType

environment

weather

mainObjects

backgroundElements

activities

textContext

description

Rules:

Do not invent invisible objects.

Use only visually supported information.

If uncertain, return null or "unknown".

Keep description concise.

15. GROUND VISION LLM BẰNG EVIDENCE

Gửi kèm:

YOLO detections
Segmentation regions
OCR text

Ví dụ:

Use the following machine-vision evidence:
YOLO objects: [...]
Segmentation regions: [...]
OCR text: [...]

Use both the image and this evidence.
Do not invent unsupported details.

16. VISION RESPONSE CONTRACT

Normalize về:

{
"sceneType": "beach",
"environment": "outdoor",
"weather": "clear",
"mainObjects": ["umbrella", "chair"],
"backgroundElements": ["sea", "sand", "sky"],
"activities": [],
"description": "A beach scene with sea, sand, sky, a beach umbrella and seating."
}

Không expose raw vendor response.

17. AI FUSION ENGINE

Tạo:

ai_fusion_service.py

Input:

YOLO

Segmentation

OCR

Vision

Output:

{
"objects": [],
"regions": [],
"text": {},
"scene": {},
"description": "",
"modules": {}
}

Fusion phải thực sự xử lý, không chỉ concatenate.

18. FUSION RULES

Duplicate concept:
YOLO: umbrella
Vision: umbrella
=> merge

Synonym:
Segmentation: sea
Vision: ocean
=> normalize

Conflict:
Segmentation và Vision mâu thuẫn
=> ưu tiên evidence trực tiếp, không bịa certainty

OCR:
Nếu Vision nhắc chữ nhưng PaddleOCR không thấy
=> không coi là verified OCR text

19. CONFIDENCE RULE

YOLO:

dùng detection confidence thật

Segmentation:

dùng regionPercentage

OCR:

dùng confidence OCR thật

Vision:

KHÔNG tự bịa numeric confidence

Không tạo fake 95% cho description.

20. UNIFIED FASTAPI PIPELINE

Tạo internal endpoint hoặc orchestration phù hợp:

POST /image-analysis

Input:

{
"imageUrl": "https://..."
}

Pipeline:

Image
|
+--> YOLO
+--> Segmentation
+--> OCR
+--> Vision
|
v
Fusion

Nếu an toàn, YOLO + Segmentation + OCR có thể chạy song song.

Ưu tiên stability trước speed.

21. PARTIAL SUCCESS

Hỗ trợ response:

{
"status": "partial_success",
"modules": {
"objectDetection": "success",
"segmentation": "success",
"ocr": "success",
"vision": "failed"
}
}

Nếu Vision fail, vẫn trả các module còn lại.

22. NESTJS PUBLIC API

Tạo:

POST /api/image-analysis

Body:

{
"imageId": "..."
}

Luồng bắt buộc:

JWT

validate imageId

find image

ownership check

lấy Cloudinary imageUrl

gọi AI Service

validate response

save MongoDB

return normalized response

Không cho frontend gửi arbitrary imageUrl.

23. OWNERSHIP

User A tuyệt đối không được:

analyze ảnh User B

xem result User B

xem history User B

Test IDOR bắt buộc.

24. MONGODB

Tạo collection:

imageanalyses

Schema gợi ý:

ImageAnalysis

userId

imageId

status

objectDetection

model

detections[]

processingTimeMs

segmentation

model

regions[]

processingTimeMs

ocr

fullText

avgConfidence

processingTimeMs

vision

sceneType

environment

weather

mainObjects[]

backgroundElements[]

activities[]

description

fusedResult

totalProcessingTimeMs

createdAt

updatedAt

Không lưu raw massive response không cần thiết.

25. FRONTEND

Tạo/nâng cấp trang:

AI Image Analysis

UI tối thiểu:

[IMAGE + OBJECT BOXES]

Detected Objects
umbrella 92%
chair 86%

Scene Regions
sky 34%
sea 28%
sand 31%

OCR
Detected text...

Scene
Beach / Outdoor

AI Description
...

26. VIEW MODES

Nếu có segmentation overlay:

[Objects]
[Segmentation]
[Both]

Overlay phải responsive.
Không che kín ảnh.
Không làm lệch YOLO bbox.

27. MODULE STATUS

Hiển thị riêng:

Object Detection: Ready
Segmentation: Ready
OCR: Ready
Vision: Unavailable

Không báo toàn bộ analysis failed nếu chỉ một module lỗi.

28. HISTORY

Thêm:

AI Analysis History

Mỗi card:

thumbnail

scene

objectCount

top regions

processing time

status

createdAt

View

Không phá history cũ.

29. PERFORMANCE

Đo riêng:

YOLO time
Segmentation time
OCR time
Vision time
Total time

Không chỉ ghi một con số tổng.

30. BENCHMARK

Chuẩn bị tối thiểu 20-30 ảnh:

Beach
Street
Indoor
Office
Food
Nature
Night
Crowded
Text-heavy

Không fake benchmark.

31. SEGMENTATION EVALUATION

Nếu không có ground-truth masks:

KHÔNG báo mIoU giả

Dùng manual evaluation:

expected region labels

predicted region labels

correct/missed/false region labels

32. YOLO EVALUATION

Theo dõi:

false positives

missed objects

confidence

Không gọi là official mAP nếu dataset chưa annotate chuẩn.

33. OCR EVALUATION

Giữ CER/WER hiện tại.
Không phá benchmark OCR.

34. VISION EVALUATION

Đánh giá:

scene correctness

consistency với YOLO

consistency với segmentation

hallucination count

description relevance

Không báo accuracy 99% nếu không có chứng cứ.

35. BEACH TEST BẮT BUỘC

Ảnh chứa:

sky
sea
sand
umbrella
chair

Expected:

YOLO:
umbrella/chair nếu model phát hiện

Segmentation:
sky
sea/water
sand/ground

Vision:
beach
outdoor

Fusion:
không làm mất region nền

36. STREET TEST

Ảnh:
car
motorbike
road
building
sky

Expected:
objects + road/building + street/outdoor

37. INDOOR TEST

Ảnh:
laptop
desk
chair
wall
floor

Expected:
objects + indoor regions + workspace/room nếu đủ evidence

38. OCR-HEAVY TEST

Ảnh biển hiệu/menu/document.

Expected:

OCR vẫn hoạt động

Vision không thay thế PaddleOCR

text verified chỉ đến từ OCR

39. FALSE POSITIVE CONTROL

YOLO default confidence khuyến nghị:

0.25

Không dùng 0.10 làm default nếu tạo noise.

Slider frontend có thể cho user chỉnh.

40. IMAGE INPUT SAFETY

FastAPI phải:

validate URL

timeout

validate content-type

giới hạn size

reject corrupt image

Ưu tiên whitelist Cloudinary host nếu phù hợp.

41. RESOURCE MANAGEMENT

Models load một lần.

Không giữ tensor/ảnh trong RAM vô hạn.
Cleanup temp files.
CPU fallback bắt buộc.
GPU optional.

Không bắt user cài CUDA.

42. TYPESCRIPT QUALITY

Tạo types:

Detection
BoundingBox
SemanticRegion
OCRResult
VisionResult
UnifiedAnalysis
ModuleStatus

Không dùng any tràn lan.
Không @ts-ignore để né lỗi.

43. PYTHON QUALITY

type hints

Pydantic

service separation

rõ exception

không bare except

không swallow error

không nhét mọi logic vào main.py

44. NESTJS QUALITY

controller

service

dto

schema

interfaces

Nếu đã có AI client thì mở rộng client đó.
Không duplicate HTTP logic.

45. HEALTH CHECK

Có thể mở rộng:

{
"ocr": true,
"objectDetection": true,
"semanticSegmentation": true,
"vision": true
}

Nhưng phải backward-compatible.

46. REGRESSION

Bắt buộc test lại:

/api/auth/*
/api/images/*
/api/ocr/*
/api/translation/*
/api/object-detection/*

Frontend:
Login
Register
Dashboard
OCR
Translation
History
Object Detection

47. BUILD CHECK

Backend:

cd D:\hocWeb\P_AI\backend
npm run build

Frontend:

cd D:\hocWeb\P_AI\frontend
npm run build

AI:

cd D:\hocWeb\P_AI\ai-service
.venv\Scripts\activate
python -m uvicorn app.main --host 0.0.0.0 --port 8000

48. END-TO-END TEST

Login
-> Upload
-> Analyze Image
-> YOLO
-> Segmentation
-> OCR
-> Vision
-> Fusion
-> MongoDB
-> Frontend
-> History

Phải chạy thật.

49. NO FAKE AI

Không được:

hard-code kết quả

map filename -> scene

fake confidence

fake benchmark

fake PASS

mock production response

50. LIMITATIONS

Documentation phải ghi rõ:

YOLO không nhận diện mọi vật thể.
Segmentation phụ thuộc class pretrained.
Vision LLM có thể hallucinate.
Scene inference có thể dùng heuristic.
CPU có thể chậm.

Không tuyên bố "nhận diện toàn bộ mọi thứ trong ảnh".

51. DOCUMENTATION

Tạo:

docs/phase-7-advanced-image-understanding.md

Bao gồm:

architecture

models

endpoints

schemas

fusion rules

benchmark

errors

limitations

run/test guide

52. ACCEPTANCE CRITERIA

Semantic Segmentation:
[ ] model load thành công
[ ] regions hợp lệ
[ ] beach test nhận ra sky/sea/sand hoặc canonical tương đương

Vision:
[ ] structured result
[ ] fallback khi unavailable

Fusion:
[ ] merge YOLO + segmentation + OCR + Vision
[ ] partial success
[ ] không mất dữ liệu

Database:
[ ] save đúng
[ ] ownership đúng

Frontend:
[ ] objects
[ ] regions
[ ] OCR
[ ] scene
[ ] description
[ ] history
[ ] responsive

Regression:
[ ] Phase 1-6 PASS

Build:
[ ] backend PASS
[ ] frontend PASS
[ ] FastAPI PASS

53. PASS/FAIL RULE

PASS chỉ khi đã test thực tế.

Nếu chưa kiểm tra:

NOT VERIFIED

Nếu lỗi:

FAIL

Không tự suy diễn PASS.

54. REPORT CUỐI

Báo cáo Antigravity phải gồm:

Existing architecture review

Files created

Files modified

Dependencies added

Segmentation model

Vision integration

Fusion logic

MongoDB changes

API changes

Frontend changes

Security checks

Performance metrics

Accuracy tests

Regression results

Known limitations

Final status

55. THỨ TỰ THỰC HIỆN BẮT BUỘC

Read current codebase

Verify Phase 6

Inspect dependency compatibility

Add segmentation

Test segmentation standalone

Add scene inference

Add Vision adapter

Test Vision standalone

Add fusion service

Add unified FastAPI pipeline

Add NestJS schema/API

Add frontend

Add history

Benchmark

Regression

Build

E2E

Documentation

Final report

Không nhảy bước.

56. DEFINITION OF DONE

Phase 7 DONE khi pipeline sau chạy thật:

IMAGE
|
+--> YOLO
+--> SegFormer
+--> PaddleOCR
+--> Vision LLM
|
v
AI Fusion
|
v
MongoDB
|
v
Frontend

Với ảnh bãi biển, hệ thống phải có khả năng cho kết quả theo hướng:

Objects:
umbrella
chair

Regions:
sky
sea/water
sand/ground

Scene:
beach
outdoor

Description:
mô tả ngắn gọn bám sát ảnh

Không hard-code.

57. ƯU TIÊN KỸ THUẬT

Correctness

Stability
Accuracy
Security
Explainability
Maintainability
Performance
UI polish

58. YÊU CẦU CUỐI CÙNG

Bắt đầu triển khai Phase 7 trên codebase hiện tại.

Không rewrite kiến trúc.
Không phá Phase 1-6.
Không tự mở rộng scope.
Không claim 100% nếu chưa test.
Không che giấu lỗi.

Mục tiêu cuối:

Biến hệ thống từ:

OCR + YOLO Tool

thành:

MULTI-MODEL AI IMAGE UNDERSTANDING SYSTEM

có khả năng:

Detect Objects
Understand Scene Regions
Read Text
Understand Context
Fuse Results
Explain Image

một cách ổn định, có kiểm thử, có benchmark và có bằng chứng