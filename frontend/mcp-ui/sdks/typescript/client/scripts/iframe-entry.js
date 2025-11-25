import { RemoteElement, RemoteMutationObserver } from '@remote-dom/core/elements';
import { ThreadNestedIframe } from '@quilted/threads';

new ThreadNestedIframe({
  exports: {
    async render(options, receiver, hostApi) {
      if (options.remoteElements) {
        options.remoteElements.forEach((def) => {
          if (customElements.get(def.tagName)) return;

          const remoteElement = class extends RemoteElement {
            static get remoteAttributes() {
              return def.remoteAttributes || [];
            }
            static get remoteEvents() {
              return def.remoteEvents || [];
            }
          };
          // Give the class a name for easier debugging
          Object.defineProperty(remoteElement, 'name', {
            value: `Remote${def.tagName.replace(/(^\w|-\w)/g, (c) =>
              c.replace('-', '').toUpperCase(),
            )}`,
          });

          customElements.define(def.tagName, remoteElement);
        });
      }

      const root = document.querySelector('#root');
      const observer = new RemoteMutationObserver(receiver);
      observer.observe(root);

      const { code } = options;

      if (code && root) {
        try {
          const scriptFunction = new Function('root', 'console', code);
          scriptFunction(root, console);
        } catch (e) {
          console.error('Error executing remote script:', e);
        }
      }
    },
  },
});
