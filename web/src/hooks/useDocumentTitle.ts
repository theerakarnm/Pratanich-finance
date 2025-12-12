import { useEffect } from 'preact/hooks';

/**
 * Custom hook to dynamically update the document title
 * @param title - The title to set for the page
 * @param suffix - Optional suffix to append (defaults to "Finance Admin")
 */
export function useDocumentTitle(title: string, suffix: string = 'Finance Admin') {
  useEffect(() => {
    const fullTitle = suffix ? `${title} | ${suffix}` : title;
    document.title = fullTitle;

    // Cleanup: Reset to default title when component unmounts
    return () => {
      document.title = suffix || 'Finance Admin';
    };
  }, [title, suffix]);
}
