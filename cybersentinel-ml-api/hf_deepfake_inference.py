import torch
from torchvision import transforms
from PIL import Image
from transformers import pipeline
import io

def load_deepfake_model():
    try:
        model = torch.jit.load("./models/Deepfake_model/best_model_scripted.pt", map_location=torch.device('cpu'))
        model.eval()
        return model
    except Exception as e:
        print(f"Deepfake PyTorch model load failed: {e}. Will fallback to HuggingFace pipeline.")
        return pipeline("image-classification", model="umm-maybe/AI-image-detector")

def load_prompt_injection_model():
    try:
        return pipeline(
            "text-classification", 
            model="protectai/deberta-v3-base-prompt-injection-v2", 
            truncation=True, 
            max_length=512
        )
    except Exception as e:
        print(f"Prompt injection model load failed: {e}")
        return None

def analyze_image(image_bytes: bytes, model):
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    
    # Check if model is a HF pipeline or PyTorch JIT model
    if hasattr(model, 'predict') or callable(getattr(model, '__call__', None)) and not isinstance(model, torch.jit.ScriptModule):
        # HF Pipeline
        target_size = (224, 224)
        if img.size[0] > 1000 or img.size[1] > 1000:
             img.thumbnail(target_size)
        hf_result = model(img)
        if hf_result:
            label = str(hf_result[0]['label']).upper()
            score = float(hf_result[0]['score'])
            is_fake = "FAKE" in label or "1" in label or "ARTIFICIAL" in label
            final_score = (score * 100) if is_fake else ((1.0 - score) * 100)
            return {"flagged": is_fake, "score": final_score, "source": "hf_pipeline"}
        return {"flagged": False, "score": 0.0}

    # PyTorch JIT Model
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    
    input_tensor = transform(img).unsqueeze(0)
    with torch.no_grad():
        output = model(input_tensor)
        probabilities = torch.nn.functional.softmax(output, dim=1)
        fake_prob = probabilities[0][1].item()
        
    is_fake = fake_prob > 0.5
    return {"flagged": is_fake, "score": fake_prob * 100, "source": "pytorch_jit"}

def analyze_prompt(text: str, model):
    if model is None:
        return {"is_injection": False, "score": 0.0}
    result = model(text)[0]
    is_injection = result['label'] == 'INJECTION'
    score = result['score'] * 100
    return {"is_injection": is_injection, "score": score}
