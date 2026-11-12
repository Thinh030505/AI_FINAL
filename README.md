# AI Visual Intelligence, OCR & Multilingual Vocabulary Studio

Hệ thống web AI đa phương thức (Multimodal AI Web Platform) tích hợp **Object Detection (YOLO11 COCO)**, **Optical Character Recognition (PaddleOCR)**, **Semantic Segmentation (SegFormer)**, **Vision-Language Understanding (Gemini)**, **Smart Camera Real-Time** và **Interactive Multilingual Vocabulary Learning Studio**.

---

## Mục lục

- [Tổng quan kiến trúc](#tổng-quan-kiến-trúc)
- [Tính năng chính](#tính-năng-chính)
- [Cấu trúc thư mục dự án](#cấu-trúc-thư-mục-dự-án)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Cấu hình môi trường](#cấu-hình-môi-trường)
- [Hướng dẫn cài đặt và chạy](#hướng-dẫn-cài-đặt-và-chạy)
- [API Endpoints chính](#api-endpoints-chính)
- [Kiểm thử (Testing)](#kiểm-thử-testing)

---

## Tổng quan kiến trúc

Dự án được thiết kế theo kiến trúc **Microservices Monorepo** gồm 3 tầng độc lập:

```text
                            USER (Browser / Webcam)
                                       │
                                       ▼
                        ┌─────────────────────────────┐
                        │          FRONTEND           │
                        │   React 18 + Vite + TS      │
                        │   Tailwind CSS + Lucide     │
                        │   Port: 5173                │
                        └──────────────┬──────────────┘
                                       │ REST API (/api/*) + JWT
                                       ▼
                        ┌─────────────────────────────┐
                        │       BACKEND GATEWAY       │
                        │     NestJS + TypeScript     │
                        │     Cloudinary + BufferCache│
                        │     Port: 3000              │
                        └──────┬───────────────┬──────┘
                               │               │
                 Mongoose ORM  │               │ HTTP / Direct Buffer
                               ▼               ▼
                        ┌────────────┐  ┌─────────────────────────────┐
                        │  MongoDB   │  │         AI SERVICE          │
                        │  Port 27017│  │  FastAPI + Uvicorn (Python) │
                        └────────────┘  │  YOLO11 + PaddleOCR +       │
                                        │  SegFormer + Gemini +       │
                                        │  Deep Translator            │
                                        │  Port: 8000                 │
                                        └─────────────────────────────┘
```

---

## Tính năng chính

### 1. Object Detection & Vocabulary Studio (`/object-detection`, `/visual-intelligence`)
- **Dual-Engine Unified Analysis**: Chỉ với 1 lần tải ảnh lên, hệ thống chạy **YOLO11 (COCO 80 classes)** và **PaddleOCR** song song trên AI Service, đồng bộ tọa độ trên cùng một canvas.
- **Duplicate Class Aggregation**: Tự động gom nhóm các vật thể cùng class (ví dụ: 5 Motorcycle $\rightarrow$ 1 thẻ `Motorcycle × 5`), giữ nguyên 100% bounding box riêng cho từng instance trên ảnh và hỗ trợ highlight theo nhóm hoặc từng đối tượng.
- **Vocabulary Learning Card chuẩn học thuật**:
  - Hỗ trợ từ điển 80 lớp COCO (`frontend/src/data/cocoDictionary.ts`) với đầy đủ **IPA chuẩn Unicode** (phân biệt rõ phát âm **US** và **UK**), **Part of Speech**, nghĩa tiếng Việt, câu ví dụ tiếng Anh & bản dịch tiếng Việt.
  - Phát âm tiếng Anh tự động qua Web Speech API (`en-US`).
  - Hỗ trợ chế độ **Learn Mode** và **Compact Mode**, phóng to/thu nhỏ, toàn màn hình và điều chỉnh ngưỡng tin cậy (confidence threshold).
- **Synchronized Multilingual Translation**:
  - Hỗ trợ **15 ngôn ngữ**: Tiếng Việt (`vi`), English (`en`), 中文简体 (`zh`), 中文繁體 (`zh-TW`), 日本語 (`ja`), 한국어 (`ko`), Français (`fr`), Deutsch (`de`), Español (`es`), Português (`pt`), ภาษาไทย (`th`), Bahasa Indonesia (`id`), العربية (`ar`), Русский (`ru`), Italiano (`it`).
  - Khi đổi ngôn ngữ đích, toàn bộ **tên từ, nghĩa và câu ví dụ** đồng bộ sang ngôn ngữ mới mà không ghi đè dữ liệu gốc; có cache bộ nhớ đệm (in-memory cache) tránh gọi API trùng lặp.
- **OCR Overlay & Translation Panel**:
  - Layer Controls độc lập (`Show All`, `Objects`, `Text`, `Hide All`).
  - Phân tách rõ nét Bounding Box vật thể (viền liền) và Bounding Box văn bản (viền nét đứt).
  - Hỗ trợ dịch toàn bộ văn bản OCR hoặc dịch từng dòng riêng lẻ, sao chép nhanh văn bản gốc và bản dịch.

### 2. OCR Scanner & Dịch thuật độc lập (`/ocr`)
- Tiền xử lý ảnh thông minh (tối ưu độ tương phản CLAHE), nhận diện đa dòng tiếng Việt/Anh và dịch trực tiếp trên giao diện.

### 3. Multimodal AI Understanding (`/image-analysis`)
- Kết hợp nhiều engine: **YOLO11 Object Detection**, **SegFormer Semantic Segmentation**, **PaddleOCR**, phân tích trang phục/thuộc tính người, quan hệ không gian và tổng hợp ngữ cảnh cảnh vật bằng **Google Gemini Vision** (có fallback cục bộ).

### 4. Smart Camera Real-Time (`/camera`)
- Nhận diện luồng webcam trực tiếp với các chế độ linh hoạt, bộ theo dõi đối tượng (`smart_camera_tracker.py`), cấu trúc cây phân cấp (`HierarchyTreeView`), bảng chi tiết đối tượng và HUD hiệu năng FPS/latency.

### 5. Quản lý tài khoản & Lịch sử (`/login`, `/register`, `/dashboard`, `/history`)
- Xác thực người dùng bằng **JWT** (`JwtAuthGuard`, `passport-jwt`), mã hóa mật khẩu `bcrypt`.
- Lưu trữ ảnh lên **Cloudinary** và lưu lịch sử phân tích (OCR, Object Detection, Image Analysis, Visual Intelligence) vào **MongoDB**.

---

## Cấu trúc thư mục dự án

```text
P_AI/
├── ai-service/                     # Microservice AI Python (FastAPI :8000)
│   ├── app/
│   │   ├── api/                    # FastAPI routers (ocr, translation, object_detection,
│   │   │                           # segmentation, image_analysis, smart_camera, visual_intelligence, feedback)
│   │   ├── models/                 # Pydantic schemas & request/response models
│   │   ├── services/               # AI pipelines: YOLO11, PaddleOCR, SegFormer, Gemini,
│   │   │                           # Fusion, Spatial Relationship, Deep Translator, GPU Manager
│   │   └── main.py                 # FastAPI entrypoint + startup preload & warmup
│   ├── models/                     # Model weights (yolo11n.pt, best.pt)
│   ├── Dockerfile
│   └── requirements.txt
│
├── backend/                        # API Gateway NestJS (:3000)
│   ├── src/
│   │   ├── config/                 # Configuration loader
│   │   ├── common/                 # Global exception filters & utilities
│   │   └── modules/                # auth, users, images (Cloudinary + ImageBufferCacheService),
│   │                               # ocr, translation, translations, object-detection,
│   │                               # image-analysis, smart-camera, visual-intelligence, health
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                       # Web Client React 18 + Vite (:5173)
│   ├── src/
│   │   ├── components/             # UI, Navigation, LanguageSelector, camera/, vocabulary/
│   │   ├── context/                # AuthContext
│   │   ├── data/                   # cocoDictionary.ts (80 COCO classes + US/UK IPA + examples)
│   │   ├── layouts/                # MainLayout
│   │   ├── pages/                  # Home, Login, Register, Dashboard, ObjectDetection,
│   │   │                           # VisualIntelligence, OCR, ImageAnalysis, Camera, History
│   │   ├── services/               # Axios API clients
│   │   ├── types/                  # TypeScript types & vocabulary schemas
│   │   └── utils/                  # cardLayoutEngine, vocabularyAggregation,
│   │                               # synchronizedTranslation, vocabularyEnricher
│   ├── test_coco_dictionary.ts
│   ├── test_phase3_integration.ts
│   ├── test_phase4_layout.ts
│   ├── test_upgrade_full_suite.ts
│   └── package.json
│
├── training/                       # Scripts huấn luyện, đánh giá, hiệu chỉnh ngưỡng & export YOLO
├── configs/                        # File YAML cấu hình huấn luyện & class thresholds
├── scripts/                        # Benchmark & E2E Smart Camera test scripts
├── docs/                           # Tài liệu báo cáo kiến trúc & tối ưu qua các giai đoạn
├── docker-compose.yml              # Triển khai đồng thời MongoDB, AI Service, Backend, Frontend
├── start-all.bat                   # Script khởi chạy toàn bộ stack trên Windows
├── .env.example                    # Mẫu biến môi trường cho toàn bộ monorepo
└── test_live_dual_engine.py        # Script kiểm thử trực tiếp pipeline YOLO + PaddleOCR
```

---

## Công nghệ sử dụng

| Tầng hệ thống | Công nghệ & Thư viện chính |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite 5, Tailwind CSS 3, React Router v6, Axios, Lucide Icons, Web Speech API |
| **Backend Gateway** | NestJS 10, TypeScript, Mongoose 8, Passport JWT, Class-Validator, Cloudinary SDK v2, RxJS |
| **AI Microservice** | Python, FastAPI, Uvicorn, Ultralytics (YOLO11), PaddlePaddle & PaddleOCR, HuggingFace Transformers (SegFormer), OpenCV, Pillow, Deep Translator, Google Generative AI (Gemini) |
| **Database & Storage** | MongoDB (Mongoose), Cloudinary CDN, In-Memory Buffer Cache |
| **DevOps / Tooling** | Docker, Docker Compose, Batch launcher (`start-all.bat`) |

---

## Yêu cầu hệ thống

- **Node.js**: v18.x hoặc v20.x+ (Khuyến nghị v20+)
- **npm**: v9.x hoặc v10.x+
- **Python**: 3.10 – 3.13
- **MongoDB**: Local (`mongodb://localhost:27017`) hoặc MongoDB Atlas / Docker container
- **Tài khoản Cloudinary** (tùy chọn cho lưu trữ ảnh trên cloud) & **Gemini API Key** (tùy chọn, có chế độ fallback cục bộ nếu không có key)

---

## Cấu hình môi trường

Tạo các file `.env` từ file mẫu `.env.example` tương ứng:

```bash
# 1. Ở thư mục gốc (nếu chạy Docker Compose)
cp .env.example .env

# 2. Hoặc tạo riêng cho từng service khi chạy local:
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
cp ai-service/.env.example ai-service/.env
```

Các biến môi trường quan trọng:
- **Frontend (`frontend/.env`)**:
  - `VITE_API_URL=http://localhost:3000/api`
- **Backend (`backend/.env`)**:
  - `PORT=3000`
  - `MONGODB_URI=mongodb://localhost:27017/ocr_ai`
  - `AI_SERVICE_URL=http://localhost:8000`
  - `FRONTEND_URL=http://localhost:5173`
  - `JWT_SECRET`, `JWT_REFRESH_SECRET`
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- **AI Service (`ai-service/.env`)**:
  - `PORT=8000`
  - `GEMINI_API_KEY` *(tùy chọn)*
  - `GEMINI_MODEL=gemini-flash-latest`

---

## Hướng dẫn cài đặt và chạy

### Cách 1: Chạy Local Development (từng service)

#### Bước 1: Khởi động MongoDB
```bash
# Chạy bằng Docker nếu chưa cài MongoDB local:
docker run -d --name ocr_ai_mongodb -p 27017:27017 mongo:latest
```

#### Bước 2: Chạy AI Service (FastAPI - Port 8000)
```bash
cd ai-service
python -m venv .venv

# Kích hoạt môi trường ảo (Windows):
.venv\Scripts\activate
# Hoặc trên Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Bước 3: Chạy Backend Gateway (NestJS - Port 3000)
```bash
cd backend
npm install
npm run start:dev
```

#### Bước 4: Chạy Frontend (React + Vite - Port 5173)
```bash
cd frontend
npm install
npm run dev
```

Truy cập ứng dụng tại: **http://localhost:5173**

> **Mẹo trên Windows**: Sau khi đã cài đặt dependencies ở trên, bạn có thể chạy nhanh cả 3 service cùng lúc bằng file [`start-all.bat`](file:///d:/hocWeb/P_AI/start-all.bat) ở thư mục gốc.

### Cách 2: Chạy bằng Docker Compose

```bash
docker-compose up --build
```

---

## API Endpoints chính

### Backend Gateway (`http://localhost:3000/api`)
| Nhóm API | Prefix | Mô tả |
| :--- | :--- | :--- |
| **Health** | `GET /api/health` | Kiểm tra trạng thái Backend, MongoDB và AI Service |
| **Auth** | `/api/auth/*` | Đăng ký, đăng nhập, lấy thông tin người dùng hiện tại (`JWT`) |
| **Images** | `/api/images/*` | Upload ảnh lên Cloudinary & lưu In-Memory Buffer Cache |
| **Visual Intelligence** | `POST /api/visual-intelligence/analyze` | Phân tích hợp nhất song song **YOLO11 + PaddleOCR**, lịch sử & truy xuất chi tiết |
| **Object Detection** | `/api/object-detection/*` | Nhận diện vật thể YOLO11 & lưu lịch sử |
| **OCR** | `/api/ocr/*` | Trích xuất văn bản PaddleOCR & lưu lịch sử |
| **Translation** | `/api/translation/*`, `/api/translations/*` | Dịch thuật đa ngôn ngữ 15 ngôn ngữ có cache |
| **Image Analysis** | `/api/image-analysis/*` | Phân tích đa phương thức (YOLO + SegFormer + OCR + Gemini) |
| **Smart Camera** | `/api/smart-camera/*` | Phân tích frame camera real-time |

### AI Service (`http://localhost:8000`)
- `GET /health` — Kiểm tra trạng thái các engine (`ocr`, `objectDetection`, `semanticSegmentation`, `vision`)
- `POST /visual-intelligence/direct` & `POST /visual-intelligence/analyze` — Dual-engine YOLO11 + PaddleOCR
- `POST /translate` — Dịch văn bản đa ngôn ngữ có cache
- Các router khác: `/ocr/*`, `/object-detection/*`, `/segmentation/*`, `/image-analysis/*`, `/smart-camera/*`, `/feedback/*`

---

## Kiểm thử (Testing)

### Build Production (Frontend & Backend)
```bash
# Kiểm tra TypeScript & build Frontend
npm --prefix frontend run build

# Kiểm tra TypeScript & build Backend
npm --prefix backend run build
```

### Chạy Test Suite Frontend (Vocabulary, Aggregation, IPA, Layout)
```bash
npx tsx frontend/test_coco_dictionary.ts
npx tsx frontend/test_upgrade_full_suite.ts
```

### Chạy Test AI Service (Dual-Engine YOLO11 + PaddleOCR)
```bash
# Sử dụng môi trường ảo trong ai-service
ai-service\.venv\Scripts\python.exe ai-service/test_visual_intelligence_unit.py
ai-service\.venv\Scripts\python.exe test_live_dual_engine.py
```
