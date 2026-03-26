居住區改成支援全世界的主要城市唷
{
    "success": false,
    "data": null,
    "error": {
        "code": "APP_ERROR",
        "message": "'tokyo_japan' 不是有效的城市名稱"
    },
    "timestamp": "2025-11-06T16:25:18.169Z",
    "meta": {
        "requestId": "req_1762446318138_gdaye7jb4",
        "processingTime": 29
    },
    "debug": {
        "stack": "ConflictError: 'tokyo_japan' 不是有效的城市名稱\n    at /app/dist/src/services/user.service.js:695:27\n    at async Proxy._transactionWithCallback (/app/dist/generated/prisma/runtime/library.js:133:8120)\n    at async Object.updateUser (/app/dist/src/services/user.service.js:659:12)\n    at async /app/dist/src/controllers/user.controller.js:98:20",
        "name": "ConflictError"
    }
}
所以需要調整 location 的限制
