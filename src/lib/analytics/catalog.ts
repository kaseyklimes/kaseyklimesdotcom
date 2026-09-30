import "server-only";
import { getAllContent } from "@/utils/content";
import type { ContentInfo } from "./model";
export function contentCatalog(): Record<string, ContentInfo> {
  return Object.fromEntries(
    getAllContent()
      .filter((item) => !item.private)
      .map((item) => [
        `/${item.category}/${item.slug}`,
        {
          title: item.title,
          tags: item.tags || [],
          emphasis: String(item.stars || 1),
          format: item.audioUrl
            ? "Audio"
            : item.carousel?.length || item.series?.length
              ? "Gallery"
              : item.videoPoster || /\.(mp4|webm)$/i.test(item.heroImage || "")
                ? "Video"
                : item.category === "photography"
                  ? "Image"
                  : item.category === "shelf"
                    ? "Shelf item"
                    : item.hasContent
                      ? "Article"
                      : "Link",
        },
      ]),
  );
}
