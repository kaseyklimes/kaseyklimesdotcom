# Portfolio Website

A high-performance personal portfolio website built with Next.js, featuring a responsive grid-based layout and support for various content types including work experience, blog posts, photography, and projects.

## Features

- Server-side rendering for optimal performance
- Responsive masonry grid layout
- Markdown content management
- Image optimization
- Category-based content organization
- Related content suggestions
- Mobile-friendly design

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Content**: Markdown with YAML frontmatter
- **Grid System**: react-masonry-css
- **Image Optimization**: Next/Image
- **Date Formatting**: date-fns
- **Markdown Processing**: react-markdown

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm (comes with Node.js)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd portfolio-website
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

## Content Management

### File Structure

Content is organized in the following directory structure:
```
content/
  blog/
    post-1.md
    post-2.md
  work/
    job-1.md
    job-2.md
  photography/
    collection-1.md
    collection-2.md
  projects/
    project-1.md
    project-2.md
```

### Content Format

Create new content files using the following format:

```yaml
---
title: "Your Title"
category: "blog" # blog, work, photography, or projects
date: "2024-02-13"
stars: 4 # 1-5 rating
heroImage: "/images/your-image.jpg"
description: "Brief description of your content"
---

Your markdown content here...
```

### Adding Images

1. Place images in the `public/images` directory
2. Reference images in content using the path: `/images/your-image.jpg`

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Environment Variables

Create a `.env.local` file with the following variables:
```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Performance Optimization

The website implements several performance optimizations:

- Server-side rendering
- Static page generation
- Image optimization
- Typography optimization
- Responsive loading
- Code splitting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
