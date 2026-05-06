const STORE_KEY = "shop_manager_v1";
const STOCK_TAXONOMY = {
  "Devices": {
    categories: {
      Laptop: ["Laptop", "Tablet", "Desktop"],
      Phone: ["Phone", "Smartphone", "Tablet"],
      Printer: ["Printer", "Scanner", "Fax"],
      Monitor: ["Monitor", "Projector", "TV"],
      Keyboard: ["Keyboard", "Mouse", "Headset"],
      Speaker: ["Speaker", "Microphone", "Soundbar"],
      Camera: ["Camera", "Action Camera", "Security Camera"],
      Other: ["Other", "Other", "Other"]
    }
  },
  "Cables": {
    categories: {
      Cable: ["HDMI Cable", "USB Cable", "LAN Cable"],
    }
  },
  "Storage": {
    categories: {
      Hard_Drive: ["Hard Drive", "SSD", "HDD"],
      Memory_Card: ["Memory Card", "SD Card", "Micro SD Card"],
      Flash_Drive: ["Flash Drive", "USB Flash Drive", "Micro USB Flash Drive"],
      External_SSD: ["External SSD", "External Hard Drive", "External Flash Drive"],
      Internal_SSD: ["Internal SSD", "Internal Hard Drive", "Internal Flash Drive"],
      Internal_HDD: ["Internal HDD", "Internal Hard Drive", "Internal Flash Drive"],
      Internal_Flash: ["Internal Flash", "Internal Hard Drive", "Internal Flash Drive"],
      Internal_RAM: ["Internal RAM", "Internal Hard Drive", "Internal Flash Drive"],
      Internal_ROM: ["Internal ROM", "Internal Hard Drive", "Internal Flash Drive"],
      Other: ["Other", "Other", "Other"]
    }
  },
  "Components": {
    categories: {
      CPU: ["CPU", "GPU", "Motherboard"],
      RAM: ["RAM", "ROM", "Flash"],
      Other: ["Other", "Other", "Other"]
    }
  },
  "Accessories": {
    categories: {
      Case: ["Case", "Cooling Fan", "Power Supply"],
      Cooling: ["Cooling Fan", "Water Cooler", "CPU Cooler"],
      Other: ["Other", "Other", "Other"]
    }
  }
};
const STOCK_BRAND_RULES = {
  Devices: {
    Laptop: {
      Laptop: ["Dell", "HP", "Lenovo", "Asus"],
      Tablet: ["Apple", "Samsung", "Lenovo"],
      Desktop: ["HP", "Dell", "Acer"]
    },
    Phone: {
      Phone: ["Apple", "Samsung", "Xiaomi"],
      Smartphone: ["Apple", "Samsung", "Oppo", "Vivo"],
      Tablet: ["Apple", "Samsung", "Lenovo"]
    },
    Printer: {
      Printer: ["HP", "Canon", "Brother", "Epson"],
      Scanner: ["Canon", "Brother", "Epson"],
      Fax: ["Brother", "Panasonic"]
    }
  },
  Cables: {
    Cable: {
      "HDMI Cable": ["Ugreen", "Baseus", "Belkin"],
      "USB Cable": ["Anker", "Baseus", "Ugreen"],
      "LAN Cable": ["Linksys", "TP-Link", "D-Link"]
    }
  },
  Storage: {
    Hard_Drive: {
      "Hard Drive": ["Seagate", "Western Digital", "Toshiba"],
      SSD: ["Samsung", "Kingston", "Crucial"],
      HDD: ["Seagate", "Western Digital", "Toshiba"]
    },
    Memory_Card: {
      "Memory Card": ["SanDisk", "Kingston", "Samsung"],
      "SD Card": ["SanDisk", "Lexar", "Kingston"],
      "Micro SD Card": ["SanDisk", "Samsung", "Kingston"]
    }
  },
  Components: {
    CPU: {
      CPU: ["Intel", "AMD"],
      GPU: ["NVIDIA", "AMD", "Asus"],
      Motherboard: ["Asus", "MSI", "Gigabyte"]
    },
    RAM: {
      RAM: ["Kingston", "Corsair", "G.Skill"],
      ROM: ["Samsung", "Micron"],
      Flash: ["Kingston", "SanDisk"]
    }
  }
};

const appData = loadData();
let editingStockId = null;
let editingCostId = null;
let editingSalesId = null;

function loadData() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { costs: [], sales: [], stock: [] };
    const parsed = JSON.parse(raw);
    return {
      costs: Array.isArray(parsed.costs) ? parsed.costs : [],
      sales: Array.isArray(parsed.sales) ? parsed.sales : [],
      stock: Array.isArray(parsed.stock) ? parsed.stock : []
    };
  } catch (error) {
    return { costs: [], sales: [], stock: [] };
  }
}

function persist() {
  localStorage.setItem(STORE_KEY, JSON.stringify(appData));
}

function formatMoney(value) {
  const amount = Number(value) || 0;
  return "THB " + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function switchPage(pageId) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.toggle("active", page.id === `page-${pageId}`);
  });

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === pageId);
  });
}

function openModal(type) {
  const modal = document.getElementById(`modal-${type}`);
  modal.classList.add("show");

  if (type === "cost") {
    resetCostForm();
  }
  if (type === "sales") {
    resetSalesForm();
  }

  if (type === "cost" || type === "sales") {
    const today = new Date().toISOString().slice(0, 10);
    const dateInputId = type === "cost" ? "cost-date" : "sales-date";
    document.getElementById(dateInputId).value = today;
  }

  if (type === "stock") {
    resetStockForm();
  }
}

function closeModal(type) {
  document.getElementById(`modal-${type}`).classList.remove("show");
}

function upsertSupplierOption(name) {
  const select = document.getElementById("cost-supplier");
  const exists = [...select.options].some((option) => option.value === name);
  if (!exists && name && name !== "Other") {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.insertBefore(option, select.querySelector("option[value='Other']"));
  }
}

function saveCost() {
  const date = document.getElementById("cost-date").value;
  const amount = Number(document.getElementById("cost-amount").value);
  const selectedSupplier = document.getElementById("cost-supplier").value;
  const customSupplier = document.getElementById("cost-supplier-other").value.trim();
  const note = document.getElementById("cost-note").value.trim();

  const supplier = selectedSupplier === "Other" ? customSupplier : selectedSupplier;

  if (!date || !supplier || !amount || amount <= 0) {
    alert("Please complete all required fields for cost entry.");
    return;
  }

  const payload = {
    id: Date.now(),
    date,
    amount,
    supplier,
    note
  };

  if (editingCostId) {
    const index = appData.costs.findIndex((row) => row.id === editingCostId);
    if (index !== -1) {
      payload.id = editingCostId;
      appData.costs[index] = payload;
    } else {
      appData.costs.push(payload);
    }
  } else {
    appData.costs.push(payload);
  }

  upsertSupplierOption(supplier);
  persist();
  renderAll();
  closeModal("cost");
}

function saveSales() {
  const date = document.getElementById("sales-date").value;
  const amount = Number(document.getElementById("sales-amount").value);
  const note = document.getElementById("sales-note").value.trim();

  if (!date || !amount || amount <= 0) {
    alert("Please complete all required fields for sales entry.");
    return;
  }

  const payload = {
    id: Date.now(),
    date,
    amount,
    note
  };

  if (editingSalesId) {
    const index = appData.sales.findIndex((row) => row.id === editingSalesId);
    if (index !== -1) {
      payload.id = editingSalesId;
      appData.sales[index] = payload;
    } else {
      appData.sales.push(payload);
    }
  } else {
    appData.sales.push(payload);
  }

  persist();
  renderAll();
  closeModal("sales");
}

function getSelectValue(selectId, customInputId) {
  const selected = document.getElementById(selectId).value;
  if (selected === "Other") {
    return document.getElementById(customInputId).value.trim();
  }
  return selected.trim();
}

function toggleStockOtherField(selectId, wrapperId) {
  const isOther = document.getElementById(selectId).value === "Other";
  document.getElementById(wrapperId).classList.toggle("hidden", !isOther);
}

function setSelectOptions(selectId, options, placeholder) {
  const select = document.getElementById(selectId);
  const currentValue = select.value;
  const list = Array.from(new Set(options));

  const html = [`<option value="">${placeholder}</option>`]
    .concat(list.map((item) => `<option value="${item}">${item}</option>`))
    .concat('<option value="Other">Other</option>')
    .join("");

  select.innerHTML = html;
  if (currentValue && [...select.options].some((option) => option.value === currentValue)) {
    select.value = currentValue;
  } else {
    select.value = "";
  }
}

function updateStockDependentOptions() {
  const productType = document.getElementById("stock-product-type-select").value;
  const category = document.getElementById("stock-category-select").value;
  const subcategory = document.getElementById("stock-subcategory-select").value;

  let categoryOptions = [];
  let subcategoryOptions = [];
  let brandOptions = [];

  if (productType && productType !== "Other" && STOCK_TAXONOMY[productType]) {
    const categoryMap = STOCK_TAXONOMY[productType].categories;
    categoryOptions = Object.keys(categoryMap);

    if (category && category !== "Other" && categoryMap[category]) {
      subcategoryOptions = categoryMap[category];
    }
  }

  if (
    productType &&
    category &&
    subcategory &&
    productType !== "Other" &&
    category !== "Other" &&
    subcategory !== "Other" &&
    STOCK_BRAND_RULES[productType] &&
    STOCK_BRAND_RULES[productType][category] &&
    STOCK_BRAND_RULES[productType][category][subcategory]
  ) {
    brandOptions = STOCK_BRAND_RULES[productType][category][subcategory];
  }

  setSelectOptions("stock-category-select", categoryOptions, "-- Select Category --");
  setSelectOptions("stock-subcategory-select", subcategoryOptions, "-- Select Subcategory --");
  setSelectOptions("stock-brand-select", brandOptions, "-- Select Brand --");

  toggleStockOtherField("stock-product-type-select", "stock-product-type-other-wrap");
  toggleStockOtherField("stock-category-select", "stock-category-other-wrap");
  toggleStockOtherField("stock-subcategory-select", "stock-subcategory-other-wrap");
  toggleStockOtherField("stock-brand-select", "stock-brand-other-wrap");
}

function resetCostForm() {
  editingCostId = null;
  document.querySelector("#modal-cost h3").textContent = "Add Cost Entry";
  document.getElementById("save-cost-btn").textContent = "Save";
  document.getElementById("cost-date").value = "";
  document.getElementById("cost-amount").value = "";
  document.getElementById("cost-supplier").value = "";
  document.getElementById("cost-supplier-other").value = "";
  document.getElementById("cost-note").value = "";
}

function resetSalesForm() {
  editingSalesId = null;
  document.querySelector("#modal-sales h3").textContent = "Add Sales Entry";
  document.getElementById("save-sales-btn").textContent = "Save";
  document.getElementById("sales-date").value = "";
  document.getElementById("sales-amount").value = "";
  document.getElementById("sales-note").value = "";
}

function resetStockForm() {
  editingStockId = null;
  document.querySelector("#modal-stock h3").textContent = "Add Product to Stock";
  document.getElementById("save-stock-btn").textContent = "Save";
  document.getElementById("stock-product-type-select").value = "";
  document.getElementById("stock-product-type-other").value = "";
  document.getElementById("stock-category-other").value = "";
  document.getElementById("stock-subcategory-other").value = "";
  document.getElementById("stock-brand-other").value = "";
  document.getElementById("stock-name").value = "";
  document.getElementById("stock-description").value = "";
  document.getElementById("stock-qty").value = "";
  document.getElementById("stock-cost").value = "";
  document.getElementById("stock-price").value = "";
  document.getElementById("stock-note").value = "";

  updateStockDependentOptions();
}

function setStockSelectOrOther(selectId, otherInputId, wrapperId, value) {
  const select = document.getElementById(selectId);
  const targetValue = (value || "").trim();
  if (!targetValue) {
    select.value = "";
    document.getElementById(otherInputId).value = "";
    toggleStockOtherField(selectId, wrapperId);
    return;
  }

  const exists = [...select.options].some((option) => option.value === targetValue);
  if (exists) {
    select.value = targetValue;
    document.getElementById(otherInputId).value = "";
  } else {
    select.value = "Other";
    document.getElementById(otherInputId).value = targetValue;
  }
  toggleStockOtherField(selectId, wrapperId);
}

function editCost(id) {
  const item = appData.costs.find((row) => row.id === id);
  if (!item) return;

  resetCostForm();
  editingCostId = id;
  document.querySelector("#modal-cost h3").textContent = "Update Cost Entry";
  document.getElementById("save-cost-btn").textContent = "Update";

  document.getElementById("cost-date").value = item.date;
  document.getElementById("cost-amount").value = item.amount;
  upsertSupplierOption(item.supplier);
  const supplierSelect = document.getElementById("cost-supplier");
  const supplierExists = [...supplierSelect.options].some((option) => option.value === item.supplier);
  if (supplierExists) {
    supplierSelect.value = item.supplier;
    document.getElementById("cost-supplier-other").value = "";
  } else {
    supplierSelect.value = "Other";
    document.getElementById("cost-supplier-other").value = item.supplier;
  }
  document
    .getElementById("cost-supplier-other-wrap")
    .classList.toggle("hidden", supplierSelect.value !== "Other");
  document.getElementById("cost-note").value = item.note || "";

  document.getElementById("modal-cost").classList.add("show");
}

function editStock(id) {
  const item = appData.stock.find((row) => row.id === id);
  if (!item) return;

  resetStockForm();
  editingStockId = id;
  document.querySelector("#modal-stock h3").textContent = "Update Stock Item";
  document.getElementById("save-stock-btn").textContent = "Update";
  document.getElementById("modal-stock").classList.add("show");

  setStockSelectOrOther("stock-product-type-select", "stock-product-type-other", "stock-product-type-other-wrap", item.productType);
  updateStockDependentOptions();
  setStockSelectOrOther("stock-category-select", "stock-category-other", "stock-category-other-wrap", item.category);
  updateStockDependentOptions();
  setStockSelectOrOther("stock-subcategory-select", "stock-subcategory-other", "stock-subcategory-other-wrap", item.subcategory);
  updateStockDependentOptions();
  setStockSelectOrOther("stock-brand-select", "stock-brand-other", "stock-brand-other-wrap", item.brand);

  document.getElementById("stock-name").value = item.name || "";
  document.getElementById("stock-description").value = item.description || "";
  document.getElementById("stock-qty").value = item.quantity;
  document.getElementById("stock-cost").value = item.cost;
  document.getElementById("stock-price").value = item.price;
  document.getElementById("stock-note").value = item.note || "";
}

function editSales(id) {
  const item = appData.sales.find((row) => row.id === id);
  if (!item) return;

  resetSalesForm();
  editingSalesId = id;
  document.querySelector("#modal-sales h3").textContent = "Update Sales Entry";
  document.getElementById("save-sales-btn").textContent = "Update";
  document.getElementById("sales-date").value = item.date;
  document.getElementById("sales-amount").value = item.amount;
  document.getElementById("sales-note").value = item.note || "";
  document.getElementById("modal-sales").classList.add("show");
}

function saveStock() {
  const item = {
    id: Date.now(),
    productType: getSelectValue("stock-product-type-select", "stock-product-type-other"),
    category: getSelectValue("stock-category-select", "stock-category-other"),
    subcategory: getSelectValue("stock-subcategory-select", "stock-subcategory-other"),
    brand: getSelectValue("stock-brand-select", "stock-brand-other"),
    name: document.getElementById("stock-name").value.trim(),
    description: document.getElementById("stock-description").value.trim(),
    quantity: Number(document.getElementById("stock-qty").value),
    cost: Number(document.getElementById("stock-cost").value),
    price: Number(document.getElementById("stock-price").value),
    note: document.getElementById("stock-note").value.trim()
  };

  if (!item.name || Number.isNaN(item.quantity) || Number.isNaN(item.cost) || Number.isNaN(item.price)) {
    alert("Please complete all required stock fields.");
    return;
  }

  if (editingStockId) {
    const index = appData.stock.findIndex((row) => row.id === editingStockId);
    if (index !== -1) {
      item.id = editingStockId;
      appData.stock[index] = item;
    } else {
      appData.stock.push(item);
    }
  } else {
    appData.stock.push(item);
  }
  persist();
  renderAll();
  closeModal("stock");
}

function deleteById(type, id) {
  if (!confirm("Are you sure you want to delete this record?")) return;
  appData[type] = appData[type].filter((row) => row.id !== id);
  persist();
  renderAll();
}

function renderDashboard() {
  const costTotal = appData.costs.reduce((sum, item) => sum + item.amount, 0);
  const salesTotal = appData.sales.reduce((sum, item) => sum + item.amount, 0);
  const profit = salesTotal - costTotal;

  document.getElementById("sum-cost").textContent = formatMoney(costTotal);
  document.getElementById("sum-sales").textContent = formatMoney(salesTotal);

  const profitEl = document.getElementById("sum-profit");
  profitEl.textContent = formatMoney(profit);
  profitEl.classList.remove("profit-positive", "profit-negative");
  profitEl.classList.add(profit >= 0 ? "profit-positive" : "profit-negative");

  const supplierSummary = document.getElementById("supplier-summary");
  const grouped = {};
  appData.costs.forEach((item) => {
    grouped[item.supplier] = (grouped[item.supplier] || 0) + item.amount;
  });

  const supplierEntries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  supplierSummary.innerHTML = supplierEntries.length
    ? supplierEntries
        .map(([name, total]) => `<div class="list-item"><span>${name}</span><strong>${formatMoney(total)}</strong></div>`)
        .join("")
    : `<p class="empty">No cost data available.</p>`;

  const recent = [
    ...appData.costs.map((item) => ({ ...item, type: "Cost" })),
    ...appData.sales.map((item) => ({ ...item, type: "Sale" }))
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id)
    .slice(0, 10);

  const recentBody = document.getElementById("recent-table");
  recentBody.innerHTML = recent.length
    ? recent
        .map(
          (item) => `<tr>
              <td>${formatDate(item.date)}</td>
              <td>${item.type}</td>
              <td>${item.type === "Cost" ? item.supplier : "-"}${item.note ? ` / ${item.note}` : ""}</td>
              <td class="right">${formatMoney(item.amount)}</td>
            </tr>`
        )
        .join("")
    : `<tr><td colspan="4" class="empty">No transactions yet.</td></tr>`;
}

function renderCostTable() {
  const tbody = document.getElementById("cost-table");
  const rows = [...appData.costs].sort((a, b) => new Date(b.date) - new Date(a.date));

  tbody.innerHTML = rows.length
    ? rows
        .map(
          (item) => `<tr>
              <td>${formatDate(item.date)}</td>
              <td>${item.supplier}</td>
              <td>${item.note || "-"}</td>
              <td class="right">${formatMoney(item.amount)}</td>
              <td class="center"><button class="ghost-btn" onclick="editCost(${item.id})">Edit</button></td>
              <td class="center"><button class="delete-btn" onclick="deleteById('costs', ${item.id})">Delete</button></td>
            </tr>`
        )
        .join("")
    : `<tr><td colspan="6" class="empty">No cost entries found.</td></tr>`;
}

function renderSalesTable() {
  const tbody = document.getElementById("sales-table");
  const rows = [...appData.sales].sort((a, b) => new Date(b.date) - new Date(a.date));

  tbody.innerHTML = rows.length
    ? rows
        .map(
          (item) => `<tr>
              <td>${formatDate(item.date)}</td>
              <td>${item.note || "-"}</td>
              <td class="right">${formatMoney(item.amount)}</td>
              <td class="center"><button class="ghost-btn" onclick="editSales(${item.id})">Edit</button></td>
              <td class="center"><button class="delete-btn" onclick="deleteById('sales', ${item.id})">Delete</button></td>
            </tr>`
        )
        .join("")
    : `<tr><td colspan="5" class="empty">No sales entries found.</td></tr>`;
}

function renderStockTable() {
  const tbody = document.getElementById("stock-table");
  const rows = [...appData.stock].sort((a, b) => a.name.localeCompare(b.name, "en"));

  tbody.innerHTML = rows.length
    ? rows
        .map(
          (item) => `<tr>
              <td>${item.productType || "-"}</td>
              <td>${item.category || "-"}</td>
              <td>${item.subcategory || "-"}</td>
              <td>${item.brand || "-"}</td>
              <td>${item.name}</td>
              <td>${item.description || "-"}</td>
              <td class="right">${item.quantity.toLocaleString("en-US")}</td>
              <td class="right">${formatMoney(item.cost)}</td>
              <td class="right">${formatMoney(item.price)}</td>
              <td>${item.note || "-"}</td>
              <td class="center"><button class="ghost-btn" onclick="editStock(${item.id})">Edit</button></td>
              <td class="center"><button class="delete-btn" onclick="deleteById('stock', ${item.id})">Delete</button></td>
            </tr>`
        )
        .join("")
    : `<tr><td colspan="12" class="empty">No stock items found.</td></tr>`;
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function getCellValue(row, headerMap, aliases) {
  for (const alias of aliases) {
    const key = normalizeHeader(alias);
    if (headerMap[key]) return row[headerMap[key]];
  }
  return "";
}

function parseNumber(value) {
  return Number(String(value || "").replace(/,/g, "").trim());
}

function sanitizeNumericInput(value, allowDecimal) {
  const cleaned = String(value || "").replace(/[^\d.]/g, "");
  if (!allowDecimal) {
    return cleaned.replace(/\./g, "");
  }

  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function enforceNumberOnly(inputId, allowDecimal) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener("input", () => {
    input.value = sanitizeNumericInput(input.value, allowDecimal);
  });

  input.addEventListener("keydown", (event) => {
    if (["e", "E", "+", "-"].includes(event.key)) {
      event.preventDefault();
    }
  });
}

function importStockFromFile(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const workbook = XLSX.read(event.target.result, { type: "array" });
      const firstSheet = workbook.SheetNames[0];
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: "" });

      if (!rows.length) {
        alert("No data found in the selected file.");
        return;
      }

      const headerMap = {};
      Object.keys(rows[0]).forEach((header) => {
        headerMap[normalizeHeader(header)] = header;
      });

      let imported = 0;
      let skipped = 0;

      rows.forEach((row, index) => {
        const name = String(getCellValue(row, headerMap, ["Product Name", "Name", "Item Name", "à¸Šà¸·à¹ˆà¸­à¸ªà¸´à¸™à¸„à¹‰à¸²"])).trim();
        const quantity = parseNumber(getCellValue(row, headerMap, ["Quantity", "Qty", "à¸ˆà¸³à¸™à¸§à¸™à¸„à¸‡à¹€à¸«à¸¥à¸·à¸­"]));
        const cost = parseNumber(getCellValue(row, headerMap, ["Cost Price", "Cost", "à¸£à¸²à¸„à¸²à¸•à¹‰à¸™à¸—à¸¸à¸™"]));
        const price = parseNumber(getCellValue(row, headerMap, ["Selling Price", "Price", "à¸£à¸²à¸„à¸²à¸‚à¸²à¸¢"]));

        if (!name || Number.isNaN(quantity) || Number.isNaN(cost) || Number.isNaN(price)) {
          skipped += 1;
          return;
        }

        appData.stock.push({
          id: Date.now() + index,
          productType: String(getCellValue(row, headerMap, ["Product Type", "à¸›à¸£à¸°à¹€à¸ à¸—à¸ªà¸´à¸™à¸„à¹‰à¸²"])) .trim(),
          category: String(getCellValue(row, headerMap, ["Category", "à¸«à¸¡à¸§à¸”à¸«à¸¡à¸¹à¹ˆà¸ªà¸´à¸™à¸„à¹‰à¸²"])) .trim(),
          subcategory: String(getCellValue(row, headerMap, ["Subcategory", "à¸«à¸¡à¸§à¸”à¸«à¸¡à¸¹à¹ˆà¸ªà¸´à¸™à¸„à¹‰à¸²à¸£à¸­à¸‡"])) .trim(),
          brand: String(getCellValue(row, headerMap, ["Brand", "à¸¢à¸µà¹ˆà¸«à¹‰à¸­à¸ªà¸´à¸™à¸„à¹‰à¸²"])) .trim(),
          name,
          description: String(getCellValue(row, headerMap, ["Product Description", "Description", "à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”à¸ªà¸´à¸™à¸„à¹‰à¸²"])) .trim(),
          quantity,
          cost,
          price,
          note: String(getCellValue(row, headerMap, ["Additional Details", "Note", "à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸”à¹€à¸žà¸´à¹ˆà¸¡à¹€à¸•à¸´à¸¡"])) .trim()
        });
        imported += 1;
      });

      persist();
      renderAll();
      alert(`Imported ${imported} item(s). Skipped ${skipped} row(s).`);
    } catch (error) {
      alert("Import failed. Please verify the XLSX file format.");
    }
  };

  reader.readAsArrayBuffer(file);
}

function bindEvents() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchPage(btn.dataset.page));
  });

  document.querySelectorAll("[data-open-modal]").forEach((btn) => {
    btn.addEventListener("click", () => openModal(btn.dataset.openModal));
  });

  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => closeModal(btn.dataset.closeModal));
  });

  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.classList.remove("show");
      }
    });
  });

  document.getElementById("cost-supplier").addEventListener("change", (event) => {
    document
      .getElementById("cost-supplier-other-wrap")
      .classList.toggle("hidden", event.target.value !== "Other");
  });

  document.getElementById("save-cost-btn").addEventListener("click", saveCost);
  document.getElementById("save-sales-btn").addEventListener("click", saveSales);
  document.getElementById("save-stock-btn").addEventListener("click", saveStock);
  enforceNumberOnly("cost-amount", true);
  enforceNumberOnly("sales-amount", true);
  enforceNumberOnly("stock-qty", false);
  enforceNumberOnly("stock-cost", true);
  enforceNumberOnly("stock-price", true);
  document.getElementById("stock-product-type-select").addEventListener("change", () => {
    updateStockDependentOptions();
  });
  document.getElementById("stock-category-select").addEventListener("change", () => {
    updateStockDependentOptions();
  });
  document.getElementById("stock-subcategory-select").addEventListener("change", () => {
    updateStockDependentOptions();
  });
  document.getElementById("stock-brand-select").addEventListener("change", () => {
    toggleStockOtherField("stock-brand-select", "stock-brand-other-wrap");
  });

  const fileInput = document.getElementById("stock-file-input");
  document.getElementById("import-stock-btn").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) importStockFromFile(file);
    event.target.value = "";
  });
}

function renderAll() {
  renderDashboard();
  renderCostTable();
  renderSalesTable();
  renderStockTable();
}

document.addEventListener("DOMContentLoaded", () => {
  updateStockDependentOptions();
  bindEvents();
  renderAll();
});
