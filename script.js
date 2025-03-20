// Global variables
let cryptoList = [];
let isLoading = false;
let chart = null;
let selectedIndex = -1;

// Initialize the application
async function initApp() {
    showGlobalLoader();
    updateLastUpdated();
    await loadCryptoList();
    hideGlobalLoader();
    
    document.querySelectorAll('.search-container input').forEach(input => {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.crypto-selector')) {
                document.getElementById('coinADropdown').style.display = 'none';
                document.getElementById('coinBDropdown').style.display = 'none';
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

// Fetch top 500 cryptos (changed from 200 to 500)
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

// Filter dropdown based on user input
function filterDropdown(searchInputId, dropdownId) {
    const input = document.getElementById(searchInputId);
    const dropdown = document.getElementById(dropdownId);
    const searchValue = input.value.toLowerCase();
    selectedIndex = -1; // Reset selected index

    if (searchValue === "" && !input.matches(':focus')) {
        dropdown.style.display = "none";
        return;
    }

    dropdown.innerHTML = "";
    
    if (isLoading || cryptoList.length === 0) {
        const item = document.createElement("div");
        item.className = "dropdown-item disabled";
        item.textContent = "Loading cryptocurrencies...";
        dropdown.appendChild(item);
        dropdown.style.display = "block";
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
    
    dropdown.style.display = "block";
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
    dropdown.style.display = "none";
}

// Compare Market Caps
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
            const change24hA = data[coinA].usd_24h_change || 0;
            const change24hB = data[coinB].usd_24h_change || 0;
            
            const newPriceA = (marketCapB / marketCapA) * priceA;
            const marketCapDiff = ((marketCapB / marketCapA) - 1) * 100;
            const marketCapRatio = marketCapA / marketCapB;
            
            const formattedMarketCapA = formatMarketCap(marketCapA);
            const formattedMarketCapB = formatMarketCap(marketCapB);
            
            comparisonResult.innerHTML = `
                <div class="comparison-details">
                    <div class="coin-comparison">
                        <div class="coin-detail">
                            <span class="coin-label">${searchInputA.dataset.symbol}</span>
                            <span class="highlight">$${formattedMarketCapA}</span>
                            <div class="price-detail">Price: $${formatPrice(priceA)} <span class="change ${change24hA >= 0 ? 'positive' : 'negative'}">(${change24hA >= 0 ? '+' : ''}${change24hA.toFixed(2)}%)</span></div>
                        </div>
                        <div class="vs-separator">vs</div>
                        <div class="coin-detail">
                            <span class="coin-label">${searchInputB.dataset.symbol}</span>
                            <span class="highlight">$${formattedMarketCapB}</span>
                            <div class="price-detail">Price: $${formatPrice(priceB)} <span class="change ${change24hB >= 0 ? 'positive' : 'negative'}">(${change24hB >= 0 ? '+' : ''}${change24hB.toFixed(2)}%)</span></div>
                        </div>
                    </div>
                    <div class="ratio-detail">
                        <span class="ratio-label">Market Cap Ratio:</span>
                        <span class="ratio-value">${marketCapRatio.toFixed(2)}x</span>
                        <span class="difference ${marketCapDiff >= 0 ? 'positive' : 'negative'}">(${marketCapDiff >= 0 ? '+' : ''}${marketCapDiff.toFixed(2)}%)</span>
                    </div>
                    <div class="hypothetical-price">
                        <span class="coin-label">${searchInputA.dataset.symbol}</span> @ 
                        <span class="coin-label">${searchInputB.dataset.symbol}</span> Cap: 
                        <span class="highlight">$${formatPrice(newPriceA)}</span>
                    </div>
                </div>
            `;
            
            createComparisonChart(
                searchInputA.dataset.symbol, 
                searchInputB.dataset.symbol, 
                marketCapA, 
                marketCapB
            );
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

// Create comparison chart
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

// Load crypto list on page load
window.onload = initApp;