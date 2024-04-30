import dayjs from "dayjs";
import {
  bibleBooks,
  bookIDs,
  bibleNumChapters,
  numVersesChapter,
} from "./constants.js";

const getBibleBook = function (passage) {
  return passage.split(" ").slice(0, -1).join(" ");
};

const getChapterAndVerse = function (passage) {
  return passage
    .split(" ")
    .slice(-1)[0]
    .split(":")
    .map((string) => Number(string));
};

export const getBookID = function (book) {
  return bookIDs[bibleBooks.indexOf(book)];
};

export const getPassageDetails = function (passage) {
  const book = getBibleBook(passage);
  const [chapter, verse] = getChapterAndVerse(passage);
  return {
    book,
    chapter,
    verse,
    bookID: getBookID(book),
    index: bibleBooks.indexOf(book),
  };
};

export const bibleAPIPsgDetails = function (passage) {
  const [book, chapter, verse] = passage.split(".");
  return { book, chapter: Number(chapter), verse: Number(verse) };
};

export const getBookFromBookID = function (bookID) {
  const bookIndex = bookIDs.indexOf(bookID);
  return bibleBooks[bookIndex];
};

export const checkIfValidPassage = function (passage) {
  const { book, chapter, verse, bookID, index } = getPassageDetails(passage);
  const validChapter = chapter <= bibleNumChapters[index] && chapter > 0;
  const validVerse = verse <= numVersesChapter[`${bookID}.${chapter}`];
  if (bibleBooks.includes(book) && validChapter && validVerse) {
    return true;
  } else {
    return false;
  }
};

export const isDateValid = function (date) {
  return dayjs(date).isValid();
};

export const getScheduleDateText = function (start, end) {
  const startDateText = start.format("MMM D");
  let startYearText = "";
  let endDateText = "";
  const endYearText = end.format("YYYY");

  if (start.month() === end.month()) {
    endDateText = end.format("[-]D[, ]");
  } else {
    endDateText = end.format("[ - ]MMM D[, ]");
  }

  if (start.year() !== end.year()) {
    startYearText = start.format("[, ]YYYY");
  }

  return `${startDateText}${startYearText}${endDateText}${endYearText}`;
};

export const getMonthDayString = function (date) {
  return date.format("MMMM D");
};

export const getSchedJPEGDate = function (date) {
  return date.format("MMM-D-YYYY");
};

export const getPassageForDayText = function (firstVerse, lastVerse) {
  const {
    book,
    chapter: chapter1st,
    verse: verse1st,
  } = bibleAPIPsgDetails(firstVerse);
  const { chapter: chapterLast, verse: verseLast } =
    bibleAPIPsgDetails(lastVerse);

  if (chapter1st === chapterLast) {
    return `${getBookFromBookID(book)} ${chapter1st}:${verse1st}-${verseLast}`;
  } else {
    return `${getBookFromBookID(
      book
    )} ${chapter1st}:${verse1st} - ${chapterLast}:${verseLast}`;
  }
};
