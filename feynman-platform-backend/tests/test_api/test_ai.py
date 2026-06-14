import allure
import pytest
import requests


@allure.feature("AI模块")
@allure.story("参数校验")
@allure.title("文本润色缺少 text 时返回 400")
@pytest.mark.ai
def test_ai_polish_requires_text(base_url, api_timeout):
    response = requests.post(
        f"{base_url}/ai/polish",
        json={},
        timeout=api_timeout,
    )
    assert response.status_code == 400, response.text
    data = response.json()
    assert "msg" in data


@allure.feature("AI模块")
@allure.story("参数校验")
@allure.title("AI 评教缺少必填字段时返回 400")
@pytest.mark.ai
def test_ai_evaluate_requires_required_fields(base_url, api_timeout):
    response = requests.post(
        f"{base_url}/ai/evaluate",
        json={"originalContent": "这是原文"},
        timeout=api_timeout,
    )
    assert response.status_code == 400, response.text
    data = response.json()
    assert "msg" in data


@allure.feature("AI模块")
@allure.story("参数校验")
@allure.title("AI 出题缺少 difficulty 时返回 400")
@pytest.mark.ai
def test_ai_generate_question_requires_difficulty(base_url, api_timeout):
    response = requests.post(
        f"{base_url}/ai/generate-question",
        json={"knowledgePointContent": "React 中 state 和 props 的区别"},
        timeout=api_timeout,
    )
    assert response.status_code == 400, response.text
    data = response.json()
    assert "msg" in data


@allure.feature("AI模块")
@allure.story("参数校验")
@allure.title("AI 评分缺少 question 和 userAnswer 时返回 400")
@pytest.mark.ai
def test_ai_grade_answer_requires_question_and_user_answer(base_url, api_timeout):
    response = requests.post(
        f"{base_url}/ai/grade-answer",
        json={},
        timeout=api_timeout,
    )
    assert response.status_code == 400, response.text
    data = response.json()
    assert "msg" in data


@allure.feature("AI模块")
@allure.story("参数校验")
@allure.title("单选题评分缺少 correctAnswer 时返回 400")
@pytest.mark.ai
def test_ai_grade_answer_single_choice_requires_correct_answer(base_url, api_timeout):
    response = requests.post(
        f"{base_url}/ai/grade-answer",
        json={
            "question": "React 是什么？",
            "userAnswer": "A",
            "type": "single-choice",
        },
        timeout=api_timeout,
    )
    assert response.status_code == 400, response.text
    data = response.json()
    assert "msg" in data


@allure.feature("AI模块")
@allure.story("接口鉴权")
@allure.title("未登录访问 RAG 问答时被拒绝")
@pytest.mark.ai
def test_ai_rag_qa_requires_auth(base_url, api_timeout):
    response = requests.post(
        f"{base_url}/ai/rag-qa",
        json={"question": "什么是费曼学习法？"},
        timeout=api_timeout,
    )
    assert response.status_code in (401, 403), response.text


@allure.feature("AI模块")
@allure.story("接口鉴权")
@allure.title("已登录但缺少 question 时返回 400")
@pytest.mark.ai
def test_ai_rag_qa_requires_question_when_authenticated(base_url, api_timeout, auth_headers):
    response = requests.post(
        f"{base_url}/ai/rag-qa",
        json={},
        headers=auth_headers,
        timeout=api_timeout,
    )
    assert response.status_code == 400, response.text
    data = response.json()
    assert "msg" in data


@allure.feature("AI模块")
@allure.story("调试接口")
@allure.title("已登录访问 debug-store 返回调试结构")
@pytest.mark.ai
def test_ai_debug_store_returns_structure(base_url, api_timeout, auth_headers):
    response = requests.get(
        f"{base_url}/ai/debug-store",
        headers=auth_headers,
        timeout=api_timeout,
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert "userId" in data
    assert "knowledgePointCount" in data
    assert "vectorStore" in data
    assert "embeddings" in data