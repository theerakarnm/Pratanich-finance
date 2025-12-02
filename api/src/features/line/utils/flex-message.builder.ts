import type {
  FlexMessage,
  FlexBox,
  FlexComponent,
  FlexText,
  FlexButton,
  FlexImage,
  FlexSeparator,
  FlexSpacer,
  FlexAction,
} from '../line.types';
import { LineMessageError } from '../line.errors';

/**
 * FlexMessageBuilder - A fluent API for building LINE Flex Messages
 * 
 * Usage:
 * const flexMessage = FlexMessageBuilder.createBubble()
 *   .setHeader([builder.addText('Header Text', { weight: 'bold' })])
 *   .setBody([builder.addText('Body content')])
 *   .build();
 */
export class FlexMessageBuilder {
  private message: Partial<FlexMessage>;

  private constructor() {
    this.message = {
      type: 'bubble',
    };
  }

  /**
   * Create a new bubble-type flex message builder
   */
  static createBubble(): FlexMessageBuilder {
    return new FlexMessageBuilder();
  }

  /**
   * Set the header section of the flex message
   */
  setHeader(contents: FlexComponent[]): FlexMessageBuilder {
    this.message.header = this.createBox('vertical', contents);
    return this;
  }

  /**
   * Set the body section of the flex message
   */
  setBody(contents: FlexComponent[]): FlexMessageBuilder {
    this.message.body = this.createBox('vertical', contents);
    return this;
  }

  /**
   * Set the footer section of the flex message
   */
  setFooter(contents: FlexComponent[]): FlexMessageBuilder {
    this.message.footer = this.createBox('vertical', contents);
    return this;
  }

  /**
   * Set the hero section (typically an image) of the flex message
   */
  setHero(component: FlexComponent): FlexMessageBuilder {
    this.message.hero = component;
    return this;
  }

  /**
   * Create a text component
   */
  addText(
    text: string,
    options?: {
      size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | '3xl' | '4xl' | '5xl';
      weight?: 'regular' | 'bold';
      color?: string;
      align?: 'start' | 'end' | 'center';
      wrap?: boolean;
      maxLines?: number;
      flex?: number;
      margin?: string;
      gravity?: 'top' | 'bottom' | 'center';
    }
  ): FlexText {
    return {
      type: 'text',
      text,
      ...options,
    };
  }

  /**
   * Create a button component with an action
   */
  addButton(
    label: string,
    action: {
      type: 'postback' | 'uri' | 'message';
      data?: string;
      uri?: string;
      text?: string;
      displayText?: string;
    },
    options?: {
      style?: 'primary' | 'secondary' | 'link';
      color?: string;
      height?: 'sm' | 'md';
      margin?: string;
      flex?: number;
      gravity?: 'top' | 'bottom' | 'center';
    }
  ): FlexButton {
    const flexAction: FlexAction = {
      label,
      ...action,
    };

    return {
      type: 'button',
      action: flexAction,
      ...options,
    };
  }

  /**
   * Create an image component
   */
  addImage(
    url: string,
    options?: {
      size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | '3xl' | '4xl' | '5xl' | 'full';
      aspectRatio?: string;
      aspectMode?: 'cover' | 'fit';
      align?: 'start' | 'end' | 'center';
      gravity?: 'top' | 'bottom' | 'center';
      margin?: string;
      flex?: number;
      backgroundColor?: string;
    }
  ): FlexImage {
    return {
      type: 'image',
      url,
      ...options,
    };
  }

  /**
   * Create a separator component
   */
  addSeparator(options?: { margin?: string; color?: string }): FlexSeparator {
    return {
      type: 'separator',
      ...options,
    };
  }

  /**
   * Create a spacer component
   */
  addSpacer(size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'): FlexSpacer {
    return {
      type: 'spacer',
      size,
    };
  }

  /**
   * Create a box container with layout and contents
   */
  createBox(
    layout: 'horizontal' | 'vertical' | 'baseline',
    contents: FlexComponent[],
    options?: {
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
  ): FlexBox {
    return {
      type: 'box',
      layout,
      contents,
      ...options,
    };
  }

  /**
   * Validate and build the final flex message
   * @throws {LineMessageError} if validation fails
   */
  build(): FlexMessage {
    // Validate required fields
    if (!this.message.type) {
      throw new LineMessageError('Flex message type is required');
    }

    // Validate that at least one section exists
    if (!this.message.header && !this.message.body && !this.message.footer && !this.message.hero) {
      throw new LineMessageError(
        'Flex message must have at least one section (header, hero, body, or footer)'
      );
    }

    // Validate box contents
    this.validateBox(this.message.header, 'header');
    this.validateBox(this.message.body, 'body');
    this.validateBox(this.message.footer, 'footer');

    return this.message as FlexMessage;
  }

  /**
   * Validate a flex box structure
   */
  private validateBox(box: FlexBox | undefined, sectionName: string): void {
    if (!box) return;

    if (box.type !== 'box') {
      throw new LineMessageError(`${sectionName} must be a box component`);
    }

    if (!box.layout) {
      throw new LineMessageError(`${sectionName} box must have a layout`);
    }

    if (!Array.isArray(box.contents)) {
      throw new LineMessageError(`${sectionName} box must have contents array`);
    }

    // Validate each component in the box
    box.contents.forEach((component, index) => {
      this.validateComponent(component, `${sectionName}[${index}]`);
    });
  }

  /**
   * Validate a flex component
   */
  private validateComponent(component: FlexComponent, path: string): void {
    if (!component.type) {
      throw new LineMessageError(`Component at ${path} must have a type`);
    }

    switch (component.type) {
      case 'text':
        if (!(component as FlexText).text) {
          throw new LineMessageError(`Text component at ${path} must have text property`);
        }
        break;
      case 'button':
        const button = component as FlexButton;
        if (!button.action) {
          throw new LineMessageError(`Button component at ${path} must have an action`);
        }
        if (!button.action.type) {
          throw new LineMessageError(`Button action at ${path} must have a type`);
        }
        break;
      case 'image':
        if (!(component as FlexImage).url) {
          throw new LineMessageError(`Image component at ${path} must have a url property`);
        }
        break;
      case 'box':
        this.validateBox(component as FlexBox, path);
        break;
      case 'separator':
      case 'spacer':
        // These components don't have required fields beyond type
        break;
      default:
        throw new LineMessageError(`Unknown component type at ${path}: ${(component as any).type}`);
    }
  }
}
