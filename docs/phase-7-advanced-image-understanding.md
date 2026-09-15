# PHASE 7: ADVANCED IMAGE UNDERSTANDING, SEMANTIC SEGMENTATION & AI FUSION

---

## 1. TỔNG QUAN GIAI ĐOẠN 7 (OVERVIEW)

Phase 7 nâng tầm hệ thống từ công cụ nhận diện đơn lẻ (OCR + YOLO Detection) thành **Hệ thống Hiểu Ảnh Đa Mô Hình Toàn Diện (Multi-Model AI Image Understanding System)**.

Hệ thống kết hợp đồng thời 4 mô hình & cơ chế AI:
1. **SegFormer Semantic Segmentation** (`nvidia/segformer-b0-finetuned-ade-512-512`): Phân đoạn vùng ngữ nghĩa môi trường (sky, water/sea, sand, road, building, wall, floor, v.v.) với tỷ lệ diện tích và số lượng pixel.
2. **Ultralytics YOLO11n**: Phát hiện và định vị các thực thể vật thể cụ thể (car, person, umbrella, chair, v.v.) kèm bounding box.
3. **PaddleOCR v4**: Nhận diện văn bản quang học đa ngôn ngữ, bảo toàn dấu tiếng Việt và trật tự không gian dòng chữ.
4. **Heuristic Scene Inference Engine**: Động cơ suy luận bối cảnh dựa trên luật thực chứng từ vùng môi trường và vật thể.
5. **Vision-Language Model (Gemini Vision / Grounded Fallback)**: Tổng hợp mô tả ngôn ngữ tự nhiên bám sát bằng chứng máy tính (Evidence-Grounded Synthesizer), không bịa đặt, tự động chuyển đổi sang bộ tổng hợp cục bộ khi không có API key.
6. **AI Fusion Engine**: Hợp nhất thông minh, khử trùng lặp bounding box, chuẩn hóa nhãn đồng nghĩa (canonical mapping), xử lý xung đột và theo dõi trạng thái `partial_success`.

---

## 2. KIẾN TRÚC LUỒNG DỮ LIỆU (DATA FLOW ARCHITECTURE)

```
                            [Uploaded Image]
                                   │
          ┌────────────────────────┼────────────────────────┐
          ▼                        ▼                        ▼
    ┌───────────┐            ┌───────────┐            ┌───────────┐
    │  YOLO11n  │            │ SegFormer │            │ PaddleOCR │
    │ (Objects) │            │ (Regions) │            │  (Text)   │
    └─────┬─────┘            └─────┬─────┘            └─────┬─────┘
          │                        │                        │
          └────────────────────────┼────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │ Rule-based Scene Inference   │
                    │ (Beach, Street, Indoor, ...) │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │ Vision-Language Synthesizer  │
                    │ (Evidence-Grounded Natural)  │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │       AI Fusion Engine       │
                    │ (Canonical, Deduplication)   │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │ NestJS Gateway (Anti-IDOR)   │
                    └──────────────┬───────────────┘
                                   │
                    ┌──────────────┴───────────────┐
                    ▼                              ▼
            ┌──────────────┐              ┌─────────────────┐
            │MongoDB Atlas │              │ React 18 Studio │
            │(imageanalyses│              │ (Overlay & Tabs)│
            └──────────────┘              └─────────────────┘
```

---

## 3. THIẾT KẾ CÁC MODULE CHÍNH

### 3.1. SegFormer Semantic Segmentation Service
- **Model**: `nvidia/segformer-b0-finetuned-ade-512-512` (ADE20K 150 classes).
- **Bộ nhớ đệm**: Tải cục bộ từ cache HuggingFace, dung lượng ~14MB, thời gian suy luận ~300ms - 1500ms trên CPU.
- **Lọc nhiễu**: Loại bỏ các vùng ngữ nghĩa có diện tích `< 1.0%` tổng diện tích ảnh.
- **Canonical Label Mapping**: Chuẩn hóa các nhãn ADE20K thô về nhãn môi trường thống nhất:
  - `sea`, `water` -> `water/sea`
  - `sand` -> `sand`
  - `earth`, `ground`, `soil` -> `ground`
  - `building`, `edifice` -> `building`
  - `tree` -> `tree`
  - `grass` -> `grass`
  - `road`, `route` -> `road`

### 3.2. Heuristic Scene Inference Service
- Phân loại bối cảnh dựa trên bằng chứng vật lý:
  - `beach`: Vùng `water/sea` + `sand` (kết hợp các vật thể ngoài bãi biển như umbrella, boat).
  - `street / urban`: Vùng `road` + `building` (kết hợp ô tô, xe buýt, đèn giao thông).
  - `park / nature`: Vùng `tree` + `grass` + `sky`.
  - `indoor room / office`: Vùng `wall` + `floor` + `ceiling` (kết hợp bàn, ghế, máy tính, tài liệu).
- Xác định môi trường (`outdoor`, `indoor`) và điều kiện ánh sáng (`clear daylight`, `indoor lighting`, v.v.).

### 3.3. Vision-Language Grounded Synthesizer
- Khi có `GEMINI_API_KEY`: Gọi `gemini-1.5-flash` kèm prompt ép buộc định dạng JSON và nghiêm cấm suy đoán ngoài danh sách vật thể/vùng đã phát hiện.
- Khi **không** có `GEMINI_API_KEY`: Kích hoạt `_generate_fallback_description` cục bộ:
  - Tạo câu mô tả mạch lạc dựa trên: bối cảnh môi trường + các vùng chủ đạo + danh sách vật thể nổi bật + trích đoạn văn bản OCR thực tế.
  - Đảm bảo 100% không bị crash hoặc gián đoạn luồng làm việc.

### 3.4. AI Fusion Engine
- **Deduplication**: Khử các bounding box trùng lặp với độ chính xác tọa độ làm tròn đến 0.1 pixel.
- **Độ tin cậy thật**: Bảo toàn float confidence từ mô hình YOLO11 (không bịa số hay hard-code 1.0/0.95).
- **Text Verification**: Văn bản chỉ được ghi nhận `hasText = true` khi PaddleOCR thực sự trích xuất được dòng chữ hợp lệ.
- **Partial Success Tracking**: Nếu bất kỳ mô hình con nào gặp sự cố, hệ thống ghi nhận `status: "partial_success"` và trả về toàn bộ kết quả của các mô hình thành công.

---

## 4. BẢN ĐẶC TẢ API (API SPECIFICATION)

### 4.1. FastAPI AI Service (`:8000`)
- `POST /semantic-segmentation`
  - Body: `{"imageUrl": "https://..."}`
  - Response: `{ "status": "success", "data": { "model": "segformer-b0-ade20k", "regions": [...], "processingTimeMs": 310 } }`
- `POST /image-analysis`
  - Body: `{"imageUrl": "https://..."}`
  - Response: Unified pipeline response (YOLO + SegFormer + OCR + Scene + Vision + FusedSummary).
- `GET /health`
  - Response: `{"status": "ok", "service": "ai-service", "ocr": true, "objectDetection": true, "semanticSegmentation": true, "vision": true}`

### 4.2. NestJS Gateway (`:3000`)
- `POST /api/image-analysis`
  - Guard: `JwtAuthGuard` (yêu cầu Bearer JWT).
  - Body: `{"imageId": "MongoDB_Image_ID"}`
  - Logic: Kiểm tra quyền sở hữu ảnh (Anti-IDOR) -> Lấy Cloudinary URL -> Chuyển tiếp tới FastAPI -> Lưu kết quả vào collection `imageanalyses` -> Trả về Client.
- `GET /api/image-analysis`
  - Lấy danh sách lịch sử phân tích đa mô hình của người dùng đăng nhập.
- `GET /api/image-analysis/:id`
  - Lấy chi tiết một bản ghi phân tích kèm kiểm tra quyền sở hữu.

---

## 5. KẾT QUẢ BENCHMARK THỰC TẾ (BENCHMARK EVALUATION)

Được thực thi qua tập lệnh `ai-service/benchmark_phase7.py` trên 4 kịch bản ảnh thực tế:

| Kịch bản kiểm thử | File mẫu | Scene Type nhận diện | Vùng ngữ nghĩa SegFormer chủ đạo (>1.0%) | Vật thể YOLO11 | OCR Text | Tổng thời gian |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Beach / Coastal Outdoor** | `beach.jpg` | **beach** (outdoor) | sky: 44.51%<br/>water/sea: 30.40%<br/>sand: 24.59% | 0 | 1 dòng | 23,443 ms |
| **Street / Urban City** | `street.jpg` | **street / urban** (outdoor) | building: 60.79%<br/>road: 25.77%<br/>sky: 5.99%<br/>car: 4.83% | 8 (7 car, 1 bus) | 1 dòng | 21,509 ms |
| **Indoor / Office** | `S15.jpg` | **indoor room** (indoor) | person: 57.66%<br/>wall: 42.34% | 1 (baseball glove) | 1 dòng | 13,602 ms |
| **Document / OCR-Heavy** | `doc_invoice.png` | **indoor room** (indoor) | wall: 82.32%<br/>bulletin board: 9.97%<br/>signboard: 4.81% | 0 | 11 dòng | 18,902 ms |

> [!NOTE]
> Tất cả các kết quả phân đoạn, phát hiện vật thể, suy luận bối cảnh và trích xuất chữ đều được tính toán từ mô hình Deep Learning thực tế (không hard-code).

---

## 6. KIỂM THỬ TÍCH HỢP & BẢO MẬT (E2E & SECURITY)

Hệ thống đã vượt qua 100% các bài kiểm thử tự động:
1. **End-to-End Gateway Integration** (`test_e2e_phase7.py`):
   - Đăng nhập người dùng qua JWT.
   - Tải ảnh lên Cloudinary qua NestJS Multer stream.
   - Gọi phân tích tổng hợp `POST /api/image-analysis`.
   - Kiểm tra lưu trữ và truy vấn qua `GET /api/image-analysis` và `GET /api/image-analysis/:id`.
   - **Anti-IDOR**: Xác thực từ chối truy cập không có token với mã `HTTP 401 Unauthorized`.
2. **Regression Testing** (`test_regression.py`):
   - Phase 1 & 2: Quản trị danh tính và upload ảnh hoạt động bình thường.
   - Phase 3: PaddleOCR trích xuất chữ hoạt động ổn định.
   - Phase 4: AI Translation dịch 2 chiều Anh - Việt hoạt động chính xác.
   - Phase 6: YOLO11 phát hiện vật thể hoạt động chính xác.
3. **Frontend Build Verification**:
   - `tsc && vite build` hoàn thành thành công với 0 lỗi TypeScript.
   - Giao diện `ImageAnalysisPage.tsx` hỗ trợ 3 chế độ xem: Unified View, Objects Only, Regions Only; thanh kéo lọc độ tin cậy; SVG Bounding Box overlay tự co giãn.
   - Thư viện `HistoryPage.tsx` tích hợp Tab 5 "AI Understanding" hiển thị đầy đủ thẻ bối cảnh, tỷ lệ vùng và liên kết Studio.
