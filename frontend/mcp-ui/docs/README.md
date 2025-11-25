# MCP-UI Documentation

This directory contains the enhanced documentation for MCP UI, built with VitePress and featuring a professional, modern design.

## 🎨 Design Enhancements

The documentation has been significantly improved with:

### Visual Design
- **Modern Color Scheme**: Blue to green gradient branding with excellent contrast
- **Professional Typography**: Inter font family with proper font weights and spacing
- **Enhanced Shadows**: Subtle depth and visual hierarchy
- **Smooth Animations**: Fade-in effects and hover transitions
- **Responsive Design**: Mobile-first approach with breakpoint optimizations

### Content Improvements
- **Video Integration**: Demo video from README prominently featured on landing page
- **Rich Feature Cards**: Six detailed feature cards with icons and descriptions
- **Code Examples**: Syntax-highlighted examples with proper formatting
- **Call-to-Action Buttons**: Professional buttons with hover effects
- **Better Navigation**: Improved sidebar with collapsible sections

### Technical Features
- **Local Search**: Built-in search functionality
- **Dark Mode**: Full dark mode support with proper color schemes
- **SEO Optimization**: Meta tags, OpenGraph, and Twitter cards
- **Performance**: Optimized loading and rendering
- **Accessibility**: Proper ARIA labels and keyboard navigation

## 🚀 Getting Started

To run the documentation locally:

```bash
cd docs
npm install
npm run dev
```

To build for production:

```bash
npm run build
```

## 📁 Structure

```
docs/
├── src/
│   ├── .vitepress/
│   │   ├── config.ts          # VitePress configuration
│   │   └── theme/
│   │       ├── index.ts       # Custom theme setup
│   │       └── custom.css     # Enhanced styling
│   ├── guide/                 # Documentation pages
│   ├── public/                # Static assets
│   │   ├── logo.svg          # Brand logo
│   │   └── favicon.png       # Site favicon
│   └── index.md              # Enhanced landing page
└── README.md                 # This file
```

## 🎯 Key Features

### Landing Page
- Hero section with gradient text and compelling tagline
- Demo video integration from the main README
- Six feature cards highlighting key capabilities
- Code examples showing quick usage
- Call-to-action buttons linking to guides and demos

### Navigation
- Clean, organized sidebar with collapsible sections
- Breadcrumb navigation
- "Edit on GitHub" links
- Social media links (GitHub, npm)

### Content
- Professional typography with proper hierarchy
- Enhanced code blocks with syntax highlighting
- Improved tables with hover effects
- Styled blockquotes and badges
- Responsive images and media

### Performance
- Optimized bundle size
- Fast loading times
- Efficient caching
- Mobile-optimized assets

## 🔧 Customization

The documentation uses CSS custom properties for easy theming:

```css
:root {
  --vp-c-brand-1: #3c82f6;      /* Primary brand color */
  --vp-c-brand-2: #2563eb;      /* Secondary brand color */
  --vp-c-accent-1: #10b981;     /* Accent color */
  /* ... more variables */
}
```

## 📝 Content Guidelines

When adding new content:

1. Use proper markdown headers (##, ###) for structure
2. Include code examples with language tags
3. Add screenshots or diagrams where helpful
4. Keep paragraphs concise and scannable
5. Use callouts for important information

## 🤝 Contributing

To contribute to the documentation:

1. Edit files in the `src/` directory
2. Test locally with `npm run dev`
3. Build with `npm run build` to verify
4. Submit a pull request

The documentation automatically rebuilds on changes to the main branch. 