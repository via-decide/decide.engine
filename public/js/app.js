const loadPhonesBtn = document.getElementById("loadPhonesBtn");
const createJobBtn = document.getElementById("createJobBtn");
const phonesList = document.getElementById("phonesList");
const jobsList = document.getElementById("jobsList");

let phones = [];
let jobs = [];

// Simulated API call
function fetchPhones() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                { id: 1, name: "iPhone 15 Pro", selected: false },
                { id: 2, name: "Samsung Galaxy S24", selected: false },
                { id: 3, name: "Google Pixel 8", selected: false },
            ]);
        }, 800);
    });
}

function renderPhones() {
    phonesList.innerHTML = "";

    phones.forEach(phone => {
        const card = document.createElement("div");
        card.className = "card";

        const label = document.createElement("label");
        label.innerHTML = `
            <input type="checkbox" data-id="${phone.id}" ${phone.selected ? "checked" : ""} />
            ${phone.name}
        `;

        card.appendChild(label);
        phonesList.appendChild(card);
    });

    updateCreateButtonState();
}

function updateCreateButtonState() {
    const anySelected = phones.some(p => p.selected);
    createJobBtn.disabled = !anySelected;
}

function renderJobs() {
    jobsList.innerHTML = "";

    jobs.forEach(job => {
        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
            <div>🎥 Job #${job.id} (${job.phones.join(", ")})</div>
            <div class="status ${job.status.toLowerCase()}">
                ${job.status}
            </div>
        `;

        jobsList.appendChild(card);
    });
}

function createVideoJob() {
    const selectedPhones = phones
        .filter(p => p.selected)
        .map(p => p.name);

    const newJob = {
        id: jobs.length + 1,
        phones: selectedPhones,
        status: "Queued"
    };

    jobs.push(newJob);
    renderJobs();

    simulateJobProgress(newJob);
}

function simulateJobProgress(job) {
    setTimeout(() => {
        job.status = "Processing";
        renderJobs();
    }, 1500);

    setTimeout(() => {
        job.status = "Done";
        renderJobs();
    }, 4000);
}

// Events

loadPhonesBtn.addEventListener("click", async () => {
    loadPhonesBtn.disabled = true;
    loadPhonesBtn.textContent = "Loading...";

    phones = await fetchPhones();

    loadPhonesBtn.textContent = "📱 Load Phones";
    renderPhones();
});

phonesList.addEventListener("change", (e) => {
    if (e.target.type === "checkbox") {
        const id = Number(e.target.dataset.id);
        const phone = phones.find(p => p.id === id);
        phone.selected = e.target.checked;
        updateCreateButtonState();
    }
});

createJobBtn.addEventListener("click", createVideoJob);
