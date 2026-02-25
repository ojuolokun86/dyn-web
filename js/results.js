// Results page client logic
document.addEventListener('DOMContentLoaded', () => {
  initResultsPage();
});

let currentEvent = null;
let contenders = [];

async function initResultsPage() {
  const container = document.getElementById('resultsContent');

  try {
    // Get event ID from URL params if provided
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('eventId');

    let res;
    if (eventId) {
      // Load specific event
      res = await fetch(`${API_BASE_URL}/events/${eventId}`);
    } else {
      // Load current event
      res = await fetch(`${API_BASE_URL}/events/current`);
    }

    const evt = await res.json();
    if (!evt.success || !evt.data) {
      container.innerHTML = `
        <div class="no-event-message">
          <h2>No Event Found</h2>
          <p>There is currently no active event to display results for.</p>
          <a href="index.html" class="back-button">← Back to Home</a>
        </div>
      `;
      return;
    }

    currentEvent = evt.data;
    await loadResults();
  } catch (err) {
    console.error('Error initializing results page', err);
    container.innerHTML = `
      <div class="no-event-message">
        <h2>Error Loading Results</h2>
        <p>Unable to load results. Please try again later.</p>
        <a href="index.html" class="back-button">← Back to Home</a>
      </div>
    `;
  }
}

async function loadResults() {
  const container = document.getElementById('resultsContent');

  try {
    // Load contenders for this event
    const res = await fetch(`${API_BASE_URL}/events/${currentEvent.id}/contenders`);
    const result = await res.json();

    if (!result.success) {
      container.innerHTML = '<p class="empty-state">No contenders data available</p>';
      return;
    }

    contenders = result.data || [];

    // Sort by total points (descending)
    contenders.sort((a, b) => (b.total_points || 0) - (a.total_points || 0));

    // Calculate analytics
    const totalVotes = contenders.reduce((sum, c) => sum + (c.vote_count || 0), 0);
    const totalPoints = contenders.reduce((sum, c) => sum + (c.total_points || 0), 0);
    const avgPoints = contenders.length > 0 ? Math.round(totalPoints / contenders.length) : 0;
    const winner = contenders[0];

    // Build results HTML
    container.innerHTML = `
      <div class="event-info-card">
        <h2>${escapeHtml(currentEvent.name)}</h2>
        <p>${escapeHtml(currentEvent.description || '')}</p>
        <span class="event-status ${currentEvent.status}">${formatStatus(currentEvent.status)}</span>
      </div>

      <div class="analytics-grid">
        <div class="analytics-card">
          <h3>Total Contenders</h3>
          <div class="analytics-number">${contenders.length}</div>
          <div class="analytics-label">Competing for the title</div>
        </div>
        <div class="analytics-card">
          <h3>Total Votes</h3>
          <div class="analytics-number">${totalVotes.toLocaleString()}</div>
          <div class="analytics-label">Cast by spectators</div>
        </div>
        <div class="analytics-card">
          <h3>Total Points</h3>
          <div class="analytics-number">${totalPoints.toLocaleString()}</div>
          <div class="analytics-label">Combined points awarded</div>
        </div>
        <div class="analytics-card">
          <h3>Average Points</h3>
          <div class="analytics-number">${avgPoints}</div>
          <div class="analytics-label">Per contender</div>
        </div>
      </div>

      <div class="contenders-section">
        <h2>🏆 Contender Rankings</h2>
        <div class="contenders-list">
          ${contenders.map((c, index) => renderContenderCard(c, index, winner?.id)).join('')}
        </div>
        <div style="text-align: center;">
          <a href="vote.html" class="back-button">← Back to Voting</a>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Error loading results', err);
    container.innerHTML = '<p class="empty-state">Error loading results data</p>';
  }
}

function renderContenderCard(contender, index, winnerId) {
  const rank = index + 1;
  const isWinner = contender.id === winnerId;
  const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other';
  const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;

  return `
    <div class="contender-result-card ${isWinner ? 'winner' : ''}" style="animation-delay: ${index * 0.1}s">
      <div class="rank-badge ${rankClass}">${rankIcon}</div>
      <div class="contender-info">
        <h3>${escapeHtml(contender.name)}</h3>
        <div class="contender-meta">
          <span class="meta-tag">${escapeHtml(contender.class || 'Unknown')}</span>
          <span class="meta-tag">${escapeHtml(contender.country || 'Unknown')}</span>
        </div>
      </div>
      <div class="contender-stats">
        <div class="stat">
          <div class="stat-value">${(contender.total_points || 0).toLocaleString()}</div>
          <div class="stat-label">Points</div>
        </div>
        <div class="stat">
          <div class="stat-value">${contender.vote_count || 0}</div>
          <div class="stat-label">Votes</div>
        </div>
      </div>
    </div>
  `;
}

function formatStatus(status) {
  const statusMap = {
    'active': 'Active',
    'closed': 'Closed',
    'winner_announced': 'Winner Announced'
  };
  return statusMap[status] || status;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/[&<>"]+/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c));
}
