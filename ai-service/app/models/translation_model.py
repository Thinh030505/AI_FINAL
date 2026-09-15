from pydantic import BaseModel, Field
from typing import Optional

class TranslationRequest(BaseModel):
    text: str = Field(..., description="Text to translate", example="Hiển thị thông tin hồ sơ")
    sourceLanguage: str = Field("auto", description="Source language code ('auto', 'vi', 'en')", example="vi")
    targetLanguage: str = Field("en", description="Target language code ('vi', 'en')", example="en")

class TranslationData(BaseModel):
    sourceText: str
    translatedText: str
    sourceLanguage: str
    targetLanguage: str
    processingTimeMs: int

class TranslationResponse(BaseModel):
    success: bool = True
    message: str = "Translation completed successfully"
    data: TranslationData
