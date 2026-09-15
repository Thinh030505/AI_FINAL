import os
import argparse
import logging
from ultralytics import YOLO

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train_accessory")

def train_custom_accessory_yolo(
    model_variant: str = "yolo11s.pt",
    data_yaml: str = "datasets/accessory_dataset_v1/data.yaml",
    epochs: int = 50,
    imgsz: int = 960,
    batch_size: int = 8,
    device: str = "0",
    output_name: str = "yolo11s_accessory_v1"
):
    """
    Trains custom YOLO11 for fine-grained accessory and small-object detection.
    Optimized for NVIDIA RTX 4050 6GB Laptop GPU:
    - imgsz=960 for fine details (airpods, rings, earrings, necklaces).
    - Mixed precision AMP (fp16) to conserve VRAM.
    - Mosaic and mixup augmentations for small-object robustness.
    """
    logger.info(f"Starting training: {model_variant} on {data_yaml} (imgsz={imgsz}, batch={batch_size})")

    model = YOLO(model_variant)
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch_size,
        device=device,
        project="runs/accessory_train",
        name=output_name,
        save=True,
        save_period=5,
        workers=2,
        mosaic=1.0,
        mixup=0.15,
        degrees=10.0,
        scale=0.5,
        fl_gamma=1.5,  # Focal loss gamma for hard small objects
        val=True,
        verbose=True
    )

    logger.info(f"Training completed. Best weights saved to: runs/accessory_train/{output_name}/weights/best.pt")
    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train custom YOLO on accessory dataset")
    parser.add_argument("--model", type=str, default="yolo11s.pt", help="Base model variant (yolo11n.pt, yolo11s.pt, yolo11m.pt)")
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--imgsz", type=int, default=960)
    parser.add_argument("--batch", type=int, default=8)
    args = parser.parse_args()

    train_custom_accessory_yolo(
        model_variant=args.model,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch_size=args.batch
    )
