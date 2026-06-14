import time

import allure
import pytest
import requests


def create_knowledge_point(base_url, api_timeout, auth_headers, payload):
    response = requests.post(
        f"{base_url}/knowledge-points",
        json=payload,
        headers=auth_headers,
        timeout=api_timeout,
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert "_id" in data
    return data


@allure.feature("图谱模块")
@allure.story("接口鉴权")
@allure.title("未登录访问知识图谱时被拒绝")
@pytest.mark.graph
def test_graph_knowledge_map_requires_auth(base_url, api_timeout):
    response = requests.get(
        f"{base_url}/graph/knowledge-map",
        timeout=api_timeout,
    )
    assert response.status_code in (401, 403), response.text


@allure.feature("图谱模块")
@allure.story("图谱构建")
@allure.title("创建关联知识点后可生成对应图谱节点和连线")
@pytest.mark.graph
def test_graph_knowledge_map_returns_nodes_and_links(base_url, api_timeout, auth_headers):
    ts = int(time.time() * 1000)
    shared_tag = f"pytest_graph_tag_{ts}"

    payload_a = {
        "title": f"pytest_graph_a_{ts}",
        "content": f"这是图谱节点A，它引用了 pytest_graph_b_{ts}",
        "tags": ["pytest", shared_tag],
    }
    payload_b = {
        "title": f"pytest_graph_b_{ts}",
        "content": "这是图谱节点B",
        "tags": ["pytest", shared_tag],
    }

    created_ids = []
    try:
        node_a = create_knowledge_point(base_url, api_timeout, auth_headers, payload_a)
        node_b = create_knowledge_point(base_url, api_timeout, auth_headers, payload_b)
        created_ids.extend([node_a["_id"], node_b["_id"]])

        response = requests.get(
            f"{base_url}/graph/knowledge-map",
            headers=auth_headers,
            timeout=api_timeout,
        )
        assert response.status_code == 200, response.text

        data = response.json()
        assert isinstance(data, dict)
        assert isinstance(data.get("nodes"), list)
        assert isinstance(data.get("links"), list)

        node_names = {node.get("name") for node in data["nodes"]}
        assert payload_a["title"] in node_names
        assert payload_b["title"] in node_names

        assert any(
            {link.get("source"), link.get("target")} == {node_a["_id"], node_b["_id"]}
            for link in data["links"]
        )
    finally:
        for kp_id in created_ids:
            requests.delete(
                f"{base_url}/knowledge-points/{kp_id}",
                headers=auth_headers,
                timeout=api_timeout,
            )