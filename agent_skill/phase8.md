SUPER PROMPT — PHASE 8

SMART CAMERA CAPTURE & MULTI-MODEL AI ANALYSIS

Dành cho Antigravity Agent

0. VAI TRÒ

Bạn là Senior Full-stack Engineer + AI Product Engineer triển khai Phase 8 cho dự án:

D:\hocWeb\P_AI

Trạng thái đã được audit:

React 18 + Vite + TypeScript + Tailwind

NestJS 10 API Gateway

FastAPI AI Service

MongoDB Atlas

Cloudinary

PaddleOCR

Translation

YOLO11n

SegFormer

Scene Inference

Gemini Vision

AI Fusion

Gemini live đã verify:
vision=success
isFallback=False

Nhiệm vụ Phase 8:
Bổ sung chức năng chụp ảnh trực tiếp từ camera trình duyệt và đưa ảnh vào unified AI pipeline để phân tích chi tiết vật thể, vùng cảnh, chữ và ngữ cảnh.

1. MỤC TIÊU

User flow:

Login
-> Open Smart Camera
-> Allow permission
-> Live preview
-> Capture
-> Preview
-> Retake hoặc Analyze
-> Upload qua API hiện có
-> Unified AI Analysis
-> Hiển thị YOLO / SegFormer / OCR / Translation / Scene / Gemini / Fusion
-> Lưu History

2. GIỮ NGUYÊN KIẾN TRÚC

React
-> NestJS
-> MongoDB + Cloudinary
-> FastAPI

Frontend không gọi FastAPI trực tiếp.
FastAPI không ghi MongoDB trực tiếp.

3. OUT OF SCOPE

Không làm:

realtime video detection

object tracking

websocket streaming

face recognition

livestream AI

social feed

like/comment/follow

chat

recommendation

SAM

CLIP

custom model training

Flutter rewrite

4. CAMERA PAGE

Tạo:
CameraPage

Route:
/camera

Navigation:
Smart Camera

Dùng:
navigator.mediaDevices.getUserMedia()

5. CAMERA STATES

Dùng state rõ ràng:
idle
requesting_permission
live
captured
uploading
analyzing
success
partial_success
error

Không dùng boolean rải rác gây conflict.

6. LIVE CAMERA UI

+--------------------------------+
|       LIVE CAMERA PREVIEW      |
+--------------------------------+

[ Switch Camera ]   [ Capture ]

Desktop ưu tiên user.
Mobile ưu tiên environment.

Nếu chỉ 1 camera thì ẩn Switch Camera.

7. CAMERA ERRORS

Handle:

permission denied

no camera

camera busy

unsupported browser

getUserMedia failed

Không crash trắng trang.

8. STREAM CLEANUP

Bắt buộc stop tracks:
stream.getTracks().forEach(track => track.stop())

khi:

unmount

navigate away

switch camera

reset stream

Không để camera tiếp tục chạy nền.

9. CAPTURE

video
-> canvas.drawImage
-> canvas.toBlob
-> File

Format:
image/jpeg
quality=0.9

Filename:
camera-capture-YYYYMMDD-HHmmss.jpg

Không lưu base64 vào localStorage.

10. PREVIEW

Sau capture:

+--------------------------------+
|       CAPTURED IMAGE           |
+--------------------------------+

[ Retake ]     [ Analyze Image ]

User phải xác nhận Analyze.

11. ANALYZE FLOW

Khi bấm Analyze:

POST /api/images

nhận imageId

POST /api/image-analysis { imageId }

render result

Tận dụng API hiện có.
Không tạo camera API riêng nếu không cần.

12. IMAGE SOURCE METADATA

Nếu phù hợp, thêm optional:

source: "upload" | "camera"
capturedAt?: Date

Backward-compatible.
Không làm ảnh cũ lỗi.

13. AI PIPELINE

Không rewrite AI.

Dùng:

YOLO11n

SegFormer

PaddleOCR

Gemini Vision

Scene Inference

AI Fusion

14. RESULT VIEW

Hiển thị:

A. Detected Objects

label

confidence

bbox

B. Scene Regions

sky

water/sea

sand

road

grass

building

wall

floor
...

C. OCR

fullText

lines

confidence

D. Translation

source

translated

E. Scene

sceneType

environment

dominantRegions

F. Gemini

description

context

G. Processing

YOLO time

segmentation time

OCR time

vision time

total time

15. REUSE UI

Ưu tiên reuse:
ImageAnalysisPage
ObjectDetectionPage
HistoryPage

Nếu cần, tách nhẹ:
AnalysisResultView
BoundingBoxOverlay
SemanticRegionPanel
OCRPanel
ScenePanel
VisionDescriptionPanel

Không refactor lớn.

16. BBOX ACCURACY

Test:

landscape

portrait

selfie

rear camera

responsive resize

Nếu preview mirror bằng CSS, capture/result không được lệch bbox.

17. SEGMENTATION

Hiển thị top regions + percentage.
Optional overlay toggle nếu component hiện có hỗ trợ.

18. TRANSLATION

Nếu OCR text không rỗng:
cho phép Translate bằng workflow hiện có.

Không auto-translate nếu không cần.
Không gọi translation khi OCR rỗng.

19. LOADING UX

Hiển thị:
Uploading image...
Detecting objects...
Analyzing scene...
Reading text...
Understanding image...
Saving result...

Nếu backend không stream progress thật, stepper chỉ mang tính UI.
Không fake module completion.

20. DOUBLE CLICK

Disable Analyze khi request đang chạy.
Không tạo duplicate upload / duplicate analysis.

21. PARTIAL SUCCESS

Nếu một module fail:

show warning

vẫn hiển thị module thành công

không làm hỏng toàn page

22. RETAKE

Retake phải:

clear captured image

clear old result

restart camera

revoke object URL

23. MEMORY SAFETY

Bắt buộc:
URL.revokeObjectURL
stop MediaStream tracks
không giữ raw Blob toàn app
cleanup canvas/reference

24. CAMERA SWITCH

Switch:

stop old stream

request new stream

update facingMode

không mở 2 stream cùng lúc

25. MOBILE UX

Yêu cầu:

full-width preview

button lớn

portrait support

không horizontal overflow

touch-friendly

26. HTTPS / LOCALHOST

Document:
Camera API hoạt động trên localhost hoặc HTTPS.

Không cần cấu hình HTTPS trong Phase 8.

27. SECURITY

Không:

log base64

log JWT

log Gemini key

lưu raw camera frame trong localStorage

gửi ảnh trước khi user bấm Analyze

28. HISTORY

Camera images phải xuất hiện trong:

Images History

AI Analysis History

Nếu có source:
hiển thị badge Camera.

29. DELETE BEHAVIOR

Không làm orphan record issue tệ hơn.
Nếu image deletion chưa cascade:

ghi Known Limitation

không refactor lớn trong Phase 8 trừ khi fix nhỏ, an toàn, có regression test.

30. OCR PERFORMANCE

Không tối ưu OCR lớn trong Phase 8.
Chỉ:

loading tốt

timeout hợp lý

không duplicate request

31. TEST — PERSON + PHONE

Expected:

YOLO object

scene

description

history save

32. TEST — PRINTED TEXT

Expected:

OCR

confidence

translation available

Gemini không thay thế OCR verified text

33. TEST — OUTDOOR

Expected:

objects

scene regions

scene classification

Gemini description

34. TEST — NO COCO OBJECT

Expected:
YOLO detections=[]

Nhưng SegFormer / Scene / Gemini vẫn hoạt động.

35. CAMERA FAILURE TESTS

Test:

permission denied

no device

camera busy

unsupported browser

capture before stream ready

36. API FAILURE TEST

Test:

upload failure

AI unavailable

Gemini fallback

timeout

UI phải recover.

37. FRONTEND BUILD

cd D:\hocWeb\P_AI\frontend
npm run build

PASS bắt buộc.

38. BACKEND BUILD

Nếu backend thay đổi:

cd D:\hocWeb\P_AI\backend
npm run build

PASS bắt buộc.

39. AI HEALTH

Verify:
GET /health

Expected:
ocr=true
objectDetection=true
semanticSegmentation=true
vision=true

40. REGRESSION PHASE 1-7

Test lại:
Register
Login
Manual Upload
OCR
Translation
YOLO
Segmentation
Gemini
Unified Analysis
History
Delete image
Health

41. ACCEPTANCE CRITERIA

Phase 8 COMPLETE khi:

[ ] /camera exists
[ ] permission works
[ ] live preview works
[ ] capture works
[ ] retake works
[ ] stream cleanup works
[ ] preview works
[ ] analyze uploads image
[ ] imageId returned
[ ] unified AI analysis runs
[ ] YOLO displayed
[ ] Segmentation displayed
[ ] OCR displayed
[ ] Scene displayed
[ ] Gemini description displayed
[ ] Result persisted
[ ] History shows camera image
[ ] Partial success handled
[ ] Mobile responsive
[ ] Frontend build PASS
[ ] Backend build PASS if modified
[ ] AI health PASS
[ ] Phase 1-7 regression PASS

42. REPORT

Tạo:
docs/PHASE_8_SMART_CAMERA_REPORT.md

Nội dung:

Summary

Files Created

Files Modified

Camera Implementation

Capture & Upload Flow

AI Integration

Result UI

Error Handling

Security

Mobile

Test Matrix

Regression Results

Known Limitations

Final Status

43. STATUS

Chỉ dùng:
COMPLETE
PARTIAL
FAILED

Nếu browser camera không test được trên hardware thật:
IMPLEMENTED_NOT_VERIFIED_ON_PHYSICAL_CAMERA

Không fake PASS.

44. THỨ TỰ TRIỂN KHAI

Inspect frontend architecture

Inspect image upload API/service

Inspect ImageAnalysisPage reusable components

Implement CameraPage

Implement media lifecycle

Capture Blob/File

Preview/Retake

Integrate upload

Integrate unified analysis

Render result

Integrate history

Mobile handling

Error states

Security checks

Frontend build

Backend build if modified

AI health/regression

Browser camera test

E2E

Report

45. DEFINITION OF DONE

Phase 8 DONE khi user có thể:

Open Camera
-> Capture
-> Preview
-> Analyze
-> See detailed AI result
-> Find result in history

mà không làm hỏng Phase 1-7.

Bắt đầu triển khai Phase 8 ngay trên codebase hiện tại.