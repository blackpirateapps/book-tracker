export const parseBook = (book) => {
  try {
    book.authors = JSON.parse(book.authors);
  } catch (e) {
    book.authors = Array.isArray(book.authors) ? book.authors : [];
  }
  
  try {
    book.imageLinks = JSON.parse(book.imageLinks);
  } catch (e) {
    book.imageLinks = typeof book.imageLinks === 'object' && book.imageLinks ? book.imageLinks : {};
  }
  
  try {
    book.industryIdentifiers = JSON.parse(book.industryIdentifiers);
  } catch (e) {
    book.industryIdentifiers = [];
  }
  
  try {
    book.highlights = JSON.parse(book.highlights);
  } catch (e) {
    book.highlights = [];
  }
  
  try {
    book.subjects = JSON.parse(book.subjects);
  } catch (e) {
    book.subjects = [];
  }
  
  return book;
};

export const groupBooksIntoLibrary = (books) => {
  const library = { watchlist: [], currentlyReading: [], read: [] };
  
  books.forEach(book => {
    const parsedBook = parseBook(book);
    if (library[parsedBook.shelf]) {
      library[parsedBook.shelf].push(parsedBook);
    } else {
      library.watchlist.push(parsedBook);
    }
  });
  
  library.watchlist.sort((a, b) => (a.title > b.title) ? 1 : -1);
  library.currentlyReading.sort((a, b) => (a.title > b.title) ? 1 : -1);
  library.read.sort((a, b) => new Date(b.finishedOn) - new Date(a.finishedOn));
  
  return library;
};