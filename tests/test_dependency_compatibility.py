"""Exercise upgraded APIs locally. No requests or provider activation."""
import io


def test_provider_clients_and_langchain_construct_without_network(monkeypatch):
    monkeypatch.setenv("LANGCHAIN_TRACING_V2", "false")
    monkeypatch.setenv("LANGSMITH_TRACING", "false")
    # Client construction must be independent of workstation proxy settings.
    for name in ("HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"):
        monkeypatch.delenv(name, raising=False)
    from openai import OpenAI
    from anthropic import Anthropic
    from langchain_openai import ChatOpenAI
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import JsonOutputParser

    with OpenAI(api_key="fixture-not-a-provider-key") as client:
        assert callable(client.chat.completions.create)
    with Anthropic(api_key="fixture-not-a-provider-key") as client:
        assert callable(client.messages.create)
    model = ChatOpenAI(api_key="fixture-not-a-provider-key", model="fixture-model")
    prompt = ChatPromptTemplate.from_messages([("human", "{question}")])
    assert prompt.invoke({"question": "fixture"}).messages[0].content == "fixture"
    assert JsonOutputParser().invoke('{"verified": true}') == {"verified": True}
    assert model.model_name == "fixture-model"
    model.root_client.close()


def test_pdf_roundtrip_uses_real_parser_and_writer():
    from pypdf import PdfReader, PdfWriter
    stream = io.BytesIO()
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=200)
    writer.write(stream)
    stream.seek(0)
    page = PdfReader(stream).pages[0]
    assert float(page.mediabox.width) == 100
    assert float(page.mediabox.height) == 200


def test_settings_and_request_validation_remain_compatible():
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from pydantic import BaseModel, Field
    from pydantic_settings import BaseSettings

    class Settings(BaseSettings):
        fixture: int = 7

    class Payload(BaseModel):
        quantity: int = Field(gt=0)

    app = FastAPI()

    @app.post("/fixture")
    def submit(payload: Payload):
        return {"quantity": payload.quantity, "setting": Settings().fixture}

    with TestClient(app) as client:
        assert client.post("/fixture", json={"quantity": 2}).json() == {"quantity": 2, "setting": 7}
        assert client.post("/fixture", json={"quantity": -1}).status_code == 422
