export const remoteCardDefinition = {
  tagName: 'ui-card',
};

export const remoteButtonDefinition = {
  tagName: 'ui-button',
  remoteAttributes: ['label'],
  remoteEvents: ['click', 'press'],
};

export const remoteTextDefinition = {
  tagName: 'ui-text',
  remoteAttributes: ['content'],
};

export const remoteStackDefinition = {
  tagName: 'ui-stack',
  remoteAttributes: ['direction', 'spacing', 'align', 'justify'],
};

export const remoteImageDefinition = {
  tagName: 'ui-image',
  remoteAttributes: ['src', 'alt', 'width', 'height'],
};
