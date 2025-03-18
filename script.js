let cryptoList = [];

// Fetch top 200 cryptos and store them for filtering
async function loadCryptoList() {
    const apiUrl = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=200&page=1&sparkline=false";
    
    try {
        const response = await fetch(apiUrl);
        cryptoList = await response.json();
    } catch (error) {
        console.error("Error fetching crypto list:", error);
    }
}

// Filter dropdown based on user input
function filterDropdown(searchInputId, dropdownId) {
    const input = document.getElementById(searchInputId).value.toLowerCase();
    const select = document.getElementById(dropdownId);

    if (input === "") {
        select.style.display = "none"; // Hide dropdown if input is empty
        return;
    }

    select.innerHTML = ""; // Clear previous results
    select.style.display = "block"; // Show dropdown

    cryptoList
        .filter(coin => coin.name.toLowerCase().includes(input) || coin.symbol.toLowerCase().includes(input))
        .forEach(coin => {
            const option = document.createElement("option");
            option.value = coin.id;  // Store the correct coin ID here
            option.text = `${coin.name} (${coin.symbol.toUpperCase()})`;
            select.appendChild(option);
        });
}

// Select a coin from dropdown and store its ID
function selectCoin(searchInputId, dropdownId) {
    const select = document.getElementById(dropdownId);
    const searchInput = document.getElementById(searchInputId);

    if (select.selectedIndex !== -1) {
        // Store only the coin ID
        searchInput.dataset.coinId = select.options[select.selectedIndex].value;
        searchInput.value = select.options[select.selectedIndex].text; // Show coin name for clarity
        select.style.display = "none"; // Hide dropdown after selection
    }
}

// Compare Market Caps
async function compareMarketCaps() {
    const searchInputA = document.getElementById("coinASearch");
    const searchInputB = document.getElementById("coinBSearch");

    const coinA = searchInputA.dataset.coinId;
    const coinB = searchInputB.dataset.coinId;

    if (!coinA || !coinB) {
        document.getElementById("comparisonResult").innerHTML = "Please select valid cryptocurrencies!";
        return;
    }

    const apiUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinA},${coinB}&vs_currencies=usd&include_market_cap=true`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error("API request failed");

        const data = await response.json();

        if (data[coinA] && data[coinB]) {
            const marketCapA = formatMarketCap(data[coinA].usd_market_cap);
            const marketCapB = formatMarketCap(data[coinB].usd_market_cap);
            const priceA = data[coinA].usd;
            const newPriceA = (data[coinB].usd_market_cap / data[coinA].usd_market_cap) * priceA;

            document.getElementById("comparisonResult").innerHTML = `
                <span class="coin-label">${coinA.toUpperCase()}:</span> <span class="highlight">${marketCapA}</span> vs 
                <span class="coin-label">${coinB.toUpperCase()}:</span> <span class="highlight">${marketCapB}</span> <br>
                <span class="coin-label">${coinA.toUpperCase()} @ ${coinB.toUpperCase()} Cap:</span> <span class="highlight">$${newPriceA.toFixed(2)}</span>
            `;
        } else {
            document.getElementById("comparisonResult").innerHTML = "Invalid cryptocurrency selection!";
        }
    } catch (error) {
        document.getElementById("comparisonResult").innerHTML = "Error fetching data!";
    }
}

// Format market cap into T, B, M format
function formatMarketCap(value) {
    if (value >= 1e12) return (value / 1e12).toFixed(1) + "T";
    if (value >= 1e9) return (value / 1e9).toFixed(1) + "B";
    if (value >= 1e6) return (value / 1e6).toFixed(1) + "M";
    return value.toLocaleString();
}

// Load crypto list on page load
window.onload = loadCryptoList;
