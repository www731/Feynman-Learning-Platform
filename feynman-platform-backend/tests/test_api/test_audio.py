import allure
import pytest
import requests


@allure.feature("音频模块")
@allure.story("参数校验")
@allure.title("未上传音频文件时返回 400")
@pytest.mark.audio
def test_audio_transcribe_requires_file(base_url, api_timeout):
    response = requests.post(
        f"{base_url}/audio/transcribe",
        timeout=api_timeout,
    )
    assert response.status_code == 400, response.text
    data = response.json()
    assert "msg" in data