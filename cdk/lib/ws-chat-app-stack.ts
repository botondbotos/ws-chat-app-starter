import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Construct } from 'constructs';

export class WsChatAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB table to track active WebSocket connections
    const connectionsTable = new dynamodb.Table(this, 'ConnectionsTable', {
      partitionKey: { name: 'connectionId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // $connect — stores the new connectionId
    const connectHandler = new lambda.Function(this, 'ConnectHandler', {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/connect'),
      environment: { TABLE_NAME: connectionsTable.tableName },
    });
    connectionsTable.grantWriteData(connectHandler);

    // $disconnect — removes the connectionId
    const disconnectHandler = new lambda.Function(this, 'DisconnectHandler', {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/disconnect'),
      environment: { TABLE_NAME: connectionsTable.tableName },
    });
    connectionsTable.grantWriteData(disconnectHandler);

    // sendmessage — broadcasts to all other connections
    const sendMessageHandler = new lambda.Function(this, 'SendMessageHandler', {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/sendmessage'),
      environment: {
        TABLE_NAME: connectionsTable.tableName,
        ...(process.env.APIGW_MANAGEMENT_ENDPOINT
          ? { APIGW_MANAGEMENT_ENDPOINT: process.env.APIGW_MANAGEMENT_ENDPOINT }
          : {}),
      },
    });
    connectionsTable.grantReadData(sendMessageHandler);

    // $default — returns connection info to the caller
    const defaultHandler = new lambda.Function(this, 'DefaultHandler', {
      runtime: lambda.Runtime.NODEJS_24_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/default'),
      environment: {
        ...(process.env.APIGW_MANAGEMENT_ENDPOINT
          ? { APIGW_MANAGEMENT_ENDPOINT: process.env.APIGW_MANAGEMENT_ENDPOINT }
          : {}),
      },
    });

    // WebSocket API
    const webSocketApi = new apigwv2.WebSocketApi(this, 'ChatApi', {
      apiName: 'chat-app-tutorial',
      connectRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration('ConnectIntegration', connectHandler),
      },
      disconnectRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration('DisconnectIntegration', disconnectHandler),
      },
      defaultRouteOptions: {
        integration: new integrations.WebSocketLambdaIntegration('DefaultIntegration', defaultHandler),
      },
    });

    const stage = new apigwv2.WebSocketStage(this, 'ProductionStage', {
      webSocketApi,
      stageName: 'production',
      autoDeploy: true,
    });

    // Grant sendmessage and defaultHandler permission to post back to connections
    stage.grantManagementApiAccess(sendMessageHandler);
    stage.grantManagementApiAccess(defaultHandler);

    // Custom sendmessage route
    webSocketApi.addRoute('sendmessage', {
      integration: new integrations.WebSocketLambdaIntegration('SendMessageIntegration', sendMessageHandler),
    });

    new cdk.CfnOutput(this, 'WebSocketUrl', {
      value: stage.url,
      description: 'WebSocket API URL',
    });
  }
}
