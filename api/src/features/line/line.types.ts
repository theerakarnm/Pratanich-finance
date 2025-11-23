// LINE Webhook Body
export interface LineWebhookBody {
  destination: string;
  events: LineEvent[];
}

// Base Event Types
export type LineEvent = 
  | LineMessageEvent 
  | LinePostbackEvent 
  | LineFollowEvent 
  | LineUnfollowEvent;

export interface BaseLineEvent {
  type: string;
  timestamp: number;
  source: LineEventSource;
  replyToken: string;
  mode: 'active' | 'standby';
}

export interface LineEventSource {
  type: 'user' | 'group' | 'room';
  userId: string;
  groupId?: string;
  roomId?: string;
}

// Message Event
export interface LineMessageEvent extends BaseLineEvent {
  type: 'message';
  message: LineMessage;
}

export type LineMessage = 
  | LineTextMessage 
  | LineImageMessage 
  | LineStickerMessage;

export interface LineTextMessage {
  type: 'text';
  id: string;
  text: string;
}

export interface LineImageMessage {
  type: 'image';
  id: string;
  contentProvider: {
    type: 'line' | 'external';
    originalContentUrl?: string;
    previewImageUrl?: string;
  };
}

export interface LineStickerMessage {
  type: 'sticker';
  id: string;
  packageId: string;
  stickerId: string;
}

// Postback Event
export interface LinePostbackEvent extends BaseLineEvent {
  type: 'postback';
  postback: {
    data: string;
    params?: Record<string, any>;
  };
}

// Follow/Unfollow Events
export interface LineFollowEvent extends BaseLineEvent {
  type: 'follow';
}

export interface LineUnfollowEvent extends BaseLineEvent {
  type: 'unfollow';
}

// Reply Messages
export interface LineReplyMessage {
  type: 'text' | 'flex' | 'template' | 'image';
  text?: string;
  altText?: string;
  contents?: FlexMessage;
  [key: string]: any;
}

// Flex Message Types
export interface FlexMessage {
  type: 'bubble' | 'carousel';
  hero?: FlexComponent;
  header?: FlexBox;
  body?: FlexBox;
  footer?: FlexBox;
  styles?: FlexStyles;
}

export interface FlexBox {
  type: 'box';
  layout: 'horizontal' | 'vertical' | 'baseline';
  contents: FlexComponent[];
  spacing?: string;
  margin?: string;
  paddingAll?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingStart?: string;
  paddingEnd?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: string;
  cornerRadius?: string;
  width?: string;
  height?: string;
  flex?: number;
  justifyContent?: string;
  alignItems?: string;
}

export type FlexComponent = 
  | FlexText 
  | FlexButton 
  | FlexImage 
  | FlexSeparator 
  | FlexSpacer 
  | FlexBox;

export interface FlexText {
  type: 'text';
  text: string;
  size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | '3xl' | '4xl' | '5xl';
  weight?: 'regular' | 'bold';
  color?: string;
  align?: 'start' | 'end' | 'center';
  gravity?: 'top' | 'bottom' | 'center';
  wrap?: boolean;
  maxLines?: number;
  flex?: number;
  margin?: string;
  position?: 'relative' | 'absolute';
  offsetTop?: string;
  offsetBottom?: string;
  offsetStart?: string;
  offsetEnd?: string;
}

export interface FlexButton {
  type: 'button';
  action: FlexAction;
  flex?: number;
  margin?: string;
  height?: 'sm' | 'md';
  style?: 'primary' | 'secondary' | 'link';
  color?: string;
  gravity?: 'top' | 'bottom' | 'center';
}

export interface FlexAction {
  type: 'postback' | 'uri' | 'message';
  label?: string;
  data?: string;
  uri?: string;
  text?: string;
  displayText?: string;
}

export interface FlexImage {
  type: 'image';
  url: string;
  flex?: number;
  margin?: string;
  align?: 'start' | 'end' | 'center';
  gravity?: 'top' | 'bottom' | 'center';
  size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | '3xl' | '4xl' | '5xl' | 'full';
  aspectRatio?: string;
  aspectMode?: 'cover' | 'fit';
  backgroundColor?: string;
}

export interface FlexSeparator {
  type: 'separator';
  margin?: string;
  color?: string;
}

export interface FlexSpacer {
  type: 'spacer';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
}

export interface FlexStyles {
  header?: FlexBlockStyle;
  hero?: FlexBlockStyle;
  body?: FlexBlockStyle;
  footer?: FlexBlockStyle;
}

export interface FlexBlockStyle {
  backgroundColor?: string;
  separator?: boolean;
  separatorColor?: string;
}

// Postback Data
export interface PostbackData {
  action: string;
  params?: Record<string, any>;
}

// Event Context for Handlers
export interface EventContext {
  replyToken: string;
  userId: string;
  timestamp: number;
}
