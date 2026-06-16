#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WsChatAppStack } from '../lib/ws-chat-app-stack';

const app = new cdk.App();
new WsChatAppStack(app, 'WsChatAppStack');
