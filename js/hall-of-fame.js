// Hall of Fame page logic
document.addEventListener('DOMContentLoaded', () => {
  loadHallOfFame();
});

async function loadHallOfFame() {
  const container = document.getElementById('hallContent');

  try {
    // Fetch Hall of Fame data
    const res = await fetch(`${API_BASE_URL}/hall-of-fame`);
    const result = await res.json();

    if (!result.success || !result.data || result.data.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h2>📜 No Hall of Fame Entries Yet</h2>
          <p>Legends are made, not born. Stay tuned for our first inductees!</p>
        </div>
      `;
      return;
    }

    const winners = result.data;

    // Group by league (normalize league names like in WhatsApp bot)
    const leagueMap = {};

    for (const win of winners) {
      const leagueName = normalizeLeague(win.league);
      if (!leagueMap[leagueName]) leagueMap[leagueName] = {};
      if (!leagueMap[leagueName][win.player_name]) {
        leagueMap[leagueName][win.player_name] = [];
      }
      leagueMap[leagueName][win.player_name].push({
        team: win.team,
        trophies: win.trophies || 1
      });
    }

    // Build HTML
    let html = '';

    for (const leagueName of Object.keys(leagueMap).sort()) {
      html += `
        <div class="league-section">
          <div class="league-header">
            <span class="league-icon">🏟️</span>
            <h2>${escapeHtml(leagueName)}</h2>
          </div>
          <div class="players-grid">
      `;

      const players = leagueMap[leagueName];
      let rank = 1;

      // Sort players by total trophies
      const sortedPlayers = Object.entries(players).sort((a, b) => {
        const trophiesA = a[1].reduce((sum, t) => sum + t.trophies, 0);
        const trophiesB = b[1].reduce((sum, t) => sum + t.trophies, 0);
        return trophiesB - trophiesA;
      });

      for (const [playerName, teams] of sortedPlayers) {
        const totalTrophies = teams.reduce((sum, t) => sum + t.trophies, 0);
        const teamStr = teams.map(t => `${t.team} x${t.trophies}`).join(', ');

        html += `
          <div class="player-card">
            <div class="player-rank">${rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}</div>
            <div class="player-name">${escapeHtml(playerName)}</div>
            <div class="player-teams">
              ${teams.map(t => `<span class="team-badge">${escapeHtml(t.team)}</span>`).join('')}
            </div>
            <div class="trophy-count">
              <span class="count">${totalTrophies}</span>
              <span class="trophy-icons">${'🏆'.repeat(Math.min(totalTrophies, 5))}</span>
            </div>
          </div>
        `;
        rank++;
      }

      html += `
          </div>
        </div>
      `;
    }

    container.innerHTML = html;

  } catch (err) {
    console.error('Error loading Hall of Fame:', err);
    container.innerHTML = `
      <div class="empty-state">
        <h2>⚠️ Error Loading Hall of Fame</h2>
        <p>Please try again later</p>
      </div>
    `;
  }
}

// Helper to normalize league names (same as WhatsApp bot)
function normalizeLeague(name) {
  if (!name) return 'General League';
  return name
    .toLowerCase()
    .replace(/season\s*\d+/i, '')
    .replace(/\d+$/, '')
    .trim()
    .replace(/\b\w/g, l => l.toUpperCase());
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/[&<>"]+/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c));
}
