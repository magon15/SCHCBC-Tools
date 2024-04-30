import dayjs from "dayjs";
import { BIBLE_API_URL, BIBLE_API_KEY, BEREAN_BIBLE_ID } from "../config";

import { MIN_VERSES_SECTION, MIN_VERSES_SCHED } from "../constants";

import * as helper from "../helpers.js";

const BIBLE_ID = BEREAN_BIBLE_ID;
export const mtmScheduleState = {
  selectedBooks: [],
};

const timeOut = function (s) {
  return new Promise(function (_, reject) {
    setTimeout(function () {
      reject(new Error("Request took too long!"));
    }, s * 1000);
  });
};

const apiRequest = async function (url) {
  try {
    const fetchRequest = fetch(url, {
      method: "GET",
      headers: {
        "api-key": BIBLE_API_KEY,
      },
    });
    const res = await Promise.race([fetchRequest]);
    const data = await res.json();

    if (!res.ok) throw new Error(`${data.message} ${res.status}`);
    return data;
  } catch (err) {
    throw err;
  }
};

const apiMultipleRequests = async function (urls) {
  try {
    const requests = urls.map((url) => apiRequest(url));
    const results = await Promise.all(requests);
    return results;
  } catch (err) {
    throw err;
  }
};

export const generateMTMSchedule = async function (
  lastVerseDetails,
  dateStart
) {
  try {
    //add the last book to the first index of the section array
    if (mtmScheduleState.selectedBooks.includes(lastVerseDetails.bookID)) {
      mtmScheduleState.selectedBooks.splice(
        mtmScheduleState.selectedBooks.indexOf(lastVerseDetails.bookID),
        1
      );
      mtmScheduleState.selectedBooks.unshift(lastVerseDetails.bookID);
    } else {
      mtmScheduleState.selectedBooks.unshift(lastVerseDetails.bookID);
    }
    const urls = mtmScheduleState.selectedBooks.map(
      (bookID) => `${BIBLE_API_URL}${BIBLE_ID}/books/${bookID}/sections`
    );
    const sections = await apiMultipleRequests(urls);
    console.log("sections", sections);
    const filteredSections = sections.flatMap((bookSections, i) => {
      if (i === 0) {
        return filterAccomplishedSections(bookSections.data, lastVerseDetails);
      } else {
        return bookSections.data;
      }
    });
    console.log("filteredSections", filteredSections);
    const schedule = createSchedule(filteredSections);
    console.log("schedule", schedule);
    return createWeeklySchedule(schedule, dateStart);
  } catch (err) {
    throw err;
  }
};

function createWeeklySchedule(schedule, dateStart) {
  //chunk schedule to weekly chunks
  const passageWeekly = schedule.reduce((resultArray, item, index) => {
    const chunkIndex = Math.floor(index / 7);
    if (!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = []; // start a new chunk
    }
    resultArray[chunkIndex].push(item);
    return resultArray;
  }, []);

  let startDate = dayjs(dateStart);
  const weeklySchedule = passageWeekly.reduce((schedule, weeklyPassages) => {
    if (weeklyPassages.length === 7) {
      const scheduleForWeek = {
        scheduleDate: helper.getScheduleDateText(
          startDate,
          startDate.add(6, "day")
        ),
        schedule: weeklyPassages.map((passage, i) => {
          return {
            date: startDate.add(i, "day"),
            passage,
          };
        }),
      };
      schedule.push(scheduleForWeek);
    }
    startDate = startDate.add(7, "day");
    return schedule;
  }, []);
  return weeklySchedule;
}

function createSchedule(filteredSections) {
  let sectionFirst;
  let skipNextSection = false;
  const schedule = [];

  const pushToSchedule = function (section1st, lastSection, verses) {
    schedule.push({
      firstVerseId: section1st.firstVerseId,
      lastVerseId: lastSection.lastVerseId,
      numVerses: verses,
    });
    sectionFirst = null;
  };

  const mergeToPrevSchedule = function (currentSection, numVerses) {
    const prevSection = schedule.at(-1);
    console.log("optimized", prevSection);
    prevSection.lastVerseId = currentSection.lastVerseId;
    prevSection.numVerses += numVerses;
    sectionFirst = null;
  };

  filteredSections.forEach((currentSection, i) => {
    if (skipNextSection) {
      skipNextSection = false;
      return;
    }
    if (!sectionFirst) sectionFirst = currentSection;
    const {
      book: book1st,
      chapter: chapter1st,
      verse: verse1st,
    } = helper.bibleAPIPsgDetails(sectionFirst.firstVerseId);
    const { verse: verseLast } = helper.bibleAPIPsgDetails(
      currentSection.lastVerseId
    );

    const numVerses = verseLast - verse1st + 1;

    //if numVerses is still less than desired amount, do checking for next section
    let firstVerse = verse1st;
    let lastVerse = verseLast;
    let numVersesPrevChapter = 0;
    const nextSection = filteredSections[i + 1];
    if (nextSection && numVerses < MIN_VERSES_SECTION) {
      const { book: nextBook, chapter: nextChapter } =
        helper.bibleAPIPsgDetails(nextSection.firstVerseId);

      //check if next section is a different book
      if (book1st !== nextBook) {
        if (numVerses >= MIN_VERSES_SCHED) {
          pushToSchedule(sectionFirst, currentSection, numVerses);
        } else {
          mergeToPrevSchedule(currentSection, numVersesPrevChapter);
        }
        return;
      }

      //check if next section is a different chapter
      if (chapter1st !== nextChapter) {
        const { verse: lastVerseSaved } = helper.bibleAPIPsgDetails(
          sectionFirst.lastVerseId
        );
        numVersesPrevChapter = lastVerseSaved - verse1st + 1;
        firstVerse = 1;
        lastVerse = helper.bibleAPIPsgDetails(nextSection.lastVerseId).verse;
      }
    }

    const numVersesFinal = lastVerse - firstVerse + 1 + numVersesPrevChapter;
    if (numVersesFinal >= MIN_VERSES_SECTION || !nextSection) {
      if (!nextSection && numVersesFinal < MIN_VERSES_SCHED) {
        mergeToPrevSchedule(currentSection, numVersesFinal);
      } else if (numVersesPrevChapter === 0) {
        pushToSchedule(sectionFirst, currentSection, numVersesFinal);
      } else {
        pushToSchedule(sectionFirst, nextSection, numVersesFinal);
        skipNextSection = true;
      }
    }
  });
  return schedule;
}

const filterAccomplishedSections = function (sections, lastVerseDetails) {
  const { chapter, verse } = lastVerseDetails;
  return sections.filter((section) => {
    if (section.bookId !== lastVerseDetails.bookID) {
      return true;
    }

    const { chapter: chapter1st, verse: verse1st } = helper.bibleAPIPsgDetails(
      section.firstVerseId
    );

    const { chapter: chapterLast, verse: verseLast } =
      helper.bibleAPIPsgDetails(section.lastVerseId);

    //check if section chapter is before the last verse chapter
    if (chapter1st < chapter && chapterLast < chapter) {
      return false;
    }

    //check if first and last section chapter is the same as the last verse chapter

    if (
      chapter1st === chapter &&
      chapterLast === chapter &&
      (verse >= verseLast || isBetween(verse, verse1st, verseLast))
    ) {
      return false;
    }

    return true;
  });
};

function isBetween(n, a, b) {
  return (n - a) * (n - b) <= 0;
}

export function resetMTMSchedule() {
  mtmScheduleState.selectedBooks = [];
}

export const selectMTMSchedBook = function (book, checked) {
  if (checked) {
    mtmScheduleState.selectedBooks.includes(book) ||
      mtmScheduleState.selectedBooks.push(book);
  } else {
    if (mtmScheduleState.selectedBooks.includes(book)) {
      mtmScheduleState.selectedBooks.splice(
        mtmScheduleState.selectedBooks.indexOf(book),
        1
      );
    }
  }
};

// export const requestBibleGatewayToken = async function () {
//   try {
//     const url = `${BIBLE_GATEWAY_API_URL}request_access_token?username=${BIBLE_GATEWAY_USERNAME}&password=${BIBLE_GATEWAY_PASSWORD}`;
//     const token = await apiRequest(url);
//     console.log(url);
//     console.log(token);
//   } catch (err) {
//     console.log(err);
//     throw err;
//   }
// };
