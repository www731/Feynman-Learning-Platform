# 后端 API 自动化测试执行说明

## 1. 目标
这份文档用于规范费曼学习平台后端 API 自动化测试的本地执行、报告生成和后续 CI 接入流程。

当前测试框架：
- Python + pytest
- requests
- allure
- pytest-rerunfailures

当前测试目录：
- `tests/test_api/`

---

## 2. 初始化环境

### 2.1 创建虚拟环境
在项目根目录执行：

```powershell
cd d:\projects\ANDRIOkaifa\feynman-platform-backend
py -3 -m venv .venv-test
```

### 2.2 激活虚拟环境

```powershell
.\.venv-test\Scripts\Activate.ps1
```

### 2.3 安装测试依赖

```powershell
pip install --upgrade pip
pip install -r tests\requirements-test.txt
```

---

## 3. 测试环境配置

测试环境变量文件路径：

- `tests\.env.test`

推荐内容示例：

```env
API_BASE_URL=https://feynman-learning-platform.onrender.com/api
API_TIMEOUT=60
TEST_USER_EMAIL=admin@example.com
TEST_USER_PASSWORD=admin123
```

说明：
- 本地调试时，可以把 `API_BASE_URL` 改为 `http://127.0.0.1:3000/api`
- 线上测试环境时，使用测试环境地址即可
- 不要把真实敏感账号密码提交到仓库

---

## 4. 日常执行流程

写完测试脚本后，标准流程如下：

1. 先跑冒烟测试，确认环境没问题
2. 再跑核心接口测试
3. 再跑全量 API 测试
4. 生成 Allure 报告
5. 检查失败原因并归类
6. 确认是否需要补充用例、修复环境、还是修复接口
7. 再准备提交代码或接入 CI

---

## 5. 常用命令

### 5.1 跑冒烟测试
```powershell
pytest tests\test_api -m smoke --alluredir=allure-results
```

### 5.2 跑核心测试
```powershell
pytest tests\test_api -m "auth or knowledge or graph" --alluredir=allure-results
```

### 5.3 跑全量 API 测试
```powershell
pytest tests\test_api --alluredir=allure-results
```

### 5.4 生成 Allure 报告
```powershell
allure generate allure-results -o allure-report --clean
```

### 5.5 打开 Allure 报告
```powershell
allure open allure-report
```

---

## 6. 推荐统一执行方式

推荐不要每次手敲全部命令，而是统一使用：

- `scripts\run_api_tests.ps1`

示例：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run_api_tests.ps1 -CreateVenv -InstallDeps -Suite smoke -GenerateReport
```

常见用法：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run_api_tests.ps1 -Suite smoke
powershell -ExecutionPolicy Bypass -File .\scripts\run_api_tests.ps1 -Suite core -GenerateReport
powershell -ExecutionPolicy Bypass -File .\scripts\run_api_tests.ps1 -Suite full -GenerateReport -ServeReport
```

---

## 7. 报告与结果目录

默认目录建议：

- `allure-results/`：pytest 原始结果
- `allure-report/`：可视化测试报告

说明：
- `allure-results` 每次执行会被覆盖
- `allure-report` 每次重新生成
- 如果后续需要趋势分析，可再接历史归档策略

---

## 8. 失败处理规范

测试失败后，优先按下面顺序排查：

1. 环境问题
   - `.env.test` 是否正确
   - 测试地址是否正确
   - 测试账号是否可用
   - 目标服务是否在线

2. 依赖问题
   - Python 包是否完整安装
   - Allure CLI 是否安装
   - 虚拟环境是否正确激活

3. 接口问题
   - 接口返回码变化
   - 返回字段变化
   - 鉴权头变化
   - 测试数据污染

4. 偶发问题
   - 网络抖动
   - 远端连接重置
   - 测试环境服务重启

---

## 9. 提交前建议

建议提交代码前至少执行：

```powershell
pytest tests\test_api -m smoke --alluredir=allure-results
```

合并主分支前建议执行：

```powershell
pytest tests\test_api --alluredir=allure-results
allure generate allure-results -o allure-report --clean
```

---

## 10. 下一步工程化方向

当前阶段完成后，下一步可以继续做：

- 补充 `package.json` 里的测试脚本入口
- 补充 GitHub Actions 自动执行
- 归档 Allure 报告为构建产物
- 按模块拆分 smoke/core/regression
- 为关键失败场景补测试数据清理策略