export default class View {
  #spinnerContainer = document.querySelector(".spinner-container");

  showSpinner() {
    this.#spinnerContainer.classList.remove("hidden");
  }

  hideSpinner() {
    this.#spinnerContainer.classList.add("hidden");
  }
}
