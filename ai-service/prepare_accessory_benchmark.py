import os
import cv2
import numpy as np

def create_accessory_benchmark_suite(base_person_path: str = "../test-images/person_phone.jpg", output_dir: str = "../test-images/accessories"):
    os.makedirs(output_dir, exist_ok=True)
    
    if os.path.exists(base_person_path):
        base_img = cv2.imread(base_person_path)
    else:
        # Generate clean realistic portrait canvas (640x800)
        base_img = np.full((800, 640, 3), (220, 220, 220), dtype=np.uint8)
        # Draw torso, neck, head
        cv2.ellipse(base_img, (320, 850), (240, 300), 0, 0, 360, (40, 40, 40), -1)  # dark shirt
        cv2.rectangle(base_img, (290, 380), (350, 460), (180, 205, 235), -1)  # neck skin
        cv2.ellipse(base_img, (320, 300), (110, 140), 0, 0, 360, (180, 205, 235), -1)  # face skin
        cv2.ellipse(base_img, (320, 210), (115, 80), 0, 0, 360, (20, 20, 20), -1)  # dark hair

    h, w = base_img.shape[:2]

    # 1. person_glasses.jpg
    img_glasses = base_img.copy()
    # Add dark frame glasses across eye region
    gy = int(h * 0.35)
    gx1, gx2 = int(w * 0.35), int(w * 0.65)
    cv2.rectangle(img_glasses, (gx1, gy - 20), (gx1 + 60, gy + 15), (25, 25, 25), 4)
    cv2.rectangle(img_glasses, (gx2 - 60, gy - 20), (gx2, gy + 15), (25, 25, 25), 4)
    cv2.line(img_glasses, (gx1 + 60, gy), (gx2 - 60, gy), (25, 25, 25), 3)
    cv2.imwrite(os.path.join(output_dir, "person_glasses.jpg"), img_glasses)

    # 2. person_airpods.jpg
    img_airpods = base_img.copy()
    # White wireless earbud at left and right ear
    cv2.ellipse(img_airpods, (int(w * 0.28), int(h * 0.38)), (10, 14), 0, 0, 360, (250, 250, 250), -1)
    cv2.rectangle(img_airpods, (int(w * 0.27), int(h * 0.38)), (int(w * 0.29), int(h * 0.44)), (245, 245, 245), -1)
    cv2.imwrite(os.path.join(output_dir, "person_airpods.jpg"), img_airpods)

    # 3. person_necklace.jpg
    img_necklace = base_img.copy()
    # Silver chain necklace around neck
    center_neck = (int(w * 0.50), int(h * 0.52))
    cv2.ellipse(img_necklace, center_neck, (int(w * 0.18), int(h * 0.10)), 0, 20, 160, (215, 215, 220), 4)
    cv2.circle(img_necklace, (int(w * 0.50), int(h * 0.62)), 8, (230, 230, 235), -1)  # pendant
    cv2.imwrite(os.path.join(output_dir, "person_necklace.jpg"), img_necklace)

    # 4. person_watch.jpg
    img_watch = base_img.copy()
    # Smartwatch on wrist / lower flank
    cv2.rectangle(img_watch, (int(w * 0.18), int(h * 0.70)), (int(w * 0.26), int(h * 0.77)), (30, 30, 30), -1)
    cv2.circle(img_watch, (int(w * 0.22), int(h * 0.735)), 14, (10, 10, 10), -1)
    cv2.imwrite(os.path.join(output_dir, "person_watch.jpg"), img_watch)

    # 5. person_bracelet.jpg
    img_bracelet = base_img.copy()
    cv2.ellipse(img_bracelet, (int(w * 0.22), int(h * 0.72)), (18, 10), 0, 0, 360, (60, 180, 220), 4)  # gold bracelet
    cv2.imwrite(os.path.join(output_dir, "person_bracelet.jpg"), img_bracelet)

    # 6. person_ring.jpg
    img_ring = base_img.copy()
    cv2.circle(img_ring, (int(w * 0.25), int(h * 0.80)), 7, (70, 200, 240), 3)  # silver/gold ring
    cv2.imwrite(os.path.join(output_dir, "person_ring.jpg"), img_ring)

    # 7. person_phone.jpg
    img_phone = base_img.copy()
    cv2.rectangle(img_phone, (int(w * 0.22), int(h * 0.65)), (int(w * 0.36), int(h * 0.85)), (20, 20, 20), -1)
    cv2.rectangle(img_phone, (int(w * 0.23), int(h * 0.66)), (int(w * 0.35), int(h * 0.84)), (180, 180, 210), -1)
    cv2.imwrite(os.path.join(output_dir, "person_phone.jpg"), img_phone)

    # 8. person_multi_accessories.jpg (SPECIAL TEST CASE: Person with glasses, airpods, necklace, watch, ring, phone)
    img_multi = base_img.copy()
    # Glasses
    cv2.rectangle(img_multi, (gx1, gy - 20), (gx1 + 60, gy + 15), (25, 25, 25), 4)
    cv2.rectangle(img_multi, (gx2 - 60, gy - 20), (gx2, gy + 15), (25, 25, 25), 4)
    cv2.line(img_multi, (gx1 + 60, gy), (gx2 - 60, gy), (25, 25, 25), 3)
    # AirPods
    cv2.ellipse(img_multi, (int(w * 0.28), int(h * 0.38)), (10, 14), 0, 0, 360, (250, 250, 250), -1)
    cv2.rectangle(img_multi, (int(w * 0.27), int(h * 0.38)), (int(w * 0.29), int(h * 0.44)), (245, 245, 245), -1)
    # Necklace + pendant
    cv2.ellipse(img_multi, center_neck, (int(w * 0.18), int(h * 0.10)), 0, 20, 160, (215, 215, 220), 4)
    cv2.circle(img_multi, (int(w * 0.50), int(h * 0.62)), 8, (230, 230, 235), -1)
    # Smartwatch
    cv2.rectangle(img_multi, (int(w * 0.18), int(h * 0.70)), (int(w * 0.26), int(h * 0.77)), (30, 30, 30), -1)
    cv2.circle(img_multi, (int(w * 0.22), int(h * 0.735)), 14, (10, 10, 10), -1)
    # Ring
    cv2.circle(img_multi, (int(w * 0.25), int(h * 0.80)), 7, (70, 200, 240), 3)
    # Smartphone
    cv2.rectangle(img_multi, (int(w * 0.60), int(h * 0.65)), (int(w * 0.74), int(h * 0.85)), (20, 20, 20), -1)
    cv2.imwrite(os.path.join(output_dir, "person_multi_accessories.jpg"), img_multi)

    # 9. person_far.jpg (Far person scale challenge: scaled down to 25% on a large 1920x1080 canvas)
    canvas_far = np.full((1080, 1920, 3), (190, 190, 190), dtype=np.uint8)
    small_person = cv2.resize(img_multi, (160, 200))
    canvas_far[400:600, 880:1040] = small_person
    cv2.imwrite(os.path.join(output_dir, "person_far.jpg"), canvas_far)

    # 10. person_low_light.jpg (Dark scene)
    img_dark = cv2.convertScaleAbs(img_multi, alpha=0.35, beta=-10)
    cv2.imwrite(os.path.join(output_dir, "person_low_light.jpg"), img_dark)

    # 11. person_occluded.jpg (Person partially occluded by a desk/barrier)
    img_occluded = img_multi.copy()
    cv2.rectangle(img_occluded, (0, int(h * 0.62)), (w, h), (80, 60, 45), -1)  # wooden desk
    cv2.imwrite(os.path.join(output_dir, "person_occluded.jpg"), img_occluded)

    # 12. multiple_people.jpg (2 people side by side)
    canvas_multi = np.full((h, w * 2, 3), (200, 200, 200), dtype=np.uint8)
    canvas_multi[:, :w] = img_multi
    canvas_multi[:, w:] = img_glasses
    cv2.imwrite(os.path.join(output_dir, "multiple_people.jpg"), canvas_multi)

    print(f"Successfully generated 12 benchmark images in: {output_dir}")

if __name__ == "__main__":
    create_accessory_benchmark_suite()
