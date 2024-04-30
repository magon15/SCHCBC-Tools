import View from "./View.js";

import { bibleBooks } from "../constants.js";
import * as helper from "../helpers.js";
import html2canvas from "html2canvas";
import JSZip from "jszip";

class MTMScheduleView extends View {
  #parentElement = document.querySelector(".mtm-schedule-view");
  #mtmSchedForm = document.querySelector(".mtm-sched-form");
  #booksContainer = document.querySelector(".books-container");
  #bookSelectionContainer = document.querySelector(".book-selection-container");
  #textLastVerse = document.querySelector(".txt-last-verse");
  #dateStartPicker = document.querySelector(".mtm-sched-start-date");
  #textDateSchedule = document.querySelector(".text-date-schedule");
  #dailySchedContainer = document.querySelector(
    ".mtm-schedule-daily-container"
  );

  //handlers
  #generateScheduleHandler;
  #checkBookHandler;

  initView() {
    this.#generateChapterCheckbox();
  }

  #generateChapterCheckbox() {
    const markup = bibleBooks
      .map((book) => {
        const bookID = helper.getBookID(book);
        return `<div class="checkbox-container">
        <input type="checkbox" id="checkbox-${bookID}" data-book-id="${bookID}" class="chk-book" />
        <label for="checkbox-${bookID}">${book}</label>
        </div>`;
      })
      .join(" ");
    this.#booksContainer.innerHTML = markup;
  }

  addHandlerGenerateSchedule(handler) {
    this.#generateScheduleHandler = handler;
    this.#parentElement.addEventListener(
      "click",
      this.#setGenerateButtonListener.bind(this)
    );
  }

  addHandlerCheckBook(handler) {
    this.#checkBookHandler = handler;
    this.#parentElement.addEventListener(
      "change",
      this.#setBookSelectListener.bind(this)
    );
  }

  #setGenerateButtonListener(e) {
    const generateBtn = e.target.closest(".btn-generate");
    if (generateBtn) {
      e.preventDefault();
      const lastVerse = this.#textLastVerse.value;
      const dateStart = this.#dateStartPicker.value;
      console.log(dateStart);

      this.#generateScheduleHandler(lastVerse, dateStart);
    }
  }

  async generateWeeklySchedule(weeklySchedule) {
    const zip = new JSZip();
    const imageBlobs = await this.generateSchedBlobs(weeklySchedule);
    console.log(imageBlobs.length);
    imageBlobs.forEach((blobInfo, i) => {
      const { blob, postDate } = blobInfo;
      zip.file(`${i}_${postDate}.jpeg`, blob);
    });
    const scheduleZipFile = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.download = "MTMSchedule.zip";
    const url = URL.createObjectURL(scheduleZipFile);
    a.href = url;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async generateSchedBlobs(weeklySchedule) {
    const imageBlobs = [];
    for await (const sched of weeklySchedule) {
      console.log(sched);
      //set schedule date text
      this.#textDateSchedule.innerText = `(${sched.scheduleDate})`;

      //generate weekly schedule
      const markup = sched.schedule
        .map((passageDetails) => {
          const textPassageForDay = helper.getPassageForDayText(
            passageDetails.passage.firstVerseId,
            passageDetails.passage.lastVerseId
          );
          return `<p class="text-mtm-for-day">${helper.getMonthDayString(
            passageDetails.date
          )} - ${textPassageForDay}</p>`;
        })
        .join(" ");
      this.#dailySchedContainer.innerHTML = markup;

      const canvas = await html2canvas(
        document.querySelector(".schedule-container")
      );
      const blob = await new Promise((resolve) => canvas.toBlob(resolve));

      const postDate = sched.schedule[0].date.subtract(1, "day");
      imageBlobs.push({
        postDate: helper.getSchedJPEGDate(postDate),
        blob,
      });
    }
    return imageBlobs;
  }

  #setBookSelectListener(e) {
    const chkBoxBook = e.target.closest(".chk-book");
    if (chkBoxBook) {
      const bookID = chkBoxBook.dataset.bookId;
      this.#checkBookHandler(bookID, chkBoxBook.checked);
      if (chkBoxBook.checked) {
        this.#bookSelectionContainer.scrollTop =
          this.#bookSelectionContainer.scrollHeight;
      }
    }
  }

  setSelectedBooks(books) {
    const selectedBooks = books
      .map((book) => {
        return `<li class="book-select">${book}</li>`;
      })
      .join(" ");
    this.#bookSelectionContainer.innerHTML = selectedBooks;
  }

  reset() {
    this.#mtmSchedForm.reset();
    this.#bookSelectionContainer.innerHTML = "";
  }
}

export default new MTMScheduleView();
