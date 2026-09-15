"""
Fine-Grained Dataset Synthesizer & Ingestion Engine
Creates high-fidelity, balanced training and validation samples across target ontology:
- Fine-grained apparel (jackets, shirts, jeans, sneakers, dresses)
- Micro-accessories (watches, rings, necklaces, bracelets, earrings, earphones)
- Electronics & Gadgets (phones, laptops, tablets, headphones, mice)
- Hard negative background suppression samples
"""

import os
import random
import cv2
import numpy as np
import yaml

ONTOLOGY_PATH = os.path.abspath("datasets/class_ontology.yaml")
INTERIM_DIR = os.path.abspath("datasets/interim")
IMAGES_DIR = os.path.join(INTERIM_DIR, "images")
LABELS_DIR = os.path.join(INTERIM_DIR, "labels")

def load_ontology():
    with open(ONTOLOGY_PATH, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    name_to_id = {c["name"]: c["id"] for c in data["classes"]}
    for c in data["classes"]:
        for syn in c.get("synonyms", []):
            name_to_id[syn] = c["id"]
    return name_to_id, data["classes"]

def random_skin_color():
    # Photorealistic skin tone range in BGR
    # R: 160-250, G: 120-210, B: 80-190 where R >= G >= B
    r = random.randint(160, 245)
    g = random.randint(max(80, r - 70), min(230, r - 15))
    b = random.randint(max(50, g - 60), min(200, g - 10))
    return (b, g, r)

def random_fabric_color():
    colors = [
        (30, 30, 30),      # Black
        (230, 230, 235),   # White/Ivory
        (120, 50, 25),     # Denim Blue
        (40, 50, 110),     # Navy
        (45, 45, 160),     # Red
        (50, 100, 50),     # Forest Green
        (130, 130, 130),   # Heather Grey
        (50, 90, 140),     # Camel/Khaki
        (110, 80, 130),    # Mauve/Burgundy
    ]
    return random.choice(colors)

def generate_portrait_with_accessories(name_to_id, sample_idx: int):
    w, h = 640, 640
    # Background
    bg_color = (random.randint(190, 240), random.randint(190, 240), random.randint(190, 240))
    img = np.full((h, w, 3), bg_color, dtype=np.uint8)
    boxes = []

    # Person
    skin = random_skin_color()
    shirt_color = random_fabric_color()
    pants_color = random_fabric_color()

    # Torso / Shirt
    torso_top = int(h * 0.45)
    torso_bottom = int(h * 0.85)
    cv2.rectangle(img, (int(w * 0.20), torso_top), (int(w * 0.80), torso_bottom), shirt_color, -1)
    shirt_cls = random.choice(["shirt", "t-shirt", "jacket", "hoodie"])
    boxes.append((name_to_id[shirt_cls], 0.50, (torso_top + torso_bottom)/(2*h), 0.60, (torso_bottom - torso_top)/h))

    # Neck
    cv2.rectangle(img, (int(w * 0.43), int(h * 0.35)), (int(w * 0.57), int(h * 0.47)), skin, -1)

    # Head / Face
    face_cy = int(h * 0.26)
    face_rx = int(w * 0.16)
    face_ry = int(h * 0.16)
    cv2.ellipse(img, (int(w * 0.50), face_cy), (face_rx, face_ry), 0, 0, 360, skin, -1)
    boxes.append((name_to_id["person"], 0.50, 0.48, 0.65, 0.85))

    # Eyewear (50% chance)
    if random.random() < 0.55:
        eyewear_cls = random.choice(["eyeglasses", "sunglasses"])
        gy = int(h * 0.25)
        gw = int(face_rx * 1.5)
        gh = int(face_ry * 0.35)
        color = (25, 25, 25) if eyewear_cls == "sunglasses" else (60, 60, 60)
        thickness = -1 if eyewear_cls == "sunglasses" else 3
        cv2.rectangle(img, (int(w * 0.50 - gw/2), gy - gh//2), (int(w * 0.50 + gw/2), gy + gh//2), color, thickness)
        boxes.append((name_to_id[eyewear_cls], 0.50, gy/h, gw/w, gh/h))

    # Earphones / Earbuds (40% chance)
    if random.random() < 0.45:
        ey = int(face_cy)
        ex = int(w * 0.50 - face_rx + 5)
        cv2.circle(img, (ex, ey), 8, (245, 245, 245), -1)
        cv2.rectangle(img, (ex - 2, ey), (ex + 2, ey + 12), (240, 240, 240), -1)
        boxes.append((name_to_id["earphones"], ex/w, (ey + 6)/h, 16/w, 24/h))

    # Necklace (40% chance)
    if random.random() < 0.45:
        ny = int(h * 0.44)
        cv2.ellipse(img, (int(w * 0.50), ny), (int(w * 0.12), int(h * 0.06)), 0, 20, 160, (210, 215, 220), 3)
        # Pendant (micro)
        py = ny + int(h * 0.05)
        cv2.circle(img, (int(w * 0.50), py), 6, (230, 210, 70), -1) # gold pendant
        boxes.append((name_to_id["necklace"], 0.50, ny/h, 0.24, 0.10))

    # Wristwatch or Bracelet (60% chance)
    if random.random() < 0.60:
        wx = int(w * 0.22)
        wy = int(h * 0.75)
        acc_type = random.choice(["wristwatch", "bracelet"])
        if acc_type == "wristwatch":
            cv2.rectangle(img, (wx - 15, wy - 22), (wx + 15, wy + 22), (30, 30, 30), -1)
            cv2.circle(img, (wx, wy), 12, (200, 200, 205), -1)
            boxes.append((name_to_id["wristwatch"], wx/w, wy/h, 34/w, 48/h))
        else:
            cv2.ellipse(img, (wx, wy), (16, 10), 0, 0, 360, (70, 190, 230), 4) # gold bangle
            boxes.append((name_to_id["bracelet"], wx/w, wy/h, 36/w, 24/h))

    # Ring (35% chance)
    if random.random() < 0.35:
        rx = int(w * 0.26)
        ry = int(h * 0.82)
        cv2.circle(img, (rx, ry), 6, (60, 200, 240), 2)
        boxes.append((name_to_id["ring"], rx/w, ry/h, 14/w, 14/h))

    # Cell phone (40% chance)
    if random.random() < 0.40:
        px = int(w * 0.72)
        py = int(h * 0.75)
        cv2.rectangle(img, (px - 22, py - 40), (px + 22, py + 40), (20, 20, 20), -1)
        cv2.rectangle(img, (px - 19, py - 36), (px + 19, py + 36), (180, 200, 220), -1)
        boxes.append((name_to_id["cell phone"], px/w, py/h, 46/w, 82/h))

    # Add subtle sensor noise
    noise = np.random.normal(0, 3, img.shape).astype(np.int16)
    img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    return img, boxes

def generate_gadgets_scene(name_to_id, sample_idx: int):
    w, h = 640, 640
    # Desk wood or neutral surface with jitter
    desk_color = (random.randint(90, 150), random.randint(120, 180), random.randint(150, 210))
    img = np.full((h, w, 3), desk_color, dtype=np.uint8)
    boxes = []

    # Laptop with jitter
    lx = int(w * 0.45) + random.randint(-20, 20)
    ly = int(h * 0.40) + random.randint(-15, 15)
    lw = int(w * 0.45) + random.randint(-20, 20)
    lh = int(h * 0.35) + random.randint(-15, 15)
    cv2.rectangle(img, (lx - lw//2, ly - lh//2), (lx + lw//2, ly + lh//2), (40, 40, 42), -1)
    cv2.rectangle(img, (lx - lw//2 + 10, ly - lh//2 + 10), (lx + lw//2 - 10, ly + lh//2 - 10), (220, 225, 230), -1)
    boxes.append((name_to_id["laptop"], lx/w, ly/h, lw/w, lh/h))

    # Mouse
    mx = int(w * 0.78) + random.randint(-10, 10)
    my = int(h * 0.55) + random.randint(-10, 10)
    cv2.ellipse(img, (mx, my), (20, 32), 8, 0, 360, (30, 30, 30), -1)
    boxes.append((name_to_id["mouse"], mx/w, my/h, 44/w, 68/h))

    # Cup / Mug
    cx = int(w * 0.18) + random.randint(-15, 15)
    cy = int(h * 0.42) + random.randint(-15, 15)
    cv2.circle(img, (cx, cy), 28, (240, 240, 245), -1)
    cv2.circle(img, (cx, cy), 22, (40, 60, 95), -1)
    boxes.append((name_to_id["cup"], cx/w, cy/h, 60/w, 60/h))

    # Pen / Stationery
    pen_x = int(w * 0.25) + random.randint(-10, 10)
    pen_y = int(h * 0.70) + random.randint(-10, 10)
    cv2.line(img, (pen_x - 40, pen_y - 15), (pen_x + 50, pen_y + 10), (180, 20, 20), 5)
    boxes.append((name_to_id["pen"], pen_x/w, pen_y/h, 95/w, 30/h))

    # Headphones (50% chance)
    if random.random() < 0.50:
        hx = int(w * 0.50) + random.randint(-15, 15)
        hy = int(h * 0.80) + random.randint(-10, 10)
        cv2.ellipse(img, (hx, hy), (60, 45), 0, 180, 360, (30, 30, 30), 8)
        cv2.circle(img, (hx - 60, hy), 18, (30, 30, 30), -1)
        cv2.circle(img, (hx + 60, hy), 18, (30, 30, 30), -1)
        boxes.append((name_to_id["headphones"], hx/w, hy/h, 140/w, 75/h))

    # Add subtle sensor noise
    noise = np.random.normal(0, 3, img.shape).astype(np.int16)
    img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    return img, boxes

def generate_apparel_scene(name_to_id, sample_idx: int):
    w, h = 640, 640
    bg = (random.randint(220, 245), random.randint(220, 245), random.randint(220, 245))
    img = np.full((h, w, 3), bg, dtype=np.uint8)
    boxes = []

    # Jacket or Coat
    jx = int(w * 0.40) + random.randint(-15, 15)
    jy = int(h * 0.32) + random.randint(-15, 15)
    jw = int(w * 0.45) + random.randint(-20, 20)
    jh = int(h * 0.38) + random.randint(-20, 20)
    j_color = random_fabric_color()
    cv2.rectangle(img, (jx - jw//2, jy - jh//2), (jx + jw//2, jy + jh//2), j_color, -1)
    boxes.append((name_to_id["jacket"], jx/w, jy/h, jw/w, jh/h))

    # Jeans or Pants
    px = jx
    py = int(h * 0.68) + random.randint(-15, 15)
    pw = int(w * 0.36) + random.randint(-15, 15)
    ph = int(h * 0.38) + random.randint(-15, 15)
    cv2.rectangle(img, (px - pw//2, py - ph//2), (px + pw//2, py + ph//2), (120, 65, 30), -1)
    boxes.append((name_to_id["jeans"], px/w, py/h, pw/w, ph/h))

    # Backpack or Handbag
    bx = int(w * 0.78) + random.randint(-15, 15)
    by = int(h * 0.45) + random.randint(-15, 15)
    bw = int(w * 0.22) + random.randint(-10, 10)
    bh = int(h * 0.35) + random.randint(-15, 15)
    bag_type = random.choice(["backpack", "handbag"])
    cv2.rectangle(img, (bx - bw//2, by - bh//2), (bx + bw//2, by + bh//2), (40, 40, 45), -1)
    boxes.append((name_to_id[bag_type], bx/w, by/h, bw/w, bh/h))

    # Sneakers / Shoes
    sx, sy = px, int(h * 0.92)
    cv2.rectangle(img, (sx - 75, sy - 18), (sx - 15, sy + 18), (245, 245, 245), -1)
    cv2.rectangle(img, (sx + 15, sy - 18), (sx + 75, sy + 18), (245, 245, 245), -1)
    boxes.append((name_to_id["sneakers"], (sx - 45)/w, sy/h, 65/w, 38/h))
    boxes.append((name_to_id["sneakers"], (sx + 45)/w, sy/h, 65/w, 38/h))

    # Add subtle sensor noise
    noise = np.random.normal(0, 3, img.shape).astype(np.int16)
    img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    return img, boxes

def generate_hard_negative_background(sample_idx: int):
    w, h = 640, 640
    style = random.choice(["bare_skin", "empty_surface", "fabric_texture", "wall_noise"])
    if style == "bare_skin":
        skin = random_skin_color()
        img = np.full((h, w, 3), skin, dtype=np.uint8)
        # Add random skin folds, pores, and varied lighting
        for i in range(random.randint(2, 6)):
            y = random.randint(80, 560)
            cv2.line(img, (random.randint(10, 80), y), (random.randint(560, 630), y + random.randint(-20, 20)), (max(0, skin[0]-25), max(0, skin[1]-20), max(0, skin[2]-20)), random.randint(1, 3))
        noise = np.random.normal(0, 4, img.shape).astype(np.int16)
        img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    elif style == "empty_surface":
        base_c = (random.randint(130, 230), random.randint(130, 230), random.randint(130, 230))
        img = np.full((h, w, 3), base_c, dtype=np.uint8)
        step = random.randint(8, 20)
        for y in range(0, h, step):
            cv2.line(img, (0, y), (w, y), (max(0, base_c[0]-15), max(0, base_c[1]-15), max(0, base_c[2]-15)), 1)
        noise = np.random.normal(0, 5, img.shape).astype(np.int16)
        img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    elif style == "fabric_texture":
        base_c = random_fabric_color()
        img = np.full((h, w, 3), base_c, dtype=np.uint8)
        noise = np.random.normal(0, random.randint(6, 12), img.shape).astype(np.int16)
        img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    else:
        img = np.full((h, w, 3), (random.randint(200, 230), random.randint(200, 230), random.randint(200, 230)), dtype=np.uint8)
        noise = np.random.normal(0, random.randint(10, 16), img.shape).astype(np.int16)
        img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    return img, [] # Strictly EMPTY annotations!

def main():
    # Clean directory
    for folder in [IMAGES_DIR, LABELS_DIR]:
        if os.path.exists(folder):
            for f in os.listdir(folder):
                os.remove(os.path.join(folder, f))
        os.makedirs(folder, exist_ok=True)

    name_to_id, classes_list = load_ontology()

    total_samples = 180
    print(f"Synthesizing and ingesting {total_samples} fine-grained dataset samples...")

    generators = [
        (generate_portrait_with_accessories, 0.40), # 40% portrait with accessories & apparel
        (generate_gadgets_scene, 0.25),              # 25% personal electronics & gadgets
        (generate_apparel_scene, 0.20),              # 20% apparel & fashion
        (generate_hard_negative_background, 0.15)    # 15% hard negative suppression
    ]

    count = 0
    hard_neg_count = 0
    total_boxes = 0

    for i in range(total_samples):
        random.seed(1000 + i)
        np.random.seed(1000 + i)

        # Pick generator
        r = random.random()
        cumulative = 0.0
        selected_gen = generators[0][0]
        for gen, prob in generators:
            cumulative += prob
            if r <= cumulative:
                selected_gen = gen
                break

        if selected_gen == generate_hard_negative_background:
            img, boxes = selected_gen(i)
            fname = f"hardneg_sample_{i:04d}.jpg"
            hard_neg_count += 1
        else:
            img, boxes = selected_gen(name_to_id, i)
            fname = f"finegrained_sample_{i:04d}.jpg"

        img_path = os.path.join(IMAGES_DIR, fname)
        lbl_path = os.path.join(LABELS_DIR, f"{os.path.splitext(fname)[0]}.txt")

        cv2.imwrite(img_path, img)
        with open(lbl_path, "w", encoding="utf-8") as lf:
            for b in boxes:
                # Clamp coordinates to [0, 1]
                cls_id = int(b[0])
                xc = max(0.01, min(0.99, float(b[1])))
                yc = max(0.01, min(0.99, float(b[2])))
                bw = max(0.01, min(0.99, float(b[3])))
                bh = max(0.01, min(0.99, float(b[4])))
                lf.write(f"{cls_id} {xc:.4f} {yc:.4f} {bw:.4f} {bh:.4f}\n")

        total_boxes += len(boxes)
        count += 1

    print(f"Finished dataset synthesis:")
    print(f"Total samples: {count}")
    print(f"Hard negative suppression samples (0 boxes): {hard_neg_count}")
    print(f"Annotated bounding boxes: {total_boxes}")

if __name__ == "__main__":
    main()
