// IMPROVED PORTFOLIO TRACKER - SNOWBALL INSPIRED
let cryptoList = [];
let allocationChart = null;
let selectedSimCoin1 = null;
let selectedSimCoin2 = null;

// ===== INITIALIZATION =====
function initApp() {
    showGlobalLoader();
    updateLastUpdated();
    
    loadCryptoList()
        .then(() => {
            loadPortfolioTracker();
            setupThemeToggle();
            setupNavigation();
            initializeCharts();
            setupEventListeners();
            setupSimulator();
            hideGlobalLoader();
        })
        .catch((error) => {
            hideGlobalLoader();
            console.error('Failed to initialize:', error);
            alert("Failed to load cryptocurrency data. Please check your internet connection.");
        });
}

// ===== LOADER =====
function showGlobalLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'flex';
}

function hideGlobalLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';
}

// ===== LAST UPDATED =====
function updateLastUpdated() {
    const element = document.getElementById('lastUpdated');
    if (element) {
        const now = new Date();
        element.textContent = `Last update: ${now.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}`;
    }
}

// ===== LOAD CRYPTO DATA =====
async function loadCryptoList() {
    const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false';
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        cryptoList = await response.json();
        return cryptoList;
    } catch (error) {
        console.error('Error loading crypto list:', error);
        throw error;
    }
}

// ===== PORTFOLIO TRACKER =====
function filterDropdown() {
    const input = document.getElementById('trackerCoinSearch');
    const dropdown = document.getElementById('trackerCoinDropdown');
    
    if (!input || !dropdown) return;
    
    const value = input.value.toLowerCase().trim();
    dropdown.innerHTML = '';
    
    if (!value) {
        dropdown.classList.remove('active');
        return;
    }
    
    const matches = cryptoList.filter(coin => 
        coin.name.toLowerCase().includes(value) || 
        coin.symbol.toLowerCase().includes(value)
    ).slice(0, 10);
    
    if (matches.length === 0) {
        dropdown.innerHTML = '<div class="dropdown-item disabled">No results found</div>';
    } else {
        matches.forEach(coin => {
            const div = document.createElement('div');
            div.className = 'dropdown-item';
            div.innerHTML = `
                <img src="${coin.image}" class="coin-icon" alt="${coin.name}">
                <span>${coin.name} (${coin.symbol.toUpperCase()})</span>
            `;
            div.onclick = () => {
                input.value = `${coin.name} (${coin.symbol.toUpperCase()})`;
                input.dataset.id = coin.id;
                input.dataset.symbol = coin.symbol;
                input.dataset.name = coin.name;
                input.dataset.image = coin.image;
                dropdown.classList.remove('active');
            };
            dropdown.appendChild(div);
        });
    }
    
    dropdown.classList.add('active');
}

async function addCoinToTracker() {
    const searchInput = document.getElementById('trackerCoinSearch');
    const amountInput = document.getElementById('coinAmount');
    const priceInput = document.getElementById('purchasePrice');
    
    const amount = parseFloat(amountInput.value);
    const purchasePrice = parseFloat(priceInput.value);
    const coinId = searchInput.dataset.id;
    
    if (!coinId || isNaN(amount) || amount <= 0 || isNaN(purchasePrice) || purchasePrice <= 0) {
        alert("Please fill all fields correctly.");
        return;
    }
    
    try {
        // Fetch detailed coin data
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}`);
        const data = await response.json();
        
        const currentPrice = data.market_data.current_price.usd;
        const category = data.categories?.[0] || 'Uncategorized';
        
        const coin = {
            id: coinId,
            name: data.name,
            symbol: data.symbol.toUpperCase(),
            image: data.image.large,
            amount: amount,
            purchasePrice: purchasePrice,
            currentPrice: currentPrice,
            value: amount * currentPrice,
            category: category,
            addedAt: new Date().toISOString()
        };
        
        // Add to portfolio
        const portfolio = JSON.parse(localStorage.getItem('cryptoPortfolio') || '[]');
        portfolio.push(coin);
        localStorage.setItem('cryptoPortfolio', JSON.stringify(portfolio));
        
        // Clear inputs
        searchInput.value = '';
        amountInput.value = '';
        priceInput.value = '';
        delete searchInput.dataset.id;
        delete searchInput.dataset.symbol;
        delete searchInput.dataset.name;
        delete searchInput.dataset.image;
        
        // Reload portfolio
        loadPortfolioTracker();
        
    } catch (error) {
        console.error('Error adding coin:', error);
        alert("Failed to add coin. Please try again.");
    }
}

function loadPortfolioTracker() {
    const portfolio = JSON.parse(localStorage.getItem('cryptoPortfolio') || '[]');
    renderPortfolio(portfolio);
    renderTrades(portfolio);
}

function renderPortfolio(portfolio) {
    const list = document.getElementById('holdingsList');
    if (!list) return;
    
    if (portfolio.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No holdings yet</p>
                <span>Add your first cryptocurrency above</span>
            </div>
        `;
        updateSummary(0, 0, 0, 0, 0, 0);
        updateChart({});
        return;
    }
    
    // Calculate totals
    const totalValue = portfolio.reduce((sum, coin) => sum + coin.value, 0);
    const totalInvested = portfolio.reduce((sum, coin) => sum + (coin.amount * coin.purchasePrice), 0);
    const pnl = totalValue - totalInvested;
    const pnlPercent = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0;
    const irr = totalInvested > 0 ? ((totalValue / totalInvested) - 1) * 100 : 0;
    const passiveIncome = totalValue * 0.0327; // 3.27% annual estimate
    
    updateSummary(totalValue, totalInvested, pnl, pnlPercent, irr, passiveIncome);
    
    // Group by category
    const groups = {};
    portfolio.forEach(coin => {
        const category = coin.category || 'Uncategorized';
        if (!groups[category]) {
            groups[category] = {
                coins: [],
                value: 0,
                invested: 0,
                gain: 0,
                count: 0
            };
        }
        groups[category].coins.push(coin);
        groups[category].value += coin.value;
        groups[category].invested += coin.amount * coin.purchasePrice;
        groups[category].gain += coin.value - (coin.amount * coin.purchasePrice);
        groups[category].count++;
    });
    
    // Render holdings with categories
    list.innerHTML = `
        <div class="holdings-header">
            <span>Name</span>
            <span>Value/Invested</span>
            <span>Gain</span>
            <span>Allocation</span>
        </div>
    `;
    
    Object.entries(groups).forEach(([category, group]) => {
        const allocation = totalValue > 0 ? (group.value / totalValue * 100).toFixed(1) : 0;
        const gainClass = group.gain >= 0 ? 'positive' : 'negative';
        
        // Category row
        list.innerHTML += `
            <div class="holdings-row category-row">
                <div>
                    <i class="fas fa-folder"></i>
                    ${category} (${group.count})
                </div>
                <div>$${formatNumber(group.value)} / $${formatNumber(group.invested)}</div>
                <div class="${gainClass}">$${formatNumber(group.gain)}</div>
                <div>${allocation}%</div>
            </div>
        `;
        
        // Coin rows
        group.coins.forEach(coin => {
            const index = portfolio.findIndex(p => 
                p.id === coin.id && 
                p.amount === coin.amount && 
                p.purchasePrice === coin.purchasePrice &&
                p.addedAt === coin.addedAt
            );
            
            const coinAllocation = totalValue > 0 ? (coin.value / totalValue * 100).toFixed(1) : 0;
            const coinPnl = coin.value - (coin.amount * coin.purchasePrice);
            const coinPnlClass = coinPnl >= 0 ? 'positive' : 'negative';
            
            list.innerHTML += `
                <div class="holdings-row coin-row">
                    <div class="coin-info">
                        <img src="${coin.image}" alt="${coin.name}">
                        <span>${coin.name} (${coin.symbol})</span>
                    </div>
                    <div>$${formatNumber(coin.value)}</div>
                    <div class="${coinPnlClass}">$${formatNumber(coinPnl)}</div>
                    <div>${coinAllocation}%</div>
                    <button class="remove-coin" data-index="${index}" onclick="removeCoin(this)">
                        ×
                    </button>
                </div>
            `;
        });
    });
    
    updateChart(groups);
}

function removeCoin(button) {
    const index = parseInt(button.dataset.index);
    if (isNaN(index)) return;
    
    const portfolio = JSON.parse(localStorage.getItem('cryptoPortfolio') || '[]');
    portfolio.splice(index, 1);
    localStorage.setItem('cryptoPortfolio', JSON.stringify(portfolio));
    
    loadPortfolioTracker();
}

function updateSummary(value, invested, pnl, pnlPercent, irr, passive) {
    // Total value
    const valueEl = document.getElementById('totalValue');
    if (valueEl) valueEl.textContent = `$${formatNumber(value)}`;
    
    // Invested
    const investedEl = document.getElementById('invested');
    if (investedEl) investedEl.textContent = `$${formatNumber(invested)} invested`;
    
    // Total profit
    const profitEl = document.getElementById('totalProfit');
    if (profitEl) {
        profitEl.textContent = pnl >= 0 ? `+$${formatNumber(pnl)}` : `-$${formatNumber(Math.abs(pnl))}`;
        profitEl.className = `card-value ${pnl >= 0 ? 'positive' : 'negative'}`;
    }
    
    // Profit percent
    const percentEl = document.getElementById('profitPercent');
    if (percentEl) {
        percentEl.textContent = `${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`;
    }
    
    // IRR
    const irrEl = document.getElementById('irr');
    if (irrEl) irrEl.textContent = `${irr.toFixed(2)}%`;
    
    const irrCurrentEl = document.getElementById('irrCurrent');
    if (irrCurrentEl) irrCurrentEl.textContent = `${(irr * 0.746).toFixed(2)}%`;
    
    // Passive income
    const passiveEl = document.getElementById('passive');
    if (passiveEl) passiveEl.textContent = `$${formatNumber(passive)} annually`;
}

function formatNumber(num) {
    if (isNaN(num) || num === null) return "0.00";
    if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
    if (num >= 1000) return (num / 1000).toFixed(2) + "K";
    return num.toFixed(2);
}

// ===== CHART =====
function initializeCharts() {
    const ctx = document.getElementById('allocationChart');
    if (!ctx) return;
    
    allocationChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [
                    '#60a5fa',
                    '#34d399',
                    '#fbbf24',
                    '#a78bfa',
                    '#f472b6',
                    '#fb923c',
                    '#22d3ee'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12,
                            family: 'Inter'
                        },
                        color: getComputedStyle(document.documentElement)
                            .getPropertyValue('--text-secondary').trim()
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: $${formatNumber(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function updateChart(groups) {
    if (!allocationChart) return;
    
    const labels = Object.keys(groups);
    const data = labels.map(key => groups[key].value);
    
    allocationChart.data.labels = labels;
    allocationChart.data.datasets[0].data = data;
    allocationChart.update();
}

// ===== TRADES =====
function renderTrades(portfolio) {
    const list = document.getElementById('tradesList');
    if (!list) return;
    
    if (portfolio.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-line"></i>
                <p>No trades recorded</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = `
        <div class="trades-header">
            <span>Asset</span>
            <span>Unrealized P/L</span>
            <span>Realized P/L</span>
        </div>
    `;
    
    portfolio.forEach(coin => {
        const unrealized = coin.value - (coin.amount * coin.purchasePrice);
        const unrealizedClass = unrealized >= 0 ? 'positive' : 'negative';
        
        list.innerHTML += `
            <div class="trades-row">
                <div class="coin-info">
                    <img src="${coin.image}" class="coin-icon" alt="${coin.name}">
                    <span>${coin.name}</span>
                </div>
                <div class="${unrealizedClass}">
                    ${unrealized >= 0 ? '+' : ''}$${formatNumber(unrealized)}
                </div>
                <div>$0.00</div>
            </div>
        `;
    });
}

// ===== REFRESH & CLEAR =====
async function refreshTrackerPrices() {
    const portfolio = JSON.parse(localStorage.getItem('cryptoPortfolio') || '[]');
    if (portfolio.length === 0) return;
    
    const ids = [...new Set(portfolio.map(coin => coin.id))].join(',');
    
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
        const prices = await response.json();
        
        portfolio.forEach(coin => {
            if (prices[coin.id]) {
                coin.currentPrice = prices[coin.id].usd;
                coin.value = coin.amount * coin.currentPrice;
            }
        });
        
        localStorage.setItem('cryptoPortfolio', JSON.stringify(portfolio));
        renderPortfolio(portfolio);
        renderTrades(portfolio);
        updateLastUpdated();
        
    } catch (error) {
        console.error('Error refreshing prices:', error);
        alert("Failed to refresh prices. Please try again.");
    }
}

function clearTracker() {
    if (confirm('Are you sure you want to clear all holdings? This cannot be undone.')) {
        localStorage.removeItem('cryptoPortfolio');
        loadPortfolioTracker();
    }
}

// ===== THEME TOGGLE =====
function setupThemeToggle() {
    const button = document.getElementById('themeToggle');
    if (!button) return;
    
    const body = document.body;
    const savedTheme = localStorage.getItem('theme') || 'dark';
    
    if (savedTheme === 'light') {
        body.classList.remove('dark-mode');
    } else {
        body.classList.add('dark-mode');
    }
    
    updateThemeIcon();
    
    button.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        const isDark = body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateThemeIcon();
        
        // Update chart colors
        if (allocationChart) {
            allocationChart.options.plugins.legend.labels.color = 
                getComputedStyle(document.documentElement)
                    .getPropertyValue('--text-secondary').trim();
            allocationChart.update();
        }
    });
}

function updateThemeIcon() {
    const button = document.getElementById('themeToggle');
    const isDark = document.body.classList.contains('dark-mode');
    if (button) {
        button.innerHTML = `<i class="fas fa-${isDark ? 'sun' : 'moon'}"></i>`;
    }
}

// ===== NAVIGATION =====
function setupNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    const pages = document.querySelectorAll('.page');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = tab.getAttribute('href').substring(1);
            
            // Update active states
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            pages.forEach(page => {
                if (page.id === targetPage + 'Page') {
                    page.classList.add('active');
                } else {
                    page.classList.remove('active');
                }
            });
        });
    });
}

// ===== SIMULATOR =====
function setupSimulator() {
    setupSimulatorSearch('simCoin1Search', 'simCoin1Dropdown', 'sim1Selected', 1);
    setupSimulatorSearch('simCoin2Search', 'simCoin2Dropdown', 'sim2Selected', 2);
}

function setupSimulatorSearch(inputId, dropdownId, displayId, coinNumber) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    
    if (!input || !dropdown) return;
    
    input.addEventListener('input', () => {
        const value = input.value.toLowerCase().trim();
        dropdown.innerHTML = '';
        
        if (!value) {
            dropdown.classList.remove('active');
            return;
        }
        
        const matches = cryptoList.filter(coin =>
            coin.name.toLowerCase().includes(value) ||
            coin.symbol.toLowerCase().includes(value)
        ).slice(0, 8);
        
        if (matches.length === 0) {
            dropdown.innerHTML = '<div class="dropdown-item disabled">No results found</div>';
        } else {
            matches.forEach(coin => {
                const div = document.createElement('div');
                div.className = 'dropdown-item';
                div.innerHTML = `
                    <img src="${coin.image}" class="coin-icon" alt="${coin.name}">
                    <span>${coin.name} (${coin.symbol.toUpperCase()})</span>
                `;
                div.onclick = () => selectSimCoin(coin, coinNumber, input, dropdown, displayId);
                dropdown.appendChild(div);
            });
        }
        
        dropdown.classList.add('active');
    });
    
    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
}

function selectSimCoin(coin, coinNumber, input, dropdown, displayId) {
    if (coinNumber === 1) {
        selectedSimCoin1 = coin;
    } else {
        selectedSimCoin2 = coin;
    }
    
    input.value = '';
    dropdown.classList.remove('active');
    
    // Update display
    const display = document.getElementById(displayId);
    if (display) {
        display.innerHTML = `
            <img src="${coin.image}" alt="${coin.name}">
            <div class="coin-details">
                <div class="coin-name">${coin.name} (${coin.symbol.toUpperCase()})</div>
                <div class="coin-price">$${formatNumber(coin.current_price)}</div>
            </div>
        `;
        display.classList.add('active');
    }
}

async function calculateSimulation() {
    const resultsDiv = document.getElementById('simulatorResults');
    
    if (!selectedSimCoin1 || !selectedSimCoin2) {
        alert('Please select both cryptocurrencies');
        return;
    }
    
    try {
        // Fetch detailed data for both coins
        const [res1, res2] = await Promise.all([
            fetch(`https://api.coingecko.com/api/v3/coins/${selectedSimCoin1.id}`),
            fetch(`https://api.coingecko.com/api/v3/coins/${selectedSimCoin2.id}`)
        ]);
        
        const [data1, data2] = await Promise.all([res1.json(), res2.json()]);
        
        const coin1Supply = data1.market_data.circulating_supply;
        const coin1Price = data1.market_data.current_price.usd;
        const coin2MarketCap = data2.market_data.market_cap.usd;
        
        if (!coin1Supply) {
            resultsDiv.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Missing supply data</p>
                    <span>${selectedSimCoin1.name} circulating supply data is not available</span>
                </div>
            `;
            return;
        }
        
        const newPrice = coin2MarketCap / coin1Supply;
        const change = ((newPrice / coin1Price) - 1) * 100;
        const multiplier = newPrice / coin1Price;
        
        resultsDiv.innerHTML = `
            <div class="result-card">
                <div class="result-label">
                    ${data1.symbol.toUpperCase()} at ${data2.symbol.toUpperCase()}'s market cap
                </div>
                <div class="result-price">$${formatNumber(newPrice)}</div>
                <div class="result-change">
                    ${change >= 0 ? '↑' : '↓'} ${Math.abs(change).toFixed(2)}%
                </div>
                <div class="result-stats">
                    <div class="result-stat">
                        <div class="result-stat-label">Current Price</div>
                        <div class="result-stat-value">$${formatNumber(coin1Price)}</div>
                    </div>
                    <div class="result-stat">
                        <div class="result-stat-label">Multiplier</div>
                        <div class="result-stat-value">${multiplier.toFixed(2)}x</div>
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error calculating:', error);
        resultsDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Calculation failed</p>
                <span>Please try again</span>
            </div>
        `;
    }
}

function swapSimCoins() {
    const temp = selectedSimCoin1;
    selectedSimCoin1 = selectedSimCoin2;
    selectedSimCoin2 = temp;
    
    // Update displays
    if (selectedSimCoin1) {
        const display1 = document.getElementById('sim1Selected');
        if (display1) {
            display1.innerHTML = `
                <img src="${selectedSimCoin1.image}" alt="${selectedSimCoin1.name}">
                <div class="coin-details">
                    <div class="coin-name">${selectedSimCoin1.name} (${selectedSimCoin1.symbol.toUpperCase()})</div>
                    <div class="coin-price">$${formatNumber(selectedSimCoin1.current_price)}</div>
                </div>
            `;
            display1.classList.add('active');
        }
    } else {
        document.getElementById('sim1Selected')?.classList.remove('active');
    }
    
    if (selectedSimCoin2) {
        const display2 = document.getElementById('sim2Selected');
        if (display2) {
            display2.innerHTML = `
                <img src="${selectedSimCoin2.image}" alt="${selectedSimCoin2.name}">
                <div class="coin-details">
                    <div class="coin-name">${selectedSimCoin2.name} (${selectedSimCoin2.symbol.toUpperCase()})</div>
                    <div class="coin-price">$${formatNumber(selectedSimCoin2.current_price)}</div>
                </div>
            `;
            display2.classList.add('active');
        }
    } else {
        document.getElementById('sim2Selected')?.classList.remove('active');
    }
    
    // Clear results
    document.getElementById('simulatorResults').innerHTML = '';
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Portfolio tracker
    const searchInput = document.getElementById('trackerCoinSearch');
    const addButton = document.getElementById('addCoinButton');
    const refreshButton = document.getElementById('refreshTrackerButton');
    const clearButton = document.getElementById('clearTrackerButton');
    
    if (searchInput) searchInput.addEventListener('input', filterDropdown);
    if (addButton) addButton.addEventListener('click', addCoinToTracker);
    if (refreshButton) refreshButton.addEventListener('click', refreshTrackerPrices);
    if (clearButton) clearButton.addEventListener('click', clearTracker);
    
    // Simulator
    const calculateButton = document.getElementById('calculateButton');
    const swapButton = document.getElementById('swapButton');
    
    if (calculateButton) calculateButton.addEventListener('click', calculateSimulation);
    if (swapButton) swapButton.addEventListener('click', swapSimCoins);
    
    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
        const trackerDropdown = document.getElementById('trackerCoinDropdown');
        const trackerSearch = document.getElementById('trackerCoinSearch');
        
        if (trackerDropdown && trackerSearch) {
            if (!trackerSearch.contains(e.target) && !trackerDropdown.contains(e.target)) {
                trackerDropdown.classList.remove('active');
            }
        }
    });
}

// ===== START APP =====
document.addEventListener('DOMContentLoaded', initApp);