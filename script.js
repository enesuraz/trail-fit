const formContainer = document.querySelector(".header");
const form = document.querySelector("form");
const workoutsContainer = document.querySelector(".sidebar");
const main = document.querySelector(".main");
const type = document.querySelector("#type");
const distance = document.querySelector("#distance");
const duration = document.querySelector("#duration");
const steps = document.querySelector("#steps");
const height = document.querySelector("#height");
const errorBox = document.querySelector(".error-box");
const errorPopup = document.querySelector(".error-popup");
const errorTitle = document.querySelector(".error-title");
const errorDescription = document.querySelector(".error-description");

const MET_VALUE = 3.5;
const KCAL_DIVIDE_VALUE = 200;

class Workout {
  date = new Date();
  id = Date.now().toString(36) + Math.random().toString(36).substr(2);

  constructor(coords, duration, height) {
    this.coords = coords;
    this.distance = this.distance;
    this.duration = duration;
    this.height = height;
  }

  _setDescription() {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    this.title = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
    return this.title;
  }

  _setKcal() {
    this.kcal = `${(
      (this.met * MET_VALUE * this.height) /
      KCAL_DIVIDE_VALUE
    ).toFixed(2)} kcal/min`;
    return this.kcal;
  }
}

class Running extends Workout {
  type = "running";
  met = 3.8;

  constructor(coords, duration, height, distance) {
    super(coords, duration, height);
    this.distance = distance;

    this._setDescription();
    this._setKcal();

    this._calcPace();
  }

  _calcPace() {
    this.pace = (this.duration / this.distance).toFixed(2);
    return this.pace;
  }
}

class Hiking extends Workout {
  type = "hiking";
  met = 3.3;

  constructor(coords, duration, height, steps) {
    super(coords, duration, height);
    this.steps = steps;

    this._stepsInmin();

    this._setDescription();
    this._setKcal();
  }

  _stepsInmin() {
    this.stepsInMin = (this.steps / this.duration).toFixed(2);
    return this.stepsInMin;
  }
}

/* const hiking_example = new Hiking([20, 30], 20, 20, 120, 1000);
const running_example = new Running([20, 30], 20, 20, 120, 1000);
console.log(hiking_example, running_example); */

class App {
  #map;
  #mapEvent;
  #zoomLevel = 13;
  #workouts = [];
  #markersLayer = new L.LayerGroup();

  constructor() {
    this._getPosition();

    form.addEventListener("submit", this._formEvent.bind(this));

    workoutsContainer.addEventListener("click", this._moveMarker.bind(this));

    type.addEventListener("change", this._changeType);

    errorPopup.addEventListener("click", this._closeErrorBox.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), () => {
        this._renderError(
          "We could not get any location.Please allow the location permission"
        );
      });
    }
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map = L.map("map", { zoomControl: false }).setView(
      coords,
      this.#zoomLevel
    );

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.tr/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on("click", this._loadUi.bind(this));

    this._getLocalStorage();
  }

  _loadUi(mapE) {
    this.#mapEvent = mapE;
    formContainer.classList.remove("header--hidden");
  }

  _hideForm() {
    formContainer.classList.add("header--hidden");
    distance.value = duration.value = steps.value = height.value = "";
  }

  _formEvent(e) {
    const allValid = (...inputs) => inputs.every((inp) => inp !== 0);
    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

    let workout;

    e.preventDefault();

    const { lat, lng } = this.#mapEvent.latlng;
    const newCoords = [lat, lng];

    const typeValue = type.value;
    const durationValue = +duration.value;
    const heightValue = +height.value;

    if (typeValue === "running") {
      const distanceValue = +distance.value;

      if (!allValid(distanceValue, durationValue, heightValue)) {
        return this._renderError("You did not provide all values");
      }

      if (!allPositive(distanceValue, durationValue, heightValue)) {
        return this._renderError("All numbers must have be positive");
      }

      workout = new Running(
        newCoords,
        durationValue,
        heightValue,
        distanceValue
      );
    }

    if (typeValue === "hiking") {
      const stepsValue = +steps.value;

      if (!allValid(stepsValue, durationValue, heightValue)) {
        return this._renderError("You did not provide all values");
      }

      if (!allPositive(stepsValue, durationValue, heightValue)) {
        return this._renderError("All numbers must have be positive");
      }

      workout = new Hiking(newCoords, durationValue, heightValue, stepsValue);
    }

    this.#workouts.push(workout);

    this._renderMarker(workout);

    this._renderHtml(workout);

    this._hideForm();

    this._setLocalStorage();
  }

  _renderMarker(workout) {
    const marker = L.marker(workout.coords)
      .bindPopup(
        L.popup({
          maxWidth: 253,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}--popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍♂️" : "🚶‍♂️"} ${workout.title}`
      )
      .openPopup();
    this.#markersLayer.addLayer(marker);
    this.#map.addLayer(this.#markersLayer);
  }

  _renderHtml(workout) {
    let html = this._getHtml(workout);
    workoutsContainer.insertAdjacentHTML("beforeend", html);
    document
      .querySelector(".delete-workout")
      .addEventListener("click", this._removeWorkout.bind(this));
  }

  _getHtml(workout) {
    return `
      <div class="workout workout--${workout.type}" data-id=${workout.id}>
              <h2 class="workout-title">${workout.title}</h2>
              <div class="workout-info">
                <span class="workout-data"><span>⏲️</span> ${
                  workout.height
                } kg</span>
                <span class="workout-data"><span>${
                  workout.type === "running" ? "🏃‍♂️" : "🚶‍♂️"
                }</span>${
      workout.type === "running" ? workout.distance : workout.steps
    } ${workout.type === "running" ? "km" : "steps"}</span>
                <span class="workout-data"><span>⏱</span> ${
                  workout.duration
                } min</span>
                <span class="workout-data"><span>⚡️</span> ${
                  workout.kcal
                }</span>
                <span class="workout-data"><span>💯</span> ${(
                  workout.kcal.split(" ")[0] * workout.duration
                ).toFixed(2)} kcal</span>
                <span class="workout-data"><span> ${
                  workout.type === "running" ? "💥" : "🦶🏼"
                }</span> ${
      workout.type === "running" ? workout.pace : workout.stepsInMin
    } ${workout.type === "running" ? "km" : "steps"}/min</span>
              </div>
              <button class="delete-workout">delete</button>
            </div>
      `;
  }

  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    workoutsContainer.innerHTML = "";
    this.#markersLayer.clearLayers();
    const workoutsData = JSON.parse(localStorage.getItem("workouts"));

    if (!workoutsData) return;
    this.#workouts = workoutsData;

    this.#workouts.forEach((workout) => {
      this._renderMarker(workout);
      this._renderHtml(workout);
    });
  }

  _removeWorkout(e) {
    const workoutElement = e.target.closest(".workout");
    const id = workoutElement.dataset.id;

    if (!id) return;

    let workoutsCopy = this.#workouts;
    workoutsCopy = workoutsCopy.filter((workout) => workout.id !== id);
    localStorage.setItem("workouts", JSON.stringify(workoutsCopy));
    this._getLocalStorage();
  }

  _moveMarker(e) {
    if (!this.#map) return;

    const workoutEl = e.target.closest(".workout");

    if (e.target.classList.contains("delete-workout")) return;

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      (workout) => workout.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#zoomLevel, {
      axtion: true,
      pan: { duration: 1 },
    });
  }

  _changeType() {
    distance.classList.toggle("form-input--hidden");
    steps.classList.toggle("form-input--hidden");
  }

  _closeErrorBox(e) {
    if (
      e.target.classList.contains("error-close") ||
      !e.target.closest(".error-box")
    ) {
      errorPopup.classList.remove("error-popup--show");
    }
  }

  _renderError(message) {
    errorTitle.innerHTML = "Error Occured";
    errorDescription.innerHTML = message;
    errorPopup.classList.add("error-popup--show");
  }
}

new App();

/* class App {

  
      
  
  
    handleError(e) {
      if (
       
      ) {
        errorBox.classList.add("error-box--hidden");
      }
    }
  
  }
  
  const app = new App();
   */
