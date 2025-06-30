// Array of quote objects with text and category properties
let quotes = [
    { text: "The only way to do great work is to love what you do.", category: "Motivation" },
    { text: "Life is what happens when you're busy making other plans.", category: "Life" },
    { text: "The future belongs to those who believe in the beauty of their dreams.", category: "Dreams" },
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", category: "Success" },
    { text: "In the middle of difficulty lies opportunity.", category: "Opportunity" },
    { text: "The best way to predict the future is to invent it.", category: "Innovation" },
    { text: "Be the change you wish to see in the world.", category: "Change" },
    { text: "Everything you've ever wanted is on the other side of fear.", category: "Courage" },
    { text: "The journey of a thousand miles begins with one step.", category: "Journey" },
    { text: "What you get by achieving your goals is not as important as what you become by achieving your goals.", category: "Growth" }
];

// DOM elements
const quoteDisplay = document.getElementById('quoteDisplay');
const newQuoteBtn = document.getElementById('newQuote');
const toggleFormBtn = document.getElementById('toggleForm');
const addQuoteForm = document.getElementById('addQuoteForm');
const categoryFilter = document.getElementById('categoryFilter');

// Current filter
let currentFilter = 'all';

// Local Storage Keys
const QUOTES_KEY = 'dynamicQuotes';
const LAST_QUOTE_KEY = 'lastViewedQuote';

// --- Enhanced Filtering System with Web Storage ---

// Storage key for filter preference
const FILTER_KEY = 'selectedCategoryFilter';

// --- Server Sync and Conflict Resolution ---

// Server sync configuration
const SERVER_SYNC_CONFIG = {
    syncInterval: 30000, // 30 seconds
    serverUrl: 'https://jsonplaceholder.typicode.com/posts',
    lastSyncKey: 'lastServerSync',
    pendingChangesKey: 'pendingChanges',
    conflictResolutionKey: 'conflictResolution'
};

// Track pending changes and sync state
let pendingChanges = [];
let isSyncing = false;
let lastServerData = null;

// Server simulation data (in real app, this would come from actual server)
const serverQuotes = [
    { id: 1, text: "The only way to do great work is to love what you do.", category: "Motivation", timestamp: Date.now() - 3600000 },
    { id: 2, text: "Life is what happens when you're busy making other plans.", category: "Life", timestamp: Date.now() - 1800000 },
    { id: 3, text: "The future belongs to those who believe in the beauty of their dreams.", category: "Dreams", timestamp: Date.now() - 900000 },
    { id: 4, text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", category: "Success", timestamp: Date.now() - 450000 },
    { id: 5, text: "In the middle of difficulty lies opportunity.", category: "Opportunity", timestamp: Date.now() - 225000 },
    { id: 6, text: "The best way to predict the future is to invent it.", category: "Innovation", timestamp: Date.now() - 112500 },
    { id: 7, text: "Be the change you wish to see in the world.", category: "Change", timestamp: Date.now() - 56250 },
    { id: 8, text: "Everything you've ever wanted is on the other side of fear.", category: "Courage", timestamp: Date.now() - 28125 },
    { id: 9, text: "The journey of a thousand miles begins with one step.", category: "Journey", timestamp: Date.now() - 14062 },
    { id: 10, text: "What you get by achieving your goals is not as important as what you become by achieving your goals.", category: "Growth", timestamp: Date.now() - 7031 },
    // Server-only quotes (simulating new data from server)
    { id: 11, text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", category: "Resilience", timestamp: Date.now() },
    { id: 12, text: "The way to get started is to quit talking and begin doing.", category: "Action", timestamp: Date.now() }
];

/**
 * Simulates fetching data from server
 * @returns {Promise<Array>} Promise that resolves to server quotes
 */
async function fetchFromServer() {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Simulate server response with potential new data
    const response = {
        ok: true,
        json: async () => {
            // Randomly add new quotes to simulate server updates
            const currentTime = Date.now();
            const newQuotes = [...serverQuotes];

            // Simulate server adding new quotes occasionally
            if (Math.random() > 0.7) {
                const newQuote = {
                    id: Date.now(),
                    text: "New quote from server: " + new Date().toLocaleTimeString(),
                    category: "Server",
                    timestamp: currentTime
                };
                newQuotes.push(newQuote);
            }

            return newQuotes;
        }
    };

    return response;
}

/**
 * Posts data to server using real HTTP POST method
 * @param {Array} data - Data to post
 * @returns {Promise<Object>} Promise that resolves to server response
 */
async function postToServer(data) {
    try {
        // Try to use real HTTP POST with proper headers
        const response = await fetch(SERVER_SYNC_CONFIG.serverUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Data posted to server successfully:', result);
        return result;

    } catch (error) {
        console.warn('Real server POST failed, using mock simulation:', error.message);

        // Fallback to mock simulation
        return await mockPostToServer(data);
    }
}

/**
 * Mock server posting for simulation (fallback)
 * @param {Array} data - Data to post
 * @returns {Promise<Object>} Promise that resolves to mock server response
 */
async function mockPostToServer(data) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));

    // Simulate server response
    return {
        success: true,
        message: "Data synced successfully (mock)",
        timestamp: Date.now(),
        dataReceived: data.length
    };
}

/**
 * Syncs local data with server
 */
async function syncWithServer() {
    if (isSyncing) return;

    isSyncing = true;
    showSyncStatus('Syncing with server...', 'info');

    try {
        // Fetch latest data from server
        const response = await fetchFromServer();

        if (!response.ok) {
            throw new Error('Failed to fetch from server');
        }

        const serverData = await response.json();
        lastServerData = serverData;

        // Check for conflicts and merge data
        const conflicts = detectConflicts(quotes, serverData);

        if (conflicts.length > 0) {
            await handleConflicts(conflicts, serverData);
        } else {
            // No conflicts, merge server data
            mergeServerData(serverData);
        }

        // Send pending changes to server
        if (pendingChanges.length > 0) {
            await sendPendingChanges();
        }

        // Update last sync timestamp
        localStorage.setItem(SERVER_SYNC_CONFIG.lastSyncKey, Date.now().toString());

        showSyncStatus('Quotes synced with server!', 'success');

    } catch (error) {
        console.error('Sync error:', error);
        showSyncStatus('Sync failed: ' + error.message, 'error');
    } finally {
        isSyncing = false;
    }
}

/**
 * Detects conflicts between local and server data
 * @param {Array} localData - Local quotes array
 * @param {Array} serverData - Server quotes array
 * @returns {Array} Array of conflicts
 */
function detectConflicts(localData, serverData) {
    const conflicts = [];

    // Create maps for efficient lookup
    const localMap = new Map(localData.map(quote => [quote.id || quote.text, quote]));
    const serverMap = new Map(serverData.map(quote => [quote.id || quote.text, quote]));

    // Check for conflicts (same quote, different content)
    for (const [key, localQuote] of localMap) {
        const serverQuote = serverMap.get(key);
        if (serverQuote && (
            localQuote.text !== serverQuote.text ||
            localQuote.category !== serverQuote.category
        )) {
            conflicts.push({
                key,
                local: localQuote,
                server: serverQuote,
                type: 'content_conflict'
            });
        }
    }

    return conflicts;
}

/**
 * Handles conflicts between local and server data
 * @param {Array} conflicts - Array of conflicts
 * @param {Array} serverData - Server data
 */
async function handleConflicts(conflicts, serverData) {
    showSyncStatus(`Found ${conflicts.length} conflicts. Resolving...`, 'warning');

    // For this implementation, we'll use server data as source of truth
    // In a real app, you might want to show a UI for user to choose

    conflicts.forEach(conflict => {
        console.log(`Conflict resolved: Using server version for "${conflict.key}"`);
    });

    // Merge server data (server takes precedence)
    mergeServerData(serverData);

    // Show conflict resolution notification
    showConflictResolutionNotification(conflicts);
}

/**
 * Merges server data with local data
 * @param {Array} serverData - Server data to merge
 */
function mergeServerData(serverData) {
    const localMap = new Map(quotes.map(quote => [quote.id || quote.text, quote]));
    const serverMap = new Map(serverData.map(quote => [quote.id || quote.text, quote]));

    // Merge server data, keeping local data for quotes not on server
    const mergedQuotes = [];

    // Add all server quotes
    for (const serverQuote of serverData) {
        mergedQuotes.push(serverQuote);
    }

    // Add local quotes that don't exist on server
    for (const [key, localQuote] of localMap) {
        if (!serverMap.has(key)) {
            mergedQuotes.push(localQuote);
        }
    }

    // Update local quotes array
    quotes = mergedQuotes;

    // Save to localStorage
    saveQuotes();

    // Update UI
    updateCategoryFilter();
    showRandomQuote();
}

/**
 * Sends pending changes to server
 */
async function sendPendingChanges() {
    if (pendingChanges.length === 0) return;

    try {
        const response = await postToServer(pendingChanges);

        if (response.ok) {
            const result = await response.json();
            console.log('Pending changes sent:', result);

            // Clear pending changes after successful sync
            pendingChanges = [];
            localStorage.removeItem(SERVER_SYNC_CONFIG.pendingChangesKey);

        } else {
            throw new Error('Failed to send pending changes');
        }
    } catch (error) {
        console.error('Error sending pending changes:', error);
        // Keep pending changes for next sync attempt
    }
}

/**
 * Shows sync status notification
 * @param {string} message - Status message
 * @param {string} type - Status type (info, success, warning, error)
 */
function showSyncStatus(message, type = 'info') {
    const statusDiv = document.getElementById('syncStatus') || createSyncStatusElement();

    statusDiv.textContent = message;
    statusDiv.className = `sync-status sync-${type}`;
    statusDiv.style.display = 'block';

    // Update sync UI
    updateSyncUI();

    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
}

/**
 * Creates sync status element
 * @returns {HTMLElement} Sync status element
 */
function createSyncStatusElement() {
    const statusDiv = document.createElement('div');
    statusDiv.id = 'syncStatus';
    statusDiv.style.cssText = `
        position: fixed;
        top: 60px;
        right: 20px;
        padding: 10px 15px;
        border-radius: 5px;
        color: white;
        font-size: 0.9em;
        z-index: 1001;
        display: none;
        max-width: 300px;
        word-wrap: break-word;
    `;

    document.body.appendChild(statusDiv);
    return statusDiv;
}

/**
 * Shows conflict resolution notification
 * @param {Array} conflicts - Array of conflicts
 */
function showConflictResolutionNotification(conflicts) {
    const notification = document.createElement('div');
    notification.className = 'conflict-notification';
    notification.innerHTML = `
        <h4>Data Conflicts Resolved</h4>
        <p>${conflicts.length} conflicts were found and resolved using server data.</p>
        <button onclick="this.parentElement.remove()">Dismiss</button>
    `;

    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 1002;
        max-width: 400px;
        text-align: center;
    `;

    document.body.appendChild(notification);

    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 10000);
}

/**
 * Adds a change to pending changes queue
 * @param {string} action - Action type (add, update, delete)
 * @param {Object} data - Change data
 */
function addPendingChange(action, data) {
    const change = {
        action,
        data,
        timestamp: Date.now(),
        id: Date.now() + Math.random()
    };

    pendingChanges.push(change);
    localStorage.setItem(SERVER_SYNC_CONFIG.pendingChangesKey, JSON.stringify(pendingChanges));
}

/**
 * Starts periodic server sync
 */
function startPeriodicSync() {
    setInterval(() => {
        syncWithServer();
    }, SERVER_SYNC_CONFIG.syncInterval);
}

/**
 * Manual sync trigger
 */
function manualSync() {
    if (isSyncing) return;

    syncWithServer();
}

/**
 * Populates the category dropdown with unique categories from quotes array
 * This function dynamically updates the dropdown when categories change
 */
function populateCategories() {
    // Get all unique categories
    const categories = [...new Set(quotes.map(quote => quote.category))];

    // Clear existing options except "All Categories"
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';

    // Add category options
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
    });

    // Restore last selected filter
    restoreLastFilter();
}

/**
 * Saves the selected filter to localStorage
 * @param {string} selectedCategory - The selected category filter
 */
function saveFilterPreference(selectedCategory) {
    localStorage.setItem(FILTER_KEY, selectedCategory);
}

/**
 * Restores the last selected filter from localStorage
 */
function restoreLastFilter() {
    const savedFilter = localStorage.getItem(FILTER_KEY);
    if (savedFilter) {
        // Check if the saved filter still exists in current categories
        const categories = [...new Set(quotes.map(quote => quote.category))];
        if (savedFilter === 'all' || categories.includes(savedFilter)) {
            categoryFilter.value = savedFilter;
            currentFilter = savedFilter;
        } else {
            // If saved filter no longer exists, reset to 'all'
            categoryFilter.value = 'all';
            currentFilter = 'all';
            saveFilterPreference('all');
        }
    }
}

/**
 * Filters quotes based on selected category and updates the display
 * This function is called when the category filter changes
 */
function filterQuotes() {
    const selectedCategory = categoryFilter.value;
    currentFilter = selectedCategory;

    // Save filter preference to localStorage
    saveFilterPreference(selectedCategory);

    // Show a random quote from the filtered selection
    showRandomQuote();

    // Show feedback message
    if (selectedCategory === 'all') {
        showSuccessMessage('Showing quotes from all categories');
    } else {
        showSuccessMessage(`Filtered to ${selectedCategory} quotes`);
    }
}

/**
 * Enhanced function to get filtered quotes based on current filter
 * @returns {Array} Array of quotes matching the current filter
 */
function getFilteredQuotes() {
    if (currentFilter === 'all') {
        return quotes;
    }
    return quotes.filter(quote => quote.category === currentFilter);
}

/**
 * Shows quote count for current filter
 */
function showQuoteCount() {
    const filteredQuotes = getFilteredQuotes();
    const totalQuotes = quotes.length;
    const filteredCount = filteredQuotes.length;

    let countMessage = `Showing ${filteredCount} of ${totalQuotes} quotes`;
    if (currentFilter !== 'all') {
        countMessage += ` in "${currentFilter}" category`;
    }

    // Create or update quote count display
    let countDisplay = document.getElementById('quoteCount');
    if (!countDisplay) {
        countDisplay = document.createElement('div');
        countDisplay.id = 'quoteCount';
        countDisplay.style.cssText = `
            text-align: center;
            color: #666;
            font-size: 0.9em;
            margin: 10px 0;
            font-style: italic;
        `;
        document.querySelector('.category-selector').appendChild(countDisplay);
    }
    countDisplay.textContent = countMessage;
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    // Set up event listeners
    newQuoteBtn.addEventListener('click', showRandomQuote);
    toggleFormBtn.addEventListener('click', toggleAddQuoteForm);
    categoryFilter.addEventListener('change', filterQuotes);

    // Initialize category filter
    populateCategories();

    // Load quotes from localStorage
    loadQuotes();
    populateCategories();

    // Show last viewed quote if available, else show random
    if (!loadLastViewedQuote()) {
        showRandomQuote();
    }

    // Wire up export button
    const exportBtn = document.getElementById('exportQuotes');
    if (exportBtn) exportBtn.addEventListener('click', exportQuotesToJson);

    // Wire up import input
    const importInput = document.getElementById('importFile');
    if (importInput) importInput.addEventListener('change', importFromJsonFile);

    // Wire up manual sync button
    const manualSyncBtn = document.getElementById('manualSync');
    if (manualSyncBtn) manualSyncBtn.addEventListener('click', manualSync);

    // Show initial quote count
    showQuoteCount();

    // Initialize server sync
    initializeServerSync();

    // Start periodic sync
    startPeriodicSync();

    // Update sync UI
    updateSyncUI();
});

/**
 * Initializes server sync functionality
 */
function initializeServerSync() {
    // Load pending changes from localStorage
    const storedPendingChanges = localStorage.getItem(SERVER_SYNC_CONFIG.pendingChangesKey);
    if (storedPendingChanges) {
        try {
            pendingChanges = JSON.parse(storedPendingChanges);
        } catch (e) {
            pendingChanges = [];
        }
    }

    // Perform initial sync
    setTimeout(() => {
        syncWithServer();
    }, 2000); // Wait 2 seconds before first sync
}

/**
 * Updates the sync UI elements
 */
function updateSyncUI() {
    // Update last sync info
    const lastSyncInfo = document.getElementById('lastSyncInfo');
    if (lastSyncInfo) {
        const lastSync = localStorage.getItem(SERVER_SYNC_CONFIG.lastSyncKey);
        if (lastSync) {
            const lastSyncDate = new Date(parseInt(lastSync));
            lastSyncInfo.textContent = `Last sync: ${lastSyncDate.toLocaleTimeString()}`;
        } else {
            lastSyncInfo.textContent = 'Last sync: Never';
        }
    }

    // Update pending changes info
    const pendingChangesInfo = document.getElementById('pendingChangesInfo');
    if (pendingChangesInfo) {
        if (pendingChanges.length > 0) {
            pendingChangesInfo.textContent = `Pending changes: ${pendingChanges.length}`;
            pendingChangesInfo.style.display = 'block';
        } else {
            pendingChangesInfo.style.display = 'none';
        }
    }

    // Update sync button state
    const manualSyncBtn = document.getElementById('manualSync');
    if (manualSyncBtn) {
        if (isSyncing) {
            manualSyncBtn.textContent = 'Syncing...';
            manualSyncBtn.classList.add('syncing');
            manualSyncBtn.disabled = true;
        } else {
            manualSyncBtn.textContent = 'Sync Now';
            manualSyncBtn.classList.remove('syncing');
            manualSyncBtn.disabled = false;
        }
    }
}

/**
 * Displays a random quote from the quotes array
 * Uses advanced DOM manipulation to create and update elements
 */
function showRandomQuote() {
    const filteredQuotes = getFilteredQuotes();

    if (filteredQuotes.length === 0) {
        displayQuote("No quotes available for this category.", "Empty");
        saveLastViewedQuote({ text: "No quotes available for this category.", category: "Empty" });
        showQuoteCount();
        return;
    }

    // Get random quote from filtered selection
    const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
    const selectedQuote = filteredQuotes[randomIndex];

    displayQuote(selectedQuote.text, selectedQuote.category);
    saveLastViewedQuote(selectedQuote);
    showQuoteCount();
}

/**
 * Displays a quote in the quote display area
 * @param {string} text - The quote text
 * @param {string} category - The quote category
 */
function displayQuote(text, category) {
    // Clear existing content
    quoteDisplay.innerHTML = '';

    // Create quote text element
    const quoteText = document.createElement('div');
    quoteText.className = 'quote-text';
    quoteText.textContent = `"${text}"`;

    // Create category element
    const quoteCategory = document.createElement('div');
    quoteCategory.className = 'quote-category';
    quoteCategory.textContent = `— ${category}`;

    // Add elements to display
    quoteDisplay.appendChild(quoteText);
    quoteDisplay.appendChild(quoteCategory);

    // Add fade-in animation
    quoteDisplay.style.opacity = '0';
    setTimeout(() => {
        quoteDisplay.style.transition = 'opacity 0.5s ease-in';
        quoteDisplay.style.opacity = '1';
    }, 10);
}

/**
 * Toggles the visibility of the add quote form
 */
function toggleAddQuoteForm() {
    const isVisible = addQuoteForm.style.display !== 'none';

    if (isVisible) {
        addQuoteForm.style.display = 'none';
        toggleFormBtn.textContent = 'Add New Quote';
    } else {
        addQuoteForm.style.display = 'block';
        toggleFormBtn.textContent = 'Hide Form';

        // Clear form inputs
        document.getElementById('newQuoteText').value = '';
        document.getElementById('newQuoteCategory').value = '';
    }
}

/**
 * Adds a new quote to the quotes array and updates the DOM
 */
function addQuote() {
    const quoteText = document.getElementById('newQuoteText').value.trim();
    const quoteCategory = document.getElementById('newQuoteCategory').value.trim();

    if (!quoteText || !quoteCategory) {
        alert('Please enter both quote text and category!');
        return;
    }

    const newQuote = { text: quoteText, category: quoteCategory };
    quotes.push(newQuote);

    // Add to pending changes for server sync
    addPendingChange('add', newQuote);

    // Save to localStorage
    saveQuotes();

    // Update categories dropdown (this will also restore filter and show count)
    updateCategoryFilter();

    // Clear form
    document.getElementById('newQuoteText').value = '';
    document.getElementById('newQuoteCategory').value = '';

    // Hide form
    toggleAddQuoteForm();

    // Show success message
    showSuccessMessage('Quote added successfully!');

    // Show the newly added quote
    displayQuote(newQuote.text, newQuote.category);
    saveLastViewedQuote(newQuote);
}

/**
 * Shows a temporary success message
 * @param {string} message - The message to display
 */
function showSuccessMessage(message) {
    // Create success message element
    const successMsg = document.createElement('div');
    successMsg.textContent = message;
    successMsg.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    // Add to DOM
    document.body.appendChild(successMsg);

    // Remove after 3 seconds
    setTimeout(() => {
        successMsg.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (successMsg.parentNode) {
                successMsg.parentNode.removeChild(successMsg);
            }
        }, 300);
    }, 3000);
}

/**
 * Creates a more advanced form for adding quotes with validation
 * This function demonstrates additional DOM manipulation techniques
 */
function createAddQuoteForm() {
    // This function could be used to create a more sophisticated form
    // For now, we're using the HTML form, but this shows how you could
    // dynamically create forms using JavaScript

    const formContainer = document.createElement('div');
    formContainer.className = 'form-container';
    formContainer.innerHTML = `
        <h3>Add a New Quote</h3>
        <div class="form-group">
            <label for="dynamicQuoteText">Quote Text:</label>
            <textarea id="dynamicQuoteText" placeholder="Enter your quote here..." rows="3"></textarea>
        </div>
        <div class="form-group">
            <label for="dynamicQuoteCategory">Category:</label>
            <input id="dynamicQuoteCategory" type="text" placeholder="Enter category" />
        </div>
        <button onclick="addQuoteFromDynamicForm()">Add Quote</button>
    `;

    return formContainer;
}

// Additional utility functions for advanced DOM manipulation

/**
 * Removes a quote from the array and updates the display
 * @param {number} index - Index of the quote to remove
 */
function removeQuote(index) {
    if (index >= 0 && index < quotes.length) {
        const removedQuote = quotes[index];
        quotes.splice(index, 1);

        // Add to pending changes for server sync
        addPendingChange('delete', removedQuote);

        // Save to localStorage
        saveQuotes();

        updateCategoryFilter();
        showRandomQuote();
        showSuccessMessage('Quote removed successfully!');
    }
}

/**
 * Edits an existing quote
 * @param {number} index - Index of the quote to edit
 * @param {string} newText - New quote text
 * @param {string} newCategory - New quote category
 */
function editQuote(index, newText, newCategory) {
    if (index >= 0 && index < quotes.length) {
        const oldQuote = { ...quotes[index] };
        quotes[index].text = newText;
        quotes[index].category = newCategory;

        // Add to pending changes for server sync
        addPendingChange('update', {
            old: oldQuote,
            new: quotes[index]
        });

        // Save to localStorage
        saveQuotes();

        updateCategoryFilter();
        showRandomQuote();
        showSuccessMessage('Quote updated successfully!');
    }
}

// --- Web Storage and JSON Handling Enhancements ---

function loadQuotes() {
    const stored = localStorage.getItem(QUOTES_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                quotes = parsed;
            }
        } catch (e) { }
    }
}

function saveQuotes() {
    localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
}

function saveLastViewedQuote(quoteObj) {
    sessionStorage.setItem(LAST_QUOTE_KEY, JSON.stringify(quoteObj));
}

function loadLastViewedQuote() {
    const stored = sessionStorage.getItem(LAST_QUOTE_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.text && parsed.category) {
                displayQuote(parsed.text, parsed.category);
                return true;
            }
        } catch (e) { }
    }
    return false;
}

function exportQuotesToJson() {
    const dataStr = JSON.stringify(quotes, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quotes.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importFromJsonFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const fileReader = new FileReader();
    fileReader.onload = function (e) {
        try {
            const importedQuotes = JSON.parse(e.target.result);
            if (Array.isArray(importedQuotes)) {
                quotes.push(...importedQuotes.filter(q => q.text && q.category));
                saveQuotes();
                updateCategoryFilter();
                showSuccessMessage('Quotes imported successfully!');
                showRandomQuote();
            } else {
                alert('Invalid JSON format.');
            }
        } catch (err) {
            alert('Failed to import quotes: ' + err.message);
        }
    };
    fileReader.readAsText(file);
}

// Make functions globally accessible
window.manualSync = manualSync;
window.filterQuotes = filterQuotes;

/**
 * Updates the category filter dropdown with all available categories
 * This is an alias for populateCategories for backward compatibility
 */
function updateCategoryFilter() {
    populateCategories();
    showQuoteCount();
}

/**
 * Fetches quotes from the server
 * @returns {Promise<Array>} Promise that resolves to server quotes
 */
async function fetchQuotesFromServer() {
    try {
        // Use the existing fetchFromServer function
        const response = await fetchFromServer();

        if (!response.ok) {
            throw new Error('Failed to fetch quotes from server');
        }

        const serverQuotes = await response.json();
        console.log('Fetched quotes from server:', serverQuotes);

        return serverQuotes;
    } catch (error) {
        console.error('Error fetching quotes from server:', error);
        showSyncStatus('Failed to fetch quotes from server: ' + error.message, 'error');
        throw error;
    }
}

/**
 * Synchronizes quotes between local storage and server
 * @returns {Promise<boolean>} Promise that resolves to true if sync was successful
 */
async function syncQuotes() {
    try {
        showSyncStatus('Starting quote synchronization...', 'info');

        // Load current quotes from localStorage
        const localQuotes = JSON.parse(localStorage.getItem(QUOTES_KEY) || '[]');

        // Fetch quotes from server
        const serverQuotes = await fetchQuotesFromServer();

        // Merge local and server quotes
        const mergedQuotes = mergeQuotesData(localQuotes, serverQuotes);

        // Update local storage with merged data
        localStorage.setItem(QUOTES_KEY, JSON.stringify(mergedQuotes));

        // Update the global quotes array
        quotes = mergedQuotes;

        // Update UI
        updateCategoryFilter();
        showRandomQuote();

        // Send any pending changes to server
        if (pendingChanges.length > 0) {
            await sendPendingChanges();
        }

        showSyncStatus('Quotes synced with server!', 'success');
        return true;

    } catch (error) {
        console.error('Quote synchronization failed:', error);
        showSyncStatus('Quote synchronization failed: ' + error.message, 'error');
        return false;
    }
}

/**
 * Merges local and server quote data, handling conflicts
 * @param {Array} localQuotes - Local quotes array
 * @param {Array} serverQuotes - Server quotes array
 * @returns {Array} Merged quotes array
 */
function mergeQuotesData(localQuotes, serverQuotes) {
    const mergedQuotes = [];
    const localMap = new Map(localQuotes.map(quote => [quote.id || quote.text, quote]));
    const serverMap = new Map(serverQuotes.map(quote => [quote.id || quote.text, quote]));

    // Add all server quotes (server takes precedence)
    for (const serverQuote of serverQuotes) {
        mergedQuotes.push(serverQuote);
    }

    // Add local quotes that don't exist on server
    for (const [key, localQuote] of localMap) {
        if (!serverMap.has(key)) {
            mergedQuotes.push(localQuote);
        }
    }

    // Log merge results
    console.log(`Merged quotes: ${localQuotes.length} local + ${serverQuotes.length} server = ${mergedQuotes.length} total`);

    return mergedQuotes;
}

// Make syncQuotes globally accessible
window.syncQuotes = syncQuotes;