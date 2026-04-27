---
title: JSON-RPC 2.0
type: concept
aliases: ["JSON-RPC", "json-rpc", "JSON RPC", "JSON Remote Procedure Call"]
tags: [protocol, rpc, api, json, microservice]
status: stub
confidence: high
sources:
  - "[[2026-04-27-cs-nest-cloud-v3.0.1-beta.9]]"
related:
  - "[[cs-nest-cloud]]"
  - "[[microservice-exception-retry]]"
created: 2026-04-27
updated: 2026-04-27
last_reviewed: 2026-04-27
---

# JSON-RPC 2.0

## 一句话定义

> JSON-RPC 2.0 是一种轻量级远程过程调用协议，基于 JSON 编码，规范了请求/响应信封格式、错误码体系和通知语义。

## 展开解释

JSON-RPC 2.0 规范定义了：
- **请求信封**：`{ jsonrpc: "2.0", method: string, params?, id? }`
- **响应信封**：`{ jsonrpc: "2.0", result? | error?, id }`
- **通知**：无 id 的请求，服务端不返回响应（fire-and-forget）
- **错误码体系**：-32700（解析错误）、-32600（无效请求）、-32601（方法未找到）、-32602（无效参数）、-32603（内部错误）；-32000~-32099 保留为自定义

### @cs/nest-cloud 中的实现

@cs/nest-cloud 基于 HTTP 协议承载 JSON-RPC 2.0，而非 WebSocket/TCP：
- **服务端**：RpcController 暴露 POST /rpc 端点，RpcRegistry 自动发现并分发
- **客户端**：RpcClient / JsonRpcClient 封装 HTTP POST，自动注入 x-rpc-request 头
- **请求验证**：validateJsonRpcRequest 校验 jsonrpc 版本、method 非空、params 类型、id 类型、无多余字段
- **响应构造**：createJsonRpcSuccess / createJsonRpcError
- **扩展错误码**：在标准 -32700~-32603 基础上增加了 -32000~-32005（SERVICE_NOT_FOUND / SERVICE_UNAVAILABLE / TIMEOUT_ERROR / VALIDATION_ERROR / UNAUTHORIZED / RATE_LIMIT_EXCEEDED）
- **业务错误码**：>= 1000 的正整数，与协议级负整数天然隔离（RpcBusinessException）

### 参数传递模式

| 模式 | 格式 | 场景 |
|------|------|------|
| 空参数 | 不传 params 或 null | 无参方法 |
| 单值 | `"some value"` | 只有一个参数 |
| 数组 | `["val1", 123, true]` | 按位置传参 |
| 对象 | `{"name": "val", "age": 18}` | 按名称传参（命名参数） |

## 与其他概念的关系

- 上位：[[microservice-exception-retry]]（RPC 是微服务间通信的载体）
- 并列：gRPC / REST / GraphQL（其他 RPC/API 协议）
- 对立：无显著对立概念
- 被使用于：[[cs-nest-cloud]]

## 引用来源

- [[2026-04-27-cs-nest-cloud-v3.0.1-beta.9]]

## 演进记录

- 2026-04-27 · 初建（来源：[[2026-04-27-cs-nest-cloud-v3.0.1-beta.9]]）
