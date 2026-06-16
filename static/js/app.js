// Application State
let appState = {
    notes: [],
    filteredNotes: [],
    searchQuery: '',
    selectedFilter: 'all',
    lastUpdated: 'Never',
    selectedNote: null,
    selectedTemplate: 'standard',
    maxTweetLength: 280
};

// DOM Elements
const notesTimeline = document.getElementById('notes-timeline');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const emptyState = document.getElementById('empty-state');
const refreshBtn = document.getElementById('refresh-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const retryBtn = document.getElementById('retry-btn');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const updateTimestamp = document.getElementById('update-timestamp');
const statusText = document.getElementById('status-text');
const statusDot = document.querySelector('.status-dot');
const filterPillsList = document.getElementById('filter-pills-list');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalNoteType = document.getElementById('modal-note-type');
const modalNoteDate = document.getElementById('modal-note-date');
const templateBtns = document.querySelectorAll('.tmpl-btn');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCountSpan = document.getElementById('char-count');
const charProgressCircle = document.getElementById('char-progress-circle');
const charWarning = document.getElementById('char-warning');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const postTweetBtn = document.getElementById('post-tweet-btn');

// Toast Elements
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// Theme Switch Elements
const themeToggle = document.getElementById('theme-toggle');
const darkIcon = document.getElementById('dark-icon');
const lightIcon = document.getElementById('light-icon');

// Progress Ring calculation
const circleRadius = 14;
const circleCircumference = 2 * Math.PI * circleRadius;
charProgressCircle.style.strokeDasharray = `${circleCircumference} ${circleCircumference}`;
charProgressCircle.style.strokeDashoffset = circleCircumference;

// Initialize the Application
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    fetchNotes(false);
    setupEventListeners();
});

// Event Listeners Setup
function setupEventListeners() {
    // Refresh, Export & Retry buttons
    refreshBtn.addEventListener('click', () => fetchNotes(true));
    exportCsvBtn.addEventListener('click', exportFilteredNotesToCSV);
    retryBtn.addEventListener('click', () => fetchNotes(true));
    resetFiltersBtn.addEventListener('click', resetFilters);

    // Search Box Input
    searchInput.addEventListener('input', handleSearch);
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        handleSearch();
        searchInput.focus();
    });

    // Modal Events
    closeModalBtn.addEventListener('click', closeTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });

    // Template Selector Events
    templateBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            templateBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.selectedTemplate = btn.dataset.template;
            generateTweetText();
        });
    });

    // Textarea Changes
    tweetTextarea.addEventListener('input', updateTweetLengthStatus);

    // Copy & Post buttons
    copyTweetBtn.addEventListener('click', copyTweetToClipboard);
    postTweetBtn.addEventListener('click', postTweetToX);

    // Theme Switch Event
    if (themeToggle) {
        themeToggle.addEventListener('change', toggleTheme);
    }
}

// Fetch Notes from Backend API
async function fetchNotes(forceRefresh = false) {
    showLoading();
    setRefreshingStatus(true);
    
    try {
        const url = `/api/notes${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            appState.notes = data.notes;
            appState.lastUpdated = data.last_updated;
            updateTimestamp.textContent = appState.lastUpdated;
            
            // Build dynamic filters based on note types
            buildFilters();
            
            // Filter and render notes
            filterAndRenderNotes();
            
            statusText.textContent = 'Feed Connected';
            statusDot.className = 'status-dot online';
        } else {
            throw new Error(data.message || 'Unknown backend error');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        showError(error.message);
        statusText.textContent = 'Connection Error';
        statusDot.className = 'status-dot';
    } finally {
        setRefreshingStatus(false);
    }
}

// Helper to toggle refreshing indicator
function setRefreshingStatus(isRefreshing) {
    if (isRefreshing) {
        refreshBtn.classList.add('loading');
        refreshBtn.disabled = true;
        statusDot.className = 'status-dot refreshing';
        statusText.textContent = 'Refetching feed...';
    } else {
        refreshBtn.classList.remove('loading');
        refreshBtn.disabled = false;
    }
}

// Build Filter Pills Dynamically
function buildFilters() {
    // Count occurrences of each type
    const counts = { all: appState.notes.length };
    appState.notes.forEach(note => {
        const type = note.type.toLowerCase();
        counts[type] = (counts[type] || 0) + 1;
    });

    // Get sorted list of types (e.g. Feature first, then Changed, Deprecation, etc.)
    const preferredOrder = ['feature', 'changed', 'deprecation', 'deprecated', 'issue'];
    const typesInFeed = Object.keys(counts).filter(t => t !== 'all');
    
    typesInFeed.sort((a, b) => {
        const idxA = preferredOrder.indexOf(a);
        const idxB = preferredOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
    });

    // Generate HTML for pills
    let html = `
        <button class="filter-pill ${appState.selectedFilter === 'all' ? 'active' : ''}" data-type="all">
            All <span class="pill-count" id="count-all">${counts.all}</span>
        </button>
    `;

    typesInFeed.forEach(type => {
        const displayLabel = type.charAt(0).toUpperCase() + type.slice(1);
        const isActive = appState.selectedFilter === type;
        html += `
            <button class="filter-pill ${isActive ? 'active' : ''}" data-type="${type}">
                ${displayLabel} <span class="pill-count">${counts[type]}</span>
            </button>
        `;
    });

    filterPillsList.innerHTML = html;

    // Attach click handlers to new pills
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            appState.selectedFilter = pill.dataset.type;
            filterAndRenderNotes();
        });
    });
}

// Search Input Handler
function handleSearch() {
    appState.searchQuery = searchInput.value.toLowerCase().strip ? searchInput.value.toLowerCase().trim() : searchInput.value.toLowerCase();
    
    // Toggle clear button visibility
    if (appState.searchQuery.length > 0) {
        clearSearchBtn.style.display = 'block';
    } else {
        clearSearchBtn.style.display = 'none';
    }
    
    filterAndRenderNotes();
}

// Filter and Render logic
function filterAndRenderNotes() {
    const q = appState.searchQuery;
    const filter = appState.selectedFilter;

    appState.filteredNotes = appState.notes.filter(note => {
        // Apply type filter
        if (filter !== 'all' && note.type.toLowerCase() !== filter) {
            return false;
        }

        // Apply search query filter
        if (q.length > 0) {
            const dateMatch = note.date.toLowerCase().includes(q);
            const typeMatch = note.type.toLowerCase().includes(q);
            const contentMatch = note.content_text.toLowerCase().includes(q);
            return dateMatch || typeMatch || contentMatch;
        }

        return true;
    });

    renderTimeline();
}

// Render the Timeline to DOM
function renderTimeline() {
    notesTimeline.innerHTML = '';

    if (appState.notes.length === 0) {
        // No notes fetched at all
        showEmpty();
        return;
    }

    if (appState.filteredNotes.length === 0) {
        // Filtered list is empty
        showEmpty();
        return;
    }

    showContent();

    appState.filteredNotes.forEach(note => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        
        const typeClass = note.type.toLowerCase();
        
        item.innerHTML = `
            <div class="timeline-marker"></div>
            <div class="timeline-card">
                <div class="card-header">
                    <div class="card-meta">
                        <span class="card-date">${note.date}</span>
                        <span class="card-type-badge ${typeClass}">${note.type}</span>
                    </div>
                </div>
                <div class="card-body">
                    ${note.content_html}
                </div>
                <div class="card-actions">
                    <button class="copy-card-btn" data-id="${note.id}">
                        <i class="fa-regular fa-copy"></i>
                        <span>Copy</span>
                    </button>
                    <button class="share-tweet-btn" data-id="${note.id}">
                        <i class="fa-brands fa-x-twitter"></i>
                        <span>Share on X</span>
                    </button>
                </div>
            </div>
        `;
        
        notesTimeline.appendChild(item);
    });

    // Add click listeners to copy buttons
    document.querySelectorAll('.copy-card-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const noteId = btn.dataset.id;
            const note = appState.notes.find(n => n.id === noteId);
            if (note) {
                try {
                    await navigator.clipboard.writeText(note.content_text);
                    showToast('Copied update details!');
                    
                    const btnSpan = btn.querySelector('span');
                    const btnIcon = btn.querySelector('i');
                    const oldText = btnSpan.textContent;
                    const oldIconClass = btnIcon.className;
                    
                    btnSpan.textContent = 'Copied!';
                    btnIcon.className = 'fa-solid fa-check';
                    btn.classList.add('success');
                    
                    setTimeout(() => {
                        btnSpan.textContent = oldText;
                        btnIcon.className = oldIconClass;
                        btn.classList.remove('success');
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy card details: ', err);
                }
            }
        });
    });

    // Add click listeners to share buttons
    document.querySelectorAll('.share-tweet-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const noteId = btn.dataset.id;
            const note = appState.notes.find(n => n.id === noteId);
            if (note) {
                openTweetModal(note);
            }
        });
    });
}

// Reset Search & Filters
function resetFilters() {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    appState.searchQuery = '';
    appState.selectedFilter = 'all';
    
    // Reset pill styles
    document.querySelectorAll('.filter-pill').forEach(p => {
        if (p.dataset.type === 'all') {
            p.classList.add('active');
        } else {
            p.classList.remove('active');
        }
    });

    filterAndRenderNotes();
}

// Screen State Toggles
function showLoading() {
    loadingState.style.display = 'flex';
    errorState.style.display = 'none';
    emptyState.style.display = 'none';
    notesTimeline.style.display = 'none';
}

function showError(msg) {
    loadingState.style.display = 'none';
    errorState.style.display = 'flex';
    errorMessage.textContent = msg;
    emptyState.style.display = 'none';
    notesTimeline.style.display = 'none';
}

function showEmpty() {
    loadingState.style.display = 'none';
    errorState.style.display = 'none';
    emptyState.style.display = 'flex';
    notesTimeline.style.display = 'none';
}

function showContent() {
    loadingState.style.display = 'none';
    errorState.style.display = 'none';
    emptyState.style.display = 'none';
    notesTimeline.style.display = 'block';
}

// Modal Control: Open
function openTweetModal(note) {
    appState.selectedNote = note;
    
    // Set preview details
    modalNoteType.textContent = note.type;
    modalNoteType.className = `preview-badge card-type-badge ${note.type.toLowerCase()}`;
    modalNoteDate.textContent = note.date;
    
    // Set active template button default
    templateBtns.forEach(btn => {
        if (btn.dataset.template === 'standard') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    appState.selectedTemplate = 'standard';
    
    // Generate text and open
    generateTweetText();
    
    tweetModal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

// Modal Control: Close
function closeTweetModal() {
    tweetModal.style.display = 'none';
    document.body.style.overflow = ''; // Restore scrolling
    appState.selectedNote = null;
}

// Generate Tweet Content based on Selected Template
function generateTweetText() {
    if (!appState.selectedNote) return;
    
    const note = appState.selectedNote;
    const date = note.date;
    const type = note.type.toUpperCase();
    const link = note.link;
    
    // Truncate function for safety
    const maxDescLen = 140;
    let desc = note.content_text;
    if (desc.length > maxDescLen) {
        desc = desc.substring(0, maxDescLen - 3) + '...';
    }
    
    let tweetText = '';
    
    switch (appState.selectedTemplate) {
        case 'short':
            tweetText = `📢 BigQuery Update (${date}): New ${note.type.toLowerCase()} released.\n\n"${desc}"\n\nDetails: ${link} #BigQuery #GoogleCloud`;
            break;
            
        case 'bullet':
            tweetText = `🛠️ GCP Release Notes | BigQuery\n\n📅 Date: ${date}\n🏷️ Type: ${note.type}\n\n📝 Details:\n${desc}\n\n👉 Read full details: ${link}\n#BigQuery #GCP`;
            break;
            
        case 'standard':
        default:
            tweetText = `📢 BigQuery Update: [${note.type}] (${date})\n\n${note.content_text.substring(0, 160)}${note.content_text.length > 160 ? '...' : ''}\n\nRead more here: ${link}\n#BigQuery #GoogleCloud #GCP`;
            break;
    }
    
    tweetTextarea.value = tweetText;
    updateTweetLengthStatus();
}

// Real-time Tweet Character length tracker and Progress Circle update
function updateTweetLengthStatus() {
    const text = tweetTextarea.value;
    const textLength = text.length;
    const remaining = appState.maxTweetLength - textLength;
    
    // Update count display
    charCountSpan.textContent = remaining;
    
    // Progress Ring offset calculation
    const progress = Math.min(textLength / appState.maxTweetLength, 1);
    const offset = circleCircumference - (progress * circleCircumference);
    charProgressCircle.style.strokeDashoffset = offset;
    
    // Color states for progress ring & counter
    if (remaining < 0) {
        charProgressCircle.style.stroke = '#ef4444'; // Red
        charCountSpan.style.color = '#ef4444';
        charWarning.style.display = 'flex';
        charWarning.querySelector('span').textContent = `Exceeded X standard limit by ${Math.abs(remaining)} chars`;
    } else if (remaining <= 20) {
        charProgressCircle.style.stroke = '#f59e0b'; // Amber
        charCountSpan.style.color = '#f59e0b';
        charWarning.style.display = 'flex';
        charWarning.querySelector('span').textContent = 'Approaching standard 280-char limit';
    } else {
        charProgressCircle.style.stroke = '#6366f1'; // Indigo
        charCountSpan.style.color = 'var(--text-secondary)';
        charWarning.style.display = 'none';
    }
}

// Copy Tweet to Clipboard
async function copyTweetToClipboard() {
    try {
        await navigator.clipboard.writeText(tweetTextarea.value);
        showToast('Tweet copied to clipboard!');
    } catch (err) {
        console.error('Failed to copy text: ', err);
        // Fallback for older browsers
        tweetTextarea.select();
        document.execCommand('copy');
        showToast('Tweet copied to clipboard!');
    }
}

// Open Twitter Web Intent
function postTweetToX() {
    const text = encodeURIComponent(tweetTextarea.value);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${text}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
}

// Show Toast Alert
let toastTimeout;
function showToast(message) {
    clearTimeout(toastTimeout);
    toastMessage.textContent = message;
    toast.style.display = 'flex';
    
    toastTimeout = setTimeout(() => {
        toast.style.animation = 'toastOut var(--transition-fast) forwards';
        setTimeout(() => {
            toast.style.display = 'none';
            toast.style.animation = ''; // Reset animation
        }, 200);
    }, 2500);
}

// Export current filtered release notes to CSV format
function exportFilteredNotesToCSV() {
    if (appState.filteredNotes.length === 0) {
        showToast('No notes available to export.');
        return;
    }
    
    // Prepare headers
    const headers = ['Date', 'Type', 'Description', 'Link'];
    
    // Convert rows
    const rows = appState.filteredNotes.map(note => {
        // Escape content text quotes: replace " with ""
        const cleanDesc = note.content_text.replace(/"/g, '""');
        return [
            `"${note.date}"`,
            `"${note.type}"`,
            `"${cleanDesc}"`,
            `"${note.link}"`
        ].join(',');
    });
    
    // Join all together
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Format timestamp for filename
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    
    link.setAttribute('href', url);
    link.setAttribute('download', `bigquery_release_notes_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('CSV export downloaded!');
}

// Initialize Theme from Local Storage
function initializeTheme() {
    if (!themeToggle || !darkIcon || !lightIcon) return;
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        themeToggle.checked = true;
        document.body.classList.add('light-theme');
        darkIcon.classList.remove('active');
        lightIcon.classList.add('active');
    } else {
        themeToggle.checked = false;
        document.body.classList.remove('light-theme');
        darkIcon.classList.add('active');
        lightIcon.classList.remove('active');
    }
}

// Toggle page theme (dark <-> light mode)
function toggleTheme() {
    if (!themeToggle || !darkIcon || !lightIcon) return;
    
    if (themeToggle.checked) {
        document.body.classList.add('light-theme');
        darkIcon.classList.remove('active');
        lightIcon.classList.add('active');
        localStorage.setItem('theme', 'light');
        showToast('Swapped to Light Theme');
    } else {
        document.body.classList.remove('light-theme');
        darkIcon.classList.add('active');
        lightIcon.classList.remove('active');
        localStorage.setItem('theme', 'dark');
        showToast('Swapped to Dark Theme');
    }
}
