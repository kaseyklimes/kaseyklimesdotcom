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
  shelf/
    project-1.md
    project-2.md
```

### Content Format

Create new content files using the following format:

```yaml
---
title: "Your Title"
category: "blog" # blog, work, photography, shelf, or tweet
date: "2024-02-13" # supports: MM-DD-YYYY, MM-YYYY, YYYY, YYYY-YYYY, YYYY-present
stars: 4 # 1-5, controls column span in masonry grid
heroImage: "/images/your-image.jpg"
thumbnail: "/images/grid-thumb.jpg" # optional, falls back to heroImage
carousel: ["/images/a.jpg", "/images/b.jpg"] # optional, hero image carousel
carouselCaption: "Caption text" # optional
description: "Brief description"
location: "City, Country" # optional
tags: ["work", "design"] # for grid filtering
private: true # optional, hides from grid
clickThroughUrl: "https://..." # optional, links grid card externally
---

Your markdown content here...
```

### Adding Images

1. Place images in the `public/images` directory
2. Reference images in content using the path: `/images/your-image.jpg`

### Markdown Layout Features

The markdown renderer supports several layout extensions beyond standard markdown.

#### Side-by-side columns (`:::` + `|||`)

Use `:::` to open/close a column block, and `|||` to separate columns. Any markdown content works inside columns — blockquotes, images, text, etc.

```markdown
:::

> First quote here

|||

> Second quote alongside it

:::
```

This renders as a responsive grid (stacks on mobile, side-by-side on desktop). Add more `|||` separators for 3+ columns.

#### Structured columns (`:::` + `###` headers)

For structured multi-column layouts (like course outlines), `:::` blocks that contain `### ` headers are automatically split into columns — one per `### ` heading. These render with compact typography (text-xs).

```markdown
:::

### Column 1
#### Subheading
^^Body text here

### Column 2
#### Subheading
^^Body text here

:::
```

The `^^` prefix on lines is stripped during rendering (used to prevent markdown treating the line as a new paragraph).

#### Inline carousel

Embed an image carousel anywhere in the body content with `<carousel>` tags. List one image URL per line.

```markdown
<carousel>
/images/slide1.jpg
/images/slide2.jpg
/images/slide3.jpg
</carousel>
```

#### Multi-image grids

Multiple images on a single line auto-layout into a grid (up to 5 columns):

```markdown
![Alt 1](/img/a.jpg) ![Alt 2](/img/b.jpg) ![Alt 3](/img/c.jpg)
```

#### Pipe-separated text columns

Text with ` | ` separators renders as side-by-side columns:

```markdown
**Name 1** | **Name 2** | **Name 3**

Description 1 | Description 2 | Description 3
```

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
