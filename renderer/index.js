const countrySelect = document.getElementById("countrySelect");
const flagPreview = document.getElementById("flagPreview");
const exploreBtn = document.getElementById("exploreBtn");
const loadingMessage = document.getElementById("loadingMessage");
const errorMessage = document.getElementById("errorMessage");
const countrySection = document.getElementById("countrySection");
const weatherSection = document.getElementById("weatherSection");
const activitySection = document.getElementById("activitySection");
const holidaySection = document.getElementById("holidaySection");
const packageContainer = document.getElementById("packageContainer");
const calculatorPackage = document.getElementById("calculatorPackage");
const travelDays = document.getElementById("travelDays");
const travellers = document.getElementById("travellers");
const calculateBtn = document.getElementById("calculateBtn");
const savePlanBtn = document.getElementById("savePlanBtn");

let packages = [];
let selectedCountry = null;
let selectedWeather = null;
let calculatedPlan = null;

const STORAGE_KEY = "jomjalan_plans";

function flagUrl(code) {
    return `https://flagcdn.com/w320/${code.toLowerCase()}.png`;
}

countrySelect.addEventListener("change", () => {
    const code = countrySelect.value;
    if (!code) {
        flagPreview.classList.add("hidden");
        flagPreview.removeAttribute("src");
        return;
    }
    flagPreview.src = flagUrl(code);
    flagPreview.alt = countrySelect.options[countrySelect.selectedIndex].text;
    flagPreview.classList.remove("hidden");
});

async function loadPackages() {
    try {
        packages = await window.api.getPackages();
        if (!Array.isArray(packages) || packages.length === 0) {
            throw new Error("No travel packages found.");
        }
        displayPackages();
        populatePackageDropdown();
    } catch (error) {
        console.error(error);
        packageContainer.innerHTML = "<p class='error-message'>Unable to load travel packages.</p>";
    }
}

function displayPackages() {
    packageContainer.innerHTML = "";
    packages.forEach(packageItem => {
        const card = document.createElement("div");
        card.className = "package-card";
        card.innerHTML = `
            <span class="package-tag">${packageItem.tag}</span>
            <h3>${packageItem.name}</h3>
            <p>${packageItem.description}</p>
            <div class="package-price">
                RM ${packageItem.pricePerDay.toLocaleString("en-MY")}
                <small>/ person / day</small>
            </div>
            <div class="package-includes">
                <strong>Package includes:</strong>
                <ul>${packageItem.includes.map(item => `<li>${item}</li>`).join("")}</ul>
            </div>
            <button class="package-button" data-id="${packageItem.id}">Choose Package</button>
        `;
        packageContainer.appendChild(card);
    });
    document.querySelectorAll(".package-button").forEach(button => {
        button.addEventListener("click", () => {
            calculatorPackage.value = button.dataset.id;
            document.getElementById("calculatorSection").scrollIntoView({ behavior: "smooth" });
        });
    });
}

function populatePackageDropdown() {
    calculatorPackage.innerHTML = "<option value=''>Select package</option>";
    packages.forEach(item => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = item.name;
        calculatorPackage.appendChild(option);
    });
}

exploreBtn.addEventListener("click", exploreDestination);

async function exploreDestination() {
    const countryCode = countrySelect.value;
    errorMessage.textContent = "";
    loadingMessage.textContent = "";

    if (!countryCode) {
        errorMessage.textContent = "Please select a destination before exploring.";
        return;
    }

    exploreBtn.disabled = true;
    loadingMessage.textContent = "Exploring your destination... Please wait";
    hideDestinationSections();

    try {
        const country = await fetchCountry(countryCode);
        selectedCountry = country;
        displayCountry(country, countryCode);

        const coordinates = await fetchCapitalCoordinates(country.capital, countryCode, country.latlng);

        const results = await Promise.allSettled([
            fetchWeather(coordinates.latitude, coordinates.longitude),
            fetchCountryDescription(country.name),
            fetchPublicHolidays(countryCode)
        ]);

        if (results[0].status === "fulfilled") {
            selectedWeather = results[0].value;
            displayWeather(selectedWeather, country.capital);
            displaySuggestion(getSuggestion(countryCode, selectedWeather));
        } else {
            console.error("Weather error:", results[0].reason);
            weatherSection.classList.add("hidden");
            activitySection.classList.add("hidden");
        }

        document.getElementById("countryDescription").textContent =
            results[1].status === "fulfilled"
                ? results[1].value
                : "Country description is currently unavailable.";

        if (results[2].status === "fulfilled") {
            displayHolidays(results[2].value);
        } else {
            holidaySection.classList.add("hidden");
        }

        loadingMessage.textContent = "Destination loaded successfully!";
    } catch (error) {
        console.error(error);
        loadingMessage.textContent = "";
        errorMessage.textContent = "Unable to load destination information. Please try again.";
    } finally {
        exploreBtn.disabled = false;
    }
}

function hideDestinationSections() {
    countrySection.classList.add("hidden");
    weatherSection.classList.add("hidden");
    activitySection.classList.add("hidden");
    holidaySection.classList.add("hidden");
}

async function fetchCountry(countryCode) {
    const response = await fetch(`https://countries.dev/alpha/${countryCode}`);
    if (!response.ok) throw new Error("Country information unavailable.");
    return await response.json();
}

function displayCountry(country, countryCode) {
    countrySection.classList.remove("hidden");

    const flag = document.getElementById("countryFlag");
    flag.src = flagUrl(countryCode);
    flag.alt = `Flag of ${country.name}`;

    document.getElementById("countryName").textContent = country.name || "Unknown";

    const regionText = [country.region, country.subregion].filter(Boolean).join(" • ");
    document.getElementById("countryRegion").textContent = regionText || "Unknown region";

    document.getElementById("countryCapital").textContent = country.capital || "Not available";

    document.getElementById("countryPopulation").textContent =
        country.population ? Number(country.population).toLocaleString() : "Not available";

    const currency = country.currencies?.[0];
    document.getElementById("countryCurrency").textContent =
        currency ? `${currency.code} (${currency.symbol || ""})` : "Not available";

    const language = country.languages?.[0];
    document.getElementById("countryLanguage").textContent = language?.name || "Not available";

    document.getElementById("wikiLink").href =
        `https://en.wikipedia.org/wiki/${encodeURIComponent(country.name)}`;
}

async function fetchCapitalCoordinates(capital, countryCode, fallbackCoordinates) {
    if (capital) {
        const response = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(capital)}&count=10&language=en&format=json`
        );
        if (response.ok) {
            const data = await response.json();
            const location = data.results?.find(item =>
                item.country_code?.toUpperCase() === countryCode.toUpperCase()
            );
            if (location) {
                return { latitude: location.latitude, longitude: location.longitude };
            }
        }
    }

    if (Array.isArray(fallbackCoordinates) && fallbackCoordinates.length >= 2) {
        return { latitude: fallbackCoordinates[0], longitude: fallbackCoordinates[1] };
    }

    throw new Error("Unable to find destination coordinates.");
}

async function fetchWeather(latitude, longitude) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Weather information unavailable.");
    const data = await response.json();
    if (!data.current) throw new Error("No current weather data.");
    return data.current;
}

function describeWeather(code) {
    if (code === 0) return { description: "Clear sky", group: "sunny" };
    if (code >= 1 && code <= 3) return { description: "Partly cloudy", group: "cloudy" };
    if (code >= 45 && code <= 48) return { description: "Foggy", group: "cloudy" };
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { description: "Rainy", group: "rainy" };
    if (code >= 71 && code <= 77) return { description: "Snowy", group: "snowy" };
    if (code >= 95 && code <= 99) return { description: "Thunderstorm", group: "stormy" };
    return { description: "Unknown weather", group: "cloudy" };
}

function displayWeather(weather, capital) {
    weatherSection.classList.remove("hidden");
    const weatherInfo = describeWeather(weather.weather_code);
    document.getElementById("weatherTemperature").textContent = `${weather.temperature_2m}°C`;
    document.getElementById("weatherDescription").textContent = weatherInfo.description;
    document.getElementById("weatherLocation").textContent = capital || "Selected destination";
    document.getElementById("feelsLike").textContent = `${weather.apparent_temperature}°C`;
    document.getElementById("humidity").textContent = `${weather.relative_humidity_2m}%`;
    document.getElementById("windSpeed").textContent = `${weather.wind_speed_10m} km/h`;
    document.getElementById("precipitation").textContent = `${weather.precipitation} mm`;
}

function getSuggestion(countryCode, weather) {
    const weatherInfo = describeWeather(weather.weather_code);
    const temperature = weather.temperature_2m;
    let suggestion = "";

    switch (weatherInfo.group) {
        case "sunny":
            suggestion = "The weather is sunny! You can enjoy sightseeing, outdoor photography, walking tours and visiting famous attractions.";
            break;
        case "cloudy":
            suggestion = "The weather is cloudy and comfortable. It is a good time to explore city attractions, visit museums and enjoy local cafes.";
            break;
        case "rainy":
            suggestion = "It may rain during your trip. Consider indoor activities such as shopping malls, museums, aquariums and local food experiences.";
            break;
        case "snowy":
            suggestion = "It is snowy! You may enjoy snow activities, winter photography and visiting indoor attractions. Remember to wear warm clothing.";
            break;
        case "stormy":
            suggestion = "Thunderstorms may occur. It is safer to stay indoors and avoid outdoor activities until the weather improves.";
            break;
        default:
            suggestion = "Explore local attractions and check the weather before starting your activities.";
    }

    if (temperature >= 30) {
        suggestion += " The temperature is hot, so remember to drink enough water and wear comfortable clothing.";
    } else if (temperature <= 10) {
        suggestion += " The temperature is cold. Bring warm clothes to stay comfortable.";
    } else {
        suggestion += " The temperature is moderate. Enjoy your journey!";
    }

    if (countryCode === "JP") {
        suggestion += " In Japan, you can visit temples, traditional streets and local food markets.";
    } else if (countryCode === "KR") {
        suggestion += " In South Korea, explore cultural villages, shopping streets and Korean food destinations.";
    } else if (countryCode === "FR") {
        suggestion += " In France, consider visiting art museums, historical buildings and beautiful cafes.";
    } else if (countryCode === "AU") {
        suggestion += " In Australia, explore nature parks, beaches and famous city attractions.";
    } else if (countryCode === "TH") {
        suggestion += " In Thailand, enjoy local markets, temples and traditional Thai food.";
    } else {
        suggestion += " Remember to explore the local culture and try traditional food.";
    }

    return { title: "Recommended Activities", suggestion: suggestion };
}

function displaySuggestion(result) {
    activitySection.classList.remove("hidden");
    document.getElementById("activityTitle").textContent = result.title;
    document.getElementById("activitySuggestion").textContent = result.suggestion;
}

async function fetchCountryDescription(countryName) {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(countryName)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Country description unavailable.");
    const data = await response.json();
    return data.extract || "No description available.";
}

async function fetchPublicHolidays(countryCode) {
    const currentYear = new Date().getFullYear();
    const url = `https://date.nager.at/api/v3/PublicHolidays/${currentYear}/${countryCode}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Holiday information unavailable.");
    return await response.json();
}

function displayHolidays(holidays) {
    holidaySection.classList.remove("hidden");
    const holidayList = document.getElementById("holidayList");
    holidayList.innerHTML = "";

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = holidays.filter(item => new Date(item.date) >= today).slice(0, 5);

    if (upcoming.length === 0) {
        holidayList.innerHTML = "<p>No upcoming public holidays found for this year.</p>";
        return;
    }

    upcoming.forEach(holiday => {
        const card = document.createElement("div");
        card.className = "holiday-item";
        card.innerHTML = `
            <div>
                <strong>${holiday.localName}</strong>
                <small>${holiday.date}</small>
            </div>
        `;
        holidayList.appendChild(card);
    });
}

async function fetchRate(currencyCode) {
    if (!currencyCode || currencyCode === "MYR") return 1;
    const url = `https://api.frankfurter.dev/v1/latest?base=MYR&symbols=${currencyCode}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Currency exchange rate unavailable.");
    const data = await response.json();
    const rate = data.rates?.[currencyCode];
    if (!rate) throw new Error("Exchange rate not found.");
    return rate;
}

calculateBtn.addEventListener("click", calculateBudget);

async function calculateBudget() {
    const packageId = Number(calculatorPackage.value);
    const days = Number(travelDays.value);
    const numberOfTravellers = Number(travellers.value);

    if (!packageId) {
        alert("Please select a travel package.");
        return;
    }

    if (!Number.isInteger(days) || days < 1 || days > 365) {
        alert("Please enter a valid travel duration between 1 and 365 days.");
        return;
    }

    if (!Number.isInteger(numberOfTravellers) || numberOfTravellers < 1 || numberOfTravellers > 100) {
        alert("Please enter a valid number of travellers between 1 and 100.");
        return;
    }

    if (!selectedCountry) {
        alert("Please explore a destination first.");
        return;
    }

    const selectedPackage = packages.find(item => item.id === packageId);

    if (!selectedPackage) {
        alert("Selected package could not be found.");
        return;
    }

    const region = selectedCountry.region || "Asia";
    const multiplier = selectedPackage.regionMultiplier[region] || 1;
    const total = selectedPackage.pricePerDay * multiplier * days * numberOfTravellers;

    calculatedPlan = {
        country: selectedCountry.name,
        countryCode: countrySelect.value,
        capital: selectedCountry.capital || "Unknown",
        currency: selectedCountry.currencies?.[0]?.code || "MYR",
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        pricePerDay: selectedPackage.pricePerDay,
        regionMultiplier: multiplier,
        days: days,
        travellers: numberOfTravellers,
        total: total,
        date: new Date().toISOString(),
        notes: ""
    };

    document.getElementById("totalBudget").textContent =
        `RM ${total.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    document.getElementById("calculationDetails").textContent =
        `RM ${selectedPackage.pricePerDay} x ${multiplier} x ${days} days x ${numberOfTravellers} travellers`;

    const currencyCode = calculatedPlan.currency;
    const localCurrency = document.getElementById("localCurrency");
    localCurrency.textContent = "Checking local currency...";

    try {
        const rate = await fetchRate(currencyCode);
        const convertedAmount = total * rate;
        localCurrency.textContent =
            `Estimated local cost: ${currencyCode} ${convertedAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        calculatedPlan.exchangeRate = rate;
        calculatedPlan.localTotal = convertedAmount;
    } catch (error) {
        console.error(error);
        localCurrency.textContent = "Currency conversion is currently unavailable.";
        calculatedPlan.exchangeRate = null;
        calculatedPlan.localTotal = null;
    }

    document.getElementById("saveMessage").textContent = "";
    savePlanBtn.disabled = false;
}

savePlanBtn.addEventListener("click", saveTravelPlan);

function saveTravelPlan() {
    if (!calculatedPlan) {
        alert("Please calculate your budget first.");
        return;
    }

    const savedPlans = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    savedPlans.push({ ...calculatedPlan, id: Date.now(), notes: "" });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedPlans));

    document.getElementById("saveMessage").textContent = "Your travel plan has been saved successfully!";

    savePlanBtn.disabled = true;
    calculatedPlan = null;
}

loadPackages();