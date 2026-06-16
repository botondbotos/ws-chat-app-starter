const { ApiGatewayManagementApiClient, PostToConnectionCommand, GetConnectionCommand } = require("@aws-sdk/client-apigatewaymanagementapi");

exports.handler = async function (event) {
  const connectionId = event.requestContext.connectionId;
  if (!connectionId) {
    console.log("Missing connectionId in requestContext");
    return { statusCode: 400 };
  }

  const managementEndpoint = process.env.APIGW_MANAGEMENT_ENDPOINT
    || ("https://" + event.requestContext.domainName + "/" + event.requestContext.stage);

  const callbackAPI = new ApiGatewayManagementApiClient({
    apiVersion: "2018-11-29",
    endpoint: managementEndpoint,
  });

  let connectionInfo;
  try {
    connectionInfo = await callbackAPI.send(new GetConnectionCommand({ ConnectionId: connectionId }));
  } catch (e) {
    console.log(e);
    return { statusCode: 500 };
  }

  connectionInfo.connectionID = connectionId;

  await callbackAPI.send(new PostToConnectionCommand({
    ConnectionId: connectionId,
    Data: "Use the sendmessage route to send a message. Your info:" + JSON.stringify(connectionInfo),
  }));

  return { statusCode: 200 };
};
