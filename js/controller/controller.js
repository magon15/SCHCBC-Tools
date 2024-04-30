import * as model from "../model/model.js";
import * as helper from "../helpers.js";
import mtmScheduleView from "../view/mtmScheduleView";

const handleGenerateSchedule = async function (lastVerse, dateStart) {
  try {
    if (!helper.checkIfValidPassage(lastVerse)) {
      throw new Error("Invalid last verse passage.");
    }
    if (!helper.isDateValid(dateStart)) {
      throw new Error("Please enter start date.");
    }
    mtmScheduleView.showSpinner();
    const weeklySchedule = await model.generateMTMSchedule(
      helper.getPassageDetails(lastVerse),
      dateStart
    );
    await mtmScheduleView.generateWeeklySchedule(weeklySchedule);
  } catch (err) {
    alert(err.message);
  } finally {
    mtmScheduleView.hideSpinner();
    model.resetMTMSchedule();
    mtmScheduleView.reset();
  }
};

const handleMTMSchedBook = function (book, isChecked) {
  model.selectMTMSchedBook(book, isChecked);
  mtmScheduleView.setSelectedBooks(
    model.mtmScheduleState.selectedBooks.map((bookID) =>
      helper.getBookFromBookID(bookID)
    )
  );
};

const init = function () {
  mtmScheduleView.initView();
  mtmScheduleView.addHandlerGenerateSchedule(handleGenerateSchedule);
  mtmScheduleView.addHandlerCheckBook(handleMTMSchedBook);
};
init();
