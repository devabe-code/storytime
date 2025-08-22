# Storytime - E-Book Reader

A modern e-book reader built with Next.js and Foliate-js, supporting EPUB, MOBI, AZW3, FB2, and CBZ formats.

## Features

- **Multiple Format Support**: EPUB, MOBI, AZW3, FB2, CBZ
- **Reading Modes**: Paginated and scrolled layouts
- **Customizable Reading Experience**: 
  - Adjustable line spacing
  - Text justification options
  - Hyphenation settings
- **Table of Contents**: Navigate through book chapters
- **Book Metadata**: Display title, author, and cover
- **Keyboard Navigation**: Use arrow keys or h/l for navigation
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Mode Support**: Automatic theme switching

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd storytime
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Opening Books

1. **Pre-loaded Books**: The reader automatically loads books from the `/public/books/` directory
2. **Upload Books**: Click "Open Book" to upload your own e-book files
3. **Supported Formats**: EPUB, MOBI, AZW3, FB2, CBZ

### Reading Controls

- **Navigation**: Use the left/right arrow buttons or keyboard arrows
- **Sidebar**: Click the menu button to access reading settings and table of contents
- **Layout**: Switch between paginated and scrolled reading modes
- **Settings**: Adjust line spacing, text justification, and hyphenation

### Keyboard Shortcuts

- `←` or `h`: Previous page/section
- `→` or `l`: Next page/section
- `Esc`: Close sidebar

## Project Structure

```
storytime/
├── app/                    # Next.js app directory
│   ├── page.tsx          # Main page with reader
│   └── layout.tsx        # App layout
├── components/            # React components
│   ├── FoliateReader.tsx # Main reader component
│   └── ui/               # UI components
├── public/                # Static assets
│   ├── books/            # Sample e-books
│   └── foliate-js/       # Foliate-js library files
└── lib/                   # Utility functions
```

## Components

### FoliateReader

The main reader component that integrates Foliate-js with React. Features include:

- Book loading and rendering
- Reading progress tracking
- Settings sidebar
- Table of contents navigation
- Responsive design

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **E-Book Engine**: Foliate-js
- **UI Components**: Radix UI, Lucide React icons
- **State Management**: React hooks

## Customization

### Adding New Books

Place e-book files in the `/public/books/` directory. The reader will automatically detect and load them.

### Styling

The reader uses Tailwind CSS for styling. Customize the appearance by modifying the component classes or extending the Tailwind configuration.

### Reading Preferences

Reading preferences (layout, spacing, etc.) are managed through React state and can be extended to include persistence using localStorage or a backend service.

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Acknowledgments

- [Foliate-js](https://github.com/johnfactotum/foliate-js) - The e-book rendering engine
- [Next.js](https://nextjs.org/) - The React framework
- [Tailwind CSS](https://tailwindcss.com/) - The CSS framework
