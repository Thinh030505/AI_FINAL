from typing import List, Dict, Optional
from app.models.smart_camera_model import RealtimeDetection, SmartBBox

class DetectionHierarchyEngine:
    """
    Infers semantic parent-child relationships among overlapping and nested detections.
    Builds a tree structure such that:
      Person -> Human Head -> Human Face -> Human Eye / Human Mouth
      Person -> Human Hand -> Watch / Phone / Guitar
      Person -> Headphones / Glasses
      Houseplant -> Flower / Flowerpot
    """
    _instance: Optional["DetectionHierarchyEngine"] = None

    @classmethod
    def get_instance(cls) -> "DetectionHierarchyEngine":
        if cls._instance is None:
            cls._instance = DetectionHierarchyEngine()
        return cls._instance

    @staticmethod
    def _is_contained(child_box: SmartBBox, parent_box: SmartBBox, margin_ratio: float = 0.20) -> bool:
        """Check if child box center or majority of child box is inside parent box"""
        cx = (child_box.x1 + child_box.x2) / 2.0
        cy = (child_box.y1 + child_box.y2) / 2.0

        pw = parent_box.x2 - parent_box.x1
        ph = parent_box.y2 - parent_box.y1
        pad_x = pw * margin_ratio
        pad_y = ph * margin_ratio

        if (parent_box.x1 - pad_x <= cx <= parent_box.x2 + pad_x and
            parent_box.y1 - pad_y <= cy <= parent_box.y2 + pad_y):
            return True

        # Fallback to IoU or area containment
        child_area = max(1.0, (child_box.x2 - child_box.x1) * (child_box.y2 - child_box.y1))
        ix1 = max(child_box.x1, parent_box.x1)
        iy1 = max(child_box.y1, parent_box.y1)
        ix2 = min(child_box.x2, parent_box.x2)
        iy2 = min(child_box.y2, parent_box.y2)
        if ix2 > ix1 and iy2 > iy1:
            inter_area = (ix2 - ix1) * (iy2 - iy1)
            if (inter_area / child_area) >= 0.55:
                return True

        return False

    def build_hierarchy(self, detections: List[RealtimeDetection]) -> List[RealtimeDetection]:
        # Reset parentId and childrenIds
        for det in detections:
            det.parentId = None
            det.childrenIds = []

        # Partition detections by semantic level & category for structured top-down linking
        people = [d for d in detections if d.category == "person" or d.label.lower() == "person"]
        heads = [d for d in detections if "head" in d.label.lower()]
        faces = [d for d in detections if "face" in d.label.lower()]
        face_parts = [d for d in detections if any(k in d.label.lower() for k in ["eye", "mouth", "nose", "ear", "glasses", "sunglasses"])]
        hands = [d for d in detections if "hand" in d.label.lower() or "wrist" in d.label.lower()]
        person_items = [d for d in detections if any(k in d.label.lower() for k in ["headphones", "airpods", "earbuds", "watch", "guitar", "phone", "backpack"])]
        plants = [d for d in detections if any(k in d.label.lower() for k in ["plant", "houseplant", "potted plant", "vase"])]
        plant_parts = [d for d in detections if any(k in d.label.lower() for k in ["flower", "flowerpot", "leaf", "stem"])]

        # 1. Link Head -> Person
        for head in heads:
            for person in people:
                if self._is_contained(head.bbox, person.bbox):
                    head.parentId = person.id
                    if head.id not in person.childrenIds:
                        person.childrenIds.append(head.id)
                    break

        # 2. Link Face -> Head (or Person if head not detected)
        for face in faces:
            linked = False
            for head in heads:
                if self._is_contained(face.bbox, head.bbox):
                    face.parentId = head.id
                    if face.id not in head.childrenIds:
                        head.childrenIds.append(face.id)
                    linked = True
                    break
            if not linked:
                for person in people:
                    if self._is_contained(face.bbox, person.bbox):
                        face.parentId = person.id
                        if face.id not in person.childrenIds:
                            person.childrenIds.append(face.id)
                        break

        # 3. Link Face Parts (eyes, mouth, nose, glasses) -> Face (or Head)
        for part in face_parts:
            linked = False
            for face in faces:
                if self._is_contained(part.bbox, face.bbox):
                    part.parentId = face.id
                    if part.id not in face.childrenIds:
                        face.childrenIds.append(part.id)
                    linked = True
                    break
            if not linked:
                for head in heads:
                    if self._is_contained(part.bbox, head.bbox):
                        part.parentId = head.id
                        if part.id not in head.childrenIds:
                            head.childrenIds.append(part.id)
                        linked = True
                        break

        # 4. Link Hands -> Person
        for hand in hands:
            for person in people:
                if self._is_contained(hand.bbox, person.bbox):
                    hand.parentId = person.id
                    if hand.id not in person.childrenIds:
                        person.childrenIds.append(hand.id)
                    break

        # 5. Link Person accessories & held items (headphones, watch, guitar, etc.)
        for item in person_items:
            # Headphones associate primarily with head/ears
            if any(k in item.label.lower() for k in ["headphones", "airpods", "earbuds"]):
                linked = False
                for head in heads:
                    if self._is_contained(item.bbox, head.bbox):
                        item.parentId = head.id
                        if item.id not in head.childrenIds:
                            head.childrenIds.append(item.id)
                        linked = True
                        break
                if not linked:
                    for person in people:
                        if self._is_contained(item.bbox, person.bbox):
                            item.parentId = person.id
                            if item.id not in person.childrenIds:
                                person.childrenIds.append(item.id)
                            break
            # Watch associates with hand
            elif "watch" in item.label.lower():
                linked = False
                for hand in hands:
                    if self._is_contained(item.bbox, hand.bbox):
                        item.parentId = hand.id
                        if item.id not in hand.childrenIds:
                            hand.childrenIds.append(item.id)
                        linked = True
                        break
                if not linked:
                    for person in people:
                        if self._is_contained(item.bbox, person.bbox):
                            item.parentId = person.id
                            if item.id not in person.childrenIds:
                                person.childrenIds.append(item.id)
                            break
            # Other items (guitar, phone, backpack) link to person
            else:
                for person in people:
                    if self._is_contained(item.bbox, person.bbox):
                        item.parentId = person.id
                        if item.id not in person.childrenIds:
                            person.childrenIds.append(item.id)
                        break

        # 6. Link Plant parts (flower, flowerpot) -> Plant
        for part in plant_parts:
            for plant in plants:
                if self._is_contained(part.bbox, plant.bbox, margin_ratio=0.30):
                    part.parentId = plant.id
                    if part.id not in plant.childrenIds:
                        plant.childrenIds.append(part.id)
                    break

        # Sanity Filter: Reject child boxes (parts/facial features) that have no valid parent
        # (Prevents floating faces/mouths/eyes from appearing on empty walls without a person)
        valid_detections: List[RealtimeDetection] = []
        for det in detections:
            if det.level == "part" and det.parentId is None:
                # Discard orphan part box
                continue
            valid_detections.append(det)

        return valid_detections
