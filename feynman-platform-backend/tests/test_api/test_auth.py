import os
import allure
import pytest
import requests


TEST_EMAIL = os.getenv("TEST_USER_EMAIL", "admin@example.com")
TEST_PASSWORD = os.getenv("TEST_USER_PASSWORD", "admin123")


@allure.feature("认证模块")
@allure.story("线上登录")
@allure.title("使用测试账号登录成功后返回 token")
@pytest.mark.auth
def test_login_success_returns_token(base_url, api_timeout):
    response = requests.post(
        f"{base_url}/users/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        timeout=api_timeout,
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert "token" in data
    assert isinstance(data["token"], str)
    assert len(data["token"]) > 0


@allure.feature("认证模块")
@allure.story("线上登录")
@allure.title("错误密码登录时返回 400")
@pytest.mark.auth
def test_login_wrong_password_returns_400(base_url, api_timeout):
    response = requests.post(
        f"{base_url}/users/login",
        json={"email": TEST_EMAIL, "password": "admin123_wrong"},
        timeout=api_timeout,
    )
    assert response.status_code == 400, response.text
    data = response.json()
    assert "msg" in data