/* eslint-disable @typescript-eslint/no-explicit-any */

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Separator from '@radix-ui/react-separator';
import * as Label from '@radix-ui/react-label';
import type { ComponentLibrary } from '@mcp-ui/client';

// Radix UI Text component using Label primitive
const RadixText = React.forwardRef<
  HTMLLabelElement,
  {
    content?: string;
    children?: React.ReactNode;
    htmlFor?: string;
    [key: string]: any;
  }
>(({ content, children, htmlFor, ...props }, ref) => {
  return React.createElement(
    Label.Root,
    {
      ref,
      htmlFor,
      style: {
        fontSize: '15px',
        fontWeight: '600',
        lineHeight: '1.4',
        color: '#6c2bd9',
        display: 'block',
        marginBottom: '8px',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        textShadow: '0 1px 2px rgba(108, 43, 217, 0.1)',
      },
      ...props,
    },
    content || children,
  );
});
RadixText.displayName = 'RadixText';

// Custom button using Radix styling patterns
const RadixButton = React.forwardRef<
  HTMLButtonElement,
  {
    label?: string;
    onPress?: (event?: React.MouseEvent<HTMLButtonElement>) => void;
    onClick?: (event?: React.MouseEvent<HTMLButtonElement>) => void;
    children?: React.ReactNode;
    variant?: 'solid' | 'soft' | 'outline';
    [key: string]: any;
  }
>(({ label, onPress, onClick, children, variant = 'solid', ...props }, ref) => {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    console.log('RadixButton clicked, calling handlers:', {
      label,
      variant,
      onPress: !!onPress,
      onClick: !!onClick,
    });

    // Call onPress if it exists (from remote press event)
    // Important: Don't pass the event object as it cannot be cloned for postMessage
    if (onPress) {
      onPress();
    }

    // Call onClick if it exists (standard React handler)
    if (onClick) {
      onClick(event);
    }
  };

  const getButtonStyles = () => {
    const baseStyles = {
      all: 'unset' as const,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '12px',
      padding: '0 20px',
      fontSize: '14px',
      lineHeight: '1',
      fontWeight: '600',
      height: '40px',
      cursor: 'pointer',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      border: '2px solid transparent',
      outline: 'none',
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      textTransform: 'none' as const,
      position: 'relative' as const,
      overflow: 'hidden' as const,
    };

    switch (variant) {
      case 'soft':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, #f3e8ff, #e5d3ff)',
          color: '#6c2bd9',
          boxShadow:
            '0 4px 12px rgba(108, 43, 217, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.4)',
        };
      case 'outline':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7))',
          color: '#6c2bd9',
          borderColor: '#6c2bd9',
          borderWidth: '2px',
          borderStyle: 'solid',
          boxShadow: '0 2px 8px rgba(108, 43, 217, 0.1)',
        };
      default: // solid
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, #6c2bd9, #8b5cf6)',
          color: 'white',
          boxShadow: '0 6px 20px rgba(108, 43, 217, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.2)',
        };
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const target = e.currentTarget;
    switch (variant) {
      case 'soft':
        target.style.background = 'linear-gradient(135deg, #ede9fe, #ddd6fe)';
        target.style.transform = 'translateY(-2px)';
        target.style.boxShadow =
          '0 8px 25px rgba(108, 43, 217, 0.25), inset 0 1px 2px rgba(255, 255, 255, 0.4)';
        break;
      case 'outline':
        target.style.background = 'linear-gradient(135deg, #f3f4f6, #e5e7eb)';
        target.style.transform = 'translateY(-2px)';
        target.style.boxShadow = '0 6px 20px rgba(108, 43, 217, 0.2)';
        break;
      default:
        target.style.background = 'linear-gradient(135deg, #7c3aed, #9333ea)';
        target.style.transform = 'translateY(-2px)';
        target.style.boxShadow =
          '0 10px 30px rgba(108, 43, 217, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.2)';
        break;
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    const target = e.currentTarget;
    const styles = getButtonStyles();
    target.style.background = styles.background as string;
    target.style.transform = 'translateY(0)';
    target.style.boxShadow = styles.boxShadow as string;
  };

  const displayText = label || children || 'Button';

  return React.createElement(
    'button',
    {
      ref,
      onClick: handleClick,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      style: getButtonStyles(),
      ...props,
    },
    displayText,
  );
});
RadixButton.displayName = 'RadixButton';

// Radix Stack component using CSS Flexbox
const RadixStack = React.forwardRef<
  HTMLDivElement,
  {
    direction?: string;
    spacing?: string;
    children?: React.ReactNode;
    align?: string;
    justify?: string;
    [key: string]: any;
  }
>(
  (
    {
      direction = 'vertical',
      spacing = '16',
      align = 'stretch',
      justify = 'flex-start',
      children,
      ...props
    },
    ref,
  ) => {
    return React.createElement(
      'div',
      {
        ref,
        style: {
          display: 'flex',
          flexDirection: direction === 'horizontal' ? 'row' : 'column',
          gap: `${spacing}px`,
          alignItems: align,
          justifyContent: justify,
          padding: '20px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #faf5ff, #f3e8ff)',
          border: '2px solid #e5d3ff',
          boxShadow: '0 8px 32px rgba(108, 43, 217, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.6)',
          position: 'relative' as const,
        },
        ...props,
      },
      children,
    );
  },
);
RadixStack.displayName = 'RadixStack';

// Radix Image component with enhanced styling
const RadixImage = React.forwardRef<
  HTMLImageElement,
  {
    src?: string;
    alt?: string;
    width?: string;
    height?: string;
    children?: React.ReactNode;
    [key: string]: any;
  }
>(({ src, alt, width, height, children, ...props }, ref) => {
  // Explicitly ignore children since img elements can't have them
  void children;

  return React.createElement('img', {
    ref,
    src,
    alt,
    width,
    height,
    style: {
      maxWidth: '100%',
      height: 'auto',
      borderRadius: '16px',
      border: '3px solid #e5d3ff',
      boxShadow: '0 12px 32px rgba(108, 43, 217, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.6)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      background: 'linear-gradient(135deg, #faf5ff, #f3e8ff)',
      padding: '4px',
      display: 'block',
    },
    onMouseEnter: (e: React.MouseEvent<HTMLImageElement>) => {
      const target = e.currentTarget;
      target.style.transform = 'scale(1.02) translateY(-4px)';
      target.style.boxShadow =
        '0 20px 40px rgba(108, 43, 217, 0.25), inset 0 1px 2px rgba(255, 255, 255, 0.6)';
      target.style.borderColor = '#c084fc';
    },
    onMouseLeave: (e: React.MouseEvent<HTMLImageElement>) => {
      const target = e.currentTarget;
      target.style.transform = 'scale(1) translateY(0)';
      target.style.boxShadow =
        '0 12px 32px rgba(108, 43, 217, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.6)';
      target.style.borderColor = '#e5d3ff';
    },
    ...props,
  });
});
RadixImage.displayName = 'RadixImage';

// Radix Separator component
const RadixSeparator = React.forwardRef<
  HTMLDivElement,
  {
    orientation?: string;
    decorative?: boolean;
    [key: string]: any;
  }
>(({ orientation = 'horizontal', decorative = true, ...props }, ref) => {
  return React.createElement(Separator.Root, {
    ref,
    orientation: orientation as 'horizontal' | 'vertical',
    decorative,
    style: {
      background: 'linear-gradient(90deg, transparent, #c084fc, transparent)',
      margin: orientation === 'horizontal' ? '16px 0' : '0 16px',
      borderRadius: '1px',
      ...(orientation === 'horizontal'
        ? { height: '2px', width: '100%' }
        : { width: '2px', height: '30px' }),
    },
    ...props,
  });
});
RadixSeparator.displayName = 'RadixSeparator';

// Radix Dialog component - converted to React.createElement to avoid JSX issues
const RadixDialog = React.forwardRef<
  HTMLDivElement,
  {
    trigger?: string;
    title?: string;
    description?: string;
    children?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    [key: string]: any;
  }
>(
  (
    {
      trigger = 'Open Dialog',
      title = 'Dialog Title',
      description,
      children,
      open,
      onOpenChange,
      ...props
    },
    ref,
  ) => {
    return React.createElement(
      Dialog.Root,
      { open, onOpenChange },
      React.createElement(
        Dialog.Trigger,
        { asChild: true },
        React.createElement(
          'button',
          {
            style: {
              all: 'unset',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '12px',
              padding: '0 20px',
              fontSize: '14px',
              lineHeight: '1',
              fontWeight: '600',
              height: '40px',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #6c2bd9, #8b5cf6)',
              color: 'white',
              border: 'none',
              boxShadow: '0 6px 20px rgba(108, 43, 217, 0.3)',
              transition: 'all 0.2s ease',
            },
          },
          trigger,
        ),
      ),
      React.createElement(
        Dialog.Portal,
        {},
        React.createElement(Dialog.Overlay, {
          style: {
            backgroundColor: 'rgba(108, 43, 217, 0.4)',
            position: 'fixed',
            inset: 0,
            animation: 'fadeIn 150ms ease-out',
          },
        }),
        React.createElement(
          Dialog.Content,
          {
            ref,
            style: {
              backgroundColor: 'white',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #ffffff, #faf5ff)',
              border: '2px solid #e5d3ff',
              boxShadow: '0 20px 50px rgba(108, 43, 217, 0.2), 0 10px 30px rgba(108, 43, 217, 0.1)',
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90vw',
              maxWidth: '500px',
              maxHeight: '85vh',
              padding: '32px',
              animation: 'contentShow 150ms ease-out',
            },
            ...props,
          },
          React.createElement(
            Dialog.Title,
            {
              style: {
                margin: 0,
                fontWeight: '700',
                fontSize: '20px',
                lineHeight: '1.2',
                color: '#6c2bd9',
                marginBottom: description ? '12px' : '20px',
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              },
            },
            title,
          ),
          description &&
            React.createElement(
              Dialog.Description,
              {
                style: {
                  margin: 0,
                  fontSize: '15px',
                  lineHeight: '1.5',
                  color: '#64748b',
                  marginBottom: '20px',
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                },
              },
              description,
            ),
          React.createElement('div', { style: { marginTop: '20px' } }, children),
          React.createElement(
            Dialog.Close,
            { asChild: true },
            React.createElement(
              'button',
              {
                style: {
                  all: 'unset',
                  fontFamily: 'inherit',
                  borderRadius: '50%',
                  height: '32px',
                  width: '32px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease',
                  background: 'rgba(148, 163, 184, 0.1)',
                  ':hover': {
                    background: 'rgba(148, 163, 184, 0.2)',
                    color: '#64748b',
                  },
                },
                'aria-label': 'Close',
              },
              '×',
            ),
          ),
        ),
      ),
    );
  },
);
RadixDialog.displayName = 'RadixDialog';

export const radixComponentLibrary: ComponentLibrary = {
  name: 'radix',
  elements: [
    {
      tagName: 'ui-text',
      component: RadixText,
      propMapping: {
        content: 'content',
        htmlFor: 'htmlFor',
      },
      eventMapping: {},
    },
    {
      tagName: 'ui-button',
      component: RadixButton,
      propMapping: {
        label: 'label',
        variant: 'variant',
      },
      eventMapping: {
        press: 'onPress',
      },
    },
    {
      tagName: 'ui-stack',
      component: RadixStack,
      propMapping: {
        direction: 'direction',
        spacing: 'spacing',
        align: 'align',
        justify: 'justify',
      },
      eventMapping: {},
    },
    {
      tagName: 'ui-image',
      component: RadixImage,
      propMapping: {
        src: 'src',
        alt: 'alt',
        width: 'width',
        height: 'height',
      },
      eventMapping: {},
    },
    {
      tagName: 'ui-separator',
      component: RadixSeparator,
      propMapping: {
        orientation: 'orientation',
        decorative: 'decorative',
      },
      eventMapping: {},
    },
    {
      tagName: 'ui-dialog',
      component: RadixDialog,
      propMapping: {
        trigger: 'trigger',
        title: 'title',
        description: 'description',
        open: 'open',
      },
      eventMapping: {
        openChange: 'onOpenChange',
      },
    },
  ],
};
