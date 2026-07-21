"""
CyberSentinel AI — Agent-Specific Schemas
JSON input/output models for individual Gemini agent communication.
"""

from typing import Dict, List, Optional

from pydantic import BaseModel


# --- Agent Envelope ---

class AgentRequest(BaseModel):
    """Common envelope sent to Gemini agents."""
    agent: str
    input: dict


class AgentMeta(BaseModel):
    model: str = "gemini-2.5-flash-lite"
    version: str = "v1"
    generated_at: str = ""


class AgentResponse(BaseModel):
    """Common envelope returned by Gemini agents."""
    agent: str
    output: dict
    meta: Optional[AgentMeta] = None


# --- Phishing Agent ---

class PhishingInput(BaseModel):
    type: str = "email"
    content: str
    language: str = "en"


class PhishingOutput(BaseModel):
    threat_type: str
    risk_score: int
    confidence: float
    indicators: List[str]
    raw_reasons: List[str] = []


# --- URL Agent ---

class URLInput(BaseModel):
    type: str = "url"
    url: str
    context: str = ""


class URLFeatures(BaseModel):
    suspicious_keywords: List[str] = []
    num_subdomains: int = 0
    length: int = 0


class URLOutput(BaseModel):
    threat_type: str
    risk_score: int
    confidence: float
    indicators: List[str]
    url_features: Optional[URLFeatures] = None


# --- Prompt Injection Agent ---

class PromptInput(BaseModel):
    type: str = "prompt"
    content: str
    target_system: str = "chatbot"


class PromptOutput(BaseModel):
    threat_type: str
    risk_score: int
    confidence: float
    indicators: List[str]
    categories: List[str] = []


# --- Deepfake Agent ---

class DeepfakeInput(BaseModel):
    type: str  # image | video
    content: str  # base64
    filename: str = ""


class AnalysisDetails(BaseModel):
    visual_artifacts: List[str] = []
    hive_ai_result: Optional[str] = None


class DeepfakeOutput(BaseModel):
    threat_type: str
    risk_score: int
    confidence: float
    indicators: List[str]
    manipulation_type: str = "none"
    analysis_details: Optional[AnalysisDetails] = None


# --- Explanation Agent ---

class ExplanationInput(BaseModel):
    threat_type: str
    risk_score: int
    indicators: List[str]
    raw_input_snippet: str


class ExplanationOutput(BaseModel):
    summary_text: str
    key_points: List[str]


# --- Recommendation Agent ---

class RecommendationInput(BaseModel):
    threat_type: str
    risk_score: int
    threat_level: str
    context: Dict[str, str] = {}


class RecommendationOutput(BaseModel):
    severity_label: str
    actions: List[str]
