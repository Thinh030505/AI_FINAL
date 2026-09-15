SUPER PROMPT — PHASE 6

TÍCH HỢP YOLO OBJECT DETECTION VÀO AI OCR HUB

Dành cho Antigravity Agent

0. VAI TRÒ CỦA BẠN

Bạn là Senior Full-stack + AI Engineer chịu trách nhiệm triển khai Phase 6 cho dự án hiện có tại:

D:\hocWeb\P_AI

Dự án đã hoàn thành 5 phase đầu tiên và đang có kiến trúc thực tế như sau:

React 18 + TypeScript + Vite
        |
        v
NestJS 10 API Gateway
        |
        +--------------------+
        |                    |
        v                    v
 MongoDB Atlas          Cloudinary
        |
        v
FastAPI AI Service
        |
        +-- PaddleOCR
        +-- Translation

Phase 6 phải mở rộng đúng kiến trúc hiện tại, tuyệt đối không viết lại project theo stack khác.

1. MỤC TIÊU PHASE 6

Triển khai chức năng:

AI Object Detection bằng YOLO cho ảnh người dùng đã upload

Người dùng phải có thể:

Upload ảnh như hệ thống hiện tại.

Chọn một ảnh thuộc quyền sở hữu của mình.

Nhấn nút Analyze Objects.

NestJS xác thực JWT và quyền sở hữu ảnh.

NestJS gửi URL ảnh sang FastAPI AI Service.

FastAPI chạy YOLO.

YOLO trả:

object label

confidence

bounding box

image width/height

processing time

NestJS lưu kết quả vào MongoDB.

Frontend hiển thị:

ảnh gốc

bounding box overlay

label

confidence

danh sách vật thể

thời gian xử lý

Có lịch sử phân tích Object Detection.

Phase 6 phải là một module AI riêng biệt và hoạt động song song với OCR hiện tại.

2. NGUYÊN TẮC KIẾN TRÚC BẮT BUỘC

KHÔNG được phá kiến trúc hiện tại.

Luồng bắt buộc:

Frontend React
      |
      | REST API + Bearer JWT
      v
NestJS Gateway
      |
      | HTTP Internal Request
      v
FastAPI AI Service
      |
      v
YOLO

Frontend KHÔNG ĐƯỢC gọi trực tiếp FastAPI.

Frontend KHÔNG ĐƯỢC gọi MongoDB trực tiếp.

FastAPI KHÔNG ĐƯỢC tự ghi MongoDB.

NestJS vẫn là nơi:

xác thực JWT

kiểm tra quyền sở hữu ảnh

lưu database

expose API public cho frontend

FastAPI chỉ xử lý AI.

3. TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ Ý THAY ĐỔI

Không được tự ý:

đổi React sang Next.js

đổi NestJS sang FastAPI-only backend

đổi MongoDB sang PostgreSQL

đổi Cloudinary

xóa PaddleOCR

xóa Translation module

đổi cấu trúc auth hiện tại

đổi JWT strategy

đổi tên endpoint cũ

đổi port hiện có

đổi cấu trúc thư mục gốc

thay đổi schema cũ theo cách breaking change

refactor toàn project không cần thiết

sửa UI cũ nếu không liên quan

thêm Docker phức tạp nếu không cần

thêm microservice mới ngoài ai-service

thêm Redis, Kafka, RabbitMQ

thêm SAM, CLIP, Gemini, TTS

fine-tune model trong Phase 6

train YOLO từ đầu

Phase 6 chỉ tập trung vào:

YOLO Object Detection + Persistence + Visualization + History

4. MODEL YOLO ĐƯỢC PHÉP DÙNG

Ưu tiên:

Ultralytics YOLO11

Model mặc định:

yolo11n.pt

Lý do:

nhẹ

đủ nhanh

phù hợp máy sinh viên

dễ deploy

không cần GPU

chạy CPU được

Nếu package Ultralytics hiện tại không tương thích thì mới được fallback sang model Ultralytics ổn định tương đương.

Không được chọn model quá nặng như x/l nếu chưa có lý do kỹ thuật rõ ràng.

Model phải được load một lần khi FastAPI startup, không load lại mỗi request.

5. CẤU TRÚC THƯ MỤC MONG MUỐN

Giữ nguyên project hiện tại.

Trong:

ai-service/

bổ sung theo hướng tương đương:

ai-service/
└── app/
    ├── main.py
    ├── services/
    │   ├── ocr_service.py
    │   ├── translation_service.py
    │   └── object_detection_service.py
    ├── models/
    │   └── object_detection_models.py
    └── utils/
        └── ...

Không bắt buộc đúng tuyệt đối tên file nếu codebase hiện tại có convention khác.

PHẢI đọc codebase trước rồi bám theo convention hiện có.

Trong NestJS:

backend/src/

bổ sung module theo convention hiện tại:

object-detection/
├── object-detection.module.ts
├── object-detection.controller.ts
├── object-detection.service.ts
├── dto/
└── schemas/

Không được copy code bừa nếu project đang tổ chức theo pattern khác.

6. FASTAPI — AI SERVICE REQUIREMENTS

6.1. Dependency

Thêm:

ultralytics

vào dependency file đang được project sử dụng.

Không tạo thêm requirements phụ nếu không cần.

Sau khi cài phải bảo đảm:

import được

server boot được

model load được

không làm hỏng PaddleOCR

6.2. Startup Model Loading

YOLO model phải được load một lần lúc startup.

Pseudo architecture:

yolo_model = None

@app.on_event("startup")
async def startup_event():
    global yolo_model
    yolo_model = YOLO("yolo11n.pt")

Nếu project đang dùng lifespan API thì dùng lifespan.

Không được tạo:

YOLO("yolo11n.pt")

mới cho mỗi request.

6.3. FastAPI Endpoint

Tạo internal endpoint:

POST /object-detection

Input:

{
  "imageUrl": "https://..."
}

Có thể dùng snake_case nội bộ nếu convention FastAPI hiện tại dùng snake_case, nhưng response về NestJS phải nhất quán.

Validation:

URL không rỗng

chỉ http/https

timeout download

kiểm tra response status

kiểm tra content-type ảnh

giới hạn dung lượng hợp lý

xử lý ảnh hỏng

Không được trust URL mù quáng.

6.4. Output Contract

Response thành công phải có format ổn định tương đương:

{
  "model": "yolo11n",
  "imageWidth": 1280,
  "imageHeight": 720,
  "processingTimeMs": 186,
  "detections": [
    {
      "label": "person",
      "classId": 0,
      "confidence": 0.9621,
      "box": {
        "x1": 100.2,
        "y1": 80.4,
        "x2": 450.8,
        "y2": 690.1
      }
    }
  ]
}

Quy định:

confidence: float 0..1

bbox dùng pixel theo ảnh gốc

x1 < x2

y1 < y2

không trả tensor/raw numpy

không trả object Python không serialize được

classId là integer

label là string

processingTimeMs là integer hoặc float hợp lệ

6.5. Confidence Threshold

Mặc định:

0.25

Tạo constant/config rõ ràng.

Không hard-code rải rác.

Có thể cho phép request override threshold sau này, nhưng Phase 6 không cần expose cho frontend nếu chưa cần.

6.6. Error Handling

FastAPI phải trả lỗi rõ ràng cho:

URL invalid

tải ảnh thất bại

timeout

file không phải ảnh

decode ảnh thất bại

model chưa load

inference exception

ảnh không có object

Lưu ý:

"không có object" KHÔNG phải server error

trường hợp đó trả:

{
  "detections": []
}

và HTTP 200.

7. NESTJS — MODULE OBJECT DETECTION

Tạo module riêng.

Tên gợi ý:

ObjectDetectionModule

8. MONGODB SCHEMA

Tạo collection mới:

objectdetections

Schema tối thiểu:

ObjectDetection
├── _id
├── userId
├── imageId
├── model
├── imageWidth
├── imageHeight
├── detections[]
│   ├── label
│   ├── classId
│   ├── confidence
│   └── box
│       ├── x1
│       ├── y1
│       ├── x2
│       └── y2
├── objectCount
├── processingTimeMs
├── createdAt
└── updatedAt

Yêu cầu:

userId phải reference user

imageId phải reference image

index hợp lý cho userId/imageId

không lưu duplicate raw response không cần thiết

objectCount phải nhất quán với detections.length

Nếu project convention dùng embedded schema thì bám theo.

9. BACKEND PUBLIC API

9.1. Analyze

POST /api/object-detection
Authorization: Bearer <JWT>

Body:

{
  "imageId": "..."
}

Luồng bắt buộc:

1. Validate JWT
2. Validate imageId
3. Tìm image
4. Kiểm tra image.userId === currentUser.id
5. Nếu không thuộc user -> 403
6. Lấy imageUrl Cloudinary
7. Gọi FastAPI /object-detection
8. Validate AI response
9. Lưu MongoDB
10. Return normalized response

Không được cho user truyền arbitrary imageUrl vào public API.

Public API chỉ nhận:

imageId

để tránh SSRF và bypass ownership.

9.2. History

GET /api/object-detection

Trả danh sách các lần phân tích thuộc user hiện tại.

Sort:

createdAt DESC

9.3. Detail

GET /api/object-detection/:id

Chỉ trả record thuộc user hiện tại.

Nếu record tồn tại nhưng thuộc user khác:

ưu tiên 404 hoặc 403 theo convention hiện tại

nhất quán với các module khác

10. KHÔNG CHO PHÉP LỖ HỔNG OWNERSHIP

Đây là yêu cầu bắt buộc.

User A tuyệt đối không được:

phân tích ảnh User B

xem object detection User B

query record User B

dùng IDOR để truy cập dữ liệu người khác

Phải test trường hợp này.

11. FRONTEND — TRANG OBJECT DETECTION

Tích hợp UI theo design system hiện tại.

Không viết lại toàn giao diện.

Có thể tạo:

ObjectDetectionPage

hoặc tích hợp vào AI Studio nếu project đã có pattern tương tự.

12. FRONTEND FLOW

UI tối thiểu:

[ Select Image ]

+----------------------------------+
|                                  |
|         IMAGE PREVIEW            |
|                                  |
+----------------------------------+

[ Analyze Objects ]

Detected Objects
------------------------------------
Person      96%
Laptop      91%
Bottle      88%

Processing: 186 ms
Objects: 3

13. BOUNDING BOX OVERLAY

Đây là yêu cầu bắt buộc của Phase 6.

Frontend phải overlay bounding box trực tiếp trên ảnh.

Không được chỉnh sửa ảnh gốc.

Dùng:

HTML canvas
hoặc

absolute positioned div/SVG

Khuyến nghị:

SVG overlay

vì dễ scale responsive.

Công thức scale:

scaleX = displayedWidth / originalImageWidth
scaleY = displayedHeight / originalImageHeight

Render:

left   = x1 * scaleX
top    = y1 * scaleY
width  = (x2 - x1) * scaleX
height = (y2 - y1) * scaleY

Nếu dùng SVG với viewBox bằng kích thước ảnh gốc thì càng tốt:

<svg
  viewBox="0 0 IMAGE_WIDTH IMAGE_HEIGHT"
  preserveAspectRatio="xMidYMid meet"
>

Bounding box phải bám đúng ảnh khi resize.

14. LABEL HIỂN THỊ

Mỗi box phải có:

label + confidence

Ví dụ:

person 96%

Không cần dịch label trong Phase 6.

Không thêm logic thừa.

15. OBJECT LIST

Hiển thị danh sách detections.

Ví dụ:

Detected objects (4)

1. person          96.21%
2. laptop          91.47%
3. bottle          88.08%
4. cell phone      84.62%

Có thể group theo class:

person x2
bottle x1
phone x1

nhưng raw detection list vẫn phải có.

16. HISTORY UI

Trong HistoryPage hiện tại có:

Uploaded Images

OCR History

Translation History

Phase 6 bổ sung:

Object Detection History

Mỗi card hiển thị:

thumbnail

số object

model

processing time

createdAt

nút View

Không phá các tab hiện tại.

17. API CLIENT

Frontend phải dùng Axios/client abstraction hiện tại.

Không tạo fetch logic rải rác nếu project đã có API service layer.

Authorization phải dùng token handling hiện tại.

Không duplicate auth code.

18. LOADING STATE

Khi inference:

disable Analyze button

show spinner

chống double click

không gửi duplicate request

Nếu lỗi:

hiển thị message thân thiện

không crash page

19. EMPTY STATE

Nếu YOLO không phát hiện object:

Hiển thị:

No objects detected in this image.

Không coi đây là lỗi.

20. VALIDATION & SECURITY

Backend phải:

validate ObjectId

validate DTO

reject malformed input

không expose stack trace production

không log JWT

không log password

không log MongoDB URI

không log Cloudinary secret

không log API secret

FastAPI phải:

có timeout tải ảnh

giới hạn response/file size hợp lý

xử lý network exception

tránh SSRF tùy khả năng

Vì URL sang FastAPI xuất phát từ Cloudinary URL đã lưu từ backend nên FastAPI có thể whitelist:

res.cloudinary.com
hoặc domain Cloudinary thực tế của project

Nếu implement whitelist, không làm hỏng Cloudinary hiện tại.

21. KHÔNG DUPLICATE PHÂN TÍCH NGOÀI Ý MUỐN

Nếu user bấm analyze nhiều lần:

cho phép tạo record mới nếu đó là hành vi hiện tại mong muốn
hoặc

reuse record gần nhất nếu thiết kế hiện tại đã có caching

Phase 6 không bắt buộc caching.

Nhưng phải chống double click trên UI.

22. PERFORMANCE

Mục tiêu trên CPU sinh viên:

YOLO11n inference: cố gắng < 2 giây / ảnh thông thường

Không biến đây thành hard failure nếu máy yếu.

Phải đo:

processingTimeMs

Chỉ tính AI processing hợp lý.

23. LOGGING

Backend log:

request start

imageId

AI service status

processing time

error category

Không log dữ liệu nhạy cảm.

FastAPI log:

model loaded

inference time

detection count

exception

24. HEALTH CHECK

Health check hiện tại không được phá.

Có thể mở rộng AI health response:

{
  "status": "ok",
  "ocr": true,
  "objectDetection": true
}

CHỈ nếu không làm breaking change frontend hiện tại.

Nếu frontend HealthStatus đang phụ thuộc response schema cũ:

giữ field cũ

chỉ thêm field mới optional

25. TEST FASTAPI

Phải có test hoặc script test cho:

Case 1

Ảnh có nhiều object.

Expected:

detections.length > 0

Case 2

Ảnh không có object rõ ràng.

Expected:

HTTP 200
detections = []

Case 3

URL invalid.

Expected:

4xx

Case 4

URL không phải ảnh.

Expected:

4xx

Case 5

Model lỗi / download lỗi.

Expected:

handled error

Không crash process.

26. TEST NESTJS

Phải test:

Không JWT -> 401

JWT hợp lệ -> được

imageId invalid -> 400

image không tồn tại -> 404

image thuộc user khác -> 403/404

AI service unavailable -> 502/503 hợp lý

AI response hợp lệ -> lưu MongoDB

GET history chỉ trả current user

GET detail không leak dữ liệu user khác

27. TEST FRONTEND

Manual test tối thiểu:

Login
-> Upload image
-> Open Object Detection
-> Select image
-> Analyze
-> See bounding boxes
-> See object list
-> Refresh
-> Open history
-> Open result again

Phải chạy được end-to-end.

28. TEST ẢNH THỰC TẾ

Chuẩn bị tối thiểu 5 loại:

1. Người + điện thoại
2. Laptop + bàn + chai
3. Xe máy / ô tô ngoài đường
4. Nhiều người
5. Ảnh ít hoặc không có object COCO rõ ràng

Ghi lại:

detections

confidence

processing time

29. ACCEPTANCE CRITERIA PHASE 6

Phase 6 chỉ được đánh dấu 100% khi tất cả điều sau đúng:

Backend

NestJS compile không lỗi

FastAPI boot không lỗi

MongoDB kết nối bình thường

Cloudinary chức năng cũ vẫn chạy

Auth chức năng cũ vẫn chạy

OCR chức năng cũ vẫn chạy

Translation chức năng cũ vẫn chạy

YOLO

Model load một lần

Detect được ảnh thực

Confidence hợp lệ

Bounding box hợp lệ

Processing time được ghi

Database

Lưu object detection

userId đúng

imageId đúng

history query đúng

Security

Không truy cập ảnh user khác

Không xem record user khác

Không expose arbitrary URL public

Frontend

Chọn ảnh được

Analyze được

Loading đúng

Error state đúng

Bounding box đúng vị trí

Responsive không lệch box

Object list hiển thị đúng

History hiển thị đúng

Regression

Register vẫn hoạt động

Login vẫn hoạt động

Upload vẫn hoạt động

Delete image vẫn hoạt động

OCR vẫn hoạt động

Translation vẫn hoạt động

30. BUILD CHECK BẮT BUỘC

Trước khi báo hoàn thành:

Backend

cd D:\hocWeb\P_AI\backend
npm install
npm run build

Build phải thành công.

Sau đó:

npm run start:dev

Không được có lỗi TypeScript.

Frontend

cd D:\hocWeb\P_AI\frontend
npm install
npm run build

Build phải thành công.

Sau đó:

npm run dev

Không được có TypeScript/Vite error nghiêm trọng.

AI Service

cd D:\hocWeb\P_AI\ai-service
.venv\Scripts\activate
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

Server phải boot.

YOLO và PaddleOCR phải cùng load được.

31. KHÔNG ĐƯỢC CHỈ KIỂM TRA BUILD

Build pass chưa đủ.

Phải thực hiện end-to-end:

Frontend
   |
   v
NestJS
   |
   v
FastAPI
   |
   v
YOLO
   |
   v
MongoDB
   |
   v
Frontend Result

32. XỬ LÝ LỖI CỔNG

Dự án hiện dùng:

Frontend: 5173
Backend: 3000
AI: 8000

Không tự đổi port.

Nếu EADDRINUSE:

dùng cơ chế clean port hiện tại

không đổi port để né lỗi

33. ENVIRONMENT VARIABLES

Không hard-code secret.

Nếu cần config mới, thêm vào .env.example.

Ví dụ nếu có:

YOLO_MODEL=yolo11n.pt
YOLO_CONFIDENCE=0.25
AI_SERVICE_URL=http://localhost:8000

Chỉ thêm nếu architecture hiện tại chưa có config tương đương.

Không duplicate biến môi trường.

34. TYPESCRIPT QUALITY

Không dùng:

any

tràn lan.

Tạo interface/type cho:

detection

bounding box

object detection result

API response

Không suppress TypeScript error bằng:

// @ts-ignore

trừ trường hợp thật sự có lý do và phải giải thích.

35. PYTHON QUALITY

Python:

type hints

Pydantic models

exception handling rõ ràng

không viết tất cả logic trong main.py

service class/function riêng

không swallow exception

không bare except:

36. KHÔNG CHỈ COPY YOLO SAMPLE CODE

Không được dừng ở:

results = model(image)
results[0].show()

Phải convert inference result thành API data chuẩn.

Không được mở cửa sổ ảnh trên server.

Không được lưu file annotated tạm nếu không cần.

37. IMAGE COORDINATE CONTRACT

Một trong những lỗi phổ biến nhất cần tránh:

YOLO bbox phải tương ứng với:

imageWidth
imageHeight

của chính ảnh được inference.

Frontend phải overlay theo đúng coordinate system này.

Không dùng dimensions thumbnail Cloudinary thay cho ảnh gốc nếu inference chạy trên ảnh gốc.

38. KHÔNG ĐƯỢC TỰ Ý TỐI ƯU ẢNH TRƯỚC YOLO THEO OCR

OCR preprocessing:

CLAHE
Lanczos
Unsharp
Gaussian

KHÔNG tự động áp dụng cho YOLO.

YOLO dùng pipeline preprocessing của Ultralytics trừ khi có benchmark chứng minh cần thay đổi.

Không làm ảnh hưởng OCR service.

39. RESPONSE NORMALIZATION

NestJS phải normalize FastAPI result trước khi gửi frontend.

Không expose raw AI-service response nếu cấu trúc nội bộ không ổn định.

Public API contract nên ổn định:

{
  "id": "...",
  "imageId": "...",
  "image": {
    "imageUrl": "..."
  },
  "model": "yolo11n",
  "imageWidth": 1280,
  "imageHeight": 720,
  "objectCount": 3,
  "processingTimeMs": 186,
  "detections": [...]
}

40. PHASE 6 KHÔNG BAO GỒM

Không làm trong phase này:

SAM segmentation
CLIP search
Gemini Vision
GPT Vision
Face Recognition
Object Tracking
Realtime Webcam Detection
WebSocket inference
Video Detection
Custom YOLO training
Dataset annotation
Recommendation engine
Social feed
Like
Comment
Follow
Chat
TTS

Các phần đó để phase sau.

41. PHASE 6 PHẢI CHUẨN BỊ ĐƯỜNG CHO PHASE SAU

Code phải dễ mở rộng để Phase 7 có thể thêm:

Multimodal Image Understanding / Vision LLM

Không coupling YOLO vào OCR.

Thiết kế:

AI Service
├── OCR Service
├── Object Detection Service
├── Translation Service
└── future Vision Service

42. GIT / FILE HYGIENE

Không commit:

.env

secret

node_modules

venv

model cache lớn nếu không cần

temporary images

build output không cần

Nếu YOLO tự tải model:

xem xét .gitignore phù hợp

Không xóa .gitignore hiện tại.

43. DOCUMENTATION

Sau khi hoàn thành, cập nhật README hoặc tạo:

docs/phase-6-object-detection.md

Nội dung:

kiến trúc

endpoint

schema

cách chạy

cách test

known limitations

model đang dùng

confidence threshold

44. BÁO CÁO KẾT QUẢ CUỐI CÙNG CỦA ANTIGRAVITY

Khi hoàn thành, KHÔNG chỉ trả:

Phase 6 completed successfully.

Phải trả báo cáo có cấu trúc:

1. Files created
2. Files modified
3. Dependencies added
4. MongoDB schema
5. FastAPI endpoint
6. NestJS endpoints
7. Frontend changes
8. Security checks
9. Tests performed
10. Build results
11. End-to-end test results
12. Sample YOLO output
13. Known limitations
14. Phase 6 final status

45. BẮT BUỘC GHI RÕ KẾT QUẢ TEST

Ví dụ:

Backend build: PASS
Frontend build: PASS
FastAPI startup: PASS
MongoDB: PASS
Cloudinary: PASS
YOLO model load: PASS
Object inference: PASS
Bounding box UI: PASS
Ownership test: PASS
OCR regression: PASS
Translation regression: PASS

Nếu bất kỳ mục nào chưa test:
phải ghi:

NOT VERIFIED

Không được tự động ghi PASS khi chưa test.

46. KHÔNG ĐƯỢC GIẤU LỖI

Nếu gặp lỗi:

xác định root cause

sửa đúng nguồn

chạy lại test

Không:

comment code để né lỗi

catch exception rồi bỏ qua

disable feature

tắt TypeScript strict

bỏ validation

hard-code fake response

mock kết quả trong production

fake PASS

47. NGUYÊN TẮC "NO SMALL ERRORS"

Trước khi kết thúc, tự kiểm tra:

Imports
Routes
DTO
Schema registration
Module imports
Dependency injection
Env vars
CORS
JWT guard
ObjectId validation
Axios URL
FastAPI route
Pydantic field names
Mongo indexes
Frontend types
Responsive bbox scaling
Loading state
Empty state
Error state
History query
Ownership
Build
Startup
Regression

Không được bỏ qua lỗi nhỏ vì “không ảnh hưởng nhiều”.

48. THỨ TỰ THỰC HIỆN BẮT BUỘC

Thực hiện theo đúng thứ tự:

Step 1

Đọc codebase hiện tại.

Step 2

Xác định convention thực tế.

Step 3

Backup/ghi nhận các file sẽ sửa.

Step 4

Cài Ultralytics cho AI service.

Step 5

Implement YOLO service.

Step 6

Test FastAPI endpoint độc lập.

Step 7

Implement MongoDB schema.

Step 8

Implement NestJS service/controller/module.

Step 9

Test backend API bằng JWT.

Step 10

Implement frontend page.

Step 11

Implement bounding box overlay.

Step 12

Implement history.

Step 13

End-to-end test.

Step 14

Regression test 5 phase cũ.

Step 15

Build frontend/backend.

Step 16

Viết báo cáo Phase 6.

Không nhảy thẳng vào frontend trước khi AI endpoint hoạt động.

49. DEFINITION OF DONE

Phase 6 chỉ DONE khi:

User login
   |
   v
Upload Image
   |
   v
Select Image
   |
   v
Analyze Objects
   |
   v
YOLO Detection
   |
   v
MongoDB Save
   |
   v
Bounding Boxes + Labels
   |
   v
History

chạy thật từ đầu đến cuối.

50. YÊU CẦU CUỐI CÙNG

Bắt đầu triển khai Phase 6 ngay trên codebase hiện tại.

Trước khi sửa:

đọc kỹ code hiện tại

không giả định cấu trúc file

không rewrite module cũ

Mọi thay đổi phải:

backward-compatible

đúng kiến trúc

có validation

có error handling

có security

có test

có build verification

Ưu tiên:

Correctness
> Stability
> Security
> Maintainability
> Performance
> Fancy UI

Không tự mở rộng scope.

Không chuyển sang Phase 7.

Kết thúc Phase 6 bằng báo cáo kiểm thử chi tiết, chỉ đánh dấu 100% COMPLETE khi toàn bộ acceptance criteria thực sự PASS.
