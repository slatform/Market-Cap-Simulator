// Global variables
let cryptoList = [];
let isLoading = false;
let chart = null;
let selectedIndex = -1;
// New globals for portfolio feature
let coinAData = null;
let coinBData = null;

// Initialize the application
async function initApp() {
    showGlobalLoader();
    updateLastUpdated();
    await loadCryptoList();
    await loadTopGainersLosers(); // Load gainers and losers on init
    hideGlobalLoader();
    
    document.querySelectorAll('.search-container input').forEach(input => {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.crypto-selector')) {
                document.getElementById('coinADropdown').classList.remove('active');
                document.getElementById('coinBDropdown').classList.remove('active');
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
    document.getElementById('globalLoader').style.display = 'flex';
}

// Hide global loader
function hideGlobalLoader() {
    document.getElementById('globalLoader').style.display = 'none';
}

// Show loading spinner
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    const loadingSpinner = document.createElement('div');
    loadingSpinner.className = 'loading';
    loadingSpinner.id = `${elementId}-loading`;
    element.parentNode.insertBefore(loadingSpinner, element.nextSibling);
    isLoading = true;
}

// Hide loading spinner
function hideLoading(elementId) {
    const loadingSpinner = document.getElementById(`${elementId}-loading`);
    if (loadingSpinner) {
        loadingSpinner.remove();
    }
    isLoading = false;
}

// Show error message
function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    
    const comparisonResult = document.getElementById('comparisonResult');
    comparisonResult.innerHTML = '';
    comparisonResult.appendChild(errorElement);
    
    document.getElementById('results-section').style.display = 'block';
}

// Update last updated timestamp
function updateLastUpdated() {
    const now = new Date();
    document.getElementById('lastUpdated').textContent = `Last updated: ${now.toLocaleString()}`;
}

// Fetch top 250 cryptos (kept at 250 as per your latest code)
async function loadCryptoList() {
    const apiUrl = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false";
    
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        cryptoList = await response.json();
    } catch (error) {
        console.error("Error fetching crypto list:", error);
        showError("Unable to fetch cryptocurrency data. Please try again later.");
    }
}

// New function to load top gainers and losers
async function loadTopGainersLosers() {
    const gainersSection = document.getElementById('topGainers');
    const losersSection = document.getElementById('topLosers');
    
    try {
        // Use existing cryptoList data
        const sortedByChange = [...cryptoList]
            .filter(coin => coin.price_change_percentage_24h !== null)
            .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
        
        const topGainers = sortedByChange.slice(0, 10);
        const topLosers = sortedByChange.slice(-10).reverse();

        // Render gainers
        gainersSection.innerHTML = topGainers.map(coin => `
            <div class="table-row">
                <div class="coin-info">
                    <img src="${coin.image}" alt="${coin.symbol}">
                    <span>${coin.symbol.toUpperCase()}</span>
                </div>
                <span class="percentage positive">${coin.price_change_percentage_24h.toFixed(2)}%</span>
            </div>
        `).join('');

        // Render losers
        losersSection.innerHTML = topLosers.map(coin => `
            <div class="table-row">
                <div class="coin-info">
                    <img src="${coin.image}" alt="${coin.symbol}">
                    <span>${coin.symbol.toUpperCase()}</span>
                </div>
                <span class="percentage negative">${coin.price_change_percentage_24h.toFixed(2)}%</span>
            </div>
        `).join('');

        document.getElementById('gainers-losers-section').style.display = 'block';
    } catch (error) {
        console.error("Error loading gainers and losers:", error);
        gainersSection.innerHTML = '<p>Unable to load data.</p>';
        losersSection.innerHTML = '<p>Unable to load data.</p>';
        document.getElementById('gainers-losers-section').style.display = 'block';
    }
}

// Filter dropdown based on user input
function filterDropdown(searchInputId, dropdownId) {
    const input = document.getElementById(searchInputId);
    const dropdown = document.getElementById(dropdownId);
    const searchValue = input.value.toLowerCase();
    selectedIndex = -1; // Reset selected index

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
            item.tabIndex = 0; // Make focusable
            
            item.addEventListener('click', () => selectCoin(input, coin, dropdown));
            dropdown.appendChild(item);
        });
    }
    
    dropdown.classList.add('active');
}

// Handle keyboard navigation
function navigateDropdown(event, dropdownId) {
    const dropdown = document.getElementById(dropdownId);
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
        selectCoin(input, coin, dropdown);
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
    dropdown.classList.remove('active');
    // Update portfolio labels when a coin is selected
    updatePortfolioLabels();
}

// Compare Market Caps (Updated to Match Screenshot)
async function compareMarketCaps() {
    const searchInputA = document.getElementById("coinASearch");
    const searchInputB = document.getElementById("coinBSearch");
    const resultsSection = document.getElementById("results-section");
    const comparisonResult = document.getElementById("comparisonResult");
    
    comparisonResult.innerHTML = "";
    resultsSection.style.display = "block";
    resultsSection.classList.remove('fade-in');
    void resultsSection.offsetWidth; // Trigger reflow
    resultsSection.classList.add('fade-in');

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

        if (data[coinA] && data[coinB]) {
            const marketCapA = data[coinA].usd_market_cap;
            const marketCapB = data[coinB].usd_market_cap;
            const priceA = data[coinA].usd;
            const priceB = data[coinB].usd;
            
            const newPriceA = (marketCapB / marketCapA) * priceA;
            const marketCapRatio = marketCapA / marketCapB;
            const barPercentage = marketCapRatio >= 1 ? (marketCapB / marketCapA) * 100 : (marketCapA / marketCapB) * 100;

            // Fetch coin images from cryptoList
            const coinAInfo = cryptoList.find(coin => coin.id === coinA);
            const coinBInfo = cryptoList.find(coin => coin.id === coinB);
            const coinAImage = coinAInfo ? coinAInfo.image : '';
            const coinBImage = coinBInfo ? coinBInfo.image : '';

            comparisonResult.innerHTML = `
                <div class="coin-comparison">
                    <div class="coin-detail">
                        <img src="${coinAImage}" alt="${searchInputA.dataset.symbol}">
                        <span class="coin-label">${searchInputA.dataset.symbol}</span>
                        <span class="highlight">$${formatMarketCap(marketCapA)}</span>
                    </div>
                    <div class="vs-separator">vs</div>
                    <div class="coin-detail">
                        <img src="${coinBImage}" alt="${searchInputB.dataset.symbol}">
                        <span class="coin-label">${searchInputB.dataset.symbol}</span>
                        <span class="highlight">$${formatMarketCap(marketCapB)}</span>
                    </div>
                </div>
                <div class="hypothetical">
                    <h3>${searchInputA.dataset.symbol} with the Market Cap of ${searchInputB.dataset.symbol}</h3>
                    <span class="price">$${formatPrice(newPriceA)}</span>
                    <span class="multiplier">(${(newPriceA / priceA).toFixed(2)}x)</span>
                </div>
                <div class="marketcap-comparison">
                    <div class="comparison-text">
                        ${marketCapRatio >= 1 ? searchInputA.dataset.symbol : searchInputB.dataset.symbol} is <span class="highlight">${Math.abs(marketCapRatio).toFixed(2)}x</span> above ${marketCapRatio >= 1 ? searchInputB.dataset.symbol : searchInputA.dataset.symbol}
                    </div>
                    <div class="marketcap-bar">
                        <div class="bar-container">
                            <div class="bar ${marketCapRatio >= 1 ? 'first' : 'second'}" style="width: ${barPercentage}%"></div>
                        </div>
                    </div>
                    <div class="marketcap-values">
                        <div class="value">
                            <img src="${coinAImage}" alt="${searchInputA.dataset.symbol}">
                            <span>$${marketCapA.toLocaleString()}</span>
                        </div>
                        <div class="value">
                            <img src="${coinBImage}" alt="${searchInputB.dataset.symbol}">
                            <span>$${marketCapB.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            `;

            // Store data for portfolio calculation
            coinAData = {
                symbol: searchInputA.dataset.symbol,
                marketCap: marketCapA,
                price: priceA,
                image: coinAImage
            };
            coinBData = {
                symbol: searchInputB.dataset.symbol,
                marketCap: marketCapB,
                price: priceB,
                image: coinBImage
            };
            // Trigger portfolio calculation
            calculatePortfolioWorth();
        } else {
            showError("Could not fetch data for the selected cryptocurrencies.");
        }
    } catch (error) {
        console.error("Error comparing market caps:", error);
        showError("Error fetching comparison data. Please try again later.");
    } finally {
        hideLoading('compareButton');
        updateLastUpdated();
    }
}

// Format market cap into T, B, M format
function formatMarketCap(value) {
    if (value >= 1e12) return (value / 1e12).toFixed(2) + "T";
    if (value >= 1e9) return (value / 1e9).toFixed(2) + "B";
    if (value >= 1e6) return (value / 1e6).toFixed(2) + "M";
    return value.toLocaleString();
}

// Format price based on value
function formatPrice(price) {
    if (price >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(2);
    if (price >= 0.01) return price.toFixed(4);
    if (price >= 0.0001) return price.toFixed(6);
    return price.toLocaleString(undefined, { minimumFractionDigits: 8, maximumFractionDigits: 8 });
}

// Create comparison chart (Original)
function createComparisonChart(coinASymbol, coinBSymbol, marketCapA, marketCapB) {
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    
    if (chart) chart.destroy();
    
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [coinASymbol, coinBSymbol],
            datasets: [{
                label: 'Market Cap (USD)',
                data: [marketCapA, marketCapB],
                backgroundColor: [
                    'rgba(255, 140, 0, 0.8)',
                    'rgba(255, 46, 99, 0.8)'
                ],
                borderColor: [
                    'rgba(255, 140, 0, 1)',
                    'rgba(255, 46, 99, 1)'
                ],
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => '$' + formatMarketCap(value),
                        color: '#ddd',
                        font: { size: 12 }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#ddd',
                        font: { size: 14 }
                    },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    titleFont: { size: 14 },
                    bodyFont: { size: 12 },
                    callbacks: {
                        label: context => 'Market Cap: $' + formatMarketCap(context.raw)
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
    
    document.getElementById('chartContainer').style.display = 'block';
}

// New Function to Update Portfolio Labels
function updatePortfolioLabels() {
    const searchInputA = document.getElementById("coinASearch");
    const searchInputB = document.getElementById("coinBSearch");
    const coinALabel = document.getElementById("coinALabel");
    const coinBLabel = document.getElementById("coinBLabel");

    coinALabel.textContent = searchInputA.dataset.symbol ? `${searchInputA.dataset.symbol} (First Crypto)` : 'First Crypto';
    coinBLabel.textContent = searchInputB.dataset.symbol ? `${searchInputB.dataset.symbol} (Second Crypto)` : 'Second Crypto';
}

// New Portfolio Worth Calculation Function (Original)
function calculatePortfolioWorth() {
    const portfolioSection = document.getElementById('portfolio-section');
    const portfolioResult = document.getElementById('portfolioResult');
    
    if (!coinAData || !coinBData) {
        portfolioResult.innerHTML = '<p>Please compare two coins first.</p>';
        portfolioSection.style.display = 'block';
        return;
    }

    const coinAAmount = parseFloat(document.getElementById('coinAAmount').value) || 0;
    const coinBAmount = parseFloat(document.getElementById('coinBAmount').value) || 0;

    if (coinAAmount === 0 && coinBAmount === 0) {
        portfolioResult.innerHTML = '<p>Please enter the amount of at least one cryptocurrency.</p>';
        portfolioSection.style.display = 'block';
        return;
    }

    const coinACurrentPrice = coinAData.price;
    const coinBCurrentPrice = coinBData.price;
    const coinAMarketCap = coinAData.marketCap;
    const coinBMarketCap = coinBData.marketCap;

    // Calculate prices at each other's market cap
    const coinASupply = coinAMarketCap / coinACurrentPrice; // Derived circulating supply
    const coinBSupply = coinBMarketCap / coinBCurrentPrice;
    const coinAPriceAtBMarketCap = coinBMarketCap / coinASupply;
    const coinBPriceAtAMarketCap = coinAMarketCap / coinBSupply;

    // Calculate portfolio values
    const coinAValueAtBMarketCap = coinAAmount * coinAPriceAtBMarketCap;
    const coinBValueAtAMarketCap = coinBAmount * coinBPriceAtAMarketCap;

    // Format the results
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
    portfolioSection.style.display = 'block';
    portfolioSection.classList.remove('fade-in');
    void portfolioSection.offsetWidth; // Trigger reflow
    portfolioSection.classList.add('fade-in');
}

// Add event listeners for real-time portfolio updates
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('coinAAmount').addEventListener('input', calculatePortfolioWorth);
    document.getElementById('coinBAmount').addEventListener('input', calculatePortfolioWorth);
    // Initial label update
    updatePortfolioLabels();
});

// Load crypto list on page load
window.onload = initApp;