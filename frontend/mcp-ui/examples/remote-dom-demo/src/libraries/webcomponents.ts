class UIButton extends HTMLElement {
  static get observedAttributes() {
    return ['label'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const button = document.createElement('button');
    const label = this.getAttribute('label');
    button.textContent = label;
    button.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('press'));
    });
    this.shadowRoot?.appendChild(button);
  }

  attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
    if (name === 'label') {
      const button = this.shadowRoot?.querySelector('button');
      if (button) {
        button.textContent = newValue;
      }
    }
  }
}

class UIText extends HTMLElement {
  static get observedAttributes() {
    return ['content'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const p = document.createElement('p');
    p.textContent = this.getAttribute('content');
    this.shadowRoot?.appendChild(p);
  }

  attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
    if (name === 'content') {
      const p = this.shadowRoot?.querySelector('p');
      if (p) {
        p.textContent = newValue;
      }
    }
  }
}

class UIStack extends HTMLElement {
  static get observedAttributes() {
    return ['direction', 'spacing', 'align', 'justify'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const div = document.createElement('div');

    // Set initial styles
    this.updateStyles(div);

    const slot = document.createElement('slot');
    div.appendChild(slot);
    this.shadowRoot?.appendChild(div);
  }

  updateStyles(div: HTMLElement) {
    const direction = this.getAttribute('direction') || 'vertical';
    const spacing = this.getAttribute('spacing') || '8';
    const align = this.getAttribute('align') || 'stretch';
    const justify = this.getAttribute('justify') || 'flex-start';

    div.style.display = 'flex';
    div.style.flexDirection = direction === 'horizontal' ? 'row' : 'column';
    div.style.gap = `${spacing}px`;
    div.style.alignItems = align;
    div.style.justifyContent = justify;
  }

  attributeChangedCallback(_name: string, _oldValue: string, _newValue: string) {
    const div = this.shadowRoot?.querySelector('div');
    if (div) {
      this.updateStyles(div);
    }
  }
}

class UIImage extends HTMLElement {
  static get observedAttributes() {
    return ['src', 'alt', 'width', 'height'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const img = document.createElement('img');

    // Set initial attributes
    const src = this.getAttribute('src');
    const alt = this.getAttribute('alt');
    const width = this.getAttribute('width');
    const height = this.getAttribute('height');

    if (src) img.src = src;
    if (alt) img.alt = alt;
    if (width) img.width = parseInt(width);
    if (height) img.height = parseInt(height);

    // Add styling
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.borderRadius = '8px';
    img.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';

    this.shadowRoot?.appendChild(img);
  }

  attributeChangedCallback(name: string, _oldValue: string, newValue: string) {
    const img = this.shadowRoot?.querySelector('img');
    if (!img) return;

    switch (name) {
      case 'src':
        img.src = newValue;
        break;
      case 'alt':
        img.alt = newValue;
        break;
      case 'width':
        img.width = parseInt(newValue);
        break;
      case 'height':
        img.height = parseInt(newValue);
        break;
    }
  }
}

export function defineWebComponents() {
  if (!customElements.get('ui-button')) {
    customElements.define('ui-button', UIButton);
  }
  if (!customElements.get('ui-text')) {
    customElements.define('ui-text', UIText);
  }
  if (!customElements.get('ui-stack')) {
    customElements.define('ui-stack', UIStack);
  }
  if (!customElements.get('ui-image')) {
    customElements.define('ui-image', UIImage);
  }
}
