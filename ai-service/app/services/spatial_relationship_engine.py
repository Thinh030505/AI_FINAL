from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger("ai-service.spatial_relationship")

class SpatialRelationshipItem:
    def __init__(
        self,
        subject: str,
        relation: str,
        target_object: str,
        confidence: float,
        description: str,
        subject_box: Optional[List[int]] = None,
        object_box: Optional[List[int]] = None
    ):
        self.subject = subject
        self.relation = relation
        self.target_object = target_object
        self.confidence = confidence
        self.description = description
        self.subject_box = subject_box or []
        self.object_box = object_box or []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "subject": self.subject,
            "relation": self.relation,
            "object": self.target_object,
            "confidence": round(float(self.confidence), 2),
            "description": self.description,
            "subjectBox": self.subject_box,
            "objectBox": self.object_box
        }

class SpatialRelationshipEngine:
    """
    Spatial & Semantic Relationship Reasoning Engine.
    Transforms raw disconnected bounding boxes and segmentation labels into structured
    visual knowledge graphs (e.g., person wearing glasses, person holding phone, cup on table).
    """
    _instance: Optional["SpatialRelationshipEngine"] = None

    @classmethod
    def get_instance(cls) -> "SpatialRelationshipEngine":
        if cls._instance is None:
            cls._instance = SpatialRelationshipEngine()
        return cls._instance

    @staticmethod
    def _compute_iou(boxA: List[int], boxB: List[int]) -> float:
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2])
        yB = min(boxA[3], boxB[3])

        interW = max(0, xB - xA)
        interH = max(0, yB - yA)
        interArea = interW * interH

        boxAArea = max(1, (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]))
        boxBArea = max(1, (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]))

        return interArea / float(boxAArea + boxBArea - interArea)

    @staticmethod
    def _is_contained(inner: List[int], outer: List[int], threshold: float = 0.55) -> bool:
        """Returns True if the majority of inner box lies inside outer box."""
        ixA = max(inner[0], outer[0])
        iyA = max(inner[1], outer[1])
        ixB = min(inner[2], outer[2])
        iyB = min(inner[3], outer[3])

        interArea = max(0, ixB - ixA) * max(0, iyB - iyA)
        innerArea = max(1, (inner[2] - inner[0]) * (inner[3] - inner[1]))
        return (interArea / float(innerArea)) >= threshold

    def extract_relationships(
        self,
        people: List[Dict[str, Any]],
        objects: List[Dict[str, Any]],
        regions: List[Dict[str, Any]]
    ) -> List[SpatialRelationshipItem]:
        relationships: List[SpatialRelationshipItem] = []

        # 1. Person-accessory and clothing relationships
        for p_idx, person in enumerate(people):
            p_name = f"person_{p_idx + 1}"
            p_box = person.get("bbox", [])

            # Accessories
            for acc in person.get("head_accessories", []):
                label = acc.get("label", "glasses")
                relationships.append(SpatialRelationshipItem(
                    subject=p_name, relation="wearing", target_object=label,
                    confidence=acc.get("confidence", 0.85),
                    description=f"{p_name} is wearing {label}",
                    subject_box=p_box, object_box=acc.get("bbox", [])
                ))

            for acc in person.get("ear_accessories", []):
                label = acc.get("label", "earbuds")
                relationships.append(SpatialRelationshipItem(
                    subject=p_name, relation="wearing", target_object=label,
                    confidence=acc.get("confidence", 0.85),
                    description=f"{p_name} is wearing {label} in ear",
                    subject_box=p_box, object_box=acc.get("bbox", [])
                ))

            for acc in person.get("neck_accessories", []):
                label = acc.get("label", "necklace")
                relationships.append(SpatialRelationshipItem(
                    subject=p_name, relation="wearing", target_object=label,
                    confidence=acc.get("confidence", 0.85),
                    description=f"{p_name} is wearing {label} around neck",
                    subject_box=p_box, object_box=acc.get("bbox", [])
                ))

            for acc in person.get("wrist_accessories", []):
                label = acc.get("label", "watch")
                relationships.append(SpatialRelationshipItem(
                    subject=p_name, relation="wearing", target_object=label,
                    confidence=acc.get("confidence", 0.85),
                    description=f"{p_name} is wearing {label} on wrist",
                    subject_box=p_box, object_box=acc.get("bbox", [])
                ))

            for acc in person.get("hand_accessories", []):
                label = acc.get("label", "ring")
                rel_verb = "holding" if label in ["phone", "smartphone", "keys"] else "wearing"
                relationships.append(SpatialRelationshipItem(
                    subject=p_name, relation=rel_verb, target_object=label,
                    confidence=acc.get("confidence", 0.85),
                    description=f"{p_name} is {rel_verb} {label}",
                    subject_box=p_box, object_box=acc.get("bbox", [])
                ))

            for c in person.get("carried_objects", []):
                label = c.get("label", "bag")
                relationships.append(SpatialRelationshipItem(
                    subject=p_name, relation="carrying", target_object=label,
                    confidence=c.get("confidence", 0.85),
                    description=f"{p_name} is carrying {label}",
                    subject_box=p_box, object_box=c.get("bbox", [])
                ))

            # Clothing items
            for cl in person.get("clothing", []):
                desc = cl.get("displayName", cl.get("type", "clothes"))
                relationships.append(SpatialRelationshipItem(
                    subject=p_name, relation="wearing", target_object=desc,
                    confidence=cl.get("confidence", 0.80),
                    description=f"{p_name} is wearing {desc}",
                    subject_box=p_box, object_box=cl.get("bbox", [])
                ))

        # 2. Object-to-Object relationships (e.g. cup on table, laptop on desk, person sitting on chair)
        table_boxes = []
        chair_boxes = []

        for obj in objects:
            lbl = obj.get("label", "").lower()
            box_dict = obj.get("box", {})
            box = [box_dict.get("x1", 0), box_dict.get("y1", 0), box_dict.get("x2", 0), box_dict.get("y2", 0)]
            if lbl in ["dining table", "table", "desk"]:
                table_boxes.append((lbl, box))
            elif lbl in ["chair", "couch", "sofa", "bench"]:
                chair_boxes.append((lbl, box))

        for obj in objects:
            lbl = obj.get("label", "").lower()
            box_dict = obj.get("box", {})
            box = [box_dict.get("x1", 0), box_dict.get("y1", 0), box_dict.get("x2", 0), box_dict.get("y2", 0)]

            # Check items on tables
            if lbl in ["cup", "bottle", "bowl", "laptop", "mouse", "keyboard", "plate", "cell phone"]:
                for tbl_name, tbl_box in table_boxes:
                    if self._is_contained(box, tbl_box, threshold=0.45):
                        relationships.append(SpatialRelationshipItem(
                            subject=lbl, relation="on", target_object=tbl_name,
                            confidence=0.88,
                            description=f"{lbl} is on {tbl_name}",
                            subject_box=box, object_box=tbl_box
                        ))
                        break

            # Check person on chairs
            if lbl == "person":
                for chair_name, chair_box in chair_boxes:
                    iou = self._compute_iou(box, chair_box)
                    if iou > 0.25:
                        relationships.append(SpatialRelationshipItem(
                            subject="person", relation="sitting on", target_object=chair_name,
                            confidence=0.84,
                            description=f"person is sitting on {chair_name}",
                            subject_box=box, object_box=chair_box
                        ))
                        break

        # 3. Object-to-Environment relationships (e.g. car on road, boat on water)
        dominant_regions = {r.get("label", "").lower() for r in regions if r.get("regionPercentage", 0) > 8.0}
        for obj in objects:
            lbl = obj.get("label", "").lower()
            box_dict = obj.get("box", {})
            box = [box_dict.get("x1", 0), box_dict.get("y1", 0), box_dict.get("x2", 0), box_dict.get("y2", 0)]
            if lbl in ["car", "bus", "truck", "motorcycle", "bicycle"] and "road" in dominant_regions:
                relationships.append(SpatialRelationshipItem(
                    subject=lbl, relation="on", target_object="road",
                    confidence=0.82,
                    description=f"{lbl} is on road",
                    subject_box=box
                ))
            elif lbl in ["boat", "ship", "surfboard"] and any(w in dominant_regions for w in ["sea", "water", "river"]):
                relationships.append(SpatialRelationshipItem(
                    subject=lbl, relation="on", target_object="water",
                    confidence=0.85,
                    description=f"{lbl} is on water",
                    subject_box=box
                ))

        return relationships

def get_spatial_relationship_engine() -> SpatialRelationshipEngine:
    return SpatialRelationshipEngine.get_instance()
