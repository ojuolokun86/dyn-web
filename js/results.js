// Results page client logic
document.addEventListener('DOMContentLoaded', () => {
  initResultsPage();
  
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
});

let currentEvent = null;
let contenders = [];

async function initResultsPage() {
  const container = document.getElementById('resultsContent');

  try {
    // Fetch current draft or open event
    const res = await fetch(`${API_BASE_URL}/events/current-draft-or-open`);

    const result = await res.json();

    if (!result.success || !result.data) {
      container.innerHTML = `
        <div class="no-event-message">
          <h2>No Active Event Found</h2>
          <p>There is currently no draft or open event to display results for.</p>
          <a href="index.html" class="back-button">← Back to Home</a>
        </div>
      `;
      return;
    }

    currentEvent = result.data;

    // Contenders are already included in the event data
    contenders = currentEvent.contenders || [];

    // Vote tables are already included
    currentEvent.vote_tables = currentEvent.vote_tables || [];

    // Check if user has voted for all tables
    let votesRecord = JSON.parse(localStorage.getItem('votesRecord')) || {};
    const eventKey = `event_${currentEvent.id}`;

    const allTables = (currentEvent.vote_tables || []);

    // Ensure all table IDs are strings for consistent comparison
    const normalizedTables = allTables.map(vt => ({ ...vt, id: String(vt.id) }));

    const allVoted = normalizedTables.length > 0 && normalizedTables.every(vt => {
      const hasVoted = votesRecord[eventKey] && votesRecord[eventKey][vt.id];
      return hasVoted;
    });

    // Temporarily remove the vote check to allow viewing results
    // if (!allVoted) {
    //   console.log('🔍 Results page: User has not voted for all tables');
    //   container.innerHTML = `
    //     <div class="no-event-message">
    //       <h2>Voting Required</h2>
    //       <p>You haven't voted for all available tables. Please vote to see results.</p>
    //       <a href="vote.html" class="back-button">🗳️ Go Vote Now</a>
    //     </div>
    //   `;
    //   return;
    // }
    await loadResults();
  } catch (err) {
    console.error('🔍 Results page: Error initializing results page', err);
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
    // Contenders are already loaded from the event data

    // Check if voting is closed (only show results after voting is complete)
    const votingClosed = currentEvent.status === 'closed' || currentEvent.status === 'winner_announced';

    // Show voting in progress banner if voting is not closed
    if (!votingClosed) {
      container.innerHTML = `
        <div class="event-info-card">
          <h2>${escapeHtml(currentEvent.name)}</h2>
          <p>${escapeHtml(currentEvent.description || '')}</p>
          <span class="event-status ${currentEvent.status}">${formatStatus(currentEvent.status)}</span>
        </div>
        <div class="voting-progress-banner">
          <h2>🗳️ Voting In Progress</h2>
          <p>Voting is currently open for this event. Results are provisional and may change as more votes are cast.</p>
          <p>You can still vote for your favorite contenders!</p>
          <a href="vote.html" class="back-button">🗳️ Go Vote Now</a>
        </div>
      `;
    }

    // Fetch vote counts for each contender
    let voteCounts = {};
    try {
      const voteRes = await fetch(`${API_BASE_URL}/votes/event/${currentEvent.id}/contender-votes`);
      const voteData = await voteRes.json();
      if (voteData.success && Array.isArray(voteData.data)) {
        voteData.data.forEach(vc => {
          voteCounts[vc.contender_id] = parseInt(vc.vote_count, 10);
        });
      }
    } catch (err) {
      console.error('Error fetching vote counts:', err);
    }

    // Fetch detailed points breakdown for each contender
    let pointsBreakdownDetailed = {};
    try {
      const pointsRes = await fetch(`${API_BASE_URL}/votes/event/${currentEvent.id}/contender-points-detailed`);
      const pointsData = await pointsRes.json();
      if (pointsData.success && Array.isArray(pointsData.data)) {
        pointsData.data.forEach(pb => {
          pointsBreakdownDetailed[pb.contender_id] = pb.points;
        });
      }
    } catch (err) {
      console.error('Error fetching points breakdown detailed:', err);
    }

    // Fetch vote points for each contender
    let votePoints = {};
    try {
      const pointsRes = await fetch(`${API_BASE_URL}/votes/event/${currentEvent.id}/contender-vote-points`);
      const pointsData = await pointsRes.json();
      if (pointsData.success && Array.isArray(pointsData.data)) {
        pointsData.data.forEach(pb => {
          votePoints[pb.contender_id] = pb.points;
        });
      }
    } catch (err) {
      console.error('Error fetching vote points:', err);
    }

    // Sort by total points (descending)
    contenders.sort((a, b) => (b.total_points || 0) - (a.total_points || 0));

    // Calculate analytics
    const totalVotes = Object.values(voteCounts).reduce((sum, v) => sum + v, 0);
    const totalPoints = contenders.reduce((sum, c) => sum + (c.total_points || 0), 0);
    const avgPoints = contenders.length > 0 ? Math.round(totalPoints / contenders.length) : 0;
    const winner = contenders[0];

    // Build results HTML
    container.innerHTML += `
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
          ${contenders.map((c, index) => renderContenderCard({
            ...c,
            vote_count: voteCounts[c.id] || 0,
            vote_points: votePoints[c.id] || []
          }, index, winner?.id)).join('')}
        </div>
        <div style="text-align: center;">
          <a href="vote.html" class="back-button">← Back to Voting</a>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Error loading results', err);
}

function renderContenderCard(contender, index, winnerId) {
  const rank = index + 1;
  const isWinner = contender.id === winnerId;
  const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other';
  const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;

  // Show vote points breakdown with table info
  const pointsList = contender.vote_points && contender.vote_points.length
    ? `<div class="points-breakdown">${contender.vote_points.map(p => `<span class="point-chip">${p.points} pts (Table ${p.table}, ${p.tablePoints} pts)</span>`).join('')}</div>`
    : '<div class="points-breakdown"><span class="point-chip">No points yet</span></div>';

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
      ${pointsList}
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
}