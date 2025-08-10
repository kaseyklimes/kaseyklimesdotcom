// Date formatting utilities extracted from MasonryGrid
import { format } from 'date-fns';

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

    // Handle date ranges (e.g., "2020-2023")
    if (dateString.includes('–') || (dateString.includes('-') && dateString.split('-').length === 2)) {
      const [start, end] = dateString.split(/[-–]/);
      if (start && end && start.length === 4 && end.length === 4) {
        return `${start}–${end}`;
      }
    }

    // Handle month-year format (e.g., "03-2023")
    if (/^\d{2}-\d{4}$/.test(dateString)) {
      const [month, year] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return format(date, 'MMMM yyyy');
    }

    // Handle full date format (e.g., "10-27-2023")
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
      const [month, day, year] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return format(date, 'MMMM d, yyyy');
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