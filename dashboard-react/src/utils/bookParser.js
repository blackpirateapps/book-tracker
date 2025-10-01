export const groupBooksIntoLibrary = (books) => {
  const library = {
    watchlist: [],
    currentlyReading: [],
    read: []
  };

  if (!books || !Array.isArray(books)) {
    return library;
  }

  books.forEach(book => {
    // Parse JSON fields if they're strings
    const parsedBook = { ...book };

    if (typeof book.authors === 'string') {
      try {
        parsedBook.authors = JSON.parse(book.authors);
      } catch (e) {
        parsedBook.authors = [book.authors];
      }
    }

    if (typeof book.imageLinks === 'string') {
      try {
        parsedBook.imageLinks = JSON.parse(book.imageLinks);
      } catch (e) {
        parsedBook.imageLinks = {};
      }
    }

    if (typeof book.highlights === 'string') {
      try {
        parsedBook.highlights = JSON.parse(book.highlights);
      } catch (e) {
        parsedBook.highlights = [];
      }
    }

    if (typeof book.tags === 'string') {
      try {
        parsedBook.tags = JSON.parse(book.tags);
      } catch (e) {
        parsedBook.tags = [];
      }
    }

    if (typeof book.subjects === 'string') {
      try {
        parsedBook.subjects = JSON.parse(book.subjects);
      } catch (e) {
        parsedBook.subjects = [];
      }
    }

    // Group by shelf
    if (parsedBook.shelf === 'watchlist') {
      library.watchlist.push(parsedBook);
    } else if (parsedBook.shelf === 'currentlyReading') {
      library.currentlyReading.push(parsedBook);
    } else if (parsedBook.shelf === 'read') {
      library.read.push(parsedBook);
    }
  });

  return library;
};