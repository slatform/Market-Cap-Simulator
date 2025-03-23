// Global variables
let isLoading = false;

// Static fallback prices
const staticPrices = {
    "bitcoin": 60000,
    "ethereum": 3000,
    "binancecoin": 500,
    "solana": 150,
    "ripple": 0.5
};

// Initialize the application
async function initApp() {
    showGlobalLoader();
    updateLastUpdated();
    loadPortfolioTracker();
    setupThemeToggle();
    hideGlobalLoader();
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
function showError(message, targetId = 'trackerList') {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    
    const target = document.getElementById(targetId);
    target.innerHTML = '';
    target.appendChild(errorElement);
}

// Update last updated timestamp
function updateLastUpdated() {
    const now = new Date();
    document.getElementById('lastUpdated').textContent = `Last dynamic update: ${now.toLocaleString()}`;
}

// Format price
function formatPrice(price) {
    if (price >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(2);
    if (price >= 0.01) return price.toFixed(4);
    if (price >= 0.0001) return price.toFixed(6);
    return price.toLocaleString(undefined, { minimumFractionDigits: 8, maximumFractionDigits: 8 });
}

// Portfolio Tracker Functions
function loadPortfolioTracker() {
    const trackerList = document.getElementById('trackerList');
    const savedPortfolio = JSON.parse(localStorage.getItem('cryptoPortfolio')) || [];
    
    if (savedPortfolio.length === 0) {
        trackerList.innerHTML = '<p>Your portfolio is empty. Add coins like Bitcoin or Ethereum to track their value offline or with live updates.</p>';
    } else {
        renderTrackerList(savedPortfolio);
    }
    document.getElementById('tracker-section').style.display = 'block';
}

function addCoinToTracker() {
    const coinNameInput = document.getElementById('trackerCoinName');
    const coinAmountInput = document.getElementById('trackerCoinAmount');
    const coinName = coinNameInput.value.trim();
    const coinAmount = parseFloat(coinAmountInput.value) || 0;

    if (!coinName || coinAmount <= 0) {
        showError("Please enter a valid coin name and amount.");
        return;
    }

    const savedPortfolio = JSON.parse(localStorage.getItem('cryptoPortfolio')) || [];
    const coinId = coinName.toLowerCase().replace(/\s+/g, '-');
    const staticPrice = staticPrices[coinId] || 0;
    const coinData = {
        name: coinName,
        amount: coinAmount,
        price: staticPrice,
        value: staticPrice * coinAmount
    };

    savedPortfolio.push(coinData);
    localStorage.setItem('cryptoPortfolio', JSON.stringify(savedPortfolio));
    renderTrackerList(savedPortfolio);

    coinNameInput.value = '';
    coinAmountInput.value = '';
}

function renderTrackerList(portfolio) {
    const trackerList = document.getElementById('trackerList');
    trackerList.innerHTML = '';

    if (portfolio.length === 0) {
        trackerList.innerHTML = '<p>Your portfolio is empty. Add coins like Bitcoin or Ethereum to track their value offline or with live updates.</p>';
        return;
    }

    let totalValue = 0;
    portfolio.forEach((coin, index) => {
        totalValue += coin.value;
        trackerList.innerHTML += `
            <div class="tracker-row">
                <div class="coin-info">
                    <span>${coin.name}</span> - <span>${coin.amount.toFixed(4)}</span>
                </div>
                <div class="coin-value">$${formatPrice(coin.value)} ($${coin.price.toLocaleString()})</div>
                <button class="remove-coin" onclick="removeCoinFromTracker(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });

    trackerList.innerHTML += `
        <div class="tracker-row">
            <div class="coin-info"><strong>Total Value:</strong></div>
            <div class="coin-value"><strong>$${formatPrice(totalValue)}</strong></div>
        </div>
    `;
}

function removeCoinFromTracker(index) {
    const savedPortfolio = JSON.parse(localStorage.getItem('cryptoPortfolio')) || [];
    savedPortfolio.splice(index, 1);
    localStorage.setItem('cryptoPortfolio', JSON.stringify(savedPortfolio));
    renderTrackerList(savedPortfolio);
}

async function refreshTrackerPrices() {
    const savedPortfolio = JSON.parse(localStorage.getItem('cryptoPortfolio')) || [];
    if (savedPortfolio.length === 0) return;

    showLoading('refreshTrackerButton');
    const coinNames = savedPortfolio.map(coin => coin.name.toLowerCase().replace(/\s+/g, '-'));
    const apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinNames.join(',')}&vs_currencies=usd`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        const data = await response.json();

        savedPortfolio.forEach(coin => {
            const coinId = coin.name.toLowerCase().replace(/\s+/g, '-');
            if (data[coinId] && data[coinId].usd) {
                coin.price = data[coinId].usd;
                coin.value = coin.amount * coin.price;
            }
        });

        localStorage.setItem('cryptoPortfolio', JSON.stringify(savedPortfolio));
        renderTrackerList(savedPortfolio);
    } catch (error) {
        console.error("Error refreshing tracker prices:", error);
        showError("Failed to refresh prices. Using static values.");
    } finally {
        hideLoading('refreshTrackerButton');
        updateLastUpdated();
    }
}

function clearTracker() {
    localStorage.removeItem('cryptoPortfolio');
    loadPortfolioTracker();
}

// Theme Toggle Function
function setupThemeToggle() {
    const toggleButton = document.getElementById('themeToggle');
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

// Load app on page load
window.onload = initApp;