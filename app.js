const STORAGE_KEY = "goodledger-v1";
const colors = ["#63a87b", "#e6ae62", "#6d9cbd", "#dc8166", "#b6c7a2"];
const categoryCatalog = { expense: ["Food", "Housing", "Transport", "Shopping", "Bills", "Health", "Entertainment", "Travel", "Education", "Personal", "Other"], income: ["Salary", "Freelance", "Interest", "Gift", "Other income"] };
const defaultBudgets = [{ category: "Overall", limit: 60000 }, { category: "Food", limit: 10000 }, { category: "Housing", limit: 18000 }, { category: "Transport", limit: 5000 }, { category: "Shopping", limit: 7000 }, { category: "Bills", limit: 5000 }, { category: "Entertainment", limit: 4000 }];
const accountDefaults = [{ id: "bank", name: "Everyday bank", type: "bank", opening: 12000000 }, { id: "wallet", name: "Cash wallet", type: "cash", opening: 250000 }, { id: "card", name: "Credit card", type: "credit", opening: -420000 }];
const symbols = { Food: "✳", Housing: "⌂", Transport: "↗", Shopping: "◌", Bills: "ϟ", Health: "+", Entertainment: "♫", Salary: "↙", Freelance: "✎", Travel: "⌁", Education: "▤", Personal: "◇", Other: "·", Interest: "%", Gift: "✧", "Other income": "·" };
const $ = (selector) => document.querySelector(selector);
const state = loadState();
let selectedMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let transactionType = "expense";
let toastTimer;

function localDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function createSeedState() {
  const rows = [["Salary", "income", 85000, 1, "Monthly salary", "bank"], ["Housing", "expense", 18000, 2, "November rent", "bank"], ["Food", "expense", 425, 3, "Sunday brunch", "card"], ["Transport", "expense", 180, 4, "Metro card top-up", "wallet"], ["Bills", "expense", 1299, 6, "Internet bill", "bank"], ["Food", "expense", 860, 7, "Groceries", "card"], ["Freelance", "income", 12000, 9, "Brand project", "bank"], ["Entertainment", "expense", 650, 10, "Movie night", "card"], ["Shopping", "expense", 2190, 12, "Running shoes", "card"], ["Food", "expense", 310, 14, "Coffee and toast", "wallet"], ["Health", "expense", 780, 16, "Pharmacy", "card"], ["Transport", "expense", 245, 1, "Ride share", "card"], ["Food", "expense", 520, 3, "Lunch", "wallet"], ["Shopping", "expense", 1340, 5, "Home essentials", "card"], ["Entertainment", "expense", 499, 8, "Music subscription", "card"], ["Food", "expense", 690, 11, "Dinner", "card"], ["Bills", "expense", 799, 13, "Mobile plan", "bank"], ["Food", "expense", 365, 15, "Lunch", "wallet"]];
  const transactions = rows.map(([category, type, amount, day, note, accountId], index) => {
    const date = new Date(); date.setDate(Math.max(1, day));
    return { id: `seed-${index}`, category, type, amountMinor: amount * 100, date: localDate(date), note, accountId };
  });
  const priorMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  const oldRows = [["Salary", "income", 85000, 1, "Monthly salary", "bank"], ["Housing", "expense", 18000, 2, "October rent", "bank"], ["Food", "expense", 6100, 6, "Groceries and meals", "card"], ["Transport", "expense", 2600, 10, "Commute", "wallet"], ["Bills", "expense", 2250, 12, "Utilities", "bank"], ["Shopping", "expense", 5800, 18, "Household", "card"], ["Freelance", "income", 9000, 21, "Design work", "bank"], ["Entertainment", "expense", 1900, 25, "Weekend plans", "card"]];
  oldRows.forEach(([category, type, amount, day, note, accountId], index) => { const date = new Date(priorMonth.getFullYear(), priorMonth.getMonth(), day); transactions.push({ id: `prior-${index}`, category, type, amountMinor: amount * 100, date: localDate(date), note, accountId }); });
  return { transactions, budgets: defaultBudgets.map((budget) => ({ ...budget })), accounts: accountDefaults.map((account) => ({ ...account })) };
}
function loadState() {
  try { const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (stored?.transactions && stored?.budgets && stored?.accounts) return stored; }
  catch (error) { console.warn("Could not load saved GoodLedger data", error); }
  const seeded = createSeedState(); localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded)); return seeded;
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function formatMoney(minor, compact = false) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0, notation: compact && Math.abs(minor / 100) >= 100000 ? "compact" : "standard" }).format(minor / 100); }
function monthTransactions(date = selectedMonth) { return state.transactions.filter((transaction) => { const transactionDate = new Date(`${transaction.date}T12:00:00`); return transactionDate.getMonth() === date.getMonth() && transactionDate.getFullYear() === date.getFullYear(); }); }
function sums(transactions) { return transactions.reduce((totals, transaction) => { totals[transaction.type] += transaction.amountMinor; return totals; }, { income: 0, expense: 0 }); }
function escapeHTML(value) { return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character]); }
function formatDate(value) { return new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`)); }

function render() { renderMonth(); renderStats(); renderAccounts(); renderTrend(); renderBreakdown(); renderBudgets(); renderTransactions(); populateAccountSelect(); }
function renderMonth() {
  $("#month-title").textContent = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(selectedMonth);
  const now = new Date(); $("#next-month").disabled = selectedMonth.getFullYear() > now.getFullYear() || (selectedMonth.getFullYear() === now.getFullYear() && selectedMonth.getMonth() >= now.getMonth());
  $("#today-label").textContent = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(now).toUpperCase();
}
function renderStats() {
  const { income, expense } = sums(monthTransactions()); $("#income-total").textContent = formatMoney(income); $("#expense-total").textContent = formatMoney(expense); $("#savings-total").textContent = formatMoney(income - expense);
  $("#savings-caption").textContent = income ? `${Math.round(((income - expense) / income) * 100)}% of income kept` : "Income minus spending";
}
function accountBalances() {
  return state.accounts.map((account) => {
    const activity = state.transactions.filter((transaction) => transaction.accountId === account.id).reduce((total, transaction) => total + (transaction.type === "income" ? transaction.amountMinor : -transaction.amountMinor), 0);
    return { ...account, balance: account.opening + activity };
  });
}
function renderAccounts() {
  const accounts = accountBalances(); $("#account-total").textContent = formatMoney(accounts.reduce((total, account) => total + account.balance, 0), true);
  $("#account-list").innerHTML = accounts.map((account) => `<div class="account-row"><span class="account-name"><i class="account-bullet ${account.type === "credit" ? "card" : ""}"></i>${escapeHTML(account.name)}</span><strong>${formatMoney(account.balance, true)}</strong></div>`).join("");
}
function renderTrend() {
  const months = []; for (let offset = 5; offset >= 0; offset--) months.push(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - offset, 1));
  const totals = months.map((month) => sums(monthTransactions(month))); const max = Math.max(1, ...totals.flatMap((total) => [total.income, total.expense]));
  $("#trend-chart").innerHTML = months.map((month, index) => { const total = totals[index]; const incomeHeight = Math.max(3, (total.income / max) * 120); const expenseHeight = Math.max(3, (total.expense / max) * 120); return `<div class="trend-month" title="${escapeHTML(new Intl.DateTimeFormat("en", { month: "long" }).format(month))}: ${formatMoney(total.income)} income, ${formatMoney(total.expense)} spent"><div class="bar-pair"><i class="bar income" style="height:${incomeHeight}px"></i><i class="bar spent" style="height:${expenseHeight}px"></i></div><span>${new Intl.DateTimeFormat("en", { month: "short" }).format(month)}</span></div>`; }).join("");
}
function renderBreakdown() {
  const spent = monthTransactions().filter((transaction) => transaction.type === "expense"); const totals = new Map(); spent.forEach((transaction) => totals.set(transaction.category, (totals.get(transaction.category) || 0) + transaction.amountMinor));
  const entries = [...totals.entries()].sort((a, b) => b[1] - a[1]); const total = spent.reduce((sum, transaction) => sum + transaction.amountMinor, 0); $("#donut-total").textContent = formatMoney(total, true);
  let position = 0; const gradient = entries.length ? entries.map(([, amount], index) => { const start = position; position += total ? amount / total * 100 : 0; return `${colors[index % colors.length]} ${start}% ${position}%`; }).join(", ") : "#edf1eb 0 100%";
  $("#category-donut").style.background = `conic-gradient(${gradient})`; $("#category-donut").setAttribute("aria-label", entries.map(([name, amount]) => `${name}: ${formatMoney(amount)}`).join(", ") || "No spending yet");
  $("#category-legend").innerHTML = entries.slice(0, 5).map(([name, amount], index) => `<div class="legend-row"><span class="legend-name"><i class="legend-swatch" style="background:${colors[index % colors.length]}"></i>${escapeHTML(name)}</span><span class="legend-amount">${formatMoney(amount, true)}</span></div>`).join("") || "<span class=\"empty-legend\">No expenses yet</span>";
}
function renderBudgets() {
  const spentByCategory = new Map(); monthTransactions().filter((transaction) => transaction.type === "expense").forEach((transaction) => spentByCategory.set(transaction.category, (spentByCategory.get(transaction.category) || 0) + transaction.amountMinor));
  $("#budget-grid").innerHTML = state.budgets.map((budget) => {
    const spent = budget.category === "Overall" ? [...spentByCategory.values()].reduce((sum, amount) => sum + amount, 0) : (spentByCategory.get(budget.category) || 0); const percent = budget.limit ? spent / budget.limit * 100 : 0; const status = percent > 100 ? "over" : percent >= 80 ? "warning" : ""; const message = percent > 100 ? "Over budget" : percent >= 80 ? "Almost there" : `${Math.max(0, Math.round(100 - percent))}% left`;
    return `<div class="budget-item ${status}"><div class="budget-top"><span>${escapeHTML(budget.category)}</span><strong>${formatMoney(budget.limit, true)}</strong></div><div class="budget-bar"><span style="width:${Math.min(100, percent)}%"></span></div><div class="budget-foot"><span>${formatMoney(spent, true)} spent</span><strong>${message}</strong></div></div>`;
  }).join("");
}
function renderTransactions() {
  const query = $("#transaction-search").value.trim().toLowerCase(); const transactions = monthTransactions().filter((transaction) => { const account = state.accounts.find((item) => item.id === transaction.accountId)?.name || ""; return [transaction.note, transaction.category, account, transaction.type].some((value) => String(value || "").toLowerCase().includes(query)); }).sort((a, b) => b.date.localeCompare(a.date));
  const visible = transactions.slice(0, 8); $("#transaction-list").innerHTML = visible.map(transactionRow).join(""); $("#empty-state").hidden = transactions.length > 0; $("#transaction-count").textContent = `Showing ${visible.length} of ${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`; $("#show-all").hidden = transactions.length <= 8;
}
function transactionRow(transaction) {
  const account = state.accounts.find((item) => item.id === transaction.accountId)?.name || "Account"; const label = transaction.note || transaction.category; const amount = `${transaction.type === "income" ? "+" : "−"}${formatMoney(transaction.amountMinor)}`;
  return `<tr class="transaction-row"><td><span class="transaction-name"><i class="transaction-symbol ${transaction.type}">${symbols[transaction.category] || "·"}</i>${escapeHTML(label)}</span></td><td><span class="category-tag"><i></i>${escapeHTML(transaction.category)}</span></td><td>${formatDate(transaction.date)}</td><td>${escapeHTML(account)}</td><td class="amount-cell ${transaction.type}">${amount}</td><td><button class="delete-row" data-delete="${escapeHTML(transaction.id)}" aria-label="Delete ${escapeHTML(label)}" title="Delete transaction">×</button></td></tr>`;
}
function populateAccountSelect() { const select = $("#account"); const current = select.value; select.innerHTML = state.accounts.map((account) => `<option value="${escapeHTML(account.id)}">${escapeHTML(account.name)}</option>`).join(""); if (state.accounts.some((account) => account.id === current)) select.value = current; }
function setType(type) { transactionType = type; document.querySelectorAll(".type-option").forEach((button) => button.classList.toggle("active", button.dataset.type === type)); $("#category").innerHTML = categoryCatalog[type].map((category) => `<option>${escapeHTML(category)}</option>`).join(""); }
function openTransaction() { $("#transaction-form").reset(); setType("expense"); $("#date").value = localDate(new Date()); populateAccountSelect(); $("#transaction-dialog").showModal(); window.setTimeout(() => $("#amount").focus(), 30); }
function showToast(message) { const toast = $("#toast"); toast.textContent = message; toast.classList.add("show"); window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3000); }
function addTransaction(event) {
  event.preventDefault(); const formData = new FormData(event.currentTarget); const amountMinor = Math.round(Number(formData.get("amount")) * 100); if (!Number.isFinite(amountMinor) || amountMinor <= 0) return;
  const transaction = { id: crypto.randomUUID ? crypto.randomUUID() : `tx-${Date.now()}`, amountMinor, type: transactionType, date: String(formData.get("date")), category: String(formData.get("category")), accountId: String(formData.get("account")), note: String(formData.get("note")).trim() };
  const sameMonth = transaction.date.slice(0, 7) === localDate(selectedMonth).slice(0, 7); const priorSpent = sums(monthTransactions()).expense; state.transactions.push(transaction); saveState(); $("#transaction-dialog").close(); render();
  if (sameMonth && transaction.type === "expense") {
    const crossed = state.budgets.filter((budget) => { const before = budget.category === "Overall" ? priorSpent : monthTransactions().filter((item) => item.type === "expense" && item.category === budget.category && item.id !== transaction.id).reduce((sum, item) => sum + item.amountMinor, 0); const after = before + (budget.category === "Overall" || budget.category === transaction.category ? transaction.amountMinor : 0); return (before < budget.limit * .8 && after >= budget.limit * .8) || (before <= budget.limit && after > budget.limit); });
    showToast(crossed.length ? `${crossed[0].category} budget reached ${Math.round((crossed[0].category === "Overall" ? sums(monthTransactions()).expense : monthTransactions().filter((item) => item.category === crossed[0].category && item.type === "expense").reduce((sum, item) => sum + item.amountMinor, 0)) / crossed[0].limit * 100)}%.` : "Transaction saved. Nice and easy.");
  } else showToast("Transaction saved. Nice and easy.");
}
function openBudgetDialog() { $("#budget-fields").innerHTML = state.budgets.map((budget, index) => `<label class="budget-field"><span>${escapeHTML(budget.category)} <small>monthly limit</small></span><input type="number" min="0" step="100" name="budget-${index}" value="${budget.limit / 100}" aria-label="${escapeHTML(budget.category)} monthly budget in rupees"></label>`).join(""); $("#budget-dialog").showModal(); }
function exportCSV() {
  const rows = [["date", "amount", "type", "category", "account", "note"], ...state.transactions.map((transaction) => [transaction.date, (transaction.amountMinor / 100).toFixed(2), transaction.type, transaction.category, state.accounts.find((account) => account.id === transaction.accountId)?.name || "", transaction.note || ""])];
  const csv = rows.map((row) => row.map((field) => `"${String(field).replaceAll('"', '""')}"`).join(",")).join("\n"); const blob = new Blob([csv], { type: "text/csv;charset=utf-8" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `goodledger-transactions-${localDate(new Date()).slice(0, 7)}.csv`; link.click(); URL.revokeObjectURL(link.href); showToast("Your transaction CSV is ready.");
}
function addAccount() {
  const name = window.prompt("Name this account"); if (!name?.trim()) return; const openingAmount = Number(window.prompt("Opening balance in rupees", "0")); if (!Number.isFinite(openingAmount)) return showToast("Please enter a valid opening balance.");
  const id = `account-${Date.now()}`; state.accounts.push({ id, name: name.trim(), type: "bank", opening: Math.round(openingAmount * 100) }); saveState(); render(); showToast(`${name.trim()} account added.`);
}

$("#open-transaction").addEventListener("click", openTransaction);
$("#close-dialog").addEventListener("click", () => $("#transaction-dialog").close()); $("#cancel-dialog").addEventListener("click", () => $("#transaction-dialog").close()); $("#transaction-form").addEventListener("submit", addTransaction);
document.querySelectorAll(".type-option").forEach((button) => button.addEventListener("click", () => setType(button.dataset.type)));
$("#transaction-search").addEventListener("input", renderTransactions);
$("#previous-month").addEventListener("click", () => { selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1); render(); });
$("#next-month").addEventListener("click", () => { const now = new Date(); if (selectedMonth < new Date(now.getFullYear(), now.getMonth(), 1)) { selectedMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1); render(); } });
$("#export-csv").addEventListener("click", exportCSV); $("#edit-budgets").addEventListener("click", openBudgetDialog);
document.querySelectorAll("[data-close-budget]").forEach((button) => button.addEventListener("click", () => $("#budget-dialog").close()));
$("#budget-form").addEventListener("submit", (event) => { event.preventDefault(); const values = new FormData(event.currentTarget); state.budgets = state.budgets.map((budget, index) => ({ ...budget, limit: Math.round(Number(values.get(`budget-${index}`)) * 100) })); saveState(); $("#budget-dialog").close(); render(); showToast("Budgets updated."); });
$("#transaction-list").addEventListener("click", (event) => { const button = event.target.closest("[data-delete]"); if (!button) return; const transaction = state.transactions.find((item) => item.id === button.dataset.delete); state.transactions = state.transactions.filter((item) => item.id !== button.dataset.delete); saveState(); render(); showToast(`${transaction?.note || transaction?.category || "Transaction"} deleted.`); });
$("#show-all").addEventListener("click", () => { const all = monthTransactions().filter((transaction) => { const query = $("#transaction-search").value.trim().toLowerCase(); const account = state.accounts.find((item) => item.id === transaction.accountId)?.name || ""; return [transaction.note, transaction.category, account, transaction.type].some((value) => String(value || "").toLowerCase().includes(query)); }).sort((a, b) => b.date.localeCompare(a.date)); $("#transaction-list").innerHTML = all.map(transactionRow).join(""); $("#show-all").hidden = true; $("#transaction-count").textContent = `Showing ${all.length} of ${all.length} transactions`; });
$("#reset-demo").addEventListener("click", () => { if (!window.confirm("Reset all transactions, accounts, and budgets to the original demo data?")) return; const fresh = createSeedState(); state.transactions = fresh.transactions; state.budgets = fresh.budgets; state.accounts = fresh.accounts; saveState(); render(); showToast("Demo data restored."); });
$("#add-account").addEventListener("click", addAccount);
document.addEventListener("keydown", (event) => {
  if ((event.key.toLowerCase() === "n" && !event.metaKey && !event.ctrlKey && !event.altKey && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) || (event.key === "Enter" && event.target === $("#amount"))) { if (!$("#transaction-dialog").open) { event.preventDefault(); openTransaction(); } }
  if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) { event.preventDefault(); $("#transaction-search").focus(); }
});
render();