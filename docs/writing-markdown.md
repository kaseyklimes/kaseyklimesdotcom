# Writing and formatting posts

Posts live in `content/blog/*.md`. Use one `# Article title`, followed by `## Section` and `### Subsection` headings. Keep ordinary prose as paragraphs, not headings. Leave a blank line between blocks.

## Images and captions

Use descriptive alt text for an image. Add a separate paragraph beginning with `Caption:` when the image needs a visible caption:

```md
![Aggregate income compared with housing supply](/images/chart.png)

Caption: Each point represents one metro area. **Source:** [Census Bureau](https://www.census.gov).
```

The label disappears in the rendered article. The image and caption become a semantic figure; captions use smaller, quieter text while retaining links and emphasis. Ordinary paragraphs after images remain body text. Don't use nonbreaking spaces or repeated underscores to position captions.

For a responsive image group, put the images in the same paragraph:

```md
![First view](/images/first.jpg) ![Second view](/images/second.jpg)

Caption: Two views of the same space.
```

Images retain their aspect ratio, without a height cap or cropping. Groups stack on small screens.

## Lists and quotations

Keep list markers and text on the same line. Indent nested content:

```md
1. **First point**
   - A supporting detail
2. **Second point**

> A quoted paragraph.
>
> Another paragraph from the same quotation.

— Author, source
```

## Tables, code, and footnotes

GitHub-flavored Markdown is supported, including tables, task lists, strikethrough, and footnotes. Tables and code blocks scroll horizontally when needed.

```md
A claim with a source.[^source]

[^source]: Author, *Title*, year. [Read more](https://example.com).
```

Footnotes get numbered references and links back to the text. For code examples, use fenced code blocks with a language label.

## Deliberate columns and carousels

Use explicit column markers; pipe characters in normal prose are not layout instructions:

```md
:::
### First column

Text, images, and lists.
|||
### Second column

More content.
:::
```

Existing column blocks that separate sections with `###` headings also work. Existing standalone `<carousel>` blocks contain one image path per line and end with `</carousel>`. The same Markdown renderer handles ordinary content and column contents.

Run `npm test`, `npm run lint`, and `npm run build` after changing rendering behavior. The Markdown regression suite checks every blog post for title structure, empty lists/quotes, and detached captions.
