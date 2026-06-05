import json
import logging
from typing import Any, Iterator

from app.config import settings

logger = logging.getLogger(__name__)

_client = None


def get_client():
    global _client
    if _client is not None:
        return _client
    if not settings.roboflow_api_key:
        raise ValueError("ROBOFLOW_API_KEY is not configured")
    from inference_sdk import InferenceHTTPClient

    _client = InferenceHTTPClient(
        api_url=settings.roboflow_api_url,
        api_key=settings.roboflow_api_key,
    )
    return _client


def severity_label(score: float) -> str:
    if score <= 9:
        return "Clear"
    if score <= 29:
        return "Mild"
    if score <= 54:
        return "Moderate"
    if score <= 74:
        return "Severe"
    return "Very Severe"


def _yield_detection_list(items: list) -> Iterator[dict]:
    for p in items:
        if isinstance(p, dict) and (
            "confidence" in p or "class" in p or "class_id" in p or "x" in p or "bbox" in p
        ):
            yield p


def _iter_prediction_dicts(obj: Any) -> Iterator[dict]:
    if isinstance(obj, dict):
        for key in ("predictions", "detections", "objects", "results"):
            preds = obj.get(key)
            if isinstance(preds, list):
                yield from _yield_detection_list(preds)
        for v in obj.values():
            yield from _iter_prediction_dicts(v)
    elif isinstance(obj, list):
        for item in obj:
            yield from _iter_prediction_dicts(item)


def _find_explicit_count(obj: Any) -> int | None:
    if isinstance(obj, dict):
        for k in ("count", "detection_count", "num_detections", "total_detections", "objects_count"):
            if k in obj and isinstance(obj[k], (int, float)) and not isinstance(obj[k], bool):
                return int(obj[k])
        for v in obj.values():
            c = _find_explicit_count(v)
            if c is not None:
                return c
    elif isinstance(obj, list):
        for item in obj:
            c = _find_explicit_count(item)
            if c is not None:
                return c
    return None


def _parse_counts_and_confidence(result: Any) -> tuple[int, float]:
    preds = list(_iter_prediction_dicts(result))
    confs: list[float] = []
    for p in preds:
        c = p.get("confidence")
        if c is not None:
            try:
                confs.append(float(c))
            except (TypeError, ValueError):
                pass
    explicit = _find_explicit_count(result)
    if preds:
        count = len(preds)
    elif explicit is not None:
        count = explicit
    else:
        count = 0
    avg_conf = sum(confs) / len(confs) if confs else 0.0
    return count, avg_conf


def _json_safe(obj: Any) -> Any:
    return json.loads(json.dumps(obj, default=str))


def run_inference(image_path: str) -> dict[str, Any]:
    """
    Run Roboflow inference and return counts + JSON-safe predictions for the UI.

    Default: direct **model** inference via `infer()` with a low confidence threshold
    and high max_detections so the API does not drop boxes the way many workflows do.

    Set `ROBOFLOW_USE_WORKFLOW=true` to use the legacy workflow instead.
    """
    from inference_sdk import InferenceConfiguration

    client = get_client()

    if settings.roboflow_use_workflow:
        result = client.run_workflow(
            workspace_name=settings.roboflow_workspace_name,
            workflow_id=settings.roboflow_workflow_id,
            images={"image": image_path},
            use_cache=True,
        )
        logger.debug("Roboflow workflow result type: %s", type(result).__name__)
    else:
        model_id = (settings.roboflow_model_id or "").strip()
        if not model_id:
            raise ValueError(
                "ROBOFLOW_MODEL_ID is not set (expected form like 'my-project/1'). "
                "Set it for direct model inference, or set ROBOFLOW_USE_WORKFLOW=true "
                "to use ROBOFLOW_WORKFLOW_ID instead."
            )
        cfg_kwargs: dict[str, Any] = {
            "confidence_threshold": settings.roboflow_confidence_threshold,
            "visualize_predictions": False,
        }
        if settings.roboflow_max_detections and settings.roboflow_max_detections > 0:
            cfg_kwargs["max_detections"] = settings.roboflow_max_detections
        cfg = InferenceConfiguration(**cfg_kwargs)
        with client.use_configuration(cfg):
            result = client.infer(
                inference_input=image_path,
                model_id=model_id,
            )
        logger.debug("Roboflow infer result type: %s", type(result).__name__)

    count, avg_conf = _parse_counts_and_confidence(result)
    preds = list(_iter_prediction_dicts(result))
    safe_predictions = _json_safe(preds)
    severity_score = min(100.0, (count / 30.0) * 100.0)

    return {
        "acne_count": count,
        "avg_confidence": avg_conf,
        "severity_score": severity_score,
        "predictions": safe_predictions,
    }
