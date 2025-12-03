import { config } from '../../core/config';
import { LineMessagingClient } from './line.client';

export const lineClient = new LineMessagingClient(
  config.line.channelAccessToken,
  config.line.messagingApiUrl
);
