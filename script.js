// script.js
// Global variables
let cryptoList = [];
let isLoading = false;
let selectedIndex = -1;
let coinAData = null;
let coinBData = null;

// Initialize the application
async function initApp() {
    showGlobalLoader();
    updateLastUpdated();
    await loadCryptoList();
    await loadTopGainersLosers();
    setupThemeToggle();
    hideGlobalLoader();

    // Close dropdowns when clicking outside
    document.querySelectorAll('.search-container input').forEach(input => {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.crypto-selector')) {
                document.getElementById('coinADropdown')?.classList.remove('active');
                document.getElementById('coinBDropdown')?.classList.remove('active');
            }
        });

        input.addEventListener('focus', () => {
            const searchInputId = input.id;
            const dropdownId = searchInputId.replace('Search', 'Dropdown');
            if (input.value) {
                filterDropdown(searchInputId, dropdownId);
            }
        });
    });
}

// Show global loader
function showGlobalLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'flex';
}

// Hide global loader
function hideGlobalLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';
}

// Show loading spinner
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'loading';
    loadingSpinner.id = `${elementId}-loading`;
    element.parentNode.insertBefore(loadingSpinner, element.nextSibling);
    isLoading = true;
}

// Hide loading spinner
function hideLoading(elementId) {
    const loadingSpinner = document.getElementById(`${elementId}-loading`);
    if (loadingSpinner) loadingSpinner.remove();
    isLoading = false;
}

// Show error message
function showError(message, targetId = 'comparisonResult') {
    const target = document.getElementById(targetId);
    if (!target) return;
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    target.innerHTML = '';
    target.appendChild(errorElement);

    const section = targetId === 'comparisonResult' ? document.getElementById('results-section') : document.getElementById('portfolio-section');
    if (section) section.classList.remove('visible');
}

// Update last updated timestamp
function updateLastUpdated() {
    const lastUpdated = document.getElementById('lastUpdated');
    if (lastUpdated) {
        const now = new Date();
        lastUpdated.textContent = `Last dynamic update: ${now.toLocaleString()}`;
    }
}

// Fetch top 500 cryptos
async function loadCryptoList() {
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
                continue; // Skip failed pages
            }
            const coins = await response.json();
            if (!Array.isArray(coins)) {
                console.warn(`Invalid data on page ${page}`);
                continue;
            }
            allCoins = allCoins.concat(coins);
            if (allCoins.length >= totalCoins) {
                allCoins = allCoins.slice(0, totalCoins);
                break;
            }
        }
        cryptoList = allCoins;
        if (cryptoList.length === 0) {
            throw new Error("No coins fetched");
        }
    } catch (error) {
        console.error("Error fetching crypto list:", error);
        showError("Unable to fetch cryptocurrency data at this time.");
        cryptoList = [];
    }
}

// Load top gainers and losers
async function loadTopGainersLosers() {
    const gainersSection = document.getElementById('topGainers');
    const losersSection = document.getElementById('topLosers');
    if (!gainersSection || !losersSection) return;

    try {
        if (cryptoList.length === 0) throw new Error("Crypto list not loaded");
        const sortedByChange = [...cryptoList]
            .filter(coin => coin.price_change_percentage_24h !== null)
            .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);

        const topGainers = sortedByChange.slice(0, 10);
        const topLosers = sortedByChange.slice(-10).reverse();

        gainersSection.innerHTML = topGainers.map(coin => `
            <div class="table-row">
                <div class="coin-info">
                    <a href="https://www.coingecko.com/en/coins/${coin.id}" target="_blank" rel="noopener noreferrer" class="coin-link">
                        <img src="${coin.image}" alt="${coin.symbol}">
                        <span>${coin.symbol.toUpperCase()}</span>
                    </a>
                </div>
                <span class="percentage positive">${coin.price_change_percentage_24h.toFixed(2)}%</span>
            </div>
        `).join('');

        losersSection.innerHTML = topLosers.map(coin => `
            <div class="table-row">
                <div class="coin-info">
                    <a href="https://www.coingecko.com/en/coins/${coin.id}" target="_blank" rel="noopener noreferrer" class="coin-link">
                        <img src="${coin.image}" alt="${coin.symbol}">
                        <span>${coin.symbol.toUpperCase()}</span>
                    </a>
                </div>
                <span class="percentage negative">${coin.price_change_percentage_24h.toFixed(2)}%</span>
            </div>
        `).join('');

        const section = document.getElementById('gainers-losers-section');
        if (section) section.style.display = 'block';
    } catch (error) {
        console.error("Error loading gainers and losers:", error);
        gainersSection.innerHTML = '<p>Unable to load live gainers data.</p>';
        losersSection.innerHTML = '<p>Unable to load live losers data.</p>';
        const section = document.getElementById('gainers-losers-section');
        if (section) section.style.display = 'block';
    }
}

// Filter dropdown
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

// Handle keyboard navigation
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
    updatePortfolioLabels();
}

// Compare Market Caps
async function compareMarketCaps() {
    const searchInputA = document.getElementById("coinASearch");
    const searchInputB = document.getElementById("coinBSearch");
    const resultsSection = document.getElementById("results-section");
    const comparisonResult = document.getElementById("comparisonResult");

    if (!searchInputA || !searchInputB || !resultsSection || !comparisonResult) {
        console.error("Required DOM elements are missing.");
        return;
    }

    comparisonResult.innerHTML = "";
    resultsSection.classList.remove('visible');

    const coinA = searchInputA.dataset.coinId;
    const coinB = searchInputB.dataset.coinId;

    if (!coinA || !coinB) {
        showError("Please select valid cryptocurrencies from the dropdown!");
        return;
    }

    if (coinA === coinB) {
        showError("Please select two different cryptocurrencies!");
        return;
    }

    showLoading('compareButton');

    const apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinA},${coinB}&vs_currencies=usd&include_market_cap=true&include_24hr_change=true`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`API request failed: ${response.status}`);
        const data = await response.json();

        if (data[coinA] && data[coinB] && data[coinA].usd_market_cap && data[coinB].usd_market_cap) {
            const marketCapA = data[coinA].usd_market_cap;
            const marketCapB = data[coinB].usd_market_cap;
            const priceA = data[coinA].usd;
            const priceB = data[coinB].usd;

            const newPriceA = (marketCapB / marketCapA) * priceA;
            const marketCapRatio = marketCapA / marketCapB;
            const barPercentage = marketCapRatio >= 1 ? (marketCapB / marketCapA) * 100 : (marketCapA / marketCapB) * 100;

            const coinAInfo = cryptoList.find(coin => coin.id === coinA) || {};
            const coinBInfo = cryptoList.find(coin => coin.id === coinB) || {};
            const coinAImage = coinAInfo.image || '';
            const coinBImage = coinBInfo.image || '';

            comparisonResult.innerHTML = `
                <div class="coin-comparison">
                    <div class="coin-detail">
                        <img src="${coinAImage}" alt="${searchInputA.dataset.symbol || 'Coin A'}">
                        <span class="coin-label">${searchInputA.dataset.symbol || 'Unknown'}</span>
                        <span class="highlight">$${formatMarketCap(marketCapA)}</span>
                    </div>
                    <div class="vs-separator">vs</div>
                    <div class="coin-detail">
                        <img src="${coinBImage}" alt="${searchInputB.dataset.symbol || 'Coin B'}">
                        <span class="coin-label">${searchInputB.dataset.symbol || 'Unknown'}</span>
                        <span class="highlight">$${formatMarketCap(marketCapB)}</span>
                    </div>
                </div>
                <div class="hypothetical">
                    <h3>${searchInputA.dataset.symbol || 'Coin A'} with the Market Cap of ${searchInputB.dataset.symbol || 'Coin B'}</h3>
                    <span class="price">$${formatPrice(newPriceA)}</span>
                    <span class="multiplier">(${(newPriceA / priceA).toFixed(2)}x)</span>
                </div>
                <div class="marketcap-comparison">
                    <div class="comparison-text">
                        ${marketCapRatio >= 1 ? (searchInputA.dataset.symbol || 'Coin A') : (searchInputB.dataset.symbol || 'Coin B')} is <span class="highlight">${Math.abs(marketCapRatio).toFixed(2)}x</span> above ${marketCapRatio >= 1 ? (searchInputB.dataset.symbol || 'Coin B') : (searchInputA.dataset.symbol || 'Coin A')}
                    </div>
                    <div class="marketcap-bar">
                        <div class="bar-container">
                            <div class="bar ${marketCapRatio >= 1 ? 'first' : 'second'}" style="width: ${barPercentage}%"></div>
                        </div>
                    </div>
                    <div class="marketcap-values">
                        <div class="value">
                            <img src="${coinAImage}" alt="${searchInputA.dataset.symbol || 'Coin A'}">
                            <span>$${marketCapA.toLocaleString()}</span>
                        </div>
                        <div class="value">
                            <img src="${coinBImage}" alt="${searchInputB.dataset.symbol || 'Coin B'}">
                            <span>$${marketCapB.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            `;

            coinAData = { symbol: searchInputA.dataset.symbol, marketCap: marketCapA, price: priceA, image: coinAImage };
            coinBData = { symbol: searchInputB.dataset.symbol, marketCap: marketCapB, price: priceB, image: coinBImage };

            resultsSection.classList.add('visible');
            resultsSection.classList.remove('fade-in');
            void resultsSection.offsetWidth;
            resultsSection.classList.add('fade-in');

            calculatePortfolioWorth();
        } else {
            showError("Could not fetch complete data for the selected cryptocurrencies.");
        }
    } catch (error) {
        console.error("Error comparing market caps:", error);
        showError("Error fetching comparison data.");
    } finally {
        hideLoading('compareButton');
        updateLastUpdated();
    }
}

// Format market cap
function formatMarketCap(value) {
    if (typeof value !== 'number' || isNaN(value)) return "N/A";
    if (value >= 1e12) return (value / 1e12).toFixed(2) + "T";
    if (value >= 1e9) return (value / 1e9).toFixed(2) + "B";
    if (value >= 1e6) return (value / 1e6).toFixed(2) + "M";
    return value.toLocaleString();
}

// Format price
function formatPrice(price) {
    if (typeof price !== 'number' || isNaN(price)) return "N/A";
    if (price >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(2);
    if (price >= 0.01) return price.toFixed(4);
    if (price >= 0.0001) return price.toFixed(6);
    return price.toLocaleString(undefined, { minimumFractionDigits: 8, maximumFractionDigits: 8 });
}

// Update Portfolio Labels
function updatePortfolioLabels() {
    const searchInputA = document.getElementById("coinASearch");
    const searchInputB = document.getElementById("coinBSearch");
    const coinALabel = document.getElementById("coinALabel");
    const coinBLabel = document.getElementById("coinBLabel");

    if (coinALabel) {
        coinALabel.textContent = searchInputA.dataset.symbol ? `${searchInputA.dataset.symbol} (First Crypto)` : 'First Crypto';
    }
    if (coinBLabel) {
        coinBLabel.textContent = searchInputB.dataset.symbol ? `${searchInputB.dataset.symbol} (Second Crypto)` : 'Second Crypto';
    }
}

// Portfolio Worth Calculation
function calculatePortfolioWorth() {
    const portfolioSection = document.getElementById('portfolio-section');
    const portfolioResult = document.getElementById('portfolioResult');
    if (!portfolioSection || !portfolioResult) return;

    portfolioSection.classList.remove('visible');

    if (!coinAData || !coinBData) {
        portfolioResult.innerHTML = '<p>Please compare two coins first to calculate portfolio worth.</p>';
        return;
    }

    const coinAAmount = parseFloat(document.getElementById('coinAAmount').value) || 0;
    const coinBAmount = parseFloat(document.getElementById('coinBAmount').value) || 0;

    if (coinAAmount === 0 && coinBAmount === 0) {
        portfolioResult.innerHTML = '<p>Please enter the amount of at least one cryptocurrency.</p>';
        return;
    }

    const coinACurrentPrice = coinAData.price;
    const coinBCurrentPrice = coinBData.price;
    const coinAMarketCap = coinAData.marketCap;
    const coinBMarketCap = coinBData.marketCap;

    if (!coinACurrentPrice || !coinBCurrentPrice || !coinAMarketCap || !coinBMarketCap) {
        portfolioResult.innerHTML = '<p>Insufficient data to calculate portfolio worth.</p>';
        return;
    }

    const coinASupply = coinAMarketCap / coinACurrentPrice;
    const coinBSupply = coinBMarketCap / coinBCurrentPrice;
    const coinAPriceAtBMarketCap = coinBMarketCap / coinASupply;
    const coinBPriceAtAMarketCap = coinAMarketCap / coinBSupply;

    const coinAValueAtBMarketCap = coinAAmount * coinAPriceAtBMarketCap;
    const coinBValueAtAMarketCap = coinBAmount * coinBPriceAtAMarketCap;

    let portfolioHTML = '';

    if (coinAAmount > 0) {
        portfolioHTML += `
            <p>${coinAData.symbol} with the Market Cap of ${coinBData.symbol}: $${formatPrice(coinAValueAtBMarketCap)}</p>
        `;
    }

    if (coinBAmount > 0) {
        portfolioHTML += `
            <p>${coinBData.symbol} with the Market Cap of ${coinAData.symbol}: $${formatPrice(coinBValueAtAMarketCap)}</p>
        `;
    }

    portfolioResult.innerHTML = portfolioHTML;
    portfolioSection.classList.add('visible');
    portfolioSection.classList.remove('fade-in');
    void portfolioSection.offsetWidth;
    portfolioSection.classList.add('fade-in');
}

// Theme Toggle Function
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
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const coinAAmount = document.getElementById('coinAAmount');
    const coinBAmount = document.getElementById('coinBAmount');
    if (coinAAmount) coinAAmount.addEventListener('input', calculatePortfolioWorth);
    if (coinBAmount) coinBAmount.addEventListener('input', calculatePortfolioWorth);
    updatePortfolioLabels();
});

// Load app
window.onload = initApp;