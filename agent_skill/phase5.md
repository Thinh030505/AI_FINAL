============================================================
PHASE 5 — TRANSLATION & OCR TEXT PROCESSING
============================================================

PROJECT:
AI OCR Application / AI OCR Hub

CURRENT STATUS:

Phase 1 — Core Infrastructure:
COMPLETED

Phase 2 — Authentication & User Management:
COMPLETED

Phase 3 — Image Upload / Cloudinary:
COMPLETED

Phase 4 — OCR:
COMPLETED / FUNCTIONAL

Current OCR pipeline:

React Frontend
    ↓
NestJS Backend
    ↓
Cloudinary
    ↓
FastAPI AI Service
    ↓
PaddleOCR (Vietnamese / English)
    ↓
OCR Result
    ↓
MongoDB
    ↓
Frontend

OCR hiện tại đã hoạt động thực tế.

PaddleOCR hiện đạt chất lượng tương đối tốt, khoảng 90%+ trên các ảnh test phù hợp.

KHÔNG tiếp tục refactor lớn OCR ở Phase 5.

KHÔNG thay đổi PaddleOCR model nếu không thực sự cần thiết.

Mục tiêu Phase 5 là xây dựng TRANSLATION PIPELINE dựa trên OCR result hiện có.

============================================================
1. MỤC TIÊU PHASE 5
============================================================

Xây dựng chức năng:

OCR Text
    ↓
Language Detection / User Selected Language
    ↓
Translation
    ↓
Translated Text
    ↓
Display trên Frontend
    ↓
Save Translation History

Hệ thống phải hỗ trợ tối thiểu:

Vietnamese → English

English → Vietnamese

Có thể thiết kế kiến trúc để mở rộng thêm ngôn ngữ sau này.

============================================================
2. KIẾN TRÚC BẮT BUỘC
============================================================

Frontend KHÔNG được gọi trực tiếp Translation Service bên ngoài.

Kiến trúc:

React
 ↓
NestJS Backend
 ↓
Translation Service

Nếu sử dụng FastAPI AI Service hiện tại thì có thể mở rộng:

NestJS
 ↓
FastAPI AI Service
 ↓
Translation Engine

Không được để:

React → FastAPI trực tiếp

Không được:

React → external translation API trực tiếp

NestJS phải tiếp tục là API Gateway.

============================================================
3. AUDIT CODE TRƯỚC KHI IMPLEMENT
============================================================

Trước khi sửa code:

Hãy inspect toàn bộ implementation hiện tại.

Kiểm tra:

Frontend:
- OCR Scanner
- OCR result state
- API client
- History
- authentication
- current user

Backend:
- OCR module
- History module
- Auth module
- Users module
- API response structure
- MongoDB schemas

AI Service:
- FastAPI structure
- OCR endpoint
- service architecture
- configuration
- environment variables

Không được đoán cấu trúc project.

Hãy sử dụng code hiện tại làm source of truth.

============================================================
4. TRANSLATION API
============================================================

Thiết kế endpoint:

POST /api/translation

Request:

{
  "text": "Hiển thị thông tin hồ sơ",
  "sourceLanguage": "vi",
  "targetLanguage": "en"
}

Response nên có cấu trúc rõ ràng:

{
  "success": true,
  "message": "Translation completed successfully",
  "data": {
    "translation": {
      "sourceText": "Hiển thị thông tin hồ sơ",
      "translatedText": "...",
      "sourceLanguage": "vi",
      "targetLanguage": "en",
      "processingTimeMs": 1234
    }
  }
}

Không được hardcode translation.

============================================================
5. TRANSLATION ENGINE
============================================================

Trước tiên hãy kiểm tra project hiện tại có translation provider nào được specification yêu cầu hay không.

Nếu đã có provider/configuration:

→ sử dụng provider đó.

Nếu chưa có:

→ tạo abstraction:

TranslationService
TranslationProvider

Ví dụ:

interface:

translate(
  text,
  sourceLanguage,
  targetLanguage
)

Không hardcode provider trực tiếp vào Controller.

Mục tiêu:

Sau này có thể thay đổi:

Provider A
→ Provider B
→ Local Translation Model

mà không cần sửa toàn bộ application.

============================================================
6. LANGUAGE DETECTION
============================================================

Có thể hỗ trợ:

sourceLanguage = "auto"

Ví dụ:

{
  "text": "Hiển thị thông tin hồ sơ",
  "sourceLanguage": "auto",
  "targetLanguage": "en"
}

System phải xác định:

vi

sau đó dịch sang:

en

Tuy nhiên:

Nếu language detection không đủ tin cậy:

hãy cho phép user chọn thủ công.

Frontend phải có:

Source Language:
[Auto Detect ▼]

Target Language:
[English ▼]

============================================================
7. UI TRANSLATION
============================================================

OCR Scanner hiện tại đang hiển thị:

OCR Text Recognition Output

Giữ nguyên khu vực OCR.

Bổ sung khu vực:

Translation

Ví dụ:

----------------------------------------
OCR RESULT

Hiển thị thông tin hồ sơ

Confidence:
96%

----------------------------------------

TRANSLATION

From:
Vietnamese

To:
English

[ Translate ]

----------------------------------------

Translated Text:

[ translated result ]

[ Copy ]

----------------------------------------

Không được làm mất OCR result gốc.

OCR text phải luôn được giữ nguyên.

============================================================
8. TRANSLATE BUTTON
============================================================

Sau khi OCR thành công:

Enable:

Translate

Button.

Nếu chưa có OCR text:

Translate button phải disabled.

Nếu OCR result:

fullText = ""

thì không được gọi Translation API.

Frontend phải hiển thị:

"No text available for translation."

============================================================
9. LOADING STATE
============================================================

Trong lúc translation:

Button:

Translating...

Disable button để tránh double request.

Không được cho user click nhiều lần tạo nhiều translation request.

Có loading indicator.

============================================================
10. ERROR HANDLING
============================================================

Phân biệt:

1. Translation service unavailable
2. Invalid source language
3. Invalid target language
4. Empty text
5. Translation timeout
6. Provider error
7. Backend error
8. Network error

Không hiển thị lỗi generic kiểu:

"Something went wrong."

Nếu provider unavailable:

Hiển thị:

"Translation service is currently unavailable."

Không được nói:

"AI Service is offline"

nếu AI Service thực tế vẫn online.

============================================================
11. TEXT PRESERVATION
============================================================

Translation phải giữ:

- Unicode
- Vietnamese accents
- line breaks khi có thể
- paragraph structure

Ví dụ:

OCR:

Hiển thị thông tin
hồ sơ

Không nên tự ý biến thành:

Hiển thị thông tin hồ sơ

nếu line structure cần được giữ.

Có thể lưu:

sourceText

và:

translatedText

riêng biệt.

============================================================
12. HISTORY
============================================================

Nếu Phase 4 đã có OCR History:

Bổ sung translation information vào history nếu kiến trúc hiện tại phù hợp.

Không phá schema cũ.

Có thể mở rộng:

{
  "ocrResult": {
    ...
  },

  "translation": {
    "sourceText": "...",
    "translatedText": "...",
    "sourceLanguage": "vi",
    "targetLanguage": "en",
    "createdAt": "..."
  }
}

Không được bắt buộc các OCR record cũ phải có translation.

Existing records phải tiếp tục đọc được.

============================================================
13. DATABASE
============================================================

Nếu cần MongoDB schema mới:

hãy tạo schema/module phù hợp.

Ưu tiên:

Translation

hoặc:

TranslationHistory

Không lưu duplicate dữ liệu không cần thiết.

Không lưu:

JWT
password
passwordHash
secret
API key

Translation data phải gắn với authenticated user.

============================================================
14. AUTHORIZATION
============================================================

Translation API phải yêu cầu authentication.

Ví dụ:

POST /api/translation

→ không token:

401 Unauthorized

→ token hợp lệ:

200 OK

User A không được truy cập translation private data của User B.

Nếu translation không được lưu DB:

vẫn phải yêu cầu authentication nếu specification hiện tại yêu cầu tất cả AI operations protected.

============================================================
15. SECURITY
============================================================

Không hardcode API keys.

Nếu translation provider cần API key:

sử dụng environment variable.

Ví dụ:

TRANSLATION_API_KEY=...

Không commit:

.env

Không log:

API key
JWT
password
authorization header

Không trả provider secret về frontend.

============================================================
16. RATE / DUPLICATE PROTECTION
============================================================

Không cần xây dựng hệ thống rate limit phức tạp nếu chưa có specification.

Tuy nhiên:

frontend phải chống double click.

Backend phải validate:

text length

sourceLanguage

targetLanguage

Không cho request:

text = ""

Không cho text quá lớn vượt giới hạn hợp lý.

============================================================
17. VALIDATION
============================================================

Tạo DTO:

TranslateDto

Validate:

text
sourceLanguage
targetLanguage

Ví dụ:

sourceLanguage:
auto | vi | en

targetLanguage:
vi | en

Không cho:

sourceLanguage == targetLanguage

Nếu muốn cho phép:

source == target

thì phải trả về text hợp lệ mà không gọi provider.

Không được crash.

============================================================
18. API CONTRACT
============================================================

API phải có response structure ổn định.

Success:

{
  "success": true,
  "message": "...",
  "data": {
    ...
  }
}

Error:

{
  "success": false,
  "message": "...",
  "error": "..."
}

Không trả raw provider response trực tiếp ra frontend.

============================================================
19. PERFORMANCE
============================================================

Đo:

- request time
- translation provider time
- total processing time

Không được block OCR.

OCR và Translation là hai operation riêng.

Nếu user chỉ OCR:

→ không được tự động translation.

Translation chỉ chạy khi user yêu cầu.

============================================================
20. REGRESSION PROTECTION
============================================================

Sau khi implement Phase 5:

PHẢI kiểm tra lại:

Authentication
Registration
Login
Logout
Dashboard
Cloudinary upload
OCR
OCR History
Health endpoints

Đặc biệt:

Phase 4 OCR phải tiếp tục hoạt động.

Không được sửa OCR chỉ để làm Translation.

============================================================
21. FRONTEND UX
============================================================

Thiết kế UI nhất quán với giao diện hiện tại.

Không thay đổi theme tổng thể.

Không phá:

- navbar
- dashboard
- OCR scanner
- history
- auth UI

Translation UI phải phù hợp với design hiện tại.

Có:

Source language selector
Target language selector
Translate button
Loading state
Translated text
Copy button
Error state

Có thể thêm:

Swap languages

Ví dụ:

Vietnamese ↔ English

Nếu source = vi
target = en

click Swap:

source = en
target = vi

============================================================
22. COPY TRANSLATION
============================================================

Thêm:

Copy Translation

Sau khi copy:

Copied!

Không copy nếu translatedText rỗng.

============================================================
23. TEST CASES
============================================================

BẮT BUỘC test:

TEST 1:

Vietnamese → English

Input:

"Hiển thị thông tin hồ sơ"

Expected:

Có translatedText hợp lệ.

--------------------------------------------------

TEST 2:

English → Vietnamese

Input:

"Display profile information"

Expected:

Có translatedText tiếng Việt hợp lệ.

--------------------------------------------------

TEST 3:

Vietnamese multi-line

Input:

"Hiển thị thông tin
hồ sơ"

Expected:

Translation không crash.

--------------------------------------------------

TEST 4:

Empty text

Expected:

400 Bad Request.

--------------------------------------------------

TEST 5:

No authentication

Expected:

401 Unauthorized.

--------------------------------------------------

TEST 6:

Same language

Expected:

Không crash.

--------------------------------------------------

TEST 7:

Long text

Expected:

Validation rõ ràng nếu vượt limit.

--------------------------------------------------

TEST 8:

Translation service unavailable

Expected:

Error rõ ràng.

--------------------------------------------------

TEST 9:

OCR → Translation

Flow:

Upload image
↓
OCR
↓
OCR text appears
↓
Select target language
↓
Translate
↓
Translated text appears

Phải test bằng browser thật.

--------------------------------------------------

TEST 10:

Refresh browser

Không được làm mất authentication/session.

--------------------------------------------------

24. BUILD TEST
============================================================

Backend:

npm run build

hoặc command build thực tế của project.

Frontend:

npm run build

AI Service:

khởi động FastAPI thực tế.

Không được coi code compile là đủ.

============================================================
25. RUNTIME TEST
============================================================

Chạy toàn bộ:

Backend
Frontend
AI Service
MongoDB

Không được để xảy ra:

EADDRINUSE

Nếu port đã được sử dụng:

hãy xác định process đang chạy trước khi start instance mới.

Không tự ý kill process khác nếu chưa xác định đó là process của project.

============================================================
26. MANUAL END-TO-END TEST
============================================================

Thực hiện browser test:

1. Login
2. Open OCR Scanner
3. Upload Vietnamese image
4. Run OCR
5. Verify OCR result
6. Select Vietnamese → English
7. Click Translate
8. Verify translation
9. Copy translation
10. Open History
11. Verify record nếu translation được lưu
12. Refresh page
13. Verify session

Ghi lại actual result.

Không được chỉ nói:

"Test passed"

nếu chưa thực sự test.

============================================================
27. KHÔNG ĐƯỢC IMPLEMENT PHASE 6
============================================================

Chỉ thực hiện Phase 5.

Không tự ý thêm:

- advanced analytics
- admin dashboard
- OCR model training
- batch OCR
- PDF OCR
- export PDF
- deployment
- payment
- notification

nếu chưa nằm trong Phase 5.

============================================================
28. FINAL REPORT
============================================================

Sau khi hoàn thành Phase 5:

DỪNG LẠI.

Không tự động chuyển Phase 6.

Xuất báo cáo:

# PHASE 5 — TRANSLATION IMPLEMENTATION REPORT

## 1. Implementation Summary

Đã xây dựng những gì.

## 2. Files Changed

Liệt kê chính xác:

Frontend
Backend
AI Service
Database

## 3. API

Liệt kê:

POST /api/translation

request
response
validation

## 4. Translation Provider

Provider nào đang được sử dụng.

Không được ghi chung chung.

## 5. Language Support

Vietnamese
English

## 6. UI

Những component nào được thêm/sửa.

## 7. Database

Schema nào thay đổi.

## 8. Authentication

Translation API có protected không.

## 9. Error Handling

Các lỗi đã xử lý.

## 10. Test Results

Dùng bảng:

| Test | Expected | Actual | Status |
|------|----------|--------|--------|

Chỉ ghi PASS nếu thực sự chạy.

## 11. Build

Frontend:
PASS / FAIL

Backend:
PASS / FAIL

AI Service:
PASS / FAIL

## 12. Runtime

Frontend:
PASS / FAIL

Backend:
PASS / FAIL

AI Service:
PASS / FAIL

MongoDB:
PASS / FAIL

## 13. End-to-End

OCR → Translation:

PASS / FAIL

## 14. Regression

Phase 1:
PASS / FAIL

Phase 2:
PASS / FAIL

Phase 3:
PASS / FAIL

Phase 4:
PASS / FAIL

## 15. Known Limitations

Nêu chính xác những gì còn hạn chế.

## 16. Manual Actions Required

Liệt kê những việc USER phải làm thủ công.

Nếu không có:

NONE

## 17. Final Status

Chỉ được chọn:

PASS
PARTIAL
FAIL

Không được báo PASS nếu còn chức năng chưa test.

============================================================
IMPORTANT RULES
============================================================

1. Không hardcode translation.
2. Không fake API response.
3. Không fake confidence.
4. Không fake test result.
5. Không phá OCR.
6. Không phá Authentication.
7. Không phá Cloudinary.
8. Không phá History.
9. Không tự động chuyển Phase 6.
10. Không báo PASS nếu chưa test thực tế.
11. Nếu gặp lỗi, phải sửa lỗi trước khi kết luận.
12. Nếu không thể sửa, ghi rõ BLOCKED và nguyên nhân.
13. Dùng implementation hiện tại làm source of truth.
14. Không thay đổi những phần ngoài phạm vi Phase 5 nếu không cần thiết.

BẮT ĐẦU:

Step 1:
Audit project hiện tại.

Step 2:
Xác định translation architecture phù hợp với code hiện tại.

Step 3:
Implement Phase 5.

Step 4:
Build.

Step 5:
Run.

Step 6:
Test API.

Step 7:
Test browser end-to-end.

Step 8:
Regression test OCR.

Step 9:
Xuất PHASE 5 REPORT.

Sau report:
DỪNG.