import pytest
import requests


@pytest.mark.smoke
def test_api_ping(base_url, api_timeout):
    response = requests.get(f"{base_url}/ping", timeout=api_timeout)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["ok"] is True
    assert "v" in data


@pytest.mark.smoke
def test_users_ping(base_url, api_timeout):
    response = requests.get(f"{base_url}/users/ping", timeout=api_timeout)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["ok"] is True
    assert "v" in data