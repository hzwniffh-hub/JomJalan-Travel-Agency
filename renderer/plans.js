const STORAGE_KEY = "jomjalan_plans";

const plansContainer = document.getElementById("plansContainer");
const totalPlans = document.getElementById("totalPlans");
const totalDestinations = document.getElementById("totalDestinations");
const totalSpending = document.getElementById("totalSpending");
const refreshBtn = document.getElementById("refreshBtn");
const editModal = document.getElementById("editModal");
const editPlanId = document.getElementById("editPlanId");
const editCountry = document.getElementById("editCountry");
const editDays = document.getElementById("editDays");
const editTravellers = document.getElementById("editTravellers");
const editNotes = document.getElementById("editNotes");
const updatePlanBtn = document.getElementById("updatePlanBtn");
const closeModalBtn = document.getElementById("closeModalBtn");

function getSavedPlans() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Unable to read saved plans:", error);
        return [];
    }
}

function storePlans(plans) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

function escapeHTML(value) {
    const characters = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    };
    return String(value ?? "").replace(/[&<>"']/g, character => characters[character]);
}

function displaySummary(plans) {
    totalPlans.textContent = plans.length;
    totalDestinations.textContent = new Set(plans.map(plan => plan.country)).size;

    const total = plans.reduce((sum, plan) => sum + Number(plan.total || 0), 0);

    totalSpending.textContent =
        `RM ${total.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function displayPlans() {
    const plans = getSavedPlans();
    displaySummary(plans);
    plansContainer.innerHTML = "";

    if (plans.length === 0) {
        plansContainer.innerHTML = `
            <div class="empty-state">
                <h2>No travel plans yet</h2>
                <p>Your saved travel plans will appear here. Start exploring and create your first journey!</p>
                <a href="index.html" class="primary-button">Explore Destinations</a>
            </div>
        `;
        return;
    }

    plans.forEach(plan => {
        const card = document.createElement("div");
        card.className = "saved-plan-card";

        const savedDate = plan.date ? new Date(plan.date).toLocaleDateString("en-MY") : "Not available";

        const flag = plan.countryCode
            ? `<img class="saved-plan-flag" src="https://flagcdn.com/w160/${escapeHTML(plan.countryCode.toLowerCase())}.png" alt="Flag of ${escapeHTML(plan.country)}">`
            : "";

        card.innerHTML = `
            <div class="saved-plan-top">
                ${flag}
                <span class="saved-plan-label">SAVED PLAN</span>
            </div>
            <h3>${escapeHTML(plan.country)}</h3>
            <p class="saved-plan-capital">Capital: ${escapeHTML(plan.capital)}</p>
            <div class="saved-plan-details">
                <div>
                    <small>Package</small>
                    <strong>${escapeHTML(plan.packageName)}</strong>
                </div>
                <div>
                    <small>Duration</small>
                    <strong>${escapeHTML(plan.days)} days</strong>
                </div>
                <div>
                    <small>Travellers</small>
                    <strong>${escapeHTML(plan.travellers)} people</strong>
                </div>
                <div>
                    <small>Date saved</small>
                    <strong>${escapeHTML(savedDate)}</strong>
                </div>
            </div>
            <div class="saved-plan-budget">
                <small>Estimated budget</small>
                <h2>RM ${Number(plan.total || 0).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
            </div>
            <div class="saved-plan-notes">
                <small>Travel notes</small>
                <p>${escapeHTML(plan.notes || "No notes added yet.")}</p>
            </div>
            <div class="saved-plan-actions">
                <button class="edit-button" data-id="${Number(plan.id)}">Edit</button>
                <button class="delete-button" data-id="${Number(plan.id)}">Delete</button>
            </div>
        `;

        plansContainer.appendChild(card);
    });

    document.querySelectorAll(".edit-button").forEach(button => {
        button.addEventListener("click", () => openEditModal(Number(button.dataset.id)));
    });

    document.querySelectorAll(".delete-button").forEach(button => {
        button.addEventListener("click", () => deletePlan(Number(button.dataset.id)));
    });
}

function openEditModal(id) {
    const plan = getSavedPlans().find(item => item.id === id);

    if (!plan) {
        alert("Travel plan not found.");
        return;
    }

    editPlanId.value = plan.id;
    editCountry.value = plan.country;
    editDays.value = plan.days;
    editTravellers.value = plan.travellers;
    editNotes.value = plan.notes || "";
    editModal.classList.remove("hidden");
}

function closeEditModal() {
    editModal.classList.add("hidden");
}

closeModalBtn.addEventListener("click", closeEditModal);

updatePlanBtn.addEventListener("click", updatePlan);

function updatePlan() {
    const id = Number(editPlanId.value);
    const days = Number(editDays.value);
    const numberOfTravellers = Number(editTravellers.value);
    const notes = editNotes.value.trim();

    if (!Number.isInteger(days) || days < 1 || days > 365) {
        alert("Please enter a valid travel duration.");
        return;
    }

    if (!Number.isInteger(numberOfTravellers) || numberOfTravellers < 1 || numberOfTravellers > 100) {
        alert("Please enter a valid number of travellers.");
        return;
    }

    const plans = getSavedPlans();
    const index = plans.findIndex(item => item.id === id);

    if (index === -1) {
        alert("Travel plan not found.");
        return;
    }

    const plan = plans[index];
    const newTotal = plan.pricePerDay * plan.regionMultiplier * days * numberOfTravellers;

    plans[index] = {
        ...plan,
        days: days,
        travellers: numberOfTravellers,
        total: newTotal,
        notes: notes
    };

    storePlans(plans);
    closeEditModal();
    displayPlans();
    alert("Travel plan updated successfully!");
}

function deletePlan(id) {
    if (!confirm("Are you sure you want to delete this travel plan?")) return;

    storePlans(getSavedPlans().filter(plan => plan.id !== id));
    displayPlans();
    alert("Travel plan deleted successfully!");
}

refreshBtn.addEventListener("click", displayPlans);

displayPlans();