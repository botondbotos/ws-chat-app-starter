# WebSocket Chat App — CDK Starter

A serverless WebSocket chat application deployed on AWS using CDK. Clients connect via API Gateway WebSocket API; messages are broadcast to all other connected clients through Lambda functions backed by DynamoDB.

## Architecture

```
Client ──── API Gateway (WebSocket) ──┬── $connect     → Lambda → DynamoDB (store connectionId)
                                      ├── $disconnect  → Lambda → DynamoDB (remove connectionId)
                                      ├── sendmessage  → Lambda → broadcast to all other connections
                                      └── $default     → Lambda → return connection info
```

**AWS services used:**
- API Gateway v2 (WebSocket API)
- Lambda (Node.js 24.x)
- DynamoDB (stores active connection IDs)

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [AWS CDK](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html) v2
- AWS credentials configured (`aws configure` or environment variables)

## Deploy

```bash
cd cdk
npm install
npm run build
npx cdk bootstrap   # first time only
npx cdk deploy
```

The WebSocket URL is printed as a stack output after deployment:

```
Outputs:
WsChatAppStack.WebSocketUrl = wss://<id>.execute-api.<region>.amazonaws.com/production
```

## Test

Connect with any WebSocket client (e.g. [`wscat`](https://github.com/websockets/wscat)):

```bash
npx wscat -c wss://<id>.execute-api.<region>.amazonaws.com/production
```

Send a message to all other connected clients:

```json
{"action": "sendmessage", "message": "hello!"}
```

## Teardown

```bash
npx cdk destroy
```

## Project structure

```
cdk/
├── bin/app.ts               # CDK app entry point
├── lib/ws-chat-app-stack.ts # Stack definition
└── lambda/
    ├── connect/             # $connect route handler
    ├── disconnect/          # $disconnect route handler
    ├── sendmessage/         # sendmessage route handler (broadcasts)
    └── default/             # $default route handler
```
