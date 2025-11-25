export function postMessageToParent(message: any) {
  console.log('Sending message:', message);
  // @ts-expect-error - window is not typed correctly
  if (window.parent) {
    // @ts-expect-error - window is not typed correctly
    window.parent.postMessage(message, '*');
  }
}
