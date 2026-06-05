from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://acneuser:acnepass@localhost:5432/acnetracker"
    secret_key: str = "CHANGE_IN_PRODUCTION_MIN_32_CHARS_SECRET_KEY"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080
    upload_dir: str = "/app/uploads"
    dev_mode: bool = True

    roboflow_api_url: str = "https://serverless.roboflow.com"
    roboflow_api_key: str = ""
    roboflow_workspace_name: str = ""
    roboflow_workflow_id: str = "detect-count-and-visualize"
    # Direct model inference (Serverless `infer`) — avoids workflow-side filters.
    # Model id format: `project-slug/version` (see Roboflow model page).
    roboflow_use_workflow: bool = False
    roboflow_model_id: str = "my-first-project-soi1o/1"
    # Passed to Inference SDK as `confidence` (0–1). Lower = keep more detections.
    roboflow_confidence_threshold: float = 0.01
    roboflow_max_detections: int = 300


settings = Settings()
