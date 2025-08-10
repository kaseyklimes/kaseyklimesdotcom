// Grid calculation utilities extracted from MasonryGrid for better organization

export function calculateRowSpan(
  stars: number, 
  description: string | undefined, 
  category: string, 
  imageWidth?: number, 
  imageHeight?: number, 
  manualSpan?: number
): number {
  // If manual span override is provided, use it
  if (typeof manualSpan === 'number') {
    return manualSpan;
  }

  // Special handling for tweets - always use 1 column and fixed height
  if (category === 'tweet') {
    return 8; // Smaller fixed height for tweets
  }

  const rowHeight = 40;
  const colSpan = Math.min(stars, 5);
  const columnWidth = 200; // Width of one column in pixels
  const containerWidth = colSpan * columnWidth;
  
  // Calculate image height
  let imageHeightPx;
  if ((category === 'photography' || category === 'shelf') && imageWidth && imageHeight) {
    // Use actual image dimensions for photography and shelf items
    imageHeightPx = (containerWidth * imageHeight) / imageWidth;
  } else {
    // Use 3:2 aspect ratio for other content
    imageHeightPx = (containerWidth * 2) / 3;
  }
  
  // Calculate text content height more precisely
  const titleHeightPx = description || (category !== 'photography' && category !== 'shelf') ? 28 : 0;
  
  // Calculate description height based on content
  const charsPerLine = Math.floor((colSpan * 75));
  const descriptionLines = description ? Math.ceil(description.length / charsPerLine) : 0;
  const descriptionHeightPx = descriptionLines * 20; // text-xs line height
  
  // Metadata height (single line of text-xs plus margins)
  const metadataHeightPx = 20;
  
  // Account for margins (mt-2 = 0.5rem = 8px)
  const marginHeightPx = description ? 16 : 8; // Less margin if no description
  
  // Calculate total content height and convert to rows
  const totalHeightPx = imageHeightPx + titleHeightPx + descriptionHeightPx + metadataHeightPx + marginHeightPx;
  let totalRows = Math.ceil(totalHeightPx / rowHeight);
  
  // Apply category-specific adjustments
  if (category === 'photography' && colSpan === 2) {
    if (description && description.length < 100) {
      totalRows = Math.min(totalRows, 9);
    } else if (!description && imageWidth && imageHeight) {
      const aspectRatio = imageWidth / imageHeight;
      if (aspectRatio > 1) {
        totalRows = Math.min(totalRows, 9);
      } else {
        totalRows = Math.max(totalRows, 14);
      }
    }
  } else if ((category === 'photography' || category === 'shelf') && !description) {
    totalRows = Math.floor(totalRows * 0.9); // Reduce by 10% for more compact layout
  }
  
  // For non-photography/shelf items, ensure we don't overallocate rows
  if (category !== 'photography' && category !== 'shelf') {
    const maxRowsBySpan: Record<number, number> = {
      1: 7,   // 1 column items max 7 rows
      2: 8,   // 2 column items max 8 rows
      3: 11,  // 3 column items max 11 rows
      4: 12,  // 4 column items max 12 rows
      5: 13   // 5 column items max 13 rows
    };
    
    // For 2-column items with short descriptions, reduce rows further
    if (colSpan === 2 && (!description || description.length < 100)) {
      totalRows = Math.min(totalRows, 8);
    }
    
    totalRows = Math.min(totalRows, maxRowsBySpan[colSpan] || totalRows);
  }
  
  return totalRows;
}