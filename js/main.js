const heroContent = document.querySelector('.hero-content');
const heroButtonContainer = document.getElementById("heroButtonContainer");
// API_BASE_URL is now provided by api-config.js

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navbarNav = document.getElementById('navbarNav');
    
    if (mobileMenuToggle && navbarNav) {
        mobileMenuToggle.addEventListener('click', function() {
            navbarNav.classList.toggle('active');
            mobileMenuToggle.textContent = navbarNav.classList.contains('active') ? '✕' : '☰';
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!navbarNav.contains(event.target) && !mobileMenuToggle.contains(event.target)) {
                navbarNav.classList.remove('active');
                mobileMenuToggle.textContent = '☰';
            }
        });
        
        // Close menu when clicking on a link
        const navLinks = navbarNav.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navbarNav.classList.remove('active');
                mobileMenuToggle.textContent = '☰';
            });
        });
    }

    // Load event data
    loadEvent();
});

async function loadEvent() {
    heroContent.innerHTML = ""; // clear previous content
    heroButtonContainer.innerHTML = ""; // clear button container

    try {
        // Fetch current event from backend
        const response = await fetch(`${API_BASE_URL}/events/current`);
        const result = await response.json();

        if (!result.success || !result.data) {
            // No active event - check for past winner AND upcoming events
            await loadPastWinnerWithUpcomingEvents();
            return;
        }

        const event = result.data;

        // Event is active
        if (event.status === 'winner_announced') {
            // Fetch winner details
            loadWinnerAnnouncement(event);
            return;
        }

        if (event.status === 'open') {
            // Event is open for voting
            // Update header title to current event
            const siteTitle = document.getElementById('siteTitle');
            if (siteTitle) siteTitle.textContent = `🏆 ${event.name}`;
            document.title = event.name;
            heroButtonContainer.innerHTML = `
                <button id="startBtn" class="hero-btn">✨ Get Started</button>
            `;

            heroContent.innerHTML = `
                <div class="event-active-message">
                    <h2>${event.name}</h2>
                    ${event.description ? `<p>${event.description}</p>` : ''}
                </div>
            `;

            const startBtn = document.getElementById("startBtn");
            startBtn.addEventListener("click", () => {
                window.location.href = 'contenders.html';
            });
            return;
        }

        if (event.status === 'closed') {
            // Update header title to event name (closed)
            const siteTitle = document.getElementById('siteTitle');
            if (siteTitle) siteTitle.textContent = `🏆 ${event.name}`;
            document.title = event.name;
            heroContent.innerHTML = `
                <div class="event-closed-message">
                    <h2>🔒 Event Closed</h2>
                    <p>${event.name} is no longer accepting votes</p>
                    <p><a href="results.html">View Results →</a></p>
                </div>
            `;
            return;
        }

        // Draft status — update header and show with upcoming events
        const siteTitle = document.getElementById('siteTitle');
        if (siteTitle) siteTitle.textContent = `🏆 DYNAMIC EFOOTBALL COMMUNITY`;
        document.title = 'DYNAMIC EFOOTBALL COMMUNITY';
        
        // Show upcoming events section
        heroContent.innerHTML = `
            <div class="home-content-wrapper">
                <div class="upcoming-events-section">
                    <h2>📋 Upcoming Event</h2>
                    <div class="upcoming-event-card">
                        <h3>${event.name}</h3>
                        ${event.description ? `<p>${event.description}</p>` : ''}
                        <p class="event-status">Coming Soon...</p>
                    </div>
                </div>
            </div>
        `;
        
        // Load past winners section
        await loadPastWinnerSection();

    } catch (error) {
        console.error('Error loading event:', error);
        heroContent.innerHTML = `
            <div class="event-error-message">
                <h2>Unable to Load Event</h2>
                <p>Please try again later</p>
            </div>
        `;
    }
}

// Load past winner when no current event
async function loadPastWinner() {
    try {
        console.log('Loading past winner...');
        // Fetch past events with winners
        const response = await fetch(`${API_BASE_URL}/events/past-winners`);
        console.log('Past winners response:', response);
        const result = await response.json();
        console.log('Past winners result:', result);
        
        if (result.success && result.data && result.data.length > 0) {
            const pastWinner = result.data[0]; // Get most recent winner
            
            // Check if winner is within 3 months
            const winnerDate = new Date(pastWinner.ended_at || pastWinner.updated_at);
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            
            if (winnerDate > threeMonthsAgo) {
                // Display past winner
                heroContent.innerHTML = `
                    <div class="past-winner-display">
                        <div class="past-winner-header">
                            <h2>🏆 Last Winner</h2>
                            <p style="opacity: 0.8; margin-bottom: 20px;">${pastWinner.event_name}</p>
                        </div>
                        <div class="past-winner-content">
                            <div class="past-winner-info">
                                ${pastWinner.winner_picture ? `<div class="past-winner-image-bg" style="background-image: url('${escapeHtml(pastWinner.winner_picture)}')"></div>` : ''}
                                <div class="past-winner-content-overlay">
                                    <div class="past-winner-name">${escapeHtml(pastWinner.winner_name)}</div>
                                    <div class="past-winner-meta">
                                        <span class="past-winner-class">${escapeHtml(pastWinner.winner_class || 'N/A')}</span>
                                        <span class="past-winner-country">${escapeHtml(pastWinner.winner_country || 'N/A')}</span>
                                    </div>
                                    <div class="past-winner-points">${pastWinner.winner_points || 0} Points</div>
                                </div>
                            </div>
                            ${pastWinner.winner_video ? `
                                <div class="past-winner-video">
                                    <video controls autoplay muted loop style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 15px;">
                                        <source src="${pastWinner.winner_video}" type="video/mp4">
                                        Your browser does not support the video tag.
                                    </video>
                                </div>
                            ` : ''}
                        </div>
                        <div class="past-winner-footer">
                            <p style="opacity: 0.7; font-size: 14px;">Winner announced ${new Date(winnerDate).toLocaleDateString()}</p>
                            <a href="results.html" class="view-results-btn">View Full Results →</a>
                        </div>
                    </div>
                `;
                
                // Update header
                const siteTitle = document.getElementById('siteTitle');
                if (siteTitle) siteTitle.textContent = '🏆 DYNAMIC EFOOTBALL COMMUNITY';
                document.title = 'DYNAMIC EFOOTBALL COMMUNITY - Past Winner';
                return;
            }
        }
        
        // No recent winner - show default message
        const siteTitle = document.getElementById('siteTitle');
        if (siteTitle) siteTitle.textContent = 'DYNAMIC EFOOTBALL COMMUNITY';
        document.title = 'DYNAMIC EFOOTBALL COMMUNITY';
        heroContent.innerHTML = `
            <div class="event-closed-message">
                <h2>🎪 No Event Currently Active</h2>
                <p>Please check back later for our next event.</p>
                <p class="secondary-text">Thank you for your interest in DYNAMIC EFOOTBALL COMMUNITY!</p>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading past winner:', error);
        // Fallback to default message
        const siteTitle = document.getElementById('siteTitle');
        if (siteTitle) siteTitle.textContent = 'DYNAMIC EFOOTBALL COMMUNITY';
        document.title = 'DYNAMIC EFOOTBALL COMMUNITY';
        heroContent.innerHTML = `
            <div class="event-closed-message">
                <h2>🎪 No Event Currently Active</h2>
                <p>Please check back later for our next event.</p>
                <p class="secondary-text">Thank you for your interest in DYNAMIC EFOOTBALL COMMUNITY!</p>
            </div>
        `;
    }
}

// Load past winner section (used after showing upcoming events)
async function loadPastWinnerSection() {
    try {
        console.log('Loading past winner section...');
        // Fetch past events with winners
        const response = await fetch(`${API_BASE_URL}/events/past-winners`);
        const result = await response.json();
        console.log('Past winners result:', result);
        
        if (result.success && result.data && result.data.length > 0) {
            const pastWinner = result.data[0]; // Get most recent winner
            
            // Check if winner is within 3 months
            const winnerDate = new Date(pastWinner.ended_at || pastWinner.updated_at);
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            
            if (winnerDate > threeMonthsAgo) {
                // Get the wrapper and append divider + past winner
                const wrapper = document.querySelector('.home-content-wrapper') || heroContent;
                
                // Create divider and past winner HTML
                const divider = document.createElement('div');
                divider.className = 'section-divider';
                
                const pastWinnerDiv = document.createElement('div');
                pastWinnerDiv.className = 'past-winner-display';
                pastWinnerDiv.innerHTML = `
                    <div class="past-winner-header">
                        <h2>🏆 Previous Winner</h2>
                        <p style="opacity: 0.8; margin-bottom: 20px;">${pastWinner.event_name}</p>
                    </div>
                    <div class="past-winner-content">
                        <div class="past-winner-info">
                            ${pastWinner.winner_picture ? `<div class="past-winner-image-bg" style="background-image: url('${escapeHtml(pastWinner.winner_picture)}')"></div>` : ''}
                            <div class="past-winner-content-overlay">
                                <div class="past-winner-name">${escapeHtml(pastWinner.winner_name)}</div>
                                <div class="past-winner-meta">
                                    <span class="past-winner-class">${escapeHtml(pastWinner.winner_class || 'N/A')}</span>
                                    <span class="past-winner-country">${escapeHtml(pastWinner.winner_country || 'N/A')}</span>
                                </div>
                                <div class="past-winner-points">${pastWinner.winner_points || 0} Points</div>
                            </div>
                        </div>
                        ${pastWinner.winner_video ? `
                            <div class="past-winner-video">
                                <video controls autoplay muted loop style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 15px;">
                                    <source src="${pastWinner.winner_video}" type="video/mp4">
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                        ` : ''}
                    </div>
                    <div class="past-winner-footer">
                        <p style="opacity: 0.7; font-size: 14px;">Winner announced ${new Date(winnerDate).toLocaleDateString()}</p>
                        <a href="results.html" class="view-results-btn">View Full Results →</a>
                    </div>
                `;
                
                // Append to wrapper
                if (wrapper) {
                    wrapper.appendChild(divider);
                    wrapper.appendChild(pastWinnerDiv);
                }
            }
        }
    } catch (error) {
        console.error('Error loading past winner section:', error);
    }
}

// Load past winner and upcoming events when no active event
async function loadPastWinnerWithUpcomingEvents() {
    try {
        const siteTitle = document.getElementById('siteTitle');
        document.title = 'DYNAMIC EFOOTBALL COMMUNITY';
        
        // Try to fetch draft events from admin endpoint (only works if admin is logged in)
        let upcomingEvents = [];
        const token = localStorage.getItem('adminToken');
        if (token) {
            try {
                const allEventsResponse = await fetch(`${API_BASE_URL}/events`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (allEventsResponse.ok) {
                    const allEventsResult = await allEventsResponse.json();
                    if (allEventsResult.success && allEventsResult.data) {
                        upcomingEvents = allEventsResult.data.filter(e => e.status === 'draft');
                    }
                }
            } catch (error) {
                console.log('Could not fetch draft events. Skipping upcoming events section.');
            }
        }
        
        // Try to fetch past winners
        const winnerResponse = await fetch(`${API_BASE_URL}/events/past-winners`);
        const winnerResult = await winnerResponse.json();
        
        let hasPastWinner = false;
        let pastWinnerHtml = '';
        
        if (winnerResult.success && winnerResult.data && winnerResult.data.length > 0) {
            const pastWinner = winnerResult.data[0];
            const winnerDate = new Date(pastWinner.ended_at || pastWinner.updated_at);
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            
            if (winnerDate > threeMonthsAgo) {
                hasPastWinner = true;
                pastWinnerHtml = `
                    <div class="past-winner-display">
                        <div class="past-winner-header">
                            <h2>🏆 Last Winner</h2>
                            <p style="opacity: 0.8; margin-bottom: 20px;">${pastWinner.event_name}</p>
                        </div>
                        <div class="past-winner-content">
                            <div class="past-winner-info">
                                ${pastWinner.winner_picture ? `<div class="past-winner-image-bg" style="background-image: url('${escapeHtml(pastWinner.winner_picture)}')"></div>` : ''}
                                <div class="past-winner-content-overlay">
                                    <div class="past-winner-name">${escapeHtml(pastWinner.winner_name)}</div>
                                    <div class="past-winner-meta">
                                        <span class="past-winner-class">${escapeHtml(pastWinner.winner_class || 'N/A')}</span>
                                        <span class="past-winner-country">${escapeHtml(pastWinner.winner_country || 'N/A')}</span>
                                    </div>
                                    <div class="past-winner-points">${pastWinner.winner_points || 0} Points</div>
                                </div>
                            </div>
                            ${pastWinner.winner_video ? `
                                <div class="past-winner-video">
                                    <video controls autoplay muted loop style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 15px;">
                                        <source src="${pastWinner.winner_video}" type="video/mp4">
                                        Your browser does not support the video tag.
                                    </video>
                                </div>
                            ` : ''}
                        </div>
                        <div class="past-winner-footer">
                            <p style="opacity: 0.7; font-size: 14px;">Winner announced ${new Date(winnerDate).toLocaleDateString()}</p>
                            <a href="results.html" class="view-results-btn">View Full Results →</a>
                        </div>
                    </div>
                `;
            }
        }
        
        // Build upcoming events HTML
        let upcomingHtml = '';
        if (upcomingEvents.length > 0) {
            upcomingHtml = `
                <div class="upcoming-events-section">
                    <h2>📋 Upcoming Events</h2>
                    <div class="upcoming-events-list">
                        ${upcomingEvents.map(event => `
                            <div class="upcoming-event-card">
                                <h3>${event.name}</h3>
                                ${event.description ? `<p>${event.description}</p>` : ''}
                                <p class="event-status">Coming Soon...</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Determine what to show
        if (hasPastWinner || upcomingEvents.length > 0) {
            if (siteTitle) siteTitle.textContent = '🏆 DYNAMIC EFOOTBALL COMMUNITY';
            
            heroContent.innerHTML = `
                <div class="home-content-wrapper">
                    ${upcomingHtml}
                    ${hasPastWinner ? `
                        ${upcomingEvents.length > 0 ? '<div class="section-divider"></div>' : ''}
                        ${pastWinnerHtml}
                    ` : ''}
                </div>
            `;
        } else {
            // No past winners and no upcoming events
            if (siteTitle) siteTitle.textContent = 'DYNAMIC EFOOTBALL COMMUNITY';
            heroContent.innerHTML = `
                <div class="event-closed-message">
                    <h2>🎪 No Event Currently Active</h2>
                    <p>Please check back later for our next event.</p>
                    <p class="secondary-text">Thank you for your interest in DYNAMIC EFOOTBALL COMMUNITY!</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error loading past winner and events:', error);
        const siteTitle = document.getElementById('siteTitle');
        if (siteTitle) siteTitle.textContent = 'DYNAMIC EFOOTBALL COMMUNITY';
        document.title = 'DYNAMIC EFOOTBALL COMMUNITY';
        heroContent.innerHTML = `
            <div class="event-closed-message">
                <h2>🎪 No Event Currently Active</h2>
                <p>Please check back later for our next event.</p>
                <p class="secondary-text">Thank you for your interest in DYNAMIC EFOOTBALL COMMUNITY!</p>
            </div>
        `;
    }
}

// Load winner announcement with animations
async function loadWinnerAnnouncement(event) {
    try {
        // Fetch winner details
        const response = await fetch(`${API_BASE_URL}/events/${event.id}/contenders`);
        const result = await response.json();
        
        if (result.success && result.data && event.winner_id) {
            const winner = result.data.find(c => c.id === event.winner_id);
            
            if (winner) {
                // Create confetti effect
                createConfetti();
                
                // Show winner announcement
                heroContent.innerHTML = `
                    <div class="winner-announcement">
                        <div class="winner-content">
                            <div class="winner-crown">👑</div>
                            <div class="winner-title">🏆 WINNER ANNOUNCED 🏆</div>
                            <div class="winner-name">${escapeHtml(winner.name)}</div>
                            <div class="winner-medal">🥇</div>
                            ${winner.video ? `
                                <div class="winner-video-container">
                                    <video class="winner-video" controls autoplay muted loop>
                                        <source src="${winner.video}" type="video/mp4">
                                        Your browser does not support the video tag.
                                    </video>
                                </div>
                            ` : ''}
                            <div style="margin-top: 30px;">
                                <button onclick="this.closest('.winner-announcement').remove()" style="background: white; color: #667eea; border: none; padding: 15px 30px; border-radius: 10px; cursor: pointer; font-size: 18px; font-weight: bold; box-shadow: 0 5px 15px rgba(0,0,0,0.2);">Continue to Results →</button>
                            </div>
                        </div>
                    </div>
                `;
                
                // Auto-remove after 10 seconds if user doesn't close
                setTimeout(() => {
                    const announcement = document.querySelector('.winner-announcement');
                    if (announcement) announcement.remove();
                    // Show normal winner message
                    heroContent.innerHTML = `
                        <div class="event-winner-message">
                            <h2>🎉 Winner Announced!</h2>
                            <p>${event.name} has concluded</p>
                            <p><a href="results.html">View Results →</a></p>
                        </div>
                    `;
                }, 10000);
            }
        }
    } catch (error) {
        console.error('Error loading winner:', error);
        // Fallback to basic message
        heroContent.innerHTML = `
            <div class="event-winner-message">
                <h2>🎉 Winner Announced!</h2>
                <p>${event.name} has concluded</p>
                <p><a href="results.html">View Results →</a></p>
            </div>
        `;
    }
}

// Create confetti effect
function createConfetti() {
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
            document.body.appendChild(confetti);
            
            // Remove confetti after animation
            setTimeout(() => confetti.remove(), 5000);
        }, i * 100);
    }
}

// Simple slider (if needed for contenders display
function initSlider() {
    const slides = document.querySelectorAll(".slide");
    if (slides.length === 0) return;
    
    let current = 0;

    slides.forEach((s, i) => {
        s.style.display = i === 0 ? "block" : "none";
    });

    setInterval(() => {
        slides[current].style.display = "none";
        current = (current + 1) % slides.length;
        slides[current].style.display = "block";
    }, 5000);
}