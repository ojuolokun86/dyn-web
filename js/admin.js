// Instagram-style Hall of Fame Poster Generator
async function downloadHallOfFameAsImage() {
    try {
        // Fetch Hall of Fame data from API
        const response = await fetch(`${API_BASE_URL}/admin/hall-of-fame-web`);
        const result = await response.json();
        
        if (!result.success) {
            alert('Failed to load Hall of Fame data');
            return;
        }
        
        const leagueData = result.data;
        
        // Create hidden container for poster generation
        const posterContainer = document.createElement('div');
        posterContainer.id = 'hof-poster-container';
        posterContainer.style.cssText = `
            position: fixed;
            top: -9999px;
            left: -9999px;
            width: 1080px;
            background: #ffffff;
            padding: 60px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #333333;
            box-sizing: border-box;
            z-index: -9999;
        `;
        
        // Build poster HTML from raw API data
        let posterHTML = `
            <div style="text-align: center; margin-bottom: 60px;">
                <h1 style="font-size: 48px; font-weight: bold; margin: 0; color: #FFD700; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                    👑 HALL OF FAME
                </h1>
                <h2 style="font-size: 24px; font-weight: 600; margin: 10px 0; color: #666666;">
                    DYNAMIC EFOOTBALL COMMUNITY
                </h2>
                <p style="font-size: 14px; margin: 0; color: #999999;">
                    ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>
        `;
        
        // Process each league from API data
        Object.keys(leagueData).forEach((leagueName, leagueIndex) => {
            const players = leagueData[leagueName];
            
            // League header
            posterHTML += `
                <div style="margin-bottom: ${leagueIndex > 0 ? '40px' : '0'};">
                    <h3 style="font-size: 32px; font-weight: bold; margin: 0 0 15px 0; color: #FFD700;">
                        ${leagueName.toUpperCase()}
                    </h3>
                    <div style="height: 2px; background: linear-gradient(90deg, #FFD700, #FFA500); margin: 0 0 25px 0; border-radius: 1px;"></div>
            `;
            
            // Process each player in this league
            Object.keys(players).forEach((playerName, playerIndex) => {
                const player = players[playerName];
                const wins = player.wins;
                const winCount = wins.length;
                
                // Player section
                posterHTML += `
                    <div style="margin-bottom: ${playerIndex > 0 ? '25px' : '0'};">
                        <div style="font-size: 20px; font-weight: bold; margin: 0 0 5px 0; color: #333333;">
                            ${playerName}
                        </div>
                        <div style="font-size: 16px; font-weight: 600; margin: 0 0 10px 0; color: #666666;">
                            ${winCount}x Winner
                        </div>
                        <div style="font-size: 14px; color: #888888; line-height: 1.6;">
                `;
                
                // List ALL wins for this player
                wins.forEach((win, winIndex) => {
                    const isLast = winIndex === wins.length - 1;
                    posterHTML += `
                        • ${win.team_name} – Season ${win.season}${isLast ? '' : '<br>'}
                    `;
                });
                
                posterHTML += `
                        </div>
                    </div>
                `;
            });
            
            posterHTML += `</div>`;
        });
        
        posterContainer.innerHTML = posterHTML;
        document.body.appendChild(posterContainer);
        
        // Load html2canvas if not already loaded
        if (typeof html2canvas === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script.onload = () => captureAndDownload();
            document.head.appendChild(script);
        } else {
            captureAndDownload();
        }
        
        async function captureAndDownload() {
            try {
                // Capture the poster with auto height
                const canvas = await html2canvas(posterContainer, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: "#ffffff",
                    width: 1080,
                    height: posterContainer.scrollHeight
                });
                
                // Convert to blob and download
                canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `hall-of-fame-instagram-${new Date().toISOString().split('T')[0]}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    
                    // Clean up the temporary container
                    document.body.removeChild(posterContainer);
                }, 'image/png');
                
            } catch (error) {
                console.error('Error generating poster:', error);
                alert('Failed to generate Hall of Fame poster');
                document.body.removeChild(posterContainer);
            }
        }
        
    } catch (error) {
        console.error('Error in downloadHallOfFameAsImage:', error);
        alert('Failed to generate Hall of Fame poster');
    }
}

// Dashboard State
let dashboardState = {
    contenders: [],
    votes: [],
    spectators: [],
    selectedSection: 'overview',
    pointTableValues: {} // Store default_points for each point table
};

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    checkAuthentication();
    loadDashboardData();
    setupEventListeners();
    loadAdminInfo();
    showSuperadminUIIfNeeded();
    setupMobileSidebar();
});

// Check if user is authenticated
function checkAuthentication() {
    const token = localStorage.getItem('adminToken');
    if (!token) {
        window.location.href = 'admin-login.html';
        return;
    }
}

// Load admin info
function loadAdminInfo() {
    const admin = JSON.parse(localStorage.getItem('adminUser')) || { username: 'Admin' };
    document.getElementById('adminUsername').textContent = admin.username;
}

// Show superadmin-only UI elements
function showSuperadminUIIfNeeded() {
    const admin = JSON.parse(localStorage.getItem('adminUser')) || {};
    if (admin.role === 'superadmin') {
        const nav = document.getElementById('navPendingRequests');
        if (nav) nav.style.display = 'block';
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Sidebar navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            switchSection(section);
        });
    });

    // Forms
    document.getElementById('contenderForm')?.addEventListener('submit', handleAddContender);
    document.getElementById('eventForm')?.addEventListener('submit', handleCreateEvent);
    document.getElementById('eventVoteForm')?.addEventListener('submit', handleCreateVoteTables);
    document.getElementById('eventVoteFormInline')?.addEventListener('submit', handleCreateVoteTablesInline);
    document.getElementById('voteEventSelectInline')?.addEventListener('change', loadVoteTablesList);
    document.getElementById('deleteSelectedEventBtn')?.addEventListener('click', handleDeleteSelectedEventFromVotes);
    document.getElementById('pointTableForm')?.addEventListener('submit', handleCreatePointTable);
    document.getElementById('awardPointsFormElement')?.addEventListener('submit', handleAwardPoints);
    document.getElementById('pastWinnerForm')?.addEventListener('submit', handleAddPastWinner);
    document.getElementById('awardPointEventSelect')?.addEventListener('change', async () => {
        // Ensure point-tables load first, then contenders — prevents race conditions
        await loadPointTablesForAward();
        await loadContendersForPoints();
    });
    document.getElementById('awardPointContenderSelect')?.addEventListener('change', filterAvailablePointTables);
    document.getElementById('awardPointTableSelect')?.addEventListener('change', () => { calculateTotalPoints(); filterContendersByPointTable(); });
    document.getElementById('awardPointAmount')?.addEventListener('input', calculateTotalPoints);
    
    // Edit/Delete points listeners
    document.getElementById('editPointEventSelect')?.addEventListener('change', loadPointTablesForEditSelect);
    document.getElementById('editPointTableSelect')?.addEventListener('change', loadPointAwardsForEdit);

    // File inputs
    document.getElementById('contenderPictures')?.addEventListener('change', handlePictureSelect);
    document.getElementById('contenderVideos')?.addEventListener('change', handleVideoSelect);

    // Analytics
    document.getElementById('analyticsEventSelect')?.addEventListener('change', loadPointRanking);
}

// Switch Dashboard Section
function switchSection(sectionId) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');

    // Update page title
    const titles = {
        'overview': 'Dashboard Overview',
        'events': 'Event Management',
        'contenders': 'Manage Contenders',
        'votes': 'Manage Votes',
        'spectators': 'Spectators',
        'analytics': 'Analytics',
        'past-winners': 'Past Winners Management',
        'hall-of-fame': 'Hall of Fame Management'
    };
    document.getElementById('pageTitle').textContent = titles[sectionId] || 'Dashboard';

    // Display active section
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');

    dashboardState.selectedSection = sectionId;
    if (sectionId === 'pending-requests') {
        if (typeof loadPendingRequests === 'function') loadPendingRequests();
    }
    if (sectionId === 'analytics') {
        if (typeof loadPointRanking === 'function') loadPointRanking();
    }
    if (sectionId === 'past-winners') {
        if (typeof loadPastWinnersList === 'function') loadPastWinnersList();
    }
    if (sectionId === 'hall-of-fame') {
        if (typeof loadHallOfFameList === 'function') loadHallOfFameList();
    }
}

// Load Dashboard Data
function loadDashboardData() {
    dashboardState.spectators = JSON.parse(localStorage.getItem('spectators')) || [];

    // Load events and then fetch contenders from backend for each event
    loadEvents();
    fetchAllContenders().then(() => {
        updateDashboardStats();
        loadContendersList();
    }).catch(err => {
        // Fallback to localStorage if API fails
        console.error('Error fetching contenders from API:', err);
        dashboardState.contenders = JSON.parse(localStorage.getItem('contenders')) || [];
        updateDashboardStats();
        loadContendersList();
    });

    loadSpectatorsList();
}

// Fetch contenders for all events and populate dashboardState.contenders
async function fetchAllContenders() {
    const token = localStorage.getItem('adminToken');
    dashboardState.contenders = [];

    try {
        const eventsRes = await fetch(`${API_BASE_URL}/events`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const eventsResult = await eventsRes.json();
        if (!eventsResult.success) return;

        const events = eventsResult.data || [];

        for (const ev of events) {
            try {
                const res = await fetch(`${API_BASE_URL}/events/${ev.id}/contenders`);
                const result = await res.json();
                if (result.success && Array.isArray(result.data)) {
                    // tag contenders with event info AND event status
                    const tagged = result.data.map(c => ({ 
                        ...c, 
                        eventName: ev.name,
                        eventStatus: ev.status,
                        eventId: ev.id
                    }));
                    dashboardState.contenders.push(...tagged);
                }
            } catch (err) {
                console.warn('Failed to load contenders for event', ev.id, err);
            }
        }

        // Persist a snapshot for offline editing (keeps backward compatibility)
        localStorage.setItem('contenders', JSON.stringify(dashboardState.contenders));
    } catch (err) {
        throw err;
    }
}

// Update Dashboard Stats
function updateDashboardStats() {
    // Count all contenders from events that haven't closed or announced winner
    const activeContenders = dashboardState.contenders.filter(c => 
        c.eventStatus !== 'closed' && c.eventStatus !== 'winner_announced'
    );
    document.getElementById('totalContenders').textContent = activeContenders.length;
    document.getElementById('totalSpectators').textContent = dashboardState.spectators.length;
}

// ===== CONTENDER MANAGEMENT =====
let selectedPictures = [];
let selectedVideos = [];

function handlePictureSelect(e) {
    selectedPictures = Array.from(e.target.files);
    displayPicturePreview();
}

function handleVideoSelect(e) {
    selectedVideos = Array.from(e.target.files);
    displayVideoPreview();
}

function displayPicturePreview() {
    const preview = document.getElementById('picturePreview');
    preview.innerHTML = '';
    selectedPictures.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <button type="button" class="remove-btn" onclick="removePicture(${index})">×</button>
            `;
            preview.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

function displayVideoPreview() {
    const preview = document.getElementById('videoPreview');
    preview.innerHTML = '';
    selectedVideos.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `
                <video controls style="max-height: 120px;">
                    <source src="${e.target.result}">
                </video>
                <button type="button" class="remove-btn" onclick="removeVideo(${index})">×</button>
            `;
            preview.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

function removePicture(index) {
    selectedPictures.splice(index, 1);
    displayPicturePreview();
}

function removeVideo(index) {
    selectedVideos.splice(index, 1);
    displayVideoPreview();
}

async function handleAddContender(e) {
    e.preventDefault();

    const token = localStorage.getItem('adminToken');
    const eventId = document.getElementById('contenderEventSelect')?.value;
    const name = document.getElementById('contenderName')?.value;
    const description = document.getElementById('contenderDescription')?.value || '';
    const contenderClass = document.getElementById('contenderClass')?.value;
    const country = document.getElementById('contenderCountry')?.value;
    const emailEl = document.getElementById('contenderEmail');
    const email = emailEl ? emailEl.value : '';

    console.log('🔍 Adding contender with data:', { name, contenderClass, country, email, description });

    if (!eventId) {
        showMessage('contenderMessage', 'Please select an event!', 'error');
        return;
    }

    if (!name.trim()) {
        showMessage('contenderMessage', 'Contender name is required!', 'error');
        return;
    }

    if (!contenderClass.trim()) {
        showMessage('contenderMessage', 'Class/Category is required!', 'error');
        return;
    }

    if (!country.trim()) {
        showMessage('contenderMessage', 'Country/Region is required!', 'error');
        return;
    }

    if (!email.trim()) {
        showMessage('contenderMessage', 'Email is required!', 'error');
        return;
    }

    const messageDiv = document.getElementById('contenderMessage');
    
    try {
        const response = await fetch(`${API_BASE_URL}/events/${eventId}/contenders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name,
                description,
                class: contenderClass,
                country,
                email
            })
        });

        const result = await response.json();
        
        console.log('✅ Contender creation result:', result);
        
        if (result.success) {
            messageDiv.innerHTML = '<div class="message success">✅ Contender added successfully!</div>';
            document.getElementById('contenderForm').reset();
            selectedPictures = [];
            selectedVideos = [];
            document.getElementById('picturePreview').innerHTML = '';
            document.getElementById('videoPreview').innerHTML = '';
            
            // Refresh the contenders list to show the new entry with database values
            await fetchAllContenders();
            loadContendersList();
            
            setTimeout(() => toggleForm('contender-form'), 1500);
        } else {
            messageDiv.innerHTML = `<div class="message error">❌ ${result.error || result.message}</div>`;
        }
    } catch (error) {
        console.error('❌ Error adding contender:', error);
        messageDiv.innerHTML = `<div class="message error">❌ Error: ${error.message}</div>`;
    }
}

function loadContendersList() {
    const listDiv = document.getElementById('contendersList');
    
    if (dashboardState.contenders.length === 0) {
        listDiv.innerHTML = '<p class="empty-state">No contenders added yet</p>';
        return;
    }

    // Separate contenders by event status
    const activeContenders = dashboardState.contenders.filter(c => 
        c.eventStatus !== 'closed' && c.eventStatus !== 'winner_announced'
    );
    const pastContenders = dashboardState.contenders.filter(c => 
        c.eventStatus === 'closed' || c.eventStatus === 'winner_announced'
    );

    let html = '';

    // Active contenders section
    if (activeContenders.length > 0) {
        html += `
            <div class="contenders-section-header" style="margin-bottom: 20px; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; color: white;">
                <h3 style="margin: 0; font-size: 18px;">🎪 Active Contenders (${activeContenders.length})</h3>
                <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">These contenders are in active events and can be edited</p>
            </div>
        `;
        html += activeContenders.map(contender => renderContenderItem(contender, true)).join('');
    }

    // Past contenders section (read-only)
    if (pastContenders.length > 0) {
        html += `
            <div class="contenders-section-header" style="margin: 30px 0 20px 0; padding: 15px; background: linear-gradient(135deg, #6c757d 0%, #495057 100%); border-radius: 10px; color: white;">
                <h3 style="margin: 0; font-size: 18px;">📦 Past Contenders (${pastContenders.length})</h3>
                <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">These contenders are from closed events - view only</p>
            </div>
        `;
        html += pastContenders.map(contender => renderContenderItem(contender, false)).join('');
    }

    listDiv.innerHTML = html;
}

function renderContenderItem(contender, canEdit) {
    return `
        <div class="list-item ${!canEdit ? 'past-contender' : ''}">
            <div class="item-header" style="display:flex; align-items:center; gap:12px;">
                <div style="width:64px; height:64px; border-radius:8px; overflow:hidden; background:#f5f5f5; flex:0 0 64px;">
                    ${contender.picture ? `<img src="${escapeHtml(contender.picture)}" style="width:100%; height:100%; object-fit:cover;"/>` : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#999;">No</div>`}
                </div>
                <div style="flex:1;">
                    <h3 style="margin:0">${escapeHtml(contender.name)}</h3>
                    <div style="color:#777; font-size:0.9em;">${escapeHtml(contender.class || '')} • ${escapeHtml(contender.country || '')}</div>
                </div>
                <span class="item-badge">${contender.total_points || 0} pts</span>
                ${!canEdit ? '<span class="item-badge" style="background: #6c757d; margin-left: 10px;">CLOSED EVENT</span>' : ''}
            </div>
            <div class="item-details">
                <span><strong>Event:</strong> ${escapeHtml(contender.eventName || '')}</span>
                <span><strong>Class:</strong> ${escapeHtml(contender.class) || 'N/A'}</span>
                <span><strong>Country:</strong> ${escapeHtml(contender.country) || 'N/A'}</span>
                <span><strong>Media:</strong> ${contender.pictures || 0} pics, ${contender.videos || 0} videos</span>
            </div>
            ${contender.description ? `<p class="item-description">${escapeHtml(contender.description)}</p>` : ''}
            ${canEdit ? `
                <div class="item-actions">
                    <button class="btn btn-small btn-secondary" onclick="editContender('${contender.id}')">Edit</button>
                    <button class="btn btn-small btn-info" onclick="resendContenderEmail('${contender.id}')" title="Resend Email to Contender">📧</button>
                    <button class="btn btn-small btn-danger" onclick="deleteContender('${contender.id}')">Delete</button>
                </div>
            ` : `
                <div class="item-actions" style="opacity: 0.6; font-style: italic; color: #6c757d;">
                    🔒 View only - Event is closed
                </div>
            `}
        </div>
    `;
}

function deleteContender(id) {
    const contender = dashboardState.contenders.find(c => c.id === id);
    if (!contender) {
        alert('Contender not found');
        return;
    }

    // Prevent deletion if event is closed
    if (contender.eventStatus === 'closed' || contender.eventStatus === 'winner_announced') {
        alert('❌ Cannot delete contenders from closed events. This contender is archived for historical records.');
        return;
    }

    if (!confirm('Are you sure you want to delete this contender?')) return;

    (async () => {
        const token = localStorage.getItem('adminToken');
        const eventId = contender.event_id || contender.eventId;

        try {
            // Prefer event-scoped delete endpoint
            const endpoint = eventId ? `${API_BASE_URL}/events/${eventId}/contenders/${id}` : `${API_BASE_URL}/contenders/${id}`;
            const res = await fetch(endpoint, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                dashboardState.contenders = dashboardState.contenders.filter(c => c.id !== id);
                localStorage.setItem('contenders', JSON.stringify(dashboardState.contenders));
                updateDashboardStats();
                loadContendersList();
            } else {
                alert('Error deleting contender: ' + (result.error || result.message));
            }
        } catch (err) {
            alert('Error deleting contender: ' + err.message);
        }
    })();
}

function editContender(id) {
    const contender = dashboardState.contenders.find(c => c.id === id);
    if (!contender) return alert('Contender not found');

    // Prevent editing if event is closed
    if (contender.eventStatus === 'closed' || contender.eventStatus === 'winner_announced') {
        alert('❌ Cannot edit contenders from closed events. This contender is archived for historical records.');
        return;
    }

    // Build modal HTML
    const existing = document.getElementById('editContenderModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'editContenderModal';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
        <div class="modal-card">
            <h3>Edit Contender</h3>
            <form id="editContenderForm">
                <div class="modal-row">
                    <div class="modal-col">
                        <label>Name</label>
                        <input type="text" id="editContenderName" class="form-input" value="${escapeHtml(contender.name||'')}" required />
                    </div>
                    <div class="modal-col">
                        <label>Class / Category</label>
                        <input type="text" id="editContenderClass" class="form-input" value="${escapeHtml(contender.class||'')}" />
                    </div>
                </div>
                <div class="modal-row" style="margin-top:10px;">
                    <div class="modal-col">
                        <label>Country / Region</label>
                        <input type="text" id="editContenderCountry" class="form-input" value="${escapeHtml(contender.country||'')}" />
                    </div>
                    <div class="modal-col">
                        <label>Profile Picture (single)</label>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <div class="file-preview" id="editPicPreview">${contender.picture ? `<img src="${escapeHtml(contender.picture)}"/>` : '<span style="color:#999">No image</span>'}</div>
                            <div>
                                <input type="file" id="editContenderPicture" accept="image/*" />
                                <div style="font-size:12px; color:#666; margin-top:6px;">Upload a single profile picture</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-row" style="margin-top:10px;">
                    <div class="modal-col">
                        <label>Video Clip (optional)</label>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <div class="file-preview" id="editVideoPreview">${contender.video ? `<video width="120" src="${escapeHtml(contender.video)}" controls></video>` : '<span style="color:#999">No clip</span>'}</div>
                            <div>
                                <input type="file" id="editContenderVideo" accept="video/*" />
                                <div style="font-size:12px; color:#666; margin-top:6px;">Upload one video clip (mp4/webm)</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div style="margin-top:10px;">
                    <label>Description</label>
                    <textarea id="editContenderDescription" class="form-input" style="min-height:80px;">${escapeHtml(contender.description||'')}</textarea>
                </div>

                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" id="cancelEditContender">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    const fileInput = document.getElementById('editContenderPicture');
    const preview = document.getElementById('editPicPreview');
    const videoInput = document.getElementById('editContenderVideo');
    const videoPreview = document.getElementById('editVideoPreview');

    fileInput.addEventListener('change', (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = (ev) => {
            preview.innerHTML = `<img src="${ev.target.result}" alt="preview">`;
        };
        r.readAsDataURL(f);
    });

    if (videoInput) {
        videoInput.addEventListener('change', (e) => {
            const vf = e.target.files[0];
            if (!vf) return;
            try {
                const url = URL.createObjectURL(vf);
                videoPreview.innerHTML = `<video width="160" controls src="${url}"></video>`;
            } catch (err) {
                console.error('Video preview error', err);
            }
        });
    }

    document.getElementById('cancelEditContender').addEventListener('click', () => {
        modal.remove();
    });

    document.getElementById('editContenderForm').addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const token = localStorage.getItem('adminToken');
        const updated = {
            name: document.getElementById('editContenderName').value.trim(),
            class: document.getElementById('editContenderClass').value.trim(),
            country: document.getElementById('editContenderCountry').value.trim(),
            description: document.getElementById('editContenderDescription').value.trim()
        };

        // Update metadata first (PUT)
        try {
            const eventId = contender.event_id || contender.eventId || contender.eventId || '';
            const endpoint = eventId ? `${API_BASE_URL}/events/${eventId}/contenders/${id}` : `${API_BASE_URL}/contenders/${id}`;
            const res = await fetch(endpoint, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(updated)
            });
            const result = await res.json();
            if (!result.success) {
                alert('Error saving contender: ' + (result.error || result.message));
                return;
            }

            // If a picture was selected, upload it via Supabase storage when available, else fallback to backend endpoint
            const picFile = document.getElementById('editContenderPicture').files[0];
            if (picFile) {
                if (window.supabaseClient && typeof uploadToSupabase === 'function') {
                    try {
                        const safeName = `${Date.now()}_${picFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
                        const storedPath = await uploadToSupabase(window.SUPABASE_BUCKET_PROFILES, `${id}/${safeName}`, picFile, { upsert: true });
                        if (storedPath) {
                            // Build public URL for profiles bucket (public access expected)
                            const base = (window.SUPABASE_URL || '').replace(/\/$/, '');
                            const publicUrl = `${base}/storage/v1/object/public/${window.SUPABASE_BUCKET_PROFILES}/${storedPath}`;
                            updated.picture = publicUrl;
                            contender.picture = publicUrl;
                            console.log('✅ Picture uploaded to Supabase:', {
                                storedPath,
                                publicUrl,
                                updatedObject: updated
                            });
                        }
                    } catch (upErr) {
                        console.error('Supabase profile upload failed:', upErr);
                    }
                }
            }

            // Video upload (optional)
            const videoFile = document.getElementById('editContenderVideo')?.files[0];
            if (videoFile) {
                if (window.supabaseClient && typeof uploadToSupabase === 'function' && typeof createSupabaseSignedUrl === 'function') {
                    try {
                        const safeVidName = `${Date.now()}_${videoFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
                        const storedVidPath = await uploadToSupabase(window.SUPABASE_BUCKET_VIDEOS, `${id}/${safeVidName}`, videoFile, { upsert: true });
                        if (storedVidPath) {
                            // Create a signed URL for playback (1 hour expiry)
                            const signed = await createSupabaseSignedUrl(window.SUPABASE_BUCKET_VIDEOS, storedVidPath, 60 * 60);
                            if (signed) {
                                updated.video = signed;
                                contender.video = signed;
                            }
                        }
                    } catch (vidErr) {
                        console.error('Supabase video upload failed:', vidErr);
                        // Fallback to backend upload
                        try {
                            const formData = new FormData();
                            formData.append('videoUrl', ''); // We'll handle this differently
                            formData.append('video', videoFile);
                            
                            const fallbackRes = await fetch(`${API_BASE_URL}/events/${eventId}/contenders/${id}/upload-video`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${token}` },
                                body: formData
                            });
                            
                            const fallbackResult = await fallbackRes.json();
                            if (fallbackResult.success && fallbackResult.data && fallbackResult.data.video) {
                                updated.video = fallbackResult.data.video;
                                contender.video = fallbackResult.data.video;
                                console.log('✅ Video uploaded via backend fallback:', fallbackResult.data.video);
                            }
                        } catch (fallbackErr) {
                            console.error('Backend video upload fallback also failed:', fallbackErr);
                            alert('Video upload failed. Please try again or use a smaller file.');
                            return; // Stop the save process if video upload fails
                        }
                    }
                } else {
                    // No Supabase available, use backend fallback
                    try {
                        const formData = new FormData();
                        formData.append('video', videoFile);
                        
                        const fallbackRes = await fetch(`${API_BASE_URL}/events/${eventId}/contenders/${id}/upload-video`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` },
                            body: formData
                        });
                        
                        const fallbackResult = await fallbackRes.json();
                        if (fallbackResult.success && fallbackResult.data && fallbackResult.data.video) {
                            updated.video = fallbackResult.data.video;
                            contender.video = fallbackResult.data.video;
                            console.log('✅ Video uploaded via backend:', fallbackResult.data.video);
                        } else {
                            throw new Error(fallbackResult.error || 'Backend upload failed');
                        }
                    } catch (fallbackErr) {
                        console.error('Backend video upload failed:', fallbackErr);
                        alert('Video upload failed. Please try again or use a smaller file.');
                        return; // Stop the save process if video upload fails
                    }
                }
            }

            // NOW update the database with picture/video URLs if they were uploaded
            if (updated.picture || updated.video) {
                try {
                    console.log('📤 Sending PUT request to save media URLs:', updated);
                    const updateRes = await fetch(eventId ? `${API_BASE_URL}/events/${eventId}/contenders/${id}` : `${API_BASE_URL}/contenders/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(updated)
                    });
                    const updateResult = await updateRes.json();
                    if (!updateResult.success) {
                        console.warn('❌ Failed to save media URLs to database:', updateResult.error);
                    } else {
                        console.log('✅ Media URLs saved to database:', updateResult.data);
                    }
                } catch (err) {
                    console.error('❌ Error updating media URLs in database:', err);
                }
            }

            // Re-fetch the contender from API to get fresh data with stored URLs
            try {
                const eventId = contender.event_id || contender.eventId || '';
                const fetchEndpoint = eventId ? `${API_BASE_URL}/events/${eventId}/contenders` : `${API_BASE_URL}/contenders`;
                const fetchRes = await fetch(fetchEndpoint, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const fetchResult = await fetchRes.json();
                if (fetchResult.success && Array.isArray(fetchResult.data)) {
                    const freshContender = fetchResult.data.find(c => c.id === id);
                    if (freshContender) {
                        console.log('🔄 Fresh contender from DB:', freshContender);
                        // Update the local copy with fresh data from DB (includes stored picture/video URLs)
                        const idx = dashboardState.contenders.findIndex(c => c.id === id);
                        if (idx !== -1) {
                            dashboardState.contenders[idx] = { ...dashboardState.contenders[idx], ...freshContender };
                            console.log('✅ Updated dashboardState.contenders[' + idx + ']:', dashboardState.contenders[idx]);
                        }
                    } else {
                        console.warn('⚠️ Fresh contender not found in API response');
                    }
                }
            } catch (fetchErr) {
                console.warn('Could not re-fetch contender after update:', fetchErr);
                // Fallback: at least update with what we know
                Object.assign(contender, updated);
            }

            loadContendersList();
            modal.remove();
        } catch (err) {
            console.error('Error updating contender:', err);
            alert('Error updating contender: ' + err.message);
        }
    });
}

// ===== VOTE MANAGEMENT =====
// ===== SPECTATORS MANAGEMENT =====
function loadSpectatorsList() {
    // Mock spectator data
    const mockSpectators = [
        { id: 1, name: 'John Doe', visits: 5, lastSeen: new Date(Date.now() - 1000000).toLocaleString() },
        { id: 2, name: 'Jane Smith', visits: 3, lastSeen: new Date(Date.now() - 2000000).toLocaleString() },
        { id: 3, name: 'Mike Johnson', visits: 8, lastSeen: new Date(Date.now() - 500000).toLocaleString() }
    ];

    document.getElementById('onlineSpectators').textContent = Math.floor(Math.random() * 50) + 10;
    document.getElementById('totalVisits').textContent = Math.floor(Math.random() * 500) + 100;
    document.getElementById('avgSession').textContent = Math.floor(Math.random() * 30) + 5 + 'm';

    const listDiv = document.getElementById('spectatorsList');
    listDiv.innerHTML = mockSpectators.map(spec => `
        <div class="list-item">
            <div class="item-header">
                <h3>${escapeHtml(spec.name)}</h3>
            </div>
            <div class="item-details">
                <span><strong>Visits:</strong> ${spec.visits}</span>
                <span><strong>Last Seen:</strong> ${spec.lastSeen}</span>
            </div>
        </div>
    `).join('');
}

// ===== UTILITY FUNCTIONS =====
function toggleForm(formId) {
    const form = document.getElementById(formId);
    form.classList.toggle('hidden');
}

function showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    const className = type === 'success' ? 'success-message' : 'error-message';
    element.innerHTML = `<div class="${className}">${escapeHtml(message)}</div>`;

    setTimeout(() => {
        element.innerHTML = '';
    }, 4000);
}

function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ===== EVENT MANAGEMENT =====

async function loadEvents() {
    const token = localStorage.getItem('adminToken');
    console.log('🔧 DEBUG: Frontend loadEvents started');
    console.log('🔧 DEBUG: Token exists:', !!token);
    
    try {
        console.log('🔧 DEBUG: Fetching events from:', `${API_BASE_URL}/events`);
        const response = await fetch(`${API_BASE_URL}/events`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('🔧 DEBUG: Events response status:', response.status);
        const result = await response.json();
        
        console.log('🔧 DEBUG: Events response data:', result);

        if (result.success) {
            const events = result.data;
            console.log('🔧 DEBUG: Events array:', events);
            
            // Display current/most recent event
            if (events.length > 0) {
                const currentEvent = events.find(e => e.status === 'open') || events[0];
                console.log('🔧 DEBUG: Selected current event:', currentEvent);
                displayCurrentEvent(currentEvent);
            } else {
                console.log('🔧 DEBUG: No events found');
            }

            // Display all events list
            displayEventsList(events);
            
            // Populate event select dropdowns
            populateEventSelects();
        } else {
            console.error('🔧 DEBUG: Events API returned error:', result);
        }
    } catch (error) {
        console.error('🔧 DEBUG: Frontend loadEvents error:', error);
    }
}

// ===== SUPERADMIN: Pending Requests =====
async function loadPendingRequests() {
    const token = localStorage.getItem('adminToken');
    const container = document.getElementById('pendingRequestsContainer');
    if (!container) return;
    container.innerHTML = '<p class="empty-state">Loading...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}/admin/pending-requests`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (!result.success) {
            container.innerHTML = `<div class="message error">Error: ${result.message || 'Failed to load'}</div>`;
            console.error('Error loading pending requests:', result.error || result.message);
            return;
        }

        const requests = result.requests || [];
        if (requests.length === 0) {
            container.innerHTML = '<p class="empty-state">No pending requests</p>';
            return;
        }

        container.innerHTML = requests.map(r => `
            <div class="list-item">
                <div class="item-header">
                    <h3>${escapeHtml(r.full_name || r.fullName || '')}</h3>
                    <span class="item-badge">${escapeHtml(r.username)}</span>
                </div>
                <div class="item-details">
                    <span><strong>Email:</strong> ${escapeHtml(r.email)}</span>
                    <span><strong>Submitted:</strong> ${new Date(r.created_at || r.createdAt).toLocaleString()}</span>
                </div>
                <div class="item-actions">
                    <button class="btn btn-small btn-success" onclick="approveRequest('${r.id}')">Approve</button>
                    <button class="btn btn-small btn-danger" onclick="rejectRequest('${r.id}')">Reject</button>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('Error loading pending requests:', err);
        container.innerHTML = `<div class="message error">Error: ${err.message}</div>`;
    }
}

window.approveRequest = async function(requestId) {
    if (!confirm('Approve this admin request?')) return;
    const token = localStorage.getItem('adminToken');
    try {
        const res = await fetch(`${API_BASE_URL}/admin/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ requestId, action: 'approve' })
        });
        const result = await res.json();
        if (result.success) {
            alert('User approved');
            loadPendingRequests();
        } else {
            alert(`Error: ${result.message || result.error}`);
        }
    } catch (err) {
        console.error('Error approving request:', err);
        alert(`Error: ${err.message}`);
    }
}

window.rejectRequest = async function(requestId) {
    if (!confirm('Reject this admin request?')) return;
    const token = localStorage.getItem('adminToken');
    try {
        const res = await fetch(`${API_BASE_URL}/admin/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ requestId, action: 'reject' })
        });
        const result = await res.json();
        if (result.success) {
            alert('User rejected');
            loadPendingRequests();
        } else {
            alert(`Error: ${result.message || result.error}`);
        }
    } catch (err) {
        alert(`Error: ${err.message}`);
    }
}

function displayCurrentEvent(event) {
    console.log('🔧 DEBUG: displayCurrentEvent called with:', event);
    
    const card = document.getElementById('currentEventCard');
    const actions = document.getElementById('eventActionButtons');
    
    console.log('🔧 DEBUG: Found elements:', { card: !!card, actions: !!actions });
    console.log('🔧 DEBUG: Card classes before:', card ? card.className : 'not found');
    
    // Force remove hidden class and make sure card is visible
    if (card) {
        card.classList.remove('hidden');
        card.style.display = 'block';
        console.log('🔧 DEBUG: Card classes after:', card.className);
        console.log('🔧 DEBUG: Card display style:', card.style.display);
    }
    
    document.getElementById('currentEventName').textContent = event.name;
    document.getElementById('currentEventDescription').textContent = event.description || 'No description';
    
    const statusText = event.status === 'winner_announced' ? '🎉 Winner Announced' :
                       event.status === 'open' ? '🎪 Event Open' :
                       event.status === 'closed' ? '🔒 Closed' : '📝 Draft';
    
    console.log('🔧 DEBUG: Event status:', event.status, 'Status text:', statusText);
    
    document.getElementById('currentEventStatus').textContent = statusText;
    document.getElementById('currentEventStatus').className = `event-status-badge ${event.status}`;
    
    // Generate action buttons based on status
    if (actions) {
        actions.innerHTML = '';
        console.log('🔧 DEBUG: Generating buttons for status:', event.status);
        
        if (event.status === 'draft') {
            console.log('🔧 DEBUG: Adding draft status buttons');
            actions.innerHTML = `
                <button class="btn btn-success" onclick="openEvent('${event.id}')">
                    ✨ Open for Voting
                </button>
                <button class="btn btn-danger" onclick="deleteEvent('${event.id}')">
                    🗑️ Delete
                </button>
            `;
        } else if (event.status === 'open') {
            console.log('🔧 DEBUG: Adding open status buttons');
            actions.innerHTML = `
                <button class="btn btn-warning" onclick="closeEvent('${event.id}')">
                    🔒 Close Event
                </button>
            `;
        } else if (event.status === 'closed') {
            console.log('🔧 DEBUG: Adding closed status buttons');
            actions.innerHTML = `
                <button class="btn btn-primary" onclick="showWinnerSelect('${event.id}')">
                    🎯 Announce Winner
                </button>
            `;
        } else if (event.status === 'winner_announced') {
            console.log('🔧 DEBUG: Adding winner_announced status buttons');
            actions.innerHTML = `
                <button class="btn btn-info" onclick="window.location.href='results.html'">
                    📊 View Results
                </button>
                <button class="btn btn-warning" onclick="reopenEvent('${event.id}')">
                    🔄 Reopen Event
                </button>
                <button class="btn btn-danger" onclick="deleteEvent('${event.id}')">
                    🗑️ Delete
                </button>
            `;
        }
        
        console.log('🔧 DEBUG: Final actions HTML:', actions.innerHTML);
        console.log('🔧 DEBUG: Actions container classes:', actions.className);
        console.log('🔧 DEBUG: Actions container style:', actions.style.cssText);
    } else {
        console.error('🔧 DEBUG: Actions container not found!');
    }
    
    // Add a temporary visual indicator for debugging
    setTimeout(() => {
        const visibleCard = document.getElementById('currentEventCard');
        if (visibleCard && visibleCard.offsetParent === null) {
            console.error('🔧 DEBUG: Event card is still hidden! Applying emergency fix...');
            // Force it to be visible with multiple approaches
            visibleCard.style.display = 'block';
            visibleCard.style.visibility = 'visible';
            visibleCard.style.opacity = '1';
            visibleCard.style.position = 'static';
            visibleCard.style.width = 'auto';
            visibleCard.style.height = 'auto';
            visibleCard.classList.remove('hidden');
            visibleCard.classList.add('visible');
            
            // Also check if parent is hidden
            let parent = visibleCard.parentElement;
            while (parent && parent.offsetParent === null) {
                console.log('🔧 DEBUG: Parent element also hidden:', parent);
                parent.style.display = 'block';
                parent.style.visibility = 'visible';
                parent = parent.parentElement;
            }
        } else {
            console.log('🔧 DEBUG: Event card is visible!');
        }
    }, 100);
}

function displayEventsList(events) {
    const list = document.getElementById('eventsList');
    
    if (events.length === 0) {
        list.innerHTML = '<p class="empty-state">No events created yet</p>';
        return;
    }
    
    list.innerHTML = events.map(event => `
        <div class="event-item">
            <div class="event-item-info">
                <h4>${event.name}</h4>
                <p>${event.description}</p>
                <span class="event-status-badge ${event.status}">
                    ${event.status === 'winner_announced' ? '🎉 Winner Announced' :
                      event.status === 'open' ? '🎪 Open' :
                      event.status === 'closed' ? '🔒 Closed' : '📝 Draft'}
                </span>
            </div>
            <div class="event-item-meta">
                <p>Total Votes: <strong>${event.totalVotes || 0}</strong></p>
                ${event.winnerId ? `<p>Winner: <strong>${event.winnerId}</strong></p>` : ''}
            </div>
            <div class="event-item-actions">
                <button class="btn btn-danger" onclick="deleteEvent('${event.id}')">Delete Event</button>
            </div>
        </div>
    `).join('');
}

async function handleCreateEvent(e) {
    e.preventDefault();
    
    const token = localStorage.getItem('adminToken');
    const name = document.getElementById('eventName').value;
    const description = document.getElementById('eventDescription').value;
    
    const messageDiv = document.getElementById('eventMessage');
    
    try {
        const response = await fetch(`${API_BASE_URL}/events`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name,
                description
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            messageDiv.innerHTML = '<div class="message success">✅ Event created successfully!</div>';
            document.getElementById('eventForm').reset();
            setTimeout(() => toggleForm('event-form'), 1500);
            loadEvents();
            populateEventSelects();
        } else {
            messageDiv.innerHTML = `<div class="message error">❌ ${result.error}</div>`;
        }
    } catch (error) {
        messageDiv.innerHTML = `<div class="message error">❌ Error: ${error.message}</div>`;
    }
}

// Populate event select dropdowns in contender and vote forms
async function populateEventSelects() {
    const token = localStorage.getItem('adminToken');
    try {
        const response = await fetch(`${API_BASE_URL}/events`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        
        if (result.success && result.data) {
            const events = result.data;
            const eventOptions = events.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
            
            const contenderSelect = document.getElementById('contenderEventSelect');
            const voteSelect = document.getElementById('voteEventSelect');
            const voteSelectInline = document.getElementById('voteEventSelectInline');
            const pointSelect = document.getElementById('pointEventSelect');
            const awardPointSelect = document.getElementById('awardPointEventSelect');
            const analyticsSelect = document.getElementById('analyticsEventSelect');
            const editPointSelect = document.getElementById('editPointEventSelect');

            if (contenderSelect) {
                contenderSelect.innerHTML = '<option value="">-- Choose an event --</option>' + eventOptions;
            }
            if (voteSelect) {
                voteSelect.innerHTML = '<option value="">-- Choose an event --</option>' + eventOptions;
            }
            if (voteSelectInline) {
                voteSelectInline.innerHTML = '<option value="">-- Choose an event --</option>' + eventOptions;
            }
            if (pointSelect) {
                pointSelect.innerHTML = '<option value="">-- Choose an event --</option>' + eventOptions;
            }
            if (awardPointSelect) {
                awardPointSelect.innerHTML = '<option value="">-- Choose an event --</option>' + eventOptions;
            }
            if (analyticsSelect) {
                analyticsSelect.innerHTML = '<option value="">-- All Events --</option>' + eventOptions;
            }
            if (editPointSelect) {
                editPointSelect.innerHTML = '<option value="">-- Choose an event --</option>' + eventOptions;
            }
        }
    } catch (error) {
        console.error('Error populating event selects:', error);
    }
}

// Update vote table inputs based on selected count
function updateVoteTableInputs() {
    const count = document.getElementById('voteTableCount').value;
    const container = document.getElementById('voteTablePointsContainer');
    container.innerHTML = '';
    
    if (!count) return;
    
    for (let i = 1; i <= parseInt(count); i++) {
        const div = document.createElement('div');
        div.className = 'form-group';
        div.innerHTML = `
            <label for="voteTable${i}Points">Vote Table ${i} - Points Per Vote</label>
            <input type="number" id="voteTable${i}Points" min="1" value="1" required>
        `;
        container.appendChild(div);
    }
}

// Inline variant for Votes panel
function updateVoteTableInputsInline() {
    const count = document.getElementById('voteTableCountInline').value;
    const container = document.getElementById('voteTablePointsContainerInline');
    container.innerHTML = '';
    if (!count) return;
    for (let i = 1; i <= parseInt(count); i++) {
        const div = document.createElement('div');
        div.className = 'form-group';
        div.innerHTML = `
            <label for="voteTableInline${i}Points">Vote Table ${i} - Points Per Vote</label>
            <input type="number" id="voteTableInline${i}Points" min="1" value="1" required>
        `;
        container.appendChild(div);
    }
}

// Handle creating vote tables from inline Votes panel
async function handleCreateVoteTablesInline(e) {
    e.preventDefault();
    const token = localStorage.getItem('adminToken');
    const eventId = document.getElementById('voteEventSelectInline').value;
    const voteTableCount = parseInt(document.getElementById('voteTableCountInline').value);
    const messageDiv = document.getElementById('eventVoteMessage');
    if (!eventId) { showMessage('eventVoteMessage', 'Please select an event!', 'error'); return; }
    if (!voteTableCount) { showMessage('eventVoteMessage', 'Please select number of vote tables!', 'error'); return; }
    const voteTables = [];
    for (let i = 1; i <= voteTableCount; i++) {
        const points = parseInt(document.getElementById(`voteTableInline${i}Points`).value);
        voteTables.push({ tableNumber: i, pointsPerVote: points });
    }
    try {
        const response = await fetch(`${API_BASE_URL}/events/${eventId}/vote-tables`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ voteTables })
        });
        const result = await response.json();
        if (result.success) {
            messageDiv.innerHTML = '<div class="message success">✅ Vote tables created successfully!</div>';
            document.getElementById('eventVoteFormInline').reset();
            document.getElementById('voteTablePointsContainerInline').innerHTML = '';
            loadVoteTablesList();
            populateEventSelects();
        } else {
            messageDiv.innerHTML = `<div class="message error">❌ ${result.error || result.message}</div>`;
        }
    } catch (error) {
        messageDiv.innerHTML = `<div class="message error">❌ Error: ${error.message}</div>`;
    }
}

// Load vote tables for selected event into Votes panel
async function loadVoteTablesList() {
    const select = document.getElementById('voteEventSelectInline') || document.getElementById('voteEventSelect');
    const eventId = select?.value;
    const listDiv = document.getElementById('voteTablesList');
    const deleteBtn = document.getElementById('deleteSelectedEventBtn');
    if (!eventId) {
        listDiv.innerHTML = '<p class="empty-state">Select an event to view its vote tables</p>';
        deleteBtn.style.display = 'none';
        return;
    }
    try {
        const res = await fetch(`${API_BASE_URL}/events/${eventId}/vote-tables`);
        const result = await res.json();
        if (!result.success || !Array.isArray(result.data) || result.data.length === 0) {
            listDiv.innerHTML = '<p class="empty-state">No vote tables configured for this event</p>';
            deleteBtn.style.display = 'inline-block';
            return;
        }
        listDiv.innerHTML = result.data.map(v => `
            <div class="list-item">
                <div class="item-header">
                    <h3>Table ${v.table_number}</h3>
                    <span class="item-badge">${v.points_per_vote} pts</span>
                </div>
                <div class="item-actions">
                    <button class="btn btn-danger" onclick="deleteVoteTable('${v.id}', '${v.event_id}')">Delete Table</button>
                </div>
            </div>
        `).join('');
        deleteBtn.style.display = 'inline-block';
    } catch (err) {
        console.error('Error loading vote tables:', err);
        listDiv.innerHTML = `<div class="message error">Error: ${err.message}</div>`;
        deleteBtn.style.display = 'none';
    }
}

// Delete vote table
async function deleteVoteTable(tableId, eventId) {
    if (!confirm('Delete this vote table?')) return;
    const token = localStorage.getItem('adminToken');
    try {
        const res = await fetch(`${API_BASE_URL}/vote-tables/${tableId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await res.json();
        if (result.success) {
            loadVoteTablesList();
        } else {
            alert('Error deleting vote table: ' + (result.error || result.message));
        }
    } catch (err) {
        alert('Error deleting vote table: ' + err.message);
    }
}

// Delete selected event from Votes panel
async function handleDeleteSelectedEventFromVotes() {
    const select = document.getElementById('voteEventSelectInline') || document.getElementById('voteEventSelect');
    const eventId = select?.value;
    if (!eventId) return alert('No event selected');
    if (!confirm('Delete this event and all its data? This cannot be undone.')) return;
    const token = localStorage.getItem('adminToken');
    try {
        const res = await fetch(`${API_BASE_URL}/events/${eventId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await res.json();
        if (result.success) {
            alert('Event deleted');
            loadEvents();
            populateEventSelects();
            loadVoteTablesList();
        } else {
            alert('Error deleting event: ' + (result.error || result.message));
        }
    } catch (err) {
        alert('Error deleting event: ' + err.message);
    }
}

// Handle creating vote tables
async function handleCreateVoteTables(e) {
    e.preventDefault();
    
    const token = localStorage.getItem('adminToken');
    const eventId = document.getElementById('voteEventSelect').value;
    const voteTableCount = parseInt(document.getElementById('voteTableCount').value);
    
    if (!eventId) {
        showMessage('eventVoteMessage', 'Please select an event!', 'error');
        return;
    }
    
    if (!voteTableCount) {
        showMessage('eventVoteMessage', 'Please select number of vote tables!', 'error');
        return;
    }
    
    const voteTables = [];
    for (let i = 1; i <= voteTableCount; i++) {
        const points = parseInt(document.getElementById(`voteTable${i}Points`).value);
        voteTables.push({
            tableNumber: i,
            pointsPerVote: points
        });
    }
    
    const messageDiv = document.getElementById('eventVoteMessage');
    
    try {
        const response = await fetch(`${API_BASE_URL}/events/${eventId}/vote-tables`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ voteTables })
        });
        
        const result = await response.json();
        
        if (result.success) {
            messageDiv.innerHTML = '<div class="message success">✅ Vote tables created successfully!</div>';
            document.getElementById('eventVoteForm').reset();
            document.getElementById('voteTablePointsContainer').innerHTML = '';
            setTimeout(() => toggleForm('event-vote-form'), 1500);
            loadEvents();
            populateEventSelects();
        } else {
            messageDiv.innerHTML = `<div class="message error">❌ ${result.error || result.message}</div>`;
        }
    } catch (error) {
        messageDiv.innerHTML = `<div class="message error">❌ Error: ${error.message}</div>`;
    }
}

async function openEvent(eventId) {
    const token = localStorage.getItem('adminToken');
    
    try {
        const response = await fetch(`${API_BASE_URL}/events/${eventId}/open`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✨ Event opened for voting!');
            loadEvents();
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function closeEvent(eventId) {
    const token = localStorage.getItem('adminToken');
    
    if (!confirm('Close this event? Voting will stop.')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/events/${eventId}/close`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('🔒 Event closed');
            loadEvents();
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function deleteEvent(eventId) {
    if (!confirm('Delete this event? This will also delete all associated contenders, vote tables, and records. This cannot be undone.')) return;
    
    const token = localStorage.getItem('adminToken');
    
    try {
        const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Remove all contenders associated with this event from dashboardState
            dashboardState.contenders = dashboardState.contenders.filter(c => c.eventId !== eventId);
            localStorage.setItem('contenders', JSON.stringify(dashboardState.contenders));
            
            alert('Event and associated contenders deleted');
            updateDashboardStats();
            loadEvents();
            loadContendersList();
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

async function showWinnerSelect(eventId) {
    const token = localStorage.getItem('adminToken');
    
    try {
        // Show loading state
        const btn = document.querySelector(`[onclick="showWinnerSelect('${eventId}')"]`);
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '🔄 Calculating...';
        }
        
        // Fetch all contenders with their points
        const response = await fetch(`${API_BASE_URL}/events/${eventId}/contenders`);
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to fetch contenders');
        }
        
        const contenders = result.data || [];
        if (contenders.length === 0) {
            throw new Error('No contenders found');
        }
        
        // Calculate winner based on total_points
        let winner = contenders[0];
        let maxPoints = winner.total_points || 0;
        
        for (const contender of contenders) {
            const totalPoints = contender.total_points || 0;
            if (totalPoints > maxPoints) {
                maxPoints = totalPoints;
                winner = contender;
            }
        }
        
        // Show custom winner confirmation modal
        showWinnerConfirmationModal(winner, maxPoints, eventId);
        
    } catch (error) {
        alert(`Error calculating winner: ${error.message}`);
    } finally {
        // Restore button state
        const btn = document.querySelector(`[onclick="showWinnerSelect('${eventId}')"]`);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '🎯 Announce Winner';
        }
    }
}

// Show custom winner confirmation modal
function showWinnerConfirmationModal(winner, maxPoints, eventId) {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease-out;
    `;
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 20px;
        padding: 40px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        animation: slideInUp 0.5s ease-out;
        text-align: center;
    `;
    
    modalContent.innerHTML = `
        <div style="margin-bottom: 30px;">
            <div style="font-size: 60px; margin-bottom: 20px; animation: crownFloat 2s ease-in-out infinite;">🏆</div>
            <h2 style="color: #667eea; margin-bottom: 20px; font-size: 28px;">WINNER CALCULATION</h2>
        </div>
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 15px; margin-bottom: 30px;">
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 15px;">${escapeHtml(winner.name)}</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                <div>
                    <div style="font-size: 12px; opacity: 0.8; margin-bottom: 5px;">CLASS</div>
                    <div style="font-size: 16px; font-weight: 600;">${escapeHtml(winner.class || 'N/A')}</div>
                </div>
                <div>
                    <div style="font-size: 12px; opacity: 0.8; margin-bottom: 5px;">COUNTRY</div>
                    <div style="font-size: 16px; font-weight: 600;">${escapeHtml(winner.country || 'N/A')}</div>
                </div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 14px; opacity: 0.8; margin-bottom: 5px;">TOTAL POINTS</div>
                <div style="font-size: 32px; font-weight: bold; color: #FFD700;">${maxPoints}</div>
            </div>
        </div>
        
        <div style="display: flex; gap: 15px; justify-content: center;">
            <button id="confirmWinnerBtn" style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 15px 30px;
                border-radius: 10px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 600;
                transition: all 0.3s ease;
                box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                🎉 Announce Winner
            </button>
            <button id="cancelWinnerBtn" style="
                background: #f8f9fa;
                color: #666;
                border: 2px solid #e9ecef;
                padding: 15px 30px;
                border-radius: 10px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 600;
                transition: all 0.3s ease;
            " onmouseover="this.style.background='#e9ecef'" onmouseout="this.style.background='#f8f9fa'">
                Cancel
            </button>
        </div>
    `;
    
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    
    // Add event listeners
    document.getElementById('confirmWinnerBtn').addEventListener('click', async () => {
        modalOverlay.remove();
        await announceWinner(eventId, winner.id);
    });
    
    document.getElementById('cancelWinnerBtn').addEventListener('click', () => {
        modalOverlay.remove();
    });
    
    // Close on overlay click
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.remove();
        }
    });
}

async function announceWinner(eventId, winnerId) {
    const token = localStorage.getItem('adminToken');
    
    try {
        const response = await fetch(`${API_BASE_URL}/events/${eventId}/winner`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ winnerId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('🎉 Winner announced!');
            loadEvents();
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

// ===== POINT TABLES & AWARD POINTS =====
// Create a new point table
async function handleCreatePointTable(e) {
    e.preventDefault();
    const token = localStorage.getItem('adminToken');
    const eventId = document.getElementById('pointEventSelect').value;
    const title = document.getElementById('pointTableTitle').value;
    const defaultPoints = parseFloat(document.getElementById('pointTableDefaultPoints').value) || 0;
    const msg = document.getElementById('pointTableMessage');

    if (!eventId || !title.trim()) {
        msg.innerHTML = '<div class="message error">Please fill all required fields</div>';
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/events/${eventId}/point-tables`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ title, defaultPoints })
        });
        const result = await res.json();
        if (result.success) {
            msg.innerHTML = '<div class="message success">✅ Point table created!</div>';
            document.getElementById('pointTableForm').reset();
            setTimeout(() => { msg.innerHTML = ''; }, 2000);
            loadPointTables();
        } else {
            msg.innerHTML = `<div class="message error">❌ ${result.error || result.message}</div>`;
        }
    } catch (err) {
        msg.innerHTML = `<div class="message error">❌ Error: ${err.message}</div>`;
    }
}

// Load and display point tables for selected event
async function loadPointTables() {
    const eventId = document.getElementById('pointEventSelect').value;
    const list = document.getElementById('pointTablesList');
    if (!eventId) {
        list.innerHTML = '<p class="empty-state">Select an event to view its point tables</p>';
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/events/${eventId}/point-tables`);
        const result = await res.json();
        if (!result.success || !Array.isArray(result.data) || result.data.length === 0) {
            list.innerHTML = '<p class="empty-state">No point tables created for this event</p>';
            return;
        }

        // Render as a polished table card
        list.innerHTML = `
            <div class="table-card">
                <div class="table-responsive">
                    <table class="ranking-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th style="text-align:right;">Default Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${result.data.map(pt => `
                                <tr>
                                    <td><strong>${escapeHtml(pt.title)}</strong></td>
                                    <td style="text-align:right;">${formatNumber(pt.default_points)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (err) {
        list.innerHTML = `<div class="message error">Error: ${err.message}</div>`;
    }
}

// Load contenders and point tables for award points section
async function loadContendersForPoints() {
    const eventId = document.getElementById('awardPointEventSelect').value;
    const contenderSelect = document.getElementById('awardPointContenderSelect');
    const pointTableSelect = document.getElementById('awardPointTableSelect');
    const list = document.getElementById('contendersPointsList');

    if (!eventId) {
        contenderSelect.innerHTML = '<option value="">-- Choose a contender --</option>';
        pointTableSelect.innerHTML = '<option value="">-- Choose a point table --</option>';
        list.innerHTML = '<p class="empty-state">Select an event</p>';
        return;
    }

    try {
        // Load contenders
        const cRes = await fetch(`${API_BASE_URL}/events/${eventId}/contenders`);
        const cResult = await cRes.json();
        if (cResult.success && Array.isArray(cResult.data)) {
            const options = cResult.data.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (${c.total_points||0} pts)</option>`).join('');
            contenderSelect.innerHTML = '<option value="">-- Choose a contender --</option>' + options;
            // Render contenders as table
            list.innerHTML = `
                <div class="table-card">
                    <div class="table-responsive">
                        <table class="ranking-table">
                            <thead>
                                <tr>
                                    <th>Contender</th>
                                    <th>Class</th>
                                    <th style="text-align:center;">Total Points</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${cResult.data.map(c => `
                                    <tr>
                                        <td><strong>${escapeHtml(c.name)}</strong><br><small class="muted">${escapeHtml(c.description||'')}</small></td>
                                        <td>${escapeHtml(c.class || 'N/A')}</td>
                                        <td style="text-align:center; font-weight:bold; color:#2ecc71;">${formatNumber(c.total_points || 0)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        // Load point tables
        const ptRes = await fetch(`${API_BASE_URL}/events/${eventId}/point-tables`);
        const ptResult = await ptRes.json();
        if (ptResult.success && Array.isArray(ptResult.data)) {
            const options = ptResult.data.map(pt => `<option value="${pt.id}">${escapeHtml(pt.title)}</option>`).join('');
            pointTableSelect.innerHTML = '<option value="">-- Choose a point table --</option>' + options;
            // If a point table is already selected (e.g. returning from another action), filter contenders
            if (pointTableSelect.value) {
                // give the DOM a tick to update then filter
                setTimeout(() => filterContendersByPointTable(), 0);
            }
        }
    } catch (err) {
        console.error('Error loading contenders/point tables:', err);
    }
}

// Load point tables for award section when event changes
async function loadPointTablesForAward() {
    const eventId = document.getElementById('awardPointEventSelect').value;
    const ptSelect = document.getElementById('awardPointTableSelect');
    if (!eventId) {
        ptSelect.innerHTML = '<option value="">-- Choose a point table --</option>';
        dashboardState.pointTableValues = {};
        calculateTotalPoints();
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/events/${eventId}/point-tables`);
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
            // Store default_points for each point table
            dashboardState.pointTableValues = {};
            for (const pt of result.data) {
                dashboardState.pointTableValues[pt.id] = pt.default_points || 1;
            }
            
            const options = result.data.map(pt => `<option value="${pt.id}">${escapeHtml(pt.title)} (${pt.default_points || 1} pts)</option>`).join('');
            ptSelect.innerHTML = '<option value="">-- Choose a point table --</option>' + options;
            loadContendersForPoints();
            calculateTotalPoints();
        }
    } catch (err) {
        console.error('Error loading point tables:', err);
    }
}

// Calculate and display total points (multiplier × table default_points)
function calculateTotalPoints() {
    const pointTableId = document.getElementById('awardPointTableSelect')?.value;
    const multiplier = parseFloat(document.getElementById('awardPointAmount')?.value) || 1;
    
    const defaultPoints = dashboardState.pointTableValues[pointTableId] || 0;
    const total = defaultPoints * multiplier;
    
    // Update display
    const ptValueEl = document.getElementById('pointTableValue');
    const multiplierEl = document.getElementById('multiplierValue');
    const totalEl = document.getElementById('totalPointsDisplay');
    
    if (ptValueEl) ptValueEl.textContent = defaultPoints > 0 ? formatNumber(defaultPoints) : '-';
    if (multiplierEl) multiplierEl.textContent = formatNumber(multiplier);
    if (totalEl) totalEl.textContent = defaultPoints > 0 ? formatNumber(total) : '-';
}

function formatNumber(n) {
    if (n === null || n === undefined || Number.isNaN(n)) return '-';
    const num = Number(n);
    if (!Number.isFinite(num)) return '-';
    if (Number.isInteger(num)) return num.toString();
    // Show up to 4 decimals but trim trailing zeros
    return num.toFixed(4).replace(/\.0+$|(?:(\.[0-9]*?)0+$)/, '$1');
}

// Load and display point ranking in Analytics
async function loadPointRanking() {
    const eventId = document.getElementById('analyticsEventSelect').value;
    const rankingBody = document.getElementById('pointRankingBody');
    rankingBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#999;">Loading...</td></tr>';

    try {
        const token = localStorage.getItem('adminToken');
        
        // Get events to fetch contenders from
        let eventsToCheck = [];
        if (eventId) {
            eventsToCheck = [eventId];
        } else {
            // Get all events
            const eventsRes = await fetch(`${API_BASE_URL}/events`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const eventsResult = await eventsRes.json();
            eventsToCheck = (eventsResult.success && Array.isArray(eventsResult.data)) 
                ? eventsResult.data.map(e => e.id)
                : [];
        }

        if (eventsToCheck.length === 0) {
            rankingBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#999;">No events found</td></tr>';
            return;
        }

        // Fetch all contenders and their point records
        let allContenders = [];
        for (const eid of eventsToCheck) {
            try {
                const res = await fetch(`${API_BASE_URL}/events/${eid}/contenders`);
                const result = await res.json();
                if (result.success && Array.isArray(result.data)) {
                    allContenders = allContenders.concat(result.data.map(c => ({ ...c, event_id: eid })));
                }
            } catch (err) {
                console.error(`Error fetching contenders for event ${eid}:`, err);
            }
        }

        if (allContenders.length === 0) {
            rankingBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#999;">No contenders found</td></tr>';
            return;
        }

        // Fetch point records and vote records for each contender
        const contendersWithBreakdown = [];
        for (const contender of allContenders) {
            try {
                // Fetch admin-awarded point records
                const recordsRes = await fetch(`${API_BASE_URL}/events/${contender.event_id}/contenders/${contender.id}/point-records`);
                const recordsResult = await recordsRes.json();
                const adminRecords = (recordsResult.success && Array.isArray(recordsResult.data)) ? recordsResult.data : [];

                // Fetch vote records
                const voteTablesRes = await fetch(`${API_BASE_URL}/events/${contender.event_id}/vote-tables`);
                const voteTablesResult = await voteTablesRes.json();
                const voteTables = (voteTablesResult.success && Array.isArray(voteTablesResult.data)) ? voteTablesResult.data : [];

                // Get vote records for this contender
                const votesRes = await fetch(`${API_BASE_URL}/events/${contender.event_id}/contenders/${contender.id}/votes`);
                let voteRecords = [];
                try {
                    const voteResult = await votesRes.json();
                    voteRecords = (voteResult.success && Array.isArray(voteResult.data)) ? voteResult.data : [];
                } catch (err) {
                    // If votes endpoint doesn't exist, we'll skip vote records
                    console.log('Vote records endpoint not available, skipping...');
                }

                // Fetch all point tables for this event to get titles
                const pointTablesRes = await fetch(`${API_BASE_URL}/events/${contender.event_id}/point-tables`);
                const pointTablesResult = await pointTablesRes.json();
                const pointTables = (pointTablesResult.success && Array.isArray(pointTablesResult.data)) ? pointTablesResult.data : [];

                // Create a map of point table id to title
                const pointTableMap = {};
                for (const pt of pointTables) {
                    pointTableMap[pt.id] = pt.title;
                }

                // Group admin points by point_table_id with title
                const pointsByTable = {};
                for (const rec of adminRecords) {
                    const key = rec.point_table_id || 'unknown';
                    if (!pointsByTable[key]) {
                        pointsByTable[key] = { 
                            id: rec.point_table_id, 
                            title: pointTableMap[rec.point_table_id] || 'Unknown Type',
                            points: 0 
                        };
                    }
                    pointsByTable[key].points += rec.points_awarded;
                }

                // Add vote points
                let totalVotePoints = 0;
                const votePointsByTable = {};
                
                for (const vote of voteRecords) {
                    const voteTable = voteTables.find(vt => vt.id === vote.vote_table_id);
                    if (voteTable) {
                        const votePoints = voteTable.points_per_vote || 0;
                        totalVotePoints += votePoints;
                        
                        const key = `vote_${vote.vote_table_id}`;
                        if (!votePointsByTable[key]) {
                            votePointsByTable[key] = {
                                id: vote.vote_table_id,
                                title: `Votes (${voteTable.table_number || 'Table'})`,
                                points: 0
                            };
                        }
                        votePointsByTable[key].points += votePoints;
                    }
                }

                // Add vote points to the breakdown
                Object.assign(pointsByTable, votePointsByTable);

                // Calculate total points (admin points + vote points)
                const adminTotal = Object.values(pointsByTable).reduce((sum, pt) => {
                    // Only count admin points (not vote points)
                    return sum + (pt.title.includes('Votes') ? 0 : pt.points);
                }, 0);
                const totalPoints = adminTotal + totalVotePoints;

                contendersWithBreakdown.push({
                    ...contender,
                    total_points: totalPoints,
                    pointsByTable: Object.values(pointsByTable)
                });
            } catch (err) {
                console.error(`Error fetching records for contender ${contender.id}:`, err);
                contendersWithBreakdown.push({
                    ...contender,
                    total_points: contender.total_points || 0,
                    pointsByTable: []
                });
            }
        }

        // Sort by total_points descending
        contendersWithBreakdown.sort((a, b) => (b.total_points || 0) - (a.total_points || 0));

        // Display ranking table
        if (contendersWithBreakdown.length === 0) {
            rankingBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#999;">No contenders with points</td></tr>';
            return;
        }

        rankingBody.innerHTML = contendersWithBreakdown.map((contender, index) => `
            <tr style="${index % 2 === 0 ? 'background-color:#f9f9f9;' : ''}">
                <td style="padding:10px; border-bottom: 1px solid #ddd; font-weight:bold; font-size:18px;">#${index + 1}</td>
                <td style="padding:10px; border-bottom: 1px solid #ddd;">
                    <strong>${escapeHtml(contender.name || 'N/A')}</strong>
                    <br><small style="color:#666;">${escapeHtml(contender.class || '')} ${escapeHtml(contender.country || '')}</small>
                </td>
                <td style="padding:10px; border-bottom: 1px solid #ddd; text-align:center; font-size:20px; font-weight:bold; color:#2ecc71;">
                    ${contender.total_points || 0}
                </td>
                <td style="padding:10px; border-bottom: 1px solid #ddd; font-size:12px;">
                    ${contender.pointsByTable.length > 0 
                        ? contender.pointsByTable.map((pt, idx) => `<span style="display:inline-block; margin-right:5px; margin-bottom:3px; background:#e0e0e0; padding:3px 6px; border-radius:3px;">${pt.points || 0} pts (${escapeHtml(pt.title || 'Unknown')})</span>`).join('')
                        : '<em style="color:#999;">No point records</em>'
                    }
                </td>
            </tr>
        `).join('');

        // Populate Top Contenders section (show top 5)
        populateTopContenders(contendersWithBreakdown.slice(0, 5));

    } catch (err) {
        console.error('Error loading point ranking:', err);
        rankingBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:#d32f2f;">Error: ${err.message}</td></tr>`;
    }
}

// Populate Top Contenders section
function populateTopContenders(topContenders) {
    const topContendersDiv = document.getElementById('topContenders');
    
    if (!topContenders || topContenders.length === 0) {
        topContendersDiv.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">No contenders with points found</p>';
        return;
    }

    const topContendersHTML = topContenders.map((contender, index) => {
        const totalPoints = contender.total_points || 0;
        const pointsBreakdown = contender.pointsByTable || [];
        
        return `
            <div class="top-contender-card" style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                margin: 10px 0;
                border-radius: 12px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                display: flex;
                align-items: center;
                gap: 20px;
                transition: transform 0.3s ease, box-shadow 0.3s ease;
            " onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 8px 25px rgba(0,0,0,0.2)'" 
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.1)'">
                
                <div style="
                    font-size: 36px;
                    font-weight: bold;
                    min-width: 60px;
                    text-align: center;
                    opacity: 0.9;
                ">
                    #${index + 1}
                </div>
                
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600;">
                        ${escapeHtml(contender.name || 'N/A')}
                    </h4>
                    <p style="margin: 0 0 10px 0; opacity: 0.9; font-size: 14px;">
                        ${escapeHtml(contender.class || '')} ${escapeHtml(contender.country || '')}
                    </p>
                    <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                        ${pointsBreakdown.map(pt => `
                            <span style="
                                background: rgba(255,255,255,0.2);
                                padding: 4px 8px;
                                border-radius: 12px;
                                font-size: 12px;
                                font-weight: 500;
                            ">
                                ${pt.points || 0} pts (${escapeHtml(pt.title || 'Unknown')})
                            </span>
                        `).join('')}
                    </div>
                </div>
                
                <div style="
                    text-align: center;
                    background: rgba(255,255,255,0.2);
                    padding: 15px 20px;
                    border-radius: 8px;
                    min-width: 100px;
                ">
                    <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">
                        ${totalPoints}
                    </div>
                    <div style="font-size: 12px; opacity: 0.9;">
                        TOTAL POINTS
                    </div>
                </div>
            </div>
        `;
    }).join('');

    topContendersDiv.innerHTML = topContendersHTML;
}


async function filterAvailablePointTables() {
    const eventId = document.getElementById('awardPointEventSelect').value;
    const contenderId = document.getElementById('awardPointContenderSelect').value;
    const ptSelect = document.getElementById('awardPointTableSelect');

    if (!eventId || !contenderId) {
        ptSelect.innerHTML = '<option value="">-- Choose a point table --</option>';
        return;
    }

    try {
        // Only fetch awarded records for this contender. Do NOT re-write the entire point-table select,
        // instead disable already-awarded options so we preserve the current selection.
        const recordsRes = await fetch(`${API_BASE_URL}/events/${eventId}/contenders/${contenderId}/point-records`);
        const recordsResult = await recordsRes.json();
        console.debug('filterAvailablePointTables: awarded records', recordsResult);
        const awardedRecords = (recordsResult.success && Array.isArray(recordsResult.data)) ? recordsResult.data : [];
        const awardedPointTableIds = awardedRecords.map(r => r.point_table_id);

        // Preserve existing options and disable those already awarded
        const opts = Array.from(ptSelect.options);
        let anyAvailable = false;
        for (const opt of opts) {
            if (!opt.value) continue; // skip placeholder
            if (awardedPointTableIds.includes(opt.value)) {
                opt.disabled = true;
                if (!/\(awarded\)$/.test(opt.text)) opt.text = opt.text + ' (awarded)';
            } else {
                opt.disabled = false;
                opt.text = opt.text.replace(/ \(awarded\)$/, '');
                anyAvailable = true;
            }
        }

        if (!anyAvailable) {
            // keep the options but select placeholder to indicate none available
            ptSelect.selectedIndex = 0;
            if (!ptSelect.options[0]) ptSelect.innerHTML = '<option value="">✓ All point tables already awarded</option>';
        }
    } catch (err) {
        console.error('Error filtering available point tables:', err);
        ptSelect.innerHTML = '<option value="">-- Error loading --</option>';
    }
}

// Award points to a contender
async function handleAwardPoints(e) {
    e.preventDefault();
    const token = localStorage.getItem('adminToken');
    const eventId = document.getElementById('awardPointEventSelect').value;
    const contenderId = document.getElementById('awardPointContenderSelect').value;
    const pointTableId = document.getElementById('awardPointTableSelect').value;
    const multiplier = parseFloat(document.getElementById('awardPointAmount').value) || 1;
    const msg = document.getElementById('awardPointsMessage');

    if (!eventId || !contenderId || !pointTableId || multiplier < 1) {
        msg.innerHTML = '<div class="message error">Please fill all fields</div>';
        return;
    }

    // Calculate actual points: default_points × multiplier
    const defaultPoints = dashboardState.pointTableValues[pointTableId] || 1;
    const totalPoints = defaultPoints * multiplier;

    try {
        const res = await fetch(`${API_BASE_URL}/events/${eventId}/contenders/${contenderId}/points`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ pointTableId, points: totalPoints })
        });
        const result = await res.json();
            if (result.success) {
                msg.innerHTML = `<div class="message success">✅ ${formatNumber(totalPoints)} points awarded! (${formatNumber(defaultPoints)} × ${formatNumber(multiplier)})</div>`;
                document.getElementById('awardPointsFormElement').reset();
                setTimeout(() => { msg.innerHTML = ''; }, 2000);
                // reload lists and re-run filtering so the awarded contender is removed
                await loadContendersForPoints();
                calculateTotalPoints();
                filterContendersByPointTable();
        } else {
            msg.innerHTML = `<div class="message error">❌ ${result.error || result.message}</div>`;
        }
    } catch (err) {
        msg.innerHTML = `<div class="message error">❌ Error: ${err.message}</div>`;
    }
}

// Filter contenders based on selected point table (exclude those already awarded)
async function filterContendersByPointTable() {
    const eventId = document.getElementById('awardPointEventSelect').value;
    const pointTableId = document.getElementById('awardPointTableSelect').value;
    const contenderSelect = document.getElementById('awardPointContenderSelect');

    if (!eventId || !pointTableId) {
        contenderSelect.innerHTML = '<option value="">-- Choose a contender --</option>';
        return;
    }

    try {
        // Fetch all contenders
        const contRes = await fetch(`${API_BASE_URL}/events/${eventId}/contenders`);
        const contResult = await contRes.json();
        console.debug('filterContendersByPointTable: all contenders', contResult);
        const allContenders = (contResult.success && Array.isArray(contResult.data)) ? contResult.data : [];

        // Fetch all awards for this point table
        const awardsRes = await fetch(`${API_BASE_URL}/events/${eventId}/point-table/${pointTableId}/awards`);
        const awardsResult = await awardsRes.json();
        console.debug('filterContendersByPointTable: awards for table', awardsResult);
        const existingAwards = (awardsResult.success && Array.isArray(awardsResult.data)) ? awardsResult.data : [];
        const awardedContenderIds = existingAwards.map(a => a.contender_id);

        // Filter contenders to exclude those already awarded
        const availableContenders = allContenders.filter(c => !awardedContenderIds.includes(c.id));

        if (availableContenders.length === 0) {
            contenderSelect.innerHTML = '<option value="">✓ All contenders already awarded this point table</option>';
        } else {
            const options = availableContenders.map(c => `<option value="${c.id}">${escapeHtml(c.name || 'N/A')}</option>`).join('');
            contenderSelect.innerHTML = '<option value="">-- Choose a contender --</option>' + options;
        }
    } catch (err) {
        console.error('Error filtering contenders by point table:', err);
    }
}

// Load point tables for edit section
async function loadPointTablesForEditSelect() {
    const eventId = document.getElementById('editPointEventSelect').value;
    const ptSelect = document.getElementById('editPointTableSelect');
    if (!eventId) {
        ptSelect.innerHTML = '<option value="">-- All Point Tables --</option>';
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/events/${eventId}/point-tables`);
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
            const options = result.data.map(pt => `<option value="${pt.id}">${escapeHtml(pt.title)}</option>`).join('');
            ptSelect.innerHTML = '<option value="">-- All Point Tables --</option>' + options;
        }
    } catch (err) {
        console.error('Error loading point tables for edit:', err);
    }
}

// Load point awards for editing/deleting
async function loadPointAwardsForEdit() {
    const eventId = document.getElementById('editPointEventSelect').value;
    const pointTableId = document.getElementById('editPointTableSelect').value;
    const container = document.getElementById('pointAwardsListForEdit');

    if (!eventId) {
        container.innerHTML = '<p class="empty-state">Select an event to view awards</p>';
        return;
    }

    container.innerHTML = '<p class="empty-state">Loading...</p>';

    try {
        // Fetch all point tables if no specific table selected
        let pointTables = [];
        if (!pointTableId) {
            const ptRes = await fetch(`${API_BASE_URL}/events/${eventId}/point-tables`);
            const ptResult = await ptRes.json();
            pointTables = (ptResult.success && Array.isArray(ptResult.data)) ? ptResult.data : [];
        }

        // Fetch all contenders
        const contRes = await fetch(`${API_BASE_URL}/events/${eventId}/contenders`);
        const contResult = await contRes.json();
        const contenders = (contResult.success && Array.isArray(contResult.data)) ? contResult.data : [];
        const contenderMap = {};
        for (const c of contenders) {
            contenderMap[c.id] = c;
        }

        // Fetch awards (for all tables or specific table)
        let allAwards = [];
        if (pointTableId) {
            const awardsRes = await fetch(`${API_BASE_URL}/events/${eventId}/point-table/${pointTableId}/awards`);
            const awardsResult = await awardsRes.json();
            allAwards = (awardsResult.success && Array.isArray(awardsResult.data)) ? awardsResult.data : [];
        } else {
            // Get awards from all point tables
            for (const pt of pointTables) {
                try {
                    const awardsRes = await fetch(`${API_BASE_URL}/events/${eventId}/point-table/${pt.id}/awards`);
                    const awardsResult = await awardsRes.json();
                    if (awardsResult.success && Array.isArray(awardsResult.data)) {
                        allAwards = allAwards.concat(awardsResult.data.map(a => ({ ...a, point_table_title: pt.title })));
                    }
                } catch (err) {
                    console.error('Error fetching awards for point table:', err);
                }
            }
        }

        if (allAwards.length === 0) {
            container.innerHTML = '<p class="empty-state">No point awards found</p>';
            return;
        }

        // Group by contender
        const awardsByContender = {};
        for (const award of allAwards) {
            const contenderId = award.contender_id;
            if (!awardsByContender[contenderId]) {
                awardsByContender[contenderId] = [];
            }
            awardsByContender[contenderId].push(award);
        }

        // Render awards as a table grouped by contender
        let rows = '';
        for (const [contenderId, awards] of Object.entries(awardsByContender)) {
            const contender = contenderMap[contenderId];
            if (!contender) continue;

            for (const award of awards) {
                rows += `
                    <tr>
                        <td>${escapeHtml(contender.name || 'N/A')}</td>
                        <td>${escapeHtml(award.point_table_title || 'Unknown')}</td>
                        <td style="text-align:center; color:#2ecc71; font-weight:bold;">${formatNumber(award.points_awarded)}</td>
                        <td style="text-align:right;">
                            <div class="row-actions">
                                <button class="btn btn-small btn-warning" onclick="editPointRecord('${award.id}', ${award.points_awarded}, '${award.point_table_title}', '${contenderId}', '${eventId}')">Edit</button>
                                <button class="btn btn-small btn-danger" onclick="deletePointRecord('${award.id}', '${contenderId}', '${eventId}')">Delete</button>
                            </div>
                        </td>
                    </tr>
                `;
            }
        }

        container.innerHTML = `
            <div class="table-card">
                <div class="table-responsive">
                    <table class="ranking-table">
                        <thead>
                            <tr>
                                <th>Contender</th>
                                <th>Point Table</th>
                                <th style="text-align:center;">Points</th>
                                <th style="text-align:right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (err) {
        console.error('Error loading point awards:', err);
        container.innerHTML = `<p class="empty-state" style="color:#d32f2f;">Error: ${err.message}</p>`;
    }
}

// Edit point record
async function editPointRecord(recordId, currentPoints, tableTitle, contenderId, eventId) {
    const newPoints = prompt(`Edit points for ${tableTitle}:\n\nCurrent: ${currentPoints}\n\nEnter new points:`, currentPoints);
    if (newPoints === null || newPoints === '') return;

    const token = localStorage.getItem('adminToken');
    const msg = document.getElementById('editPointsMessage');

    try {
        const res = await fetch(`${API_BASE_URL}/events/${eventId}/contenders/${contenderId}/point-records/${recordId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ points_awarded: parseFloat(newPoints) })
        });
        const result = await res.json();
        if (result.success) {
            msg.innerHTML = `<div class="message success">✅ Points updated!</div>`;
            setTimeout(() => { msg.innerHTML = ''; }, 2000);
            loadPointAwardsForEdit();
        } else {
            msg.innerHTML = `<div class="message error">❌ ${result.error || result.message}</div>`;
        }
    } catch (err) {
        msg.innerHTML = `<div class="message error">❌ Error: ${err.message}</div>`;
    }
}

// Delete point record
async function deletePointRecord(recordId, contenderId, eventId) {
    if (!confirm('Are you sure you want to delete this point award?')) return;

    const token = localStorage.getItem('adminToken');
    const msg = document.getElementById('editPointsMessage');

    try {
        const res = await fetch(`${API_BASE_URL}/events/${eventId}/contenders/${contenderId}/point-records/${recordId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await res.json();
        if (result.success) {
            msg.innerHTML = `<div class="message success">✅ Point award deleted!</div>`;
            setTimeout(() => { msg.innerHTML = ''; }, 2000);
            loadPointAwardsForEdit();
        } else {
            msg.innerHTML = `<div class="message error">❌ ${result.error || result.message}</div>`;
        }
    } catch (err) {
        msg.innerHTML = `<div class="message error">❌ Error: ${err.message}</div>`;
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = 'admin-login.html';
    }
}

// Past Winner Image Preview Functions
function previewPastWinnerImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('pastWinnerImagePreview');
            const img = preview.querySelector('img');
            img.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function removePastWinnerImage() {
    const input = document.getElementById('pastWinnerPicture');
    const preview = document.getElementById('pastWinnerImagePreview');
    input.value = '';
    preview.style.display = 'none';
    preview.querySelector('img').src = '';
}

// ===== PAST WINNERS MANAGEMENT =====
async function loadPastWinnersList() {
    const listDiv = document.getElementById('pastWinnersList');
    if (!listDiv) return;

    try {
        const res = await fetch(`${API_BASE_URL}/admin/past-winners`);
        const result = await res.json();

        if (!result.success || !result.data || result.data.length === 0) {
            listDiv.innerHTML = '<p class="empty-state">No past winners found</p>';
            return;
        }

        listDiv.innerHTML = result.data.map((winner, index) => `
            <div class="list-item">
                <div class="item-header" style="display:flex; align-items:center; gap:12px;">
                    <div style="width:64px; height:64px; border-radius:50%; overflow:hidden; background:linear-gradient(135deg, #FFD700, #FFA500); display:flex; align-items:center; justify-content:center; font-size:24px;">
                        ${winner.winner_picture ? `<img src="${escapeHtml(winner.winner_picture)}" style="width:100%; height:100%; object-fit:cover;"/>` : '🏆'}
                    </div>
                    <div style="flex:1;">
                        <h3 style="margin:0">${escapeHtml(winner.winner_name)}</h3>
                        <div style="color:#777; font-size:0.9em;">${escapeHtml(winner.event_name)}</div>
                    </div>
                    <span class="item-badge" style="background: linear-gradient(135deg, #FFD700, #FFA500);">${winner.winner_points || 0} pts</span>
                </div>
                <div class="item-details">
                    <span><strong>Class:</strong> ${escapeHtml(winner.winner_class) || 'N/A'}</span>
                    <span><strong>Country:</strong> ${escapeHtml(winner.winner_country) || 'N/A'}</span>
                    <span><strong>Date:</strong> ${new Date(winner.ended_at || winner.updated_at).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error loading past winners:', err);
        listDiv.innerHTML = '<p class="empty-state">Error loading past winners</p>';
    }
}

async function handleAddPastWinner(e) {
    e.preventDefault();
    const token = localStorage.getItem('adminToken');
    const msgDiv = document.getElementById('pastWinnerMessage');
    const saveBtn = e.target.querySelector('button[type="submit"]');
    
    try {
        // Disable button and show loading
        saveBtn.disabled = true;
        saveBtn.textContent = 'Adding...';
        
        // Get form data
        const formData = new FormData(e.target);
        const pictureFile = document.getElementById('pastWinnerPicture').files[0];
        
        let pictureUrl = '';
        
        // Upload picture if provided
        if (pictureFile) {
            const uploadFormData = new FormData();
            uploadFormData.append('image', pictureFile);
            
            const uploadResponse = await fetch(`${API_BASE_URL}/admin/past-winners/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: uploadFormData
            });
            
            const uploadResult = await uploadResponse.json();
            if (!uploadResult.success) {
                throw new Error(uploadResult.error || 'Failed to upload picture');
            }
            pictureUrl = uploadResult.url;
        }
        
        // Prepare winner data
        const winnerData = {
            name: formData.get('name'),
            event_name: formData.get('event_name'),
            class: formData.get('class'),
            country: formData.get('country'),
            points: parseFloat(formData.get('points')) || 0,
            date: formData.get('date'),
            picture: pictureUrl,
            video: formData.get('video')
        };

        // Add past winner
        const response = await fetch(`${API_BASE_URL}/admin/past-winners`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(winnerData)
        });
        
        const result = await response.json();

        if (result.success) {
            msgDiv.innerHTML = '<div class="message success">✅ Past winner added successfully!</div>';
            document.getElementById('pastWinnerForm').reset();
            
            // Clear image preview
            document.getElementById('pastWinnerImagePreview').style.display = 'none';
            document.getElementById('pastWinnerImagePreview').querySelector('img').src = '';
            
            setTimeout(() => {
                toggleForm('add-past-winner-form');
                loadPastWinnersList();
            }, 1500);
        } else {
            msgDiv.innerHTML = `<div class="message error">❌ ${result.error || result.message}</div>`;
        }
    } catch (err) {
        msgDiv.innerHTML = `<div class="message error">❌ Error: ${err.message}</div>`;
    } finally {
        // Re-enable button
        saveBtn.disabled = false;
        saveBtn.textContent = 'Add Past Winner';
    }
}

// ===== HALL OF FAME MANAGEMENT =====
// Helper to normalize league names (matching bot logic)
function normalizeLeague(name) {
    if (!name) return 'Unknown League';
    // Remove "season", "season X", "1", "2" etc at the end
    return name
        .toLowerCase()
        .replace(/season\s*\d+/i, '')
        .replace(/\d+$/, '')
        .trim()
        .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letters
}

async function loadHallOfFameList() {
    const listDiv = document.getElementById('hallOfFameList');
    if (!listDiv) return;

    try {
        const res = await fetch(`${API_BASE_URL}/admin/hall-of-fame-web`);
        const result = await res.json();

        if (!result.success || !result.data || Object.keys(result.data).length === 0) {
            listDiv.innerHTML = '<p class="empty-state">No Hall of Fame entries yet</p>';
            return;
        }

        let html = '';
        
        // Loop through leagues
        for (const [leagueName, players] of Object.entries(result.data)) {
            html += `
                <div style="margin-bottom: 40px; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px 25px;">
                        <h3 style="margin: 0; font-size: 22px; display: flex; align-items: center; gap: 10px;">
                            🏆 ${escapeHtml(leagueName)}
                        </h3>
                    </div>
                    <div style="padding: 20px;">
            `;
            
            // Loop through players in this league
            for (const [playerName, playerData] of Object.entries(players)) {
                const winCount = playerData.wins.length;
                
                html += `
                    <div style="margin-bottom: 20px; padding: 20px; background: #f8f9fa; border-radius: 12px; border-left: 4px solid #FFD700;">
                        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                            ${playerData.player_image ? 
                                `<img src="${escapeHtml(playerData.player_image)}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 3px solid #FFD700;" />` :
                                `<div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #FFD700, #FFA500); display: flex; align-items: center; justify-content: center; font-size: 24px;">👤</div>`
                            }
                            <div style="flex: 1;">
                                <h4 style="margin: 0; font-size: 18px; color: #333;">${escapeHtml(playerName)}</h4>
                                <span style="background: #FFD700; color: #333; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                                    ${winCount}x Winner
                                </span>
                            </div>
                            <button onclick="openEditHallOfFameModal('${playerData.wins[0]?.id || ''}', '${escapeHtml(playerName)}', '${escapeHtml(leagueName)}', '${escapeHtml(playerData.player_image || '')}', '${escapeHtml(playerData.wins[0]?.team_name || '')}', '${playerData.wins[0]?.season || ''}', '${escapeHtml(playerData.wins[0]?.team_logo || '')}')" class="btn btn-small btn-primary">✏️ Edit Player</button>
                        </div>
                        
                        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                            ${playerData.wins.map(win => `
                                <div style="display: flex; align-items: center; gap: 8px; background: white; padding: 10px 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                                    ${win.team_logo ? 
                                        `<img src="${escapeHtml(win.team_logo)}" style="width: 30px; height: 30px; object-fit: contain;" />` :
                                        `<div style="width: 30px; height: 30px; background: #ddd; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">⚽</div>`
                                    }
                                    <div>
                                        <div style="font-weight: 600; font-size: 13px;">${escapeHtml(win.team_name)}</div>
                                        <div style="font-size: 11px; color: #666;">Season ${win.season}</div>
                                    </div>
                                    <button onclick="deleteHallOfFameEntry('${win.id}')" style="background: #ff4444; color: white; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 12px; margin-left: 5px;">×</button>
                                    <button onclick="openEditHallOfFameModal('${win.id}', '${escapeHtml(playerName)}', '${escapeHtml(leagueName)}', '${escapeHtml(playerData.player_image || '')}', '${escapeHtml(win.team_name)}', '${win.season}', '${escapeHtml(win.team_logo || '')}')" style="background: #667eea; color: white; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 12px; margin-left: 5px;">✏️</button>
                                    <button onclick="resendHallOfFameEmail('${win.id}')" style="background: #28a745; color: white; border: none; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 12px; margin-left: 5px;" title="Resend Hall of Fame Email">📧</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
            
            html += '</div></div>';
        }

        listDiv.innerHTML = html;
    } catch (err) {
        console.error('Error loading Hall of Fame:', err);
        listDiv.innerHTML = '<p class="empty-state">Error loading Hall of Fame</p>';
    }
}

// Edit Hall of Fame entry
async function editHallOfFameEntry(playerName, league) {
    const newTeam = prompt(`Edit ${playerName}'s team in ${league}:\nEnter new team name:`);
    if (!newTeam) return;
    
    const newSeason = prompt('Enter season number:');
    if (!newSeason) return;
    
    const newLogo = prompt('Enter team logo URL (optional):');
    
    // For now, we'll add a new entry. To properly edit, we'd need the entry ID
    // This is a simplified version - you may want to implement a modal for better UX
    alert('To edit existing entries, please delete the old entry and add a new one with updated information.');
}

// Delete Hall of Fame entry
async function deleteHallOfFameEntry(entryId) {
    if (!confirm('Are you sure you want to delete this Hall of Fame entry?')) return;
    
    const token = localStorage.getItem('adminToken');
    
    try {
        const res = await fetch(`${API_BASE_URL}/admin/hall-of-fame-web/${entryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await res.json();
        
        if (result.success) {
            alert('Entry deleted successfully');
            loadHallOfFameList();
        } else {
            alert('Error: ' + (result.error || result.message));
        }
    } catch (err) {
        alert('Error deleting entry: ' + err.message);
    }
}

async function handleAddHallOfFame(e) {
    e.preventDefault();
    const token = localStorage.getItem('adminToken');
    const msgDiv = document.getElementById('hallOfFameMessage');
    
    msgDiv.innerHTML = '<div class="message">⏳ Uploading images...</div>';

    try {
        // Upload team logo if selected
        let teamLogoUrl = '';
        const teamLogoFile = document.getElementById('hofTeamLogo').files[0];
        if (teamLogoFile) {
            const logoFormData = new FormData();
            logoFormData.append('image', teamLogoFile);
            
            const logoRes = await fetch(`${API_BASE_URL}/admin/hall-of-fame-web/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: logoFormData
            });
            
            const logoResult = await logoRes.json();
            if (logoResult.success) {
                teamLogoUrl = logoResult.url;
            }
        }

        // Upload player image if selected
        let playerImageUrl = '';
        const playerImageFile = document.getElementById('hofPlayerImage').files[0];
        if (playerImageFile) {
            const imageFormData = new FormData();
            imageFormData.append('image', playerImageFile);
            
            const imageRes = await fetch(`${API_BASE_URL}/admin/hall-of-fame-web/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: imageFormData
            });
            
            const imageResult = await imageRes.json();
            if (imageResult.success) {
                playerImageUrl = imageResult.url;
            }
        }

        // Now submit the Hall of Fame entry
        const hofData = {
            player_name: document.getElementById('hofPlayerName').value,
            league: document.getElementById('hofLeague').value,
            team_name: document.getElementById('hofTeam').value,
            season: parseInt(document.getElementById('hofSeason').value) || 1,
            team_logo: teamLogoUrl,
            player_image: playerImageUrl,
            email: document.getElementById('hofEmail').value || '',
            phone: document.getElementById('hofPhone').value || ''
        };

        const res = await fetch(`${API_BASE_URL}/admin/hall-of-fame-web`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(hofData)
        });

        const result = await res.json();

        if (result.success) {
            msgDiv.innerHTML = '<div class="message success">✅ Hall of Fame entry added!</div>';
            document.getElementById('hallOfFameForm').reset();
            document.getElementById('teamLogoPreview').style.display = 'none';
            document.getElementById('playerImagePreview').style.display = 'none';
            setTimeout(() => {
                toggleForm('add-hall-of-fame-form');
                loadHallOfFameList();
            }, 1500);
        } else {
            msgDiv.innerHTML = `<div class="message error">❌ ${result.error || result.message}</div>`;
        }
    } catch (err) {
        msgDiv.innerHTML = `<div class="message error">❌ Error: ${err.message}</div>`;
    }
}

// Image preview functionality
document.addEventListener('DOMContentLoaded', function() {
    // Team logo preview
    const teamLogoInput = document.getElementById('hofTeamLogo');
    if (teamLogoInput) {
        teamLogoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const preview = document.getElementById('teamLogoPreview');
                    preview.querySelector('img').src = e.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Player image preview
    const playerImageInput = document.getElementById('hofPlayerImage');
    if (playerImageInput) {
        playerImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const preview = document.getElementById('playerImagePreview');
                    preview.querySelector('img').src = e.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Hall of Fame form submission
    const hallOfFameForm = document.getElementById('hallOfFameForm');
    if (hallOfFameForm) {
        hallOfFameForm.addEventListener('submit', handleAddHallOfFame);
    }
});

// Mobile Sidebar Toggle
function setupMobileSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            sidebarToggle.textContent = sidebar.classList.contains('active') ? '✕' : '☰';
        });
        
        // Close sidebar when clicking outside
        document.addEventListener('click', function(event) {
            if (!sidebar.contains(event.target) && !sidebarToggle.contains(event.target)) {
                sidebar.classList.remove('active');
                sidebarToggle.textContent = '☰';
            }
        });
        
        // Close sidebar when clicking on a nav item
        const navItems = sidebar.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', function() {
                sidebar.classList.remove('active');
                sidebarToggle.textContent = '☰';
            });
        });
    }
}

// Hall of Fame Edit Functions
async function openEditHallOfFameModal(hofId, playerName, league, playerImage, entryId, team, season, teamLogo) {
    const modal = document.getElementById('editHallOfFameModal');
    
    // If we have a hofId, fetch the complete entry data
    if (hofId) {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/hall-of-fame-web/${hofId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                
                if (result.success && result.data) {
                    const entry = result.data;
                    
                    // Set current values from fetched data
                    document.getElementById('editHofId').value = entry.id || '';
                    document.getElementById('editHofPlayerName').value = entry.player_name || '';
                    document.getElementById('editHofLeague').value = entry.league || '';
                    document.getElementById('editHofTeam').value = entry.team_name || '';
                    document.getElementById('editHofSeason').value = entry.season || '';
                    document.getElementById('editHofEmail').value = entry.email || '';
                    document.getElementById('editHofPhone').value = entry.phone || '';
                    
                    // Show image previews if URLs exist
                    if (entry.player_image) {
                        const playerPreview = document.getElementById('editPlayerImagePreview');
                        if (playerPreview) {
                            playerPreview.querySelector('img').src = entry.player_image;
                            playerPreview.style.display = 'block';
                        }
                    }
                    
                    if (entry.team_logo) {
                        const teamPreview = document.getElementById('editTeamLogoPreview');
                        if (teamPreview) {
                            teamPreview.querySelector('img').src = entry.team_logo;
                            teamPreview.style.display = 'block';
                        }
                    }
                } else {
                    console.error('No data in API response');
                }
            } else {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
            }
        } catch (error) {
            console.error('Error fetching Hall of Fame entry:', error);
        }
    } else {
        setFallbackValues();
    }
    
    function setFallbackValues() {
        // Set current values from parameters
        document.getElementById('editHofId').value = entryId || hofId || '';
        document.getElementById('editHofPlayerName').value = playerName || '';
        document.getElementById('editHofLeague').value = league || '';
        document.getElementById('editHofTeam').value = team || '';
        document.getElementById('editHofSeason').value = season || '';
        document.getElementById('editHofEmail').value = '';
        document.getElementById('editHofPhone').value = '';
        
        // Clear file inputs to prevent caching
        document.getElementById('editHofPlayerImage').value = '';
        document.getElementById('editHofTeamLogo').value = '';
        
        // Hide image previews
        document.getElementById('editPlayerImagePreview').style.display = 'none';
        document.getElementById('editTeamLogoPreview').style.display = 'none';
    }
    
    // Clear any previous messages
    document.getElementById('editHallOfFameMessage').innerHTML = '';
    
    // Show modal
    modal.style.display = 'block';
    
    // Only clear form if we're using fallback values (no API call)
    if (!hofId) {
        setTimeout(() => {
            const editHofForm = document.getElementById('editHallOfFameForm');
            if (editHofForm) {
                editHofForm.reset();
                
                // Clear file inputs explicitly
                document.getElementById('editHofPlayerImage').value = '';
                document.getElementById('editHofTeamLogo').value = '';
                
                // Hide image previews
                document.getElementById('editPlayerImagePreview').style.display = 'none';
                document.getElementById('editTeamLogoPreview').style.display = 'none';
            }
        }, 100);
    }
}

function closeEditHallOfFameModal() {
    const modal = document.getElementById('editHallOfFameModal');
    modal.style.display = 'none';
}

// Handle edit form submission
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    
    // Add file upload handlers for Hall of Fame edit
    const editPlayerImageInput = document.getElementById('editHofPlayerImage');
    const editTeamLogoInput = document.getElementById('editHofTeamLogo');
    const editPlayerImagePreview = document.getElementById('editPlayerImagePreview');
    const editTeamLogoPreview = document.getElementById('editTeamLogoPreview');
    
    // Handle player image upload
    if (editPlayerImageInput) {
        editPlayerImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    editPlayerImagePreview.querySelector('img').src = e.target.result;
                    editPlayerImagePreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
        
        // Add drag and drop
        setupDragAndDrop(editPlayerImageInput, editPlayerImagePreview);
    }
    
    // Handle team logo upload
    if (editTeamLogoInput) {
        editTeamLogoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    editTeamLogoPreview.querySelector('img').src = e.target.result;
                    editTeamLogoPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
        
        // Add drag and drop
        setupDragAndDrop(editTeamLogoInput, editTeamLogoPreview);
    }
    
    // Add Hall of Fame edit form handler
    const editHofForm = document.getElementById('editHallOfFameForm');
    if (editHofForm) {
        editHofForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(editHofForm);
            const data = {
                hofId: formData.get('hofId'),
                playerName: formData.get('editHofPlayerName'),
                league: formData.get('editHofLeague'),
                team: formData.get('editHofTeam'),
                season: formData.get('editHofSeason'),
                email: formData.get('editHofEmail'),
                phone: formData.get('editHofPhone')
            };
            
            // Handle file uploads
            const playerImageFile = editPlayerImageInput.files[0];
            const teamLogoFile = editTeamLogoInput.files[0];
            
            if (playerImageFile) {
                data.playerImageFile = playerImageFile;
            }
            if (teamLogoFile) {
                data.teamLogoFile = teamLogoFile;
            }
            
            try {
                // Show loading state
                const saveBtn = editHofForm.querySelector('.btn-primary');
                const originalText = saveBtn.textContent;
                saveBtn.textContent = 'Updating...';
                saveBtn.disabled = true;
                
                // Create FormData for file upload
                const uploadFormData = new FormData();
                Object.keys(data).forEach(key => {
                    uploadFormData.append(key, data[key]);
                });
                
                // Call API to update Hall of Fame
                const response = await fetch(`${API_BASE_URL}/admin/hall-of-fame-web/${formData.get('hofId')}`, {
                    method: 'PUT',
                    body: uploadFormData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    document.getElementById('editHallOfFameMessage').innerHTML = 
                        '<div class="success-message">✅ Hall of Fame entry updated successfully!</div>';
                    
                    setTimeout(() => {
                        closeEditHallOfFameModal();
                        loadHallOfFameList(); // Reload the list
                    }, 1500);
                } else {
                    document.getElementById('editHallOfFameMessage').innerHTML = 
                        `<div class="error-message">❌ Error updating entry: ${result.message || 'Unknown error'}</div>`;
                }
                
            } catch (error) {
                console.error('Error updating Hall of Fame:', error);
                document.getElementById('editHallOfFameMessage').innerHTML = 
                    '<div class="error-message">❌ Error updating entry. Please try again.</div>';
            } finally {
                // Reset button state
                const saveBtn = editHofForm.querySelector('.btn-primary');
                saveBtn.textContent = 'Update Entry';
                saveBtn.disabled = false;
            }
        });
    }
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        const modal = document.getElementById('editHallOfFameModal');
        if (event.target === modal) {
            closeEditHallOfFameModal();
        }
    }
});

// Drag and drop functionality
function setupDragAndDrop(input, preview) {
    const dropZone = input.parentElement;
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle dropped files
    dropZone.addEventListener('drop', function(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                input.files = files;
                
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.querySelector('img').src = e.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        }
    }, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight(e) {
    e.target.parentElement.classList.add('drag-over');
}

function unhighlight(e) {
    e.target.parentElement.classList.remove('drag-over');
}

// Resend Contender Email
async function resendContenderEmail(contenderId) {
    console.log('🔧 DEBUG: resendContenderEmail called with ID:', contenderId);
    
    if (!confirm('Are you sure you want to resend an email to this contender?')) return;
    
    const token = localStorage.getItem('adminToken');
    
    try {
        // Show loading state
        const originalText = event.target.textContent;
        event.target.textContent = '...';
        event.target.disabled = true;
        
        const apiUrl = `${API_BASE_URL}/admin/contenders/${contenderId}/resend-email`;
        console.log('🔧 DEBUG: Calling API URL:', apiUrl);
        console.log('🔧 DEBUG: API_BASE_URL:', API_BASE_URL);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('🔧 DEBUG: Response status:', response.status);
        console.log('🔧 DEBUG: Response ok:', response.ok);
        
        const result = await response.json();
        console.log('🔧 DEBUG: Response data:', result);
        
        if (result.success) {
            alert('✅ Email sent to contender successfully!');
            console.log('Email sent:', result.data);
        } else {
            alert('❌ Error sending email: ' + (result.error || result.message || 'Unknown error'));
            console.error('Email send error:', result);
        }
        
    } catch (error) {
        console.error('Error resending contender email:', error);
        alert('❌ Error sending email. Please try again.');
    } finally {
        // Reset button state
        event.target.textContent = '📧';
        event.target.disabled = false;
    }
}

// Resend Hall of Fame Email
async function resendHallOfFameEmail(entryId) {
    if (!confirm('Are you sure you want to resend the Hall of Fame notification email for this entry?')) return;
    
    const token = localStorage.getItem('adminToken');
    
    try {
        // Show loading state
        const originalText = event.target.textContent;
        event.target.textContent = '...';
        event.target.disabled = true;
        
        const response = await fetch(`${API_BASE_URL}/admin/hall-of-fame/${entryId}/resend-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Hall of Fame email sent successfully!');
            console.log('Email sent:', result.data);
        } else {
            alert('❌ Error sending email: ' + (result.error || result.message || 'Unknown error'));
            console.error('Email send error:', result);
        }
        
    } catch (error) {
        console.error('Error resending Hall of Fame email:', error);
        alert('❌ Error sending email. Please try again.');
    } finally {
        // Reset button state
        event.target.textContent = '📧';
        event.target.disabled = false;
    }
}

console.log('Modern Admin Dashboard loaded!');
