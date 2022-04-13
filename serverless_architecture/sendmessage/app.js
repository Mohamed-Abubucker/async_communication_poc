// Copyright 2018-2020Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10', region: process.env.AWS_REGION });

const { TABLE_NAME, MESSAGE_HISTORY } = process.env;

exports.handler = async event => {
  let connectionData;

  try {
    connectionData = await ddb.scan({ TableName: TABLE_NAME, ProjectionExpression: 'connectionId, clientId' }).promise();
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }

  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: event.requestContext.domainName + '/' + event.requestContext.stage
  });

  const postData = JSON.parse(event.body).data;
  const { data, clientId, timestamp, userId } = postData;

  // TODO: decrypt the message using AWS KMS

  // TODO: verify the message data

  const verifiedMessage = data + ': VERIFIED';

  // insert the message into the message history table

  try {
    await ddb.put({
      TableName: MESSAGE_HISTORY,
      Item: {
        messageId: `${timestamp}_${userId}_${clientId}`,
        userId,
        clientId,
        timestamp,
        data: verifiedMessage
      }
    }).promise();
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }


  // getting connection id from the database
  const receiver = connectionData.Items.find(item => item.clientId === clientId);

  if (!receiver) {
    return { statusCode: 500, body: 'receiver not found!' };
  }

  const messageData = { data: verifiedMessage, clientId, timestamp, userId };

  try {
    await sendMessage(apigwManagementApi, receiver.connectionId, messageData);
  } catch (e) {
    return { statusCode: 500, body: e.stack };
  }

  return { statusCode: 200, body: 'Data sent.' };
};


const sendMessage = (apigwManagementApi, connectionId, postData) => {
  try {
    await apigwManagementApi.postToConnection({ ConnectionId: connectionId, Data: postData }).promise();
  } catch (e) {
    if (e.statusCode === 410) {
      console.log(`Found stale connection, deleting ${connectionId}`);
      await ddb.delete({ TableName: TABLE_NAME, Key: { connectionId } }).promise();
    } else {
      throw e;
    }
  }
}