// ULTRA SIMPLE - GUARANTEED TO WORK
let cryptoList = [];
let allocationChart = null;
let selectedSimCoin1 = null;
let selectedSimCoin2 = null;

// ===== INITIALIZATION =====
function initApp() {
    showGlobalLoader();
    loadCryptoList()
        .then(() => {
            loadPortfolioTracker();
            setupThemeToggle();
            setupNavigation();
            initializeCharts();
            setupEventListeners();
            setupSimulator();
            hideGlobalLoader();
            console.log('✓ App ready!');
        })
        .catch((error) => {
            hideGlobalLoader();
            console.error('Init failed:', error);
        });
}

function showGlobalLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'flex';
}

function hideGlobalLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';
}

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

// ===== LOAD CRYPTO LIST - SIMPLE =====
async function loadCryptoList() {
    try {
        console.log('Loading coins...');
        // ONLY CHANGE: increase per_page to 250 to include top 250 coins
        const response = await fetch(
            'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false'
        );
        
        if (response.ok) {
            cryptoList = await response.json();
            console.log(`✓ Loaded ${cryptoList.length} coins`);
            return;
        }
    } catch (error) {
        console.warn('API failed, using backup');
    }
    
    // Backup hardcoded data
    cryptoList = [
        {id: "bitcoin", symbol: "btc", name: "Bitcoin", current_price: 69000, market_cap: 1350000000000, image: "https://assets.coincap.io/assets/icons/btc@2x.png", circulating_supply: 19500000},
        {id: "ethereum", symbol: "eth", name: "Ethereum", current_price: 2500, market_cap: 300000000000, image: "https://assets.coincap.io/assets/icons/eth@2x.png", circulating_supply: 120000000},
        {id: "tether", symbol: "usdt", name: "Tether", current_price: 1, market_cap: 100000000000, image: "https://assets.coincap.io/assets/icons/usdt@2x.png", circulating_supply: 100000000000},
        {id: "binancecoin", symbol: "bnb", name: "BNB", current_price: 600, market_cap: 90000000000, image: "https://assets.coincap.io/assets/icons/bnb@2x.png", circulating_supply: 150000000},
        {id: "solana", symbol: "sol", name: "Solana", current_price: 180, market_cap: 80000000000, image: "https://assets.coincap.io/assets/icons/sol@2x.png", circulating_supply: 444000000},
        {id: "ripple", symbol: "xrp", name: "XRP", current_price: 0.65, market_cap: 35000000000, image: "https://assets.coincap.io/assets/icons/xrp@2x.png", circulating_supply: 53800000000},
        {id: "cardano", symbol: "ada", name: "Cardano", current_price: 0.60, market_cap: 21000000000, image: "https://assets.coincap.io/assets/icons/ada@2x.png", circulating_supply: 35000000000},
        {id: "avalanche-2", symbol: "avax", name: "Avalanche", current_price: 40, market_cap: 15000000000, image: "https://assets.coincap.io/assets/icons/avax@2x.png", circulating_supply: 375000000},
        {id: "dogecoin", symbol: "doge", name: "Dogecoin", current_price: 0.15, market_cap: 21000000000, image: "https://assets.coincap.io/assets/icons/doge@2x.png", circulating_supply: 140000000000},
        {id: "polkadot", symbol: "dot", name: "Polkadot", current_price: 7, market_cap: 10000000000, image: "https://assets.coincap.io/assets/icons/dot@2x.png", circulating_supply: 1400000000}
    ];
    console.log('✓ Using backup data');
}

// ===== SIMPLE CALCULATOR - NO COMPLEX API CALLS =====
async function calculateSimulation() {
    console.log('=== CALCULATE CLICKED ===');
    const resultsDiv = document.getElementById('simulatorResults');
    
    if (!selectedSimCoin1 || !selectedSimCoin2) {
        alert('Please select both coins first!');
        return;
    }
    
    console.log('Coin 1:', selectedSimCoin1.name);
    console.log('Coin 2:', selectedSimCoin2.name);

    // Ensure results container is visible
    if (resultsDiv) resultsDiv.classList.add('active');

    resultsDiv.innerHTML = '<div class="empty-state"><div class="loader-circle"></div><p>Calculating...</p></div>';
    
    try {
        // Get supply for coin 1
        let coin1Supply = selectedSimCoin1.circulating_supply;
        
        // If we don't have supply, calculate it
        if (!coin1Supply || coin1Supply === 0) {
            coin1Supply = selectedSimCoin1.market_cap / selectedSimCoin1.current_price;
            console.log('Calculated supply for', selectedSimCoin1.name, '=', coin1Supply);
        }
        
        const coin1Price = selectedSimCoin1.current_price;
        const coin2MarketCap = selectedSimCoin2.market_cap;
        
        console.log('Supply:', coin1Supply);
        console.log('Current price:', coin1Price);
        console.log('Target market cap:', coin2MarketCap);
        
        // THE CALCULATION
        const newPrice = coin2MarketCap / coin1Supply;
        const change = ((newPrice / coin1Price) - 1) * 100;
        const multiplier = newPrice / coin1Price;
        
        console.log('NEW PRICE:', newPrice);
        console.log('Change:', change, '%');
        console.log('Multiplier:', multiplier, 'x');
        
        // Show result
        resultsDiv.innerHTML = `
            <div class="result-card" style="background: var(--bg-elevated); padding: 30px; border-radius: 12px; border: 1px solid var(--border-color);">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 8px;">
                        ${selectedSimCoin1.symbol.toUpperCase()} at ${selectedSimCoin2.symbol.toUpperCase()}'s market cap
                    </div>
                    <div style="font-size: 2.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">
                        $${formatNumber(newPrice)}
                    </div>
                    <div style="font-size: 1.25rem; font-weight: 600; color: ${change >= 0 ? '#22c55e' : '#ef4444'};">
                        ${change >= 0 ? '↑' : '↓'} ${Math.abs(change).toFixed(2)}%
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-color);">
                    <div style="text-align: center;">
                        <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 4px;">Current Price</div>
                        <div style="font-size: 1.125rem; font-weight: 600;">$${formatNumber(coin1Price)}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 0.75rem; color: var(--text-tertiary); margin-bottom: 4px;">Multiplier</div>
                        <div style="font-size: 1.125rem; font-weight: 600;">${multiplier.toFixed(2)}x</div>
                    </div>
                </div>
            </div>
        `;
        
        console.log('✓ SUCCESS!');
        
    } catch (error) {
        console.error('ERROR:', error);
        resultsDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Calculation Error</p>
                <span>${error.message}</span>
            </div>
        `;
    }
}

function formatNumber(num) {
    if (isNaN(num) || num === null) return "0.00";
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + "B";
    if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
    if (num >= 1000) return (num / 1000).toFixed(2) + "K";
    if (num >= 1) return num.toFixed(2);
    if (num >= 0.01) return num.toFixed(4);
    if (num >= 0.0001) return num.toFixed(6);
    return num.toFixed(8);
}

// ===== PORTFOLIO FUNCTIONS =====
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
    ).slice(0, 15);
    
    if (matches.length === 0) {
        dropdown.innerHTML = '<div class="dropdown-item disabled">No results</div>';
    } else {
        matches.forEach(coin => {
            const div = document.createElement('div');
            div.className = 'dropdown-item';
            div.innerHTML = `
                <img src="${coin.image}" class="coin-icon" alt="${coin.name}" onerror="this.style.display='none'">
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
    
    const coinData = cryptoList.find(c => c.id === coinId);
    if (!coinData) {
        alert("Coin not found");
        return;
    }
    
    const coin = {
        id: coinId,
        name: coinData.name,
        symbol: coinData.symbol.toUpperCase(),
        image: coinData.image,
        amount: amount,
        purchasePrice: purchasePrice,
        currentPrice: coinData.current_price,
        value: amount * coinData.current_price,
        addedAt: new Date().toISOString()
    };
    
    const portfolio = JSON.parse(localStorage.getItem('cryptoPortfolio') || '[]');
    portfolio.push(coin);
    localStorage.setItem('cryptoPortfolio', JSON.stringify(portfolio));
    
    searchInput.value = '';
    amountInput.value = '';
    priceInput.value = '';
    delete searchInput.dataset.id;
    
    loadPortfolioTracker();
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
        updateSummaryCards(portfolio);
        return;
    }
    
    list.innerHTML = portfolio.map((coin, index) => {
        const profit = (coin.currentPrice - coin.purchasePrice) * coin.amount;
        const profitPercent = ((coin.currentPrice / coin.purchasePrice) - 1) * 100;
        const isProfit = profit >= 0;
        
        return `
            <div class="holding-item">
                <div class="holding-header">
                    <div class="holding-info">
                        <img src="${coin.image}" alt="${coin.name}" onerror="this.style.display='none'">
                        <div class="holding-details">
                            <h4>${coin.name}</h4>
                            <span>${coin.symbol}</span>
                        </div>
                    </div>
                    <div class="holding-actions">
                        <button onclick="deleteCoin(${index})" class="delete-btn">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="holding-stats">
                    <div class="holding-stat">
                        <div class="stat-label">Amount</div>
                        <div class="stat-value">${coin.amount}</div>
                    </div>
                    <div class="holding-stat">
                        <div class="stat-label">Value</div>
                        <div class="stat-value">$${coin.value.toFixed(2)}</div>
                    </div>
                    <div class="holding-stat">
                        <div class="stat-label">Profit/Loss</div>
                        <div class="stat-value ${isProfit ? 'positive' : 'negative'}">
                            ${isProfit ? '+' : ''}$${profit.toFixed(2)} (${profitPercent.toFixed(2)}%)
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    updateSummaryCards(portfolio);
    updateAllocationChart(portfolio);
}

function updateSummaryCards(portfolio) {
    const totalValue = portfolio.reduce((sum, coin) => sum + coin.value, 0);
    const totalInvested = portfolio.reduce((sum, coin) => sum + (coin.purchasePrice * coin.amount), 0);
    const totalProfit = totalValue - totalInvested;
    const profitPercent = totalInvested > 0 ? ((totalValue / totalInvested) - 1) * 100 : 0;
    
    const valueEl = document.getElementById('totalValue');
    const investedEl = document.getElementById('invested');
    const profitEl = document.getElementById('totalProfit');
    const profitPercentEl = document.getElementById('profitPercent');
    
    if (valueEl) valueEl.textContent = `$${totalValue.toFixed(2)}`;
    if (investedEl) investedEl.textContent = `$${totalInvested.toFixed(2)} invested`;
    if (profitEl) {
        profitEl.textContent = `${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}`;
        profitEl.className = `card-value ${totalProfit >= 0 ? 'positive' : 'negative'}`;
    }
    if (profitPercentEl) {
        profitPercentEl.textContent = `${profitPercent >= 0 ? '+' : ''}${profitPercent.toFixed(2)}%`;
    }
}

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
    
    list.innerHTML = portfolio.map(coin => `
        <div class="trade-item">
            <div class="trade-info">
                <div class="trade-type buy">BUY</div>
                <div class="trade-details">
                    <div class="trade-coin">${coin.name}</div>
                    <div class="trade-meta">${new Date(coin.addedAt).toLocaleDateString()}</div>
                </div>
            </div>
            <div class="trade-value">
                <div class="trade-amount">${coin.amount} ${coin.symbol}</div>
                <div class="trade-price">@ $${coin.purchasePrice.toFixed(2)}</div>
            </div>
        </div>
    `).join('');
}

function deleteCoin(index) {
    if (!confirm('Remove this holding?')) return;
    const portfolio = JSON.parse(localStorage.getItem('cryptoPortfolio') || '[]');
    portfolio.splice(index, 1);
    localStorage.setItem('cryptoPortfolio', JSON.stringify(portfolio));
    loadPortfolioTracker();
}

async function refreshTrackerPrices() {
    alert('Price refresh coming soon!');
}

function clearTracker() {
    if (!confirm('Clear all holdings?')) return;
    localStorage.removeItem('cryptoPortfolio');
    loadPortfolioTracker();
}

// ===== CHARTS =====
function initializeCharts() {
    const canvas = document.getElementById('allocationChart');
    if (!canvas) return;
    updateAllocationChart([]);
}

function updateAllocationChart(portfolio) {
    const canvas = document.getElementById('allocationChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (allocationChart) {
        allocationChart.destroy();
    }
    
    if (portfolio.length === 0) {
        allocationChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['No Data'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#2a2a2a']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                }
            }
        });
        return;
    }
    
    const labels = portfolio.map(coin => coin.symbol);
    const data = portfolio.map(coin => coin.value);
    const colors = [];
    for (let i = 0; i < portfolio.length; i++) {
        const hue = (i * 360 / portfolio.length) % 360;
        colors.push(`hsl(${hue}, 70%, 60%)`);
    }
    
    allocationChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#000'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#fff',
                        padding: 15,
                        font: { size: 12 }
                    }
                }
            }
        }
    });
}

// ===== SIMULATOR SEARCH =====
function setupSimulator() {
    console.log('Setting up simulator...');
    setupSimulatorSearch('simCoin1Search', 'simCoin1Dropdown', 'sim1Selected', 1);
    setupSimulatorSearch('simCoin2Search', 'simCoin2Dropdown', 'sim2Selected', 2);
}

function setupSimulatorSearch(inputId, dropdownId, displayId, coinNumber) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    
    if (!input || !dropdown) {
        console.warn('Missing elements:', inputId, dropdownId);
        return;
    }
    
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
        ).slice(0, 15);
        
        if (matches.length === 0) {
            dropdown.innerHTML = '<div class="dropdown-item disabled">No results</div>';
        } else {
            matches.forEach(coin => {
                const div = document.createElement('div');
                div.className = 'dropdown-item';
                div.innerHTML = `
                    <img src="${coin.image}" class="coin-icon" alt="${coin.name}" onerror="this.style.display='none'">
                    <span>${coin.name} (${coin.symbol.toUpperCase()})</span>
                `;
                div.onclick = () => selectSimCoin(coin, coinNumber, input, dropdown, displayId);
                dropdown.appendChild(div);
            });
        }
        
        dropdown.classList.add('active');
    });
    
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
}

function selectSimCoin(coin, coinNumber, input, dropdown, displayId) {
    console.log('Selected coin', coinNumber, ':', coin.name);
    
    if (coinNumber === 1) {
        selectedSimCoin1 = coin;
    } else {
        selectedSimCoin2 = coin;
    }
    
    input.value = '';
    dropdown.classList.remove('active');
    
    const display = document.getElementById(displayId);
    if (display) {
        display.innerHTML = `
            <img src="${coin.image}" alt="${coin.name}" onerror="this.style.display='none'">
            <div class="coin-details">
                <div class="coin-name">${coin.name} (${coin.symbol.toUpperCase()})</div>
                <div class="coin-price">$${formatNumber(coin.current_price)}</div>
            </div>
        `;
        display.classList.add('active');
    }
}

function swapSimCoins() {
    const temp = selectedSimCoin1;
    selectedSimCoin1 = selectedSimCoin2;
    selectedSimCoin2 = temp;
    
    if (selectedSimCoin1) {
        const display1 = document.getElementById('sim1Selected');
        if (display1) {
            display1.innerHTML = `
                <img src="${selectedSimCoin1.image}" alt="${selectedSimCoin1.name}" onerror="this.style.display='none'">
                <div class="coin-details">
                    <div class="coin-name">${selectedSimCoin1.name} (${selectedSimCoin1.symbol.toUpperCase()})</div>
                    <div class="coin-price">$${formatNumber(selectedSimCoin1.current_price)}</div>
                </div>
            `;
            display1.classList.add('active');
        }
    } else {
        const display1 = document.getElementById('sim1Selected');
        if (display1) display1.classList.remove('active');
    }
    
    if (selectedSimCoin2) {
        const display2 = document.getElementById('sim2Selected');
        if (display2) {
            display2.innerHTML = `
                <img src="${selectedSimCoin2.image}" alt="${selectedSimCoin2.name}" onerror="this.style.display='none'">
                <div class="coin-details">
                    <div class="coin-name">${selectedSimCoin2.name} (${selectedSimCoin2.symbol.toUpperCase()})</div>
                    <div class="coin-price">$${formatNumber(selectedSimCoin2.current_price)}</div>
                </div>
            `;
            display2.classList.add('active');
        }
    } else {
        const display2 = document.getElementById('sim2Selected');
        if (display2) display2.classList.remove('active');
    }
    
    const resultsDiv = document.getElementById('simulatorResults');
    if (resultsDiv) resultsDiv.innerHTML = '';
}

// ===== NAVIGATION =====
function setupNavigation() {
    console.log('Setting up navigation...');
    const navTabs = document.querySelectorAll('.nav-tab');
    const pages = document.querySelectorAll('.page');
    
    console.log('Nav tabs:', navTabs.length);
    console.log('Pages:', pages.length);
    
    navTabs.forEach(tab => {
        const href = tab.getAttribute('href');
        console.log('Tab href:', href);
        
        // Skip external links
        if (href && (href.endsWith('.html') || href.startsWith('http'))) {
            console.log('Skipping external link:', href);
            return;
        }
        
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Tab clicked:', href);
            
            // Extract target from href (#simulator -> simulator)
            const target = href ? href.substring(1) : null;
            if (!target) return;
            
            console.log('Looking for page:', target + 'Page');
            
            // Remove active from all
            navTabs.forEach(t => t.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            
            // Add active to clicked tab
            tab.classList.add('active');
            
            // Find and activate the correct page
            // href="#simulator" should activate id="simulatorPage"
            const targetPage = document.getElementById(target + 'Page');
            if (targetPage) {
                targetPage.classList.add('active');
                console.log('✓ Activated:', target + 'Page');
            } else {
                console.error('Page not found:', target + 'Page');
            }
        });
    });
}

// ===== THEME =====
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
    });
}

function updateThemeIcon() {
    const button = document.getElementById('themeToggle');
    const isDark = document.body.classList.contains('dark-mode');
    if (button) {
        button.innerHTML = `<i class="fas fa-${isDark ? 'sun' : 'moon'}"></i>`;
    }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    const searchInput = document.getElementById('trackerCoinSearch');
    const addButton = document.getElementById('addCoinButton');
    const refreshButton = document.getElementById('refreshTrackerButton');
    const clearButton = document.getElementById('clearTrackerButton');
    
    if (searchInput) searchInput.addEventListener('input', filterDropdown);
    if (addButton) addButton.addEventListener('click', addCoinToTracker);
    if (refreshButton) refreshButton.addEventListener('click', refreshTrackerPrices);
    if (clearButton) clearButton.addEventListener('click', clearTracker);
    
    const calculateButton = document.getElementById('calculateButton');
    const swapButton = document.getElementById('swapButton');
    
    if (calculateButton) {
        calculateButton.addEventListener('click', calculateSimulation);
        console.log('✓ Calculate button ready');
    } else {
        console.error('Calculate button NOT FOUND!');
    }
    
    if (swapButton) {
        swapButton.addEventListener('click', swapSimCoins);
        console.log('✓ Swap button ready');
    }
    
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

// ===== START =====
document.addEventListener('DOMContentLoaded', initApp);