import time
import allure
import pytest
import requests


def make_kp_payload():
    ts = int(time.time() * 1000)
    return {
        "title": f"pytest_kp_{ts}",
        "content": f"这是自动化测试创建的知识点内容_{ts}",
        "tags": ["pytest", "autotest"],
    }


@allure.feature("知识点模块")
@allure.story("接口鉴权")
@allure.title("未登录访问知识点列表时被拒绝")
@pytest.mark.knowledge
def test_knowledge_points_requires_auth(base_url, api_timeout):
    response = requests.get(
        f"{base_url}/knowledge-points",
        timeout=api_timeout,
    )
    assert response.status_code in (401, 403), response.text


@allure.feature("知识点模块")
@allure.story("CRUD 主链路")
@allure.title("创建 查询 更新 删除知识点主流程通过")
@pytest.mark.knowledge
def test_create_list_get_update_delete_knowledge_point(base_url, api_timeout, auth_headers):
    payload = make_kp_payload()

    create_resp = requests.post(
        f"{base_url}/knowledge-points",
        json=payload,
        headers=auth_headers,
        timeout=api_timeout,
    )
    assert create_resp.status_code == 200, create_resp.text
    created = create_resp.json()
    assert "_id" in created
    kp_id = created["_id"]

    list_resp = requests.get(
        f"{base_url}/knowledge-points",
        headers=auth_headers,
        timeout=api_timeout,
    )
    assert list_resp.status_code == 200, list_resp.text
    items = list_resp.json()
    assert isinstance(items, list)
    assert any(item["_id"] == kp_id for item in items)

    detail_resp = requests.get(
        f"{base_url}/knowledge-points/{kp_id}",
        headers=auth_headers,
        timeout=api_timeout,
    )
    assert detail_resp.status_code == 200, detail_resp.text
    detail = detail_resp.json()
    assert detail["_id"] == kp_id
    assert detail["title"] == payload["title"]

    update_payload = {
        "title": payload["title"] + "_updated",
        "content": payload["content"] + "_updated",
        "status": "in_progress",
        "reviewList": True,
        "tags": ["pytest", "updated"],
    }
    update_resp = requests.put(
        f"{base_url}/knowledge-points/{kp_id}",
        json=update_payload,
        headers=auth_headers,
        timeout=api_timeout,
    )
    assert update_resp.status_code == 200, update_resp.text
    updated = update_resp.json()
    assert updated["_id"] == kp_id
    assert updated["title"] == update_payload["title"]
    assert updated["reviewList"] is True

    review_list_resp = requests.get(
        f"{base_url}/knowledge-points/review-list",
        headers=auth_headers,
        timeout=api_timeout,
    )
    assert review_list_resp.status_code == 200, review_list_resp.text
    review_items = review_list_resp.json()
    assert isinstance(review_items, list)
    assert any(item["_id"] == kp_id for item in review_items)

    delete_resp = requests.delete(
        f"{base_url}/knowledge-points/{kp_id}",
        headers=auth_headers,
        timeout=api_timeout,
    )
    assert delete_resp.status_code == 200, delete_resp.text
    deleted = delete_resp.json()
    assert "msg" in deleted

    deleted_detail_resp = requests.get(
        f"{base_url}/knowledge-points/{kp_id}",
        headers=auth_headers,
        timeout=api_timeout,
    )
    assert deleted_detail_resp.status_code == 404, deleted_detail_resp.text