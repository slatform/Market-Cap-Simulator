// Global variables
let cryptoList = [];
let isLoading = false;
let chart = null;

// Initialize the application
async function initApp() {
    updateLastUpdated();
    showLoading('coinASearch');
    showLoading('coinBSearch');
    await loadCryptoList();
    hideLoading('coinASearch');
    hideLoading('coinBSearch');
    
    // Add event listeners for better mobile experience
    document.querySelectorAll('.search-container input').forEach(input => {
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.crypto-selector')) {
                document.getElementById('coinADropdown').style.display = 'none';
                document.getElementById('coinBDropdown').style.display = 'none';
            }
        });
        
        // Show dropdown on focus if there's input
        input.addEventListener('focus', () => {
            const searchInputId = input.id;
            const dropdownId = searchInputId.replace('Search', 'Dropdown');
            if (input.value) {
                filterDropdown(searchInputId, dropdownId);
            }
        });
    });
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

// Fetch top 200 cryptos and store them for filtering
async function loadCryptoList() {
    const apiUrl = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=200&page=1&sparkline=false";
    
    try {
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
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

    if (searchValue === "" && !input.matches(':focus')) {
        dropdown.style.display = "none";
        return;
    }

    dropdown.innerHTML = ""; // Clear previous results
    
    if (isLoading || cryptoList.length === 0) {
        const item = document.createElement("div");
        item.className = "dropdown-item disabled";
        item.textContent = "Loading cryptocurrencies...";
        dropdown.appendChild(item);
        dropdown.style.display = "block";
        return;
    }
    
    // Filter the list based on input
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
        filteredList.forEach(coin => {
            const item = document.createElement("div");
            item.className = "dropdown-item";
            item.textContent = `${coin.name} (${coin.symbol.toUpperCase()})`;
            item.dataset.id = coin.id;
            item.dataset.symbol = coin.symbol.toUpperCase();
            item.dataset.image = coin.image;
            
            // Add click event to select item
            item.addEventListener('click', () => {
                input.value = item.textContent;
                input.dataset.coinId = coin.id;
                input.dataset.symbol = coin.symbol.toUpperCase();
                dropdown.style.display = "none";
            });
            
            dropdown.appendChild(item);
        });
    }
    
    dropdown.style.display = "block";
}

// Compare Market Caps
async function compareMarketCaps() {
    const searchInputA = document.getElementById("coinASearch");
    const searchInputB = document.getElementById("coinBSearch");
    const resultsSection = document.getElementById("results-section");
    const comparisonResult = document.getElementById("comparisonResult");
    
    comparisonResult.innerHTML = "";
    resultsSection.style.display = "block";

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
                            <span class="coin-label">${searchInputA.dataset.symbol || coinA.toUpperCase()}</span>
                            <span class="highlight">$${formattedMarketCapA}</span>
                            <div class="price-detail">Price: $${formatPrice(priceA)} (${change24hA >= 0 ? '+' : ''}${change24hA.toFixed(2)}%)</div>
                        </div>
                        <div class="vs-separator">vs</div>
                        <div class="coin-detail">
                            <span class="coin-label">${searchInputB.dataset.symbol || coinB.toUpperCase()}</span>
                            <span class="highlight">$${formattedMarketCapB}</span>
                            <div class="price-detail">Price: $${formatPrice(priceB)} (${change24hB >= 0 ? '+' : ''}${change24hB.toFixed(2)}%)</div>
                        </div>
                    </div>
                    <div class="ratio-detail">
                        <span class="ratio-label">Market Cap Ratio:</span>
                        <span class="ratio-value">${marketCapRatio.toFixed(2)}x</span>
                        <span class="difference">(${marketCapDiff >= 0 ? '+' : ''}${marketCapDiff.toFixed(2)}%)</span>
                    </div>
                    <div class="hypothetical-price">
                        <span class="coin-label">${searchInputA.dataset.symbol || coinA.toUpperCase()}</span> @ 
                        <span class="coin-label">${searchInputB.dataset.symbol || coinB.toUpperCase()}</span> Cap: 
                        <span class="highlight">$${formatPrice(newPriceA)}</span>
                    </div>
                </div>
            `;
            
            createComparisonChart(
                searchInputA.dataset.symbol || coinA.toUpperCase(), 
                searchInputB.dataset.symbol || coinB.toUpperCase(), 
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
    
    if (chart) {
        chart.destroy();
    }
    
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [coinASymbol, coinBSymbol],
            datasets: [{
                label: 'Market Cap (USD)',
                data: [marketCapA, marketCapB],
                backgroundColor: [
                    'rgba(255, 140, 0, 0.7)',
                    'rgba(255, 46, 99, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 140, 0, 1)',
                    'rgba(255, 46, 99, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + formatMarketCap(value);
                        },
                        color: '#ddd'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#ddd'
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Market Cap: $' + formatMarketCap(context.raw);
                        }
                    }
                }
            }
        }
    });
    
    document.getElementById('chartContainer').style.display = 'block';
}

// Load crypto list on page load
window.onload = initApp;