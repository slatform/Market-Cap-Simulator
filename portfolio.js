// portfolio.js
let isLoading = false;
let cryptoList = [];
let selectedIndex = -1;
let pnlChart = null;
let allocationChart = null;

const staticPrices = {
    "bitcoin": 60000,
    "ethereum": 3000,
    "binancecoin": 500,
    "solana": 150,
    "ripple": 0.5
};

async function initApp() {
    console.log("Starting initApp...");
    showGlobalLoader();
    updateLastUpdated();
    await loadCryptoList();
    loadPortfolioTracker();
    setupThemeToggle();
    initializeCharts();
    console.log("Initialization complete (historical P&L skipped).");
    hideGlobalLoader();

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.crypto-selector')) {
            const dropdown = document.getElementById('trackerCoinDropdown');
            if (dropdown) dropdown.classList.remove('active');
        }
    });

    const trackerCoinSearch = document.getElementById('trackerCoinSearch');
    if (trackerCoinSearch) {
        trackerCoinSearch.addEventListener('focus', () => {
            if (trackerCoinSearch.value) {
                filterDropdown('trackerCoinSearch', 'trackerCoinDropdown');
            }
        });
    } else {
        console.warn("trackerCoinSearch not found.");
    }
}

function showGlobalLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'flex';
}

function hideGlobalLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';
}

function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'loading';
    loadingSpinner.id = `${elementId}-loading`;
    element.parentNode.insertBefore(loadingSpinner, element.nextSibling);
    isLoading = true;
}

function hideLoading(elementId) {
    const loadingSpinner = document.getElementById(`${elementId}-loading`);
    if (loadingSpinner) loadingSpinner.remove();
    isLoading = false;
}

function showError(message, targetId = 'holdingsList') {
    const target = document.getElementById(targetId);
    if (!target) return;
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    target.innerHTML = '';
    target.appendChild(errorElement);
}

function updateLastUpdated() {
    const lastUpdated = document.getElementById('lastUpdated');
    if (lastUpdated) {
        const now = new Date();
        lastUpdated.textContent = `Last dynamic update: ${now.toLocaleString()}`;
    }
}

async function loadCryptoList() {
    console.log("Fetching crypto list...");
    const coinsPerPage = 250;
    const totalCoins = 500;
    const pagesNeeded = Math.ceil(totalCoins / coinsPerPage);
    let allCoins = [];

    try {
        for (let page = 1; page <= pagesNeeded; page++) {
            const apiUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${coinsPerPage}&page=${page}&sparkline=false`;
            const response = await fetch(apiUrl);
            if (!response.ok) {
                console.warn(`API error on page ${page}: ${response.status}`);
                continue;
            }
            const coins = await response.json();
            allCoins = allCoins.concat(coins);
            if (allCoins.length >= totalCoins) {
                allCoins = allCoins.slice(0, totalCoins);
                break;
            }
        }
        cryptoList = allCoins;
        if (cryptoList.length === 0) throw new Error("No coins fetched");
        console.log(`Loaded ${cryptoList.length} coins.`);
    } catch (error) {
        console.error("Error fetching crypto list:", error);
        showError("Unable to fetch cryptocurrency data. Using static prices.");
        cryptoList = [];
    }
}

function filterDropdown(searchInputId, dropdownId) {
    const input = document.getElementById(searchInputId);
    const dropdown = document.getElementById(dropdownId);
    if (!input || !dropdown) return;

    const searchValue = input.value.toLowerCase();
    selectedIndex = -1;

    if (searchValue === "" && !input.matches(':focus')) {
        dropdown.classList.remove('active');
        return;
    }

    dropdown.innerHTML = "";

    if (isLoading || cryptoList.length === 0) {
        const item = document.createElement("div");
        item.className = "dropdown-item disabled";
        item.textContent = "Loading cryptocurrencies...";
        dropdown.appendChild(item);
        dropdown.classList.add('active');
        return;
    }

    const filteredList = cryptoList.filter(coin =>
        coin.name.toLowerCase().includes(searchValue) ||
        coin.symbol.toLowerCase().includes(searchValue)
    );

    if (filteredList.length === 0) {
        const item = document.createElement("div");
        item.className = "dropdown-item disabled";
        item.textContent = "No matching cryptocurrencies";
        dropdown.appendChild(item);
    } else {
        filteredList.forEach((coin, index) => {
            const item = document.createElement("div");
            item.className = "dropdown-item";
            item.innerHTML = `
                <img src="${coin.image}" alt="${coin.symbol}" class="coin-icon">
                <span>${coin.name} (${coin.symbol.toUpperCase()})</span>
            `;
            item.dataset.id = coin.id;
            item.dataset.symbol = coin.symbol.toUpperCase();
            item.dataset.image = coin.image;
            item.tabIndex = 0;

            item.addEventListener('click', () => selectCoin(input, coin, dropdown));
            dropdown.appendChild(item);
        });
    }

    dropdown.classList.add('active');
}

function navigateDropdown(event, dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    const items = dropdown.querySelectorAll('.dropdown-item:not(.disabled)');
    if (!items.length) return;

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelection(dropdown, items);
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        updateSelection(dropdown, items);
    } else if (event.key === 'Enter' && selectedIndex >= 0) {
        event.preventDefault();
        const input = document.getElementById(dropdownId.replace('Dropdown', 'Search'));
        const coin = cryptoList.find(c => c.id === items[selectedIndex].dataset.id);
        if (input && coin) selectCoin(input, coin, dropdown);
    }
}

function updateSelection(dropdown, items) {
    items.forEach((item, index) => {
        item.classList.toggle('selected', index === selectedIndex);
        if (index === selectedIndex) item.scrollIntoView({ block: 'nearest' });
    });
}

function selectCoin(input, coin, dropdown) {
    input.value = `${coin.name} (${coin.symbol.toUpperCase()})`;
    input.dataset.coinId = coin.id;
    input.dataset.symbol = coin.symbol.toUpperCase();
    input.dataset.image = coin.image;
    dropdown.classList.remove('active');
}

function formatPrice(price) {
    if (typeof price !== 'number' || isNaN(price)) return "N/A";
    if (price >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(2);
    if (price >= 0.01) return price.toFixed(4);
    if (price >= 0.0001) return price.toFixed(6);
    return price.toLocaleString(undefined, { minimumFractionDigits: 8, maximumFractionDigits: 8 });
}

function initializeCharts() {
    const isLightMode = document.body.classList.contains('light-mode');
    const textColor = isLightMode ? '#333333' : '#ffffff';
    const gridColor = isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';

    const pnlCtx = document.getElementById('pnlChart')?.getContext('2d');
    if (pnlCtx) {
        console.log("Initializing P&L chart...");
        pnlChart = new Chart(pnlCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Portfolio P&L',
                    data: [],
                    borderColor: 'rgba(30, 144, 255, 1)',
                    backgroundColor: 'rgba(30, 144, 255, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { title: { display: true, text: 'Date', color: textColor }, ticks: { color: textColor }, grid: { color: gridColor } },
                    y: { title: { display: true, text: 'P&L (USD)', color: textColor }, ticks: { color: textColor }, grid: { color: gridColor }, beginAtZero: true }
                },
                plugins: { legend: { labels: { color: textColor } } }
            }
        });
    } else {
        console.error("pnlChart canvas not found.");
    }

    const allocationCtx = document.getElementById('allocationChart')?.getContext('2d');
    if (allocationCtx) {
        console.log("Initializing allocation chart...");
        allocationChart = new Chart(allocationCtx, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CB3F', '#7BCB3F', '#3FCB7B', '#3F7BCB'],
                    borderColor: isLightMode ? '#e0e0e0' : '#0a0e17',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { color: textColor } } }
            }
        });
    } else {
        console.error("allocationChart canvas not found.");
    }
}

function loadPortfolioTracker() {
    const savedPortfolio = JSON.parse(localStorage.getItem('cryptoPortfolio')) || [];
    renderPortfolio(savedPortfolio);
    const sections = ['tracker-section', 'summary-section', 'allocation-section', 'holdings-section', 'trades-section'];
    sections.forEach(id => {
        const section = document.getElementById(id);
        if (section) section.style.display = 'block';
    });
}

function addCoinToTracker() {
    const coinSearchInput = document.getElementById('trackerCoinSearch');
    const coinAmountInput = document.getElementById('trackerCoinAmount');
    const purchasePriceInput = document.getElementById('trackerPurchasePrice');
    if (!coinSearchInput || !coinAmountInput || !purchasePriceInput) return;

    const coinId = coinSearchInput.dataset.coinId;
    const coinAmount = parseFloat(coinAmountInput.value) || 0;
    const purchasePrice = parseFloat(purchasePriceInput.value) || 0;

    if (!coinId || coinAmount <= 0 || purchasePrice <= 0) {
        showError("Please select a valid coin, enter a positive amount, and a valid purchase price.");
        return;
    }

    const savedPortfolio = JSON.parse(localStorage.getItem('cryptoPortfolio')) || [];
    const coinInfo = cryptoList.find(coin => coin.id === coinId) || {};
    const staticPrice = staticPrices[coinId] || coinInfo.current_price || 0;
    const coinData = {
        id: coinId,
        name: coinInfo.name || coinSearchInput.value.split(' (')[0],
        symbol: coinSearchInput.dataset.symbol,
        image: coinSearchInput.dataset.image || '',
        amount: coinAmount,
        purchasePrice: purchasePrice,
        price: staticPrice,
        value: staticPrice * coinAmount,
        change_24h: coinInfo.price_change_percentage_24h || 0
    };

    savedPortfolio.push(coinData);
    localStorage.setItem('cryptoPortfolio', JSON.stringify(savedPortfolio));
    renderPortfolio(savedPortfolio);

    coinSearchInput.value = '';
    coinSearchInput.dataset.coinId = '';
    coinSearchInput.dataset.symbol = '';
    coinSearchInput.dataset.image = '';
    coinAmountInput.value = '';
    purchasePriceInput.value = '';
}

function renderPortfolio(portfolio) {
    renderSummary(portfolio);
    renderAllocation(portfolio);
    renderHoldings(portfolio);
    renderTrades(portfolio);
}

function renderSummary(portfolio) {
    const elements = {
        currentValue: document.getElementById('currentValue'),
        dailyChange: document.getElementById('dailyChange'),
        totalPnL: document.getElementById('totalPnL'),
        unrealizedPnL: document.getElementById('unrealizedPnL'),
        lifetimeCost: document.getElementById('lifetimeCost')
    };
    if (Object.values(elements).some(el => !el)) return;

    let totalValue = 0;
    let totalPurchaseValue = 0;
    let dailyChange = 0;

    portfolio.forEach(coin => {
        totalValue += coin.value;
        totalPurchaseValue += coin.amount * coin.purchasePrice;
        dailyChange += (coin.value * (coin.change_24h / 100));
    });

    const totalPnL = totalValue - totalPurchaseValue;
    const unrealizedPnL = totalPnL;

    elements.currentValue.textContent = `$${formatPrice(totalValue)}`;
    elements.dailyChange.textContent = `${dailyChange >= 0 ? '+' : ''}$${formatPrice(dailyChange)}`;
    elements.dailyChange.className = `summary-value change ${dailyChange >= 0 ? 'positive' : 'negative'}`;
    elements.totalPnL.textContent = `${totalPnL >= 0 ? '+' : ''}$${formatPrice(totalPnL)}`;
    elements.totalPnL.className = `summary-value change ${totalPnL >= 0 ? 'positive' : 'negative'}`;
    elements.unrealizedPnL.textContent = `${unrealizedPnL >= 0 ? '+' : ''}$${formatPrice(unrealizedPnL)}`;
    elements.unrealizedPnL.className = `summary-value change ${unrealizedPnL >= 0 ? 'positive' : 'negative'}`;
    elements.lifetimeCost.textContent = `$${formatPrice(totalPurchaseValue)}`;
}

function renderAllocation(portfolio) {
    const allocationList = document.getElementById('allocationList');
    if (!allocationList || !allocationChart) return;

    if (portfolio.length === 0) {
        allocationList.innerHTML = '<p>Add coins to see your portfolio allocation.</p>';
        allocationChart.data.labels = [];
        allocationChart.data.datasets[0].data = [];
        allocationChart.update();
        return;
    }

    const totalValue = portfolio.reduce((sum, coin) => sum + coin.value, 0);
    const allocationData = portfolio.map(coin => ({
        label: coin.symbol,
        value: coin.value,
        percentage: (coin.value / totalValue) * 100
    }));

    allocationList.innerHTML = allocationData.map((item, index) => `
        <div class="allocation-item">
            <span class="allocation-color" style="background-color: ${allocationChart.data.datasets[0].backgroundColor[index % allocationChart.data.datasets[0].backgroundColor.length]}"></span>
            <span>${item.label}</span>
            <span>${item.percentage.toFixed(1)}%</span>
        </div>
    `).join('');

    allocationChart.data.labels = allocationData.map(item => item.label);
    allocationChart.data.datasets[0].data = allocationData.map(item => item.value);
    allocationChart.update();
}

function renderHoldings(portfolio) {
    const holdingsList = document.getElementById('holdingsList');
    if (!holdingsList) return;

    if (portfolio.length === 0) {
        holdingsList.innerHTML = '<p>Your portfolio is empty. Add coins to track their value and performance.</p>';
        return;
    }

    const totalValue = portfolio.reduce((sum, coin) => sum + coin.value, 0);
    holdingsList.innerHTML = `
        <div class="holdings-header">
            <span>Coin</span>
            <span>Amount</span>
            <span>Value</span>
            <span>% of Portfolio</span>
            <span>P&L</span>
        </div>
    `;
    portfolio.forEach((coin, index) => {
        const percentage = totalValue > 0 ? (coin.value / totalValue) * 100 : 0;
        const pnL = coin.value - (coin.amount * coin.purchasePrice);
        const changeClass = pnL >= 0 ? 'positive' : 'negative';
        holdingsList.innerHTML += `
            <div class="holdings-row">
                <div class="coin-info">
                    <img src="${coin.image}" alt="${coin.symbol}" class="coin-icon">
                    <span>${coin.name} (${coin.symbol})</span>
                </div>
                <div class="coin-amount">${coin.amount.toFixed(4)}</div>
                <div class="coin-value">$${formatPrice(coin.value)} <span class="price-sub">($${formatPrice(coin.price)})</span></div>
                <div class="coin-percentage">${percentage.toFixed(1)}%</div>
                <div class="coin-pnl ${changeClass}">${pnL >= 0 ? '+' : ''}$${formatPrice(pnL)}</div>
                <button class="remove-coin" onclick="removeCoinFromTracker(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
}

function renderTrades(portfolio) {
    const tradesList = document.getElementById('tradesList');
    if (!tradesList) return;

    if (portfolio.length === 0) {
        tradesList.innerHTML = '<p>No trades recorded. Add coins to track your trades.</p>';
        return;
    }

    tradesList.innerHTML = `
        <div class="trades-header">
            <span>Asset</span>
            <span>Unrealized Gain</span>
            <span>Realized Gain</span>
        </div>
    `;
    portfolio.forEach(coin => {
        const unrealizedGain = coin.value - (coin.amount * coin.purchasePrice);
        const realizedGain = 0;
        tradesList.innerHTML += `
            <div class="trades-row">
                <div class="coin-info">
                    <img src="${coin.image}" alt="${coin.symbol}" class="coin-icon">
                    <span>${coin.name} (${coin.symbol})</span>
                </div>
                <div class="coin-unrealized ${unrealizedGain >= 0 ? 'positive' : 'negative'}">${unrealizedGain >= 0 ? '+' : ''}$${formatPrice(unrealizedGain)}</div>
                <div class="coin-realized">${realizedGain >= 0 ? '+' : ''}$${formatPrice(realizedGain)}</div>
            </div>
        `;
    });
}

function removeCoinFromTracker(index) {
    const savedPortfolio = JSON.parse(localStorage.getItem('cryptoPortfolio')) || [];
    savedPortfolio.splice(index, 1);
    localStorage.setItem('cryptoPortfolio', JSON.stringify(savedPortfolio));
    renderPortfolio(savedPortfolio);
}

async function refreshTrackerPrices() {
    const savedPortfolio = JSON.parse(localStorage.getItem('cryptoPortfolio')) || [];
    if (savedPortfolio.length === 0) return;

    showLoading('refreshTrackerButton');
    const coinIds = savedPortfolio.map(coin => coin.id);
    const apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd&include_24hr_change=true`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`API request failed: ${response.status}`);
        const data = await response.json();

        savedPortfolio.forEach(coin => {
            if (data[coin.id] && data[coin.id].usd) {
                coin.price = data[coin.id].usd;
                coin.value = coin.amount * coin.price;
                coin.change_24h = data[coin.id].usd_24h_change || 0;
            } else {
                coin.price = staticPrices[coin.id] || coin.price;
                coin.value = coin.amount * coin.price;
            }
        });

        localStorage.setItem('cryptoPortfolio', JSON.stringify(savedPortfolio));
        renderPortfolio(savedPortfolio);
    } catch (error) {
        console.error("Error refreshing tracker prices:", error);
        showError("Failed to refresh prices. Using last known values.");
    } finally {
        hideLoading('refreshTrackerButton');
        updateLastUpdated();
    }
}

function clearTracker() {
    localStorage.removeItem('cryptoPortfolio');
    loadPortfolioTracker();
}

function setupThemeToggle() {
    const toggleButton = document.getElementById('themeToggle');
    if (!toggleButton) return;
    const body = document.body;
    const savedTheme = localStorage.getItem('theme') || 'dark';

    if (savedTheme === 'light') {
        body.classList.add('light-mode');
        toggleButton.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        toggleButton.innerHTML = '<i class="fas fa-moon"></i>';
    }

    toggleButton.addEventListener('click', () => {
        body.classList.toggle('light-mode');
        const isLightMode = body.classList.contains('light-mode');
        toggleButton.innerHTML = isLightMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        localStorage.setItem('theme', isLightMode ? 'light' : 'dark');
        updateChartColors();
    });
}

function updateChartColors() {
    const isLightMode = document.body.classList.contains('light-mode');
    const textColor = isLightMode ? '#333333' : '#ffffff';
    const gridColor = isLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
    const borderColor = isLightMode ? '#e0e0e0' : '#0a0e17';

    if (pnlChart) {
        pnlChart.options.scales.x.title.color = textColor;
        pnlChart.options.scales.x.ticks.color = textColor;
        pnlChart.options.scales.x.grid.color = gridColor;
        pnlChart.options.scales.y.title.color = textColor;
        pnlChart.options.scales.y.ticks.color = textColor;
        pnlChart.options.scales.y.grid.color = gridColor;
        pnlChart.options.plugins.legend.labels.color = textColor;
        pnlChart.update();
    }

    if (allocationChart) {
        allocationChart.options.plugins.legend.labels.color = textColor;
        allocationChart.data.datasets[0].borderColor = borderColor;
        allocationChart.update();
    }
}

window.onload = initApp;