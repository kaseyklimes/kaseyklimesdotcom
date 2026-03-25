// Date formatting utilities using native Intl API (no external dependencies)

// Cached formatters for performance
const monthYearFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const fullDateFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

/**
 * Parse a date string in any of our custom formats and return a numeric timestamp.
 * Handles: "present", "YYYY-YYYY", "YYYY/YYYY", "YYYY", "MM-YYYY", "MM-DD-YYYY",
 * and falls back to native Date parsing.
 */
export function parseDateToTimestamp(dateStr: string | undefined): number {
  if (!dateStr || typeof dateStr !== 'string') {
    return 0;
  }

  try {
    // Handle "present" as far-future date
    if (dateStr.toLowerCase().includes('present')) {
      return new Date('9999-12-31').getTime();
    }

    // Handle year ranges with either hyphen or forward slash (e.g., "2017-2021" or "1993/2008")
    if (/^\d{4}[-\/]\d{4}$/.test(dateStr)) {
      const [startYear, endYear] = dateStr.split(/[-\/]/);
      if (parseInt(endYear) < parseInt(startYear)) {
        console.error(`Invalid date range: ${dateStr}`);
        return new Date(parseInt(startYear), 11, 31).getTime();
      }
      return new Date(parseInt(endYear), 11, 31).getTime();
    }

    // Handle just year (e.g., "2014")
    if (/^\d{4}$/.test(dateStr)) {
      return new Date(parseInt(dateStr), 0, 1).getTime();
    }

    // Handle month-year format (e.g., "07-2024")
    if (/^\d{2}-\d{4}$/.test(dateStr)) {
      const [month, year] = dateStr.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, 1).getTime();
    }

    // Handle full date format (e.g., "10-27-2023")
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [month, day, year] = dateStr.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).getTime();
    }

    // Fallback to native parsing
    const parsed = new Date(dateStr).getTime();
    return isNaN(parsed) ? 0 : parsed;
  } catch (error) {
    console.error('Error parsing date:', dateStr, error);
    return 0;
  }
}

export function formatDateOrRange(dateString: string): string {
  try {
    // Handle undefined or invalid dates
    if (!dateString || typeof dateString !== 'string') {
      return '';
    }

    // Handle date ranges with "present"
    if (dateString.toLowerCase().includes('present')) {
      const startYear = dateString.split('-')[0];
      return `${startYear}–Present`;
    }

    // Handle year ranges with either hyphen or forward slash (e.g., "2017-2021" or "1993/2008")
    if (/^\d{4}[-\/]\d{4}$/.test(dateString)) {
      const [startYear, endYear] = dateString.split(/[-\/]/);
      // If end year is less than start year, something is wrong
      if (parseInt(endYear) < parseInt(startYear)) {
        console.error(`Invalid date range: ${dateString}`);
        return startYear;
      }
      return `${startYear}–${endYear}`;
    }

    // Handle month-year format (e.g., "03-2023" or "07-2024")
    if (/^\d{2}-\d{4}$/.test(dateString)) {
      const [month, year] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return monthYearFormatter.format(date);
    }

    // Handle full date format (e.g., "10-27-2023")
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
      const [month, day, year] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return fullDateFormatter.format(date);
    }

    // Handle just year (e.g., "2023")
    if (/^\d{4}$/.test(dateString)) {
      return dateString;
    }

    return dateString;
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return dateString;
  }
}
