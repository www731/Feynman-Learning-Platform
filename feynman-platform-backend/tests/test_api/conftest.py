import os
import uuid
from pathlib import Path
import pytest
import requests
from dotenv import load_dotenv

TEST_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(TEST_ROOT / ".env.test", override=False)
load_dotenv(BACKEND_ROOT / ".env", override=False)


@pytest.fixture(scope="session")
def base_url() -> str:
    return os.getenv("API_BASE_URL", "http://127.0.0.1:3000/api").rstrip("/")


@pytest.fixture(scope="session")
def api_timeout() -> int:
    return int(os.getenv("API_TIMEOUT", "15"))


@pytest.fixture
def make_test_user():
    def _make():
        uid = uuid.uuid4().hex[:8]
        return {
            "username": f"pytest_user_{uid}",
            "email": f"pytest_{uid}@example.com",
            "password": "Pytest@123456",
        }
    return _make


@pytest.fixture
def register_user(base_url, api_timeout):
    def _register(user):
        return requests.post(f"{base_url}/users/register", json=user, timeout=api_timeout)
    return _register


@pytest.fixture
def login_user(base_url, api_timeout):
    def _login(email, password):
        return requests.post(f"{base_url}/users/login", json={"email": email, "password": password}, timeout=api_timeout)
    return _login


@pytest.fixture
def registered_user(make_test_user, register_user):
    user = make_test_user()
    response = register_user(user)
    assert response.status_code == 200, f"注册失败: {response.status_code} {response.text}"
    return user


@pytest.fixture
def auth_token(registered_user, login_user):
    response = login_user(registered_user["email"], registered_user["password"])
    assert response.status_code == 200, f"登录失败: {response.status_code} {response.text}"
    return response.json()["token"]


@pytest.fixture
def auth_headers(auth_token):
    return {
        "x-auth-token": auth_token,
        "Authorization": f"Bearer {auth_token}",
    }