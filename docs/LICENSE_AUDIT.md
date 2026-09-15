# Open-Source Dataset License Audit & Attribution Matrix

**Phase 11: Dataset Expansion, Fine-Grained Detection & Model Intelligence Upgrade**  
**Repository**: `D:\hocWeb\P_AI`  
**Audit Date**: September 2026  
**Auditor**: Senior Computer Vision Engineer & MLOps Lead  

---

## 1. Executive Summary

This document establishes the legal, ethical, and operational compliance matrix for all candidate image datasets considered or ingested into the fine-grained computer vision pipeline. The objective is to ensure that all trained weights, exported artifacts, evaluation suites, and deployed services strictly adhere to intellectual property, copyright, and licensing restrictions.

In accordance with Phase 11 requirements:
- Commercial vs. Non-Commercial datasets are segregated.
- No uncontrolled data merging is permitted.
- Canonical image IDs and source URLs are logged in manifests with exact cryptographic SHA-256 provenance.
- All attribution notices are centrally tracked.

---

## 2. Dataset License Matrix

| Dataset | Primary Version | License Type | Commercial Usability | Attribution Required | Key Ontology Focus | Ingestion Recommendation |
| :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| **MS COCO** | 2017 Release | CC BY 4.0 (Annotations) / Flickr Terms (Images) | ✅ Yes (with attribution) | Yes (Lin et al., ECCV 2014) | 80 Common categories (person, vehicle, animals, indoor, accessories) | **Approved (Core Base)**: Foundation backbone and general closed-set categories. |
| **Objects365** | v2 (2020) | CC BY 4.0 (Annotations) / Image owners retain rights | ✅ Research & Commercial permitted under CC BY 4.0 | Yes (Shao et al., ICCV 2019) | 365 Fine-grained classes (jewelry, watches, footwear, electronics, kitchenware) | **Approved (Selective Sampling)**: High-precision filtering for micro-accessories and electronics. |
| **Open Images** | V7 (2022) | CC BY 4.0 (Annotations) / CC BY 2.0 (Images) | ✅ Yes (Images have verified CC licenses) | Yes (Kuznetsova et al., IJCV 2020) | 600 Box classes, fine-grained fashion, tools, household items | **Approved (Subset Ingestion)**: High quality for bags, footwear, accessories. |
| **LVIS** | v1.0 | CC BY 4.0 | ✅ Yes | Yes (Gupta et al., CVPR 2019) | 1,203 Long-tail fine-grained categories (rings, bracelets, caps, glasses) | **Approved (Long-Tail Sampling)**: Superb for micro-accessories and fine apparel. |
| **DeepFashion2** | 2019 | Non-Commercial Research License | ⚠️ **Research Only** (Strict Non-Commercial) | Yes (Ge et al., CVPR 2019) | Detailed clothing (short/long sleeve, skirt, trousers, vest, dress) | **Restricted**: Permitted solely for academic benchmark validation; isolated from production model weights if commercialization is targeted. |
| **Visual Genome** | v1.4 | CC BY 4.0 | ✅ Yes | Yes (Krishna et al., IJCV 2017) | Dense attributes, body parts, jewelry, micro-objects | **Approved (Selective Extraction)**: High-density localized bounding boxes. |
| **Roboflow 100** | 2022 Benchmark | CC BY 4.0 / Public Domain / MIT (Per dataset) | ✅ Varies (Each domain verified independently) | Yes (Dwivedi et al.) | Niche evaluation domains (micro-electronics, apparel, jewelry) | **Approved for Benchmarking**: Domain-specific challenge sets. |
| **CrowdHuman** | 2018 | Non-Commercial Research License | ⚠️ **Research Only** | Yes (Shao et al.) | Dense crowds, severe occlusion, head/body/visible box | **Restricted**: Evaluation benchmark only. |

---

## 3. Compliance & Governance Rules

### 3.1 Strict Provenance Tracking
Every ingested image must be indexed in `datasets/manifests/dataset_manifest.json` with the following mandatory schema:
```json
{
  "image_id": "coco_val2017_000000123456",
  "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "source_dataset": "MS_COCO_2017",
  "license": "CC BY 4.0",
  "original_url": "http://images.cocodataset.org/val2017/000000123456.jpg",
  "license_url": "https://creativecommons.org/licenses/by/4.0/",
  "split": "train",
  "storage_path": "datasets/processed/images/train/coco_000000123456.jpg"
}
```

### 3.2 Attribution Notice Requirements
Any deployed artifact or report utilizing models trained on CC BY 4.0 datasets must include standard citations in `docs/ATTRIBUTIONS.md`:
1. *Microsoft COCO*: Lin, T. Y., et al. "Microsoft COCO: Common Objects in Context." ECCV 2014.
2. *Objects365*: Shao, S., et al. "Objects365: A Large-Scale, High-Quality Dataset for Object Detection." ICCV 2019.
3. *Open Images V7*: Kuznetsova, A., et al. "The Open Images Dataset V4." IJCV 2020.
4. *LVIS*: Gupta, A., Dollar, P., Girshick, R. "LVIS: A Dataset for Large Vocabulary Instance Segmentation." CVPR 2019.

### 3.3 Storage Quota & Leakage Boundaries
- Total raw and interim disk footprint must not exceed 20GB.
- Automated pipeline scripts must halt if downloaded cache exceeds 18GB.
- No training image may ever be ingested into the frozen benchmark set (`datasets/benchmarks/phase11_v1/`).
- Split checks require cryptographic verification (`train_sha256 ∩ test_sha256 = ∅`).
