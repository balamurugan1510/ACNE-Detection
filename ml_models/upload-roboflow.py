# !pip install roboflow
# !pip install ultralytics
from roboflow import Roboflow
import os

rf = Roboflow(api_key="qZwsZzOrXcCH02VKH31Q")
project = rf.workspace().project("my-first-project-soi1o")

print("Attempting to deploy model from 'training1/best.pt'...")

try:
    versions = project.versions()

    if not versions:
        print("No versions found.")
    else:
        first_version = versions[0]
        dataset_version = project.version(first_version.version)

        # Deploying weights
        deployed_model = dataset_version.deploy(
            model_type="yolov8n",
            model_path="training1"
        )
        print(f"Model deployed successfully to Roboflow Version {first_version.version}!")

        # Test if Roboflow API is working
        image_path = "test_image.jpg"
        if os.path.exists(image_path):
            print(f"Testing Roboflow API inference on {image_path}...")
            prediction = deployed_model.predict(image_path, confidence=10).json()
            print("Roboflow API Response:")
            print(prediction)

            if not prediction.get('predictions'):
                print("\nNote: The API returned 0 predictions. This might mean the confidence is too low or the model needs a moment to initialize on Roboflow's servers.")
        else:
            print(f"Image {image_path} not found for API test.")

except Exception as e:
    print(f"An error occurred: {e}")