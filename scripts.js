// Auto-save enabled for all fields in Sections 1 and 2.
// Full script included below.

let chart;

function toggleTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  document.documentElement.setAttribute(
    "data-theme",
    isDark ? "light" : "dark"
  );
  localStorage.setItem("theme", isDark ? "light" : "dark");
}

function saveContractDetails() {
  const data = {
    supplier: supplier.value,
    endDate: endDate.value,
    elecRate: elecRate.value,
    elecStanding: elecStanding.value,
    gasRate: gasRate.value,
    gasStanding: gasStanding.value,
  };
  localStorage.setItem("contractDetails", JSON.stringify(data));
}

function loadContractDetails() {
  const data = JSON.parse(localStorage.getItem("contractDetails") || "{}");
  supplier.value = data.supplier || "";
  endDate.value = data.endDate || "";
  elecRate.value = data.elecRate || "";
  elecStanding.value = data.elecStanding || "";
  gasRate.value = data.gasRate || "";
  gasStanding.value = data.gasStanding || "";
}

function addYearSection(year = new Date().getFullYear(), suppressSave = false) {
  const container = document.getElementById("yearSections");
  const wrapper = document.createElement("div");
  wrapper.className = "card";

  // Generate the HTML for each month with calculated last day
  wrapper.innerHTML = `
    <div class="section-title">
      <input value="${year}" onchange="saveReadings()" style="font-size: 1.2rem; font-weight: bold;" />
      <button onclick="this.closest('.card').remove(); saveReadings();" class="error">Remove</button>
    </div>
    <div class="grid">
      ${Array.from({ length: 12 })
        .map((_, i) => {
          // Calculate the last day of the month
          const month = i + 1; // months are 0-indexed in JS Date, so add 1
          const lastDay = new Date(year, month, 0).getDate();
          const formattedDate = `${year}-${month
            .toString()
            .padStart(2, "0")}-${lastDay.toString().padStart(2, "0")}`;

          return `
        <div class="card">
          <strong>${new Date(0, i).toLocaleString("default", {
            month: "long",
          })}</strong>
          <div><label>Date<input type="date" value="${formattedDate}" style="width: 92%;" /></label></div>
          <div class="reading-row">
            <input type="number" placeholder="Electricity Reading" />
            <select><option>kWh</option><option>m3</option></select>
          </div>
          <div class="reading-row">
            <input type="number" placeholder="Gas Reading" />
            <select><option>kWh</option><option>m3</option></select>
          </div>
        </div>
        `;
        })
        .join("")}
    </div>
  `;

  container.appendChild(wrapper);
  wrapper
    .querySelectorAll("input, select")
    .forEach((el) => el.addEventListener("change", saveReadings));
  if (!suppressSave) saveReadings();
  updateChartYearOptions();
}

function saveReadings() {
  const years = [];
  document.querySelectorAll("#yearSections > .card").forEach((section) => {
    const year = section.querySelector("input").value;
    const months = Array.from(section.querySelectorAll(".grid > .card")).map(
      (card) => {
        const [date, elec, elecUnit, gas, gasUnit] =
          card.querySelectorAll("input, select");
        return {
          date: date.value,
          elec: +elec.value || 0,
          elecUnit: elecUnit.value,
          gas: +gas.value || 0,
          gasUnit: gasUnit.value,
        };
      }
    );
    years.push({ year, months });
  });
  localStorage.setItem("readings", JSON.stringify(years));
  updateCharts();
}

function loadReadings() {
  const data = JSON.parse(localStorage.getItem("readings") || "[]");
  data.forEach(({ year, months }) => {
    addYearSection(year, true);
    // Replace .at(-1) with standard array access
    const sections = document.querySelectorAll("#yearSections > .card");
    const section = sections[sections.length - 1]; // Gets the last element
    const cards = section.querySelectorAll(".grid > .card");
    months.forEach((m, i) => {
      const card = cards[i];
      if (!card) return; // Skip if no matching card
      const dateInput = card.querySelector('input[type="date"]');
      const elecInput = card.querySelector(
        'input[placeholder="Electricity Reading"]'
      );
      const elecUnit = elecInput?.nextElementSibling;
      const gasInput = card.querySelector('input[placeholder="Gas Reading"]');
      const gasUnit = gasInput?.nextElementSibling;
      if (dateInput) dateInput.value = m.date;
      if (elecInput) elecInput.value = m.elec;
      if (elecUnit) elecUnit.value = m.elecUnit;
      if (gasInput) gasInput.value = m.gas;
      if (gasUnit) gasUnit.value = m.gasUnit;
    });
    section
      .querySelectorAll("input, select")
      .forEach((el) => el.addEventListener("change", saveReadings));
  });
}

function updateChartYearOptions() {
  const chartYear = document.getElementById("chartYear");
  chartYear.innerHTML = "";
  const data = JSON.parse(localStorage.getItem("readings") || "[]");
  data.forEach((y) => {
    const opt = document.createElement("option");
    opt.value = y.year;
    opt.textContent = y.year;
    chartYear.appendChild(opt);
  });
}

function updateCharts() {
  const year = document.getElementById("chartYear").value;
  const data = JSON.parse(localStorage.getItem("readings") || "[]");
  const yearData = data.find((y) => y.year == year);
  if (!yearData) return;

  const labels = [...Array(12)].map((_, i) =>
    new Date(0, i).toLocaleString("default", { month: "short" })
  );
  const elecData = yearData.months.map((m) => m.elec);
  const gasData = yearData.months.map((m) => m.gas);

  const ctx = document.getElementById("usageChart").getContext("2d");
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Electricity",
          data: elecData,
          borderColor: "#007acc",
          fill: false,
        },
        { label: "Gas", data: gasData, borderColor: "#cc3300", fill: false },
      ],
    },
  });

  const summary = document.getElementById("monthlySummary");
  summary.innerHTML = "";
  yearData.months.forEach((m, i) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <strong>${labels[i]}</strong>
      <p>Electricity: ${m.elec} ${m.elecUnit}</p>
      <p>Gas: ${m.gas} ${m.gasUnit}</p>
    `;
    summary.appendChild(div);
  });
}

function exportData() {
  const data = {
    contract: JSON.parse(localStorage.getItem("contractDetails") || "{}"),
    readings: JSON.parse(localStorage.getItem("readings") || "[]"),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "energy-data.json";
  a.click();
}

function importDataPrompt() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = JSON.parse(e.target.result);
      localStorage.setItem("contractDetails", JSON.stringify(data.contract));
      localStorage.setItem("readings", JSON.stringify(data.readings));
      location.reload();
    };
    reader.readAsText(file);
  };
  input.click();
}

function clearData() {
  if (confirm("Clear all saved energy data?")) {
    localStorage.clear();
    location.reload();
  }
}

// Expose functions for inline handlers
window.toggleTheme = toggleTheme;
window.exportData = exportData;
window.importDataPrompt = importDataPrompt;
window.clearData = clearData;
window.addYearSection = addYearSection;
window.saveContractDetails = saveContractDetails;
window.updateCharts = updateCharts;

loadReadings();
