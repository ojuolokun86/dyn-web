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

// Render upcoming event with premium styles and strict column targeting
function renderUpcomingEvent(event, targetCol) {
    const col = targetCol; // Use the passed column directly
    if (!col) {
        return;
    }

    // Always render content - never leave blank
    if (!event) {
        col.innerHTML = `
            <div class="upcoming-event-premium">
                <div class="section-title">🔥 UPCOMING EVENT</div>
                <div class="gold-underline"></div>
                <div class="glass-card">
                    <div class="status-badge closed">NO UPCOMING EVENT</div>
                    <h3 style="color: #FFD700; font-size: 1.3rem; margin: 15px 0;">No Upcoming Event Yet</h3>
                    <p style="color: rgba(255,255,255,0.8); line-height: 1.6;">Stay tuned for the next competition.</p>
                </div>
            </div>
        `;
        return;
    }

    if (event.status === 'draft') {
        col.innerHTML = `
            <div class="upcoming-event-premium">
                <div class="section-title">🔥 UPCOMING EVENT</div>
                <div class="gold-underline"></div>
                <div class="glass-card">
                    <div class="status-badge coming-soon">COMING SOON</div>
                    <h3 style="color: #FFD700; font-size: 1.4rem; margin: 15px 0;">${escapeHtml(event.name)}</h3>
                    ${event.description ? `<p style="color: rgba(255,255,255,0.8); line-height: 1.6; margin: 10px 0;">${escapeHtml(event.description)}</p>` : ''}
                    <div style="color: #4169e1; font-weight: 600; margin-top: 15px;">Status: <strong>Coming Soon</strong></div>
                </div>
            </div>
        `;
        return;
    }

    if (event.status === 'open') {
        col.innerHTML = `
            <div class="upcoming-event-premium">
                <div class="section-title">🔥 UPCOMING EVENT</div>
                <div class="gold-underline"></div>
                <div class="glass-card">
                    <div class="status-badge open">OPEN</div>
                    <h3 style="color: #FFD700; font-size: 1.4rem; margin: 15px 0;">${escapeHtml(event.name)}</h3>
                    ${event.description ? `<p style="color: rgba(255,255,255,0.8); line-height: 1.6; margin: 10px 0;">${escapeHtml(event.description)}</p>` : ''}
                    <div style="color: #00ff88; font-weight: 600; margin: 15px 0;">Status: <strong>Open for Voting</strong></div>
                    <button class="premium-btn" onclick="window.location.href='contenders.html'">
                        ✨ Get Started
                    </button>
                </div>
            </div>
        `;
        return;
    }

    // closed or winner_announced -> show fallback message
    col.innerHTML = `
        <div class="upcoming-event-premium">
            <div class="section-title">🔥 UPCOMING EVENT</div>
            <div class="gold-underline"></div>
            <div class="glass-card">
                <div class="status-badge closed">CLOSED</div>
                <h3 style="color: #FFD700; font-size: 1.3rem; margin: 15px 0;">No Upcoming Event Yet</h3>
                <p style="color: rgba(255,255,255,0.8); line-height: 1.6;">Stay tuned for the next competition.</p>
            </div>
        </div>
    `;
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
    
    // Only call ensureHomeThreeLayout() ONCE
    const layout = ensureHomeThreeLayout();

    // Clear any existing intervals to prevent memory leaks
    if (layout.hofCol._hofInterval) clearInterval(layout.hofCol._hofInterval);
    if (layout.pastCol._pwInterval) clearInterval(layout.pastCol._pwInterval);

    try {
        const response = await fetch(`${API_BASE_URL}/events/home`);
        const result = await response.json();

        let upcomingEvent = null;
        if (result.success && result.data) {
            upcomingEvent = result.data.upcoming;
        }

        // Render columns in strict order with proper targeting:
        // Left Column      → 📅 Upcoming Event
        // Center Column    → 🏆 Past Winner  
        // Right Column     → 👑 Hall of Fame

        await renderUpcomingEvent(upcomingEvent, layout.upcomingCol); // Left
        await renderPastWinnersSlideshow(layout.pastCol);           // Center
        await renderHallOfFame(layout.hofCol);                     // Right

    } catch (error) {
        console.error('❌ [ERROR] loadEvent failed:', error);
        // Render fallback for all sections in case of major error
        renderUpcomingEvent(null, layout.upcomingCol);
        renderPastWinnersSlideshow(layout.pastCol);
        renderHallOfFame(layout.hofCol);
    }
}

// Ensure the three-column layout exists and return column elements (container is defined statically in HTML)
function ensureHomeThreeLayout() {
    const container = document.querySelector('.home-three-container');
    if (!container) {
        // fallback: create dynamically if missing
        const created = document.createElement('div');
        created.className = 'home-three-container';
        ['home-col-hof','home-col-past','home-col-upcoming'].forEach(cls => {
            const d = document.createElement('div');
            d.className = 'home-column ' + cls;
            created.appendChild(d);
        });
        document.querySelector('.hero')?.appendChild(created);
        return {
            container: created,
            hofCol: created.querySelector('.home-col-hof'),
            pastCol: created.querySelector('.home-col-past'),
            upcomingCol: created.querySelector('.home-col-upcoming')
        };
    }
    // clear each column only if needed (removed to prevent flashing)
    return {
        container,
        hofCol: container.querySelector('.home-col-hof'),
        pastCol: container.querySelector('.home-col-past'),
        upcomingCol: container.querySelector('.home-col-upcoming')
    };
}


// Render past winners slideshow into provided column with premium styles and strict targeting
async function renderPastWinnersSlideshow(col) {
    try {
        const response = await fetch(`${API_BASE_URL}/events/past-winners`);
        const result = await response.json();

        if (!col) {
            console.error('❌ [ERROR] No past winner column provided!');
            return;
        }

        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
            const winners = result.data;

            col.innerHTML = `
                <div class="section-title">🏆 LAST SEASON WINNER</div>
                <div class="gold-underline"></div>
                <div class="section-subtitle">Ballon D'or Champion</div>
                <div class="past-winner-container">
                    <div class="spotlight-bg">
                        <div class="trophy-icon">🏆</div>
                        <div class="pw-slides"></div>
                        <div class="winner-stats">
                            <div class="stat-item">Season Champion</div>
                            <div class="stat-item">Elite Performance</div>
                        </div>
                    </div>
                </div>
            `;

            const slidesWrap = col.querySelector('.pw-slides');
            let currentSlide = 0;

            winners.forEach((w, idx) => {
                const pic = w.winner_picture || '';
                const slide = document.createElement('div');
                slide.className = 'pw-slide winner-image-glow';
                slide.style.backgroundImage = pic ? `url('${escapeHtml(pic)}')` : '';
                slide.style.backgroundSize = 'contain';
                slide.style.backgroundPosition = 'center';
                slide.style.backgroundRepeat = 'no-repeat';
                slide.style.height = '300px';
                slide.style.margin = '20px 0';
                slide.style.display = idx === 0 ? 'block' : 'none';
                slide.style.animation = idx === 0 ? 'imageGlow 2s ease-in-out infinite alternate' : 'none';

                slide.innerHTML = `
                    <div style="padding: 20px; background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 60%); border-radius: 12px; height: 100%; display: flex; flex-direction: column; justify-content: flex-end;">
                        <div class="winner-name-main">${escapeHtml(w.winner_name)}</div>
                        <div class="pw-event-name" style="color: #FFD700; font-size: 1.2rem; margin-bottom: 10px;">${escapeHtml(w.event_name)}</div>
                        <div class="pw-winner-meta" style="color: rgba(255,255,255,0.9); font-size: 1rem;">
                            <span>${escapeHtml(w.winner_class || '')}</span>
                            <span>${escapeHtml(w.winner_country || '')}</span>
                        </div>
                    </div>
                `;
                slidesWrap.appendChild(slide);
            });

            const slideEls = slidesWrap.querySelectorAll('.pw-slide');
            
            function showSlide(index) {
                slideEls.forEach((el, idx) => {
                    el.style.display = idx === index ? 'block' : 'none';
                    el.style.animation = idx === index ? 'imageGlow 2s ease-in-out infinite alternate' : 'none';
                });
            }

            // Auto-rotate slides
            const interval = setInterval(() => {
                currentSlide = (currentSlide + 1) % slideEls.length;
                showSlide(currentSlide);
            }, 5000);
            
            col._pwInterval = interval;
        } else {
            col.innerHTML = `
                <div class="section-title">🏆 LAST SEASON WINNER</div>
                <div class="gold-underline"></div>
                <div class="section-subtitle">Ballon D'or Champion</div>
                <div class="glass-card">
                    <div class="trophy-icon">🏆</div>
                    <div style="color: #FFD700; font-size: 1.5rem; margin: 20px 0;">No past winners yet</div>
                    <div style="color: rgba(255,255,255,0.7);">Champions will be crowned here</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ [ERROR] renderPastWinnersSlideshow failed:', error);
        col && (col.innerHTML = `
            <div class="section-title">🏆 LAST SEASON WINNER</div>
            <div class="gold-underline"></div>
            <div class="section-subtitle">Ballon D'or Champion</div>
            <div class="glass-card">
                <div class="trophy-icon">🏆</div>
                <div style="color: #FFD700; font-size: 1.5rem; margin: 20px 0;">Error loading winner</div>
            </div>
        `);
    }
}

// appendPastWinnerSection kept for backwards compatibility but now delegates to the slideshow
async function appendPastWinnerSection(col) {
    return renderPastWinnersSlideshow(col);
}


// Render Hall of Fame into provided column with premium styles and strict targeting
async function renderHallOfFame(col) {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/hall-of-fame-web`);
        const result = await response.json();

        if (!col) {
            console.error('❌ [ERROR] No Hall of Fame column provided!');
            return;
        }

        if (!result || !result.success || !result.data) {
            col.innerHTML = `
                <div class="section-title">👑 HALL OF FAME</div>
                <div class="gold-underline"></div>
                <div class="section-subtitle">No champions yet</div>
            `;
            return;
        }

        const raw = result.data;
        // recursively flatten raw structure into a list of player objects with league info
        function collectSlides(node, out) {
            if (!node) return;
            if (Array.isArray(node)) {
                node.forEach(item => collectSlides(item, out));
            } else if (typeof node === 'object') {
                // Check if this is a league (key) with players
                if (Object.keys(node).length > 0 && !node.player_name && !node.name) {
                    // This is a league object - iterate through its players
                    Object.keys(node).forEach(leagueName => {
                        const players = node[leagueName];
                        // Add league info to each player
                        Object.values(players).forEach(player => {
                            player.league = leagueName; // Add league name to player object
                            out.push(player);
                        });
                    });
                } else if ('player_name' in node || 'name' in node || 'playerName' in node) {
                    // This is a player object
                    out.push(node);
                } else {
                    Object.values(node).forEach(val => collectSlides(val, out));
                }
            }
        }
        let slides = [];
        collectSlides(raw, slides);

        // ensure each slide's wins property is an array
        slides = slides.map(p => {
            if (p && p.wins && !Array.isArray(p.wins)) {
                p.wins = Object.values(p.wins);
            }
            return p;
        });

        if (!slides.length) {
            col.innerHTML = `
                <div class="section-title">👑 HALL OF FAME</div>
                <div class="gold-underline"></div>
                <div class="section-subtitle">Legendary Champions Coming Soon</div>
            `;
            return;
        }

        // Build premium HTML structure with cinematic container
        col.innerHTML = `
            <div class="section-title">👑 HALL OF FAME</div>
            <div class="gold-underline"></div>
            <div class="section-subtitle">Legendary Champions of Our Community</div>
            <div class="hof-cinematic-container">
                <div class="hof-slideshow-container">
                    <div class="hof-slides"></div>
                    <div class="hof-nav prev">‹</div>
                    <div class="hof-nav next">›</div>
                </div>
                <div class="hof-counter">1 / ${slides.length}</div>
            </div>
        `;

        const container = col.querySelector('.hof-slideshow-container');
        const slidesWrap = container.querySelector('.hof-slides');
        const counter = col.querySelector('.hof-counter');
        const prevBtn = container.querySelector('.hof-nav.prev');
        const nextBtn = container.querySelector('.hof-nav.next');

        
        slides.forEach((p, idx) => {
            const playerPicture = p.player_image || (p.wins && p.wins[0] && p.wins[0].player_image) || '';
            const teamLogo = (p.wins && p.wins[0] && p.wins[0].team_logo) || '';
            const teamName = (p.wins && p.wins[0] && p.wins[0].team_name) || '';
            const playerName = p.player_name || p.name || p.playerName || '';
            
            // Get award information from API data
            let awardName = 'Hall of Fame Champion';
            if (p.wins && p.wins[0]) {
                const win = p.wins[0];
                awardName = win.event_name || win.competition_name || win.title || 'Champion';
            }

            const slide = document.createElement('div');
            slide.className = 'hof-slide';
            slide.style.backgroundImage = playerPicture ? `url('${escapeHtml(playerPicture)}')` : '';
            
            slide.innerHTML = `
                ${teamLogo ? `
                    <div class="hof-team-logo-cinematic">
                        <img src="${escapeHtml(teamLogo)}" alt="${escapeHtml(teamName)}">
                    </div>
                ` : ''}
                <div class="hof-text-overlay">
                    <div class="hof-player-name-cinematic">${escapeHtml(playerName)}</div>
                    <div class="hof-award-line">
                        <span class="hof-award-icon">🏆</span>
                        ${escapeHtml(awardName)}
                    </div>
                    ${teamName ? `<div class="hof-team-info">${escapeHtml(teamName)}</div>` : ''}
                    <div class="hof-league-info">${escapeHtml(p.league)}</div>
                </div>
            `;

            slidesWrap.appendChild(slide);
        });

        const slideEls = slidesWrap.querySelectorAll('.hof-slide');
        let current = 0;
        
        function showSlide(index) {
            slideEls.forEach((el, idx) => {
                el.classList.toggle('active', idx === index);
            });
            counter.textContent = `${index + 1} / ${slideEls.length}`;
        }
        
        showSlide(0);

        // Auto-rotate
        const interval = setInterval(() => {
            current = (current + 1) % slideEls.length;
            showSlide(current);
        }, 4500);
        container._hofInterval = interval;

        // Manual navigation
        prevBtn.addEventListener('click', () => {
            current = (current - 1 + slideEls.length) % slideEls.length;
            showSlide(current);
        });

        nextBtn.addEventListener('click', () => {
            current = (current + 1) % slideEls.length;
            showSlide(current);
        });

    } catch (error) {
        console.error('❌ [ERROR] renderHallOfFame failed:', error);
        col.innerHTML = `
            <div class="section-title">👑 HALL OF FAME</div>
            <div class="gold-underline"></div>
            <div class="section-subtitle">Error loading champions</div>
        `;
    }
}
