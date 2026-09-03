'use strict';

const tournamentToken = () => localStorage.getItem('adminToken');
const tournamentHeaders = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${tournamentToken()}` });

async function tournamentRequest(path, options = {}) {
  const response = await fetch(`${window.API_BASE_URL}/tournaments${path}`, { ...options, headers: { ...tournamentHeaders(), ...(options.headers || {}) } });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error || 'Tournament request failed');
  return result;
}

async function teamRequest(path, options = {}) {
  const response = await fetch(`${window.API_BASE_URL}/teams${path}`, { ...options, headers: { Authorization: `Bearer ${tournamentToken()}`, ...(options.headers || {}) } });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error || 'Team request failed');
  return result;
}

function escapeText(value) {
  const text = value == null ? '' : String(value);
  if (typeof document === 'undefined') return text;
  const element = document.createElement('span');
  element.textContent = text;
  return element.innerHTML;
}

function getFormatLabel(format) {
  const labels = {
    knockout: 'Single Elimination',
    league: 'League',
    group_knockout: 'Groups + Knockout',
    league_phase_knockout: 'League Phase + Knockout'
  };
  return labels[format] || format;
}

function getTournamentFormatType(tournament) {
  return tournament?.format_config?.format_type || tournament?.format_type || tournament?.tournament_type || 'knockout';
}

let currentTournament = null;

// Get tournament ID from URL
function getTournamentIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

// Load tournament data
async function loadTournament() {
  const id = getTournamentIdFromUrl();
  if (!id) {
    document.body.innerHTML = '<p>Tournament not found</p>';
    return;
  }

  try {
    const result = await tournamentRequest(`/${encodeURIComponent(id)}`);
    currentTournament = result.data;
    updateTournamentHeader();
    loadHomeTab();
    setupTabNavigation();
  } catch (error) {
    document.body.innerHTML = `<div class="tournament-state error"><h2>Failed to load tournament</h2><p>${escapeText(error.message)}</p></div>`;
  }
}

// Update header with tournament name and status
function updateTournamentHeader() {
  if (!currentTournament) return;
  document.getElementById('tournament-name').textContent = escapeText(currentTournament.name);
  const statusBadge = document.getElementById('tournament-status');
  statusBadge.textContent = String(currentTournament.status).replace(/_/g, ' ');
  statusBadge.className = `tournament-status-badge ${currentTournament.status}`;
}

// Setup tab navigation
function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('[data-tab]');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.dataset.tab;
      switchTab(tabName);
    });
  });
}

// Switch between tabs
function switchTab(tabName) {
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.setAttribute('aria-selected', btn.dataset.tab === tabName ? 'true' : 'false');
  });

  document.querySelectorAll('[data-panel]').forEach(panel => {
    panel.setAttribute('aria-hidden', panel.dataset.panel === tabName ? 'false' : 'true');
  });

  switch (tabName) {
    case 'home':
      loadHomeTab();
      break;
    case 'teams':
      loadTeamsTab();
      break;
    case 'fixtures':
      loadFixturesTab();
      break;
    case 'standings':
      loadStandingsTab();
      break;
    case 'stats':
      loadStatsTab();
      break;
    case 'results':
      loadResultsTab();
      break;
  }
}

function renderRecentMatches(matches) {
  if (!matches || matches.length === 0) {
    return '<p class="tournament-state">No recent matches yet.</p>';
  }

  return matches.slice(0, 5).map(match => `
    <div class="fixture-row">
      <span>${escapeText(match.stage || 'Match')}</span>
      <strong>${escapeText(match.home_team || 'Home')} ${match.home_score != null ? `${match.home_score} - ${match.away_score}` : 'vs'} ${escapeText(match.away_team || 'Away')}</strong>
      <small>${escapeText(match.status || 'Scheduled')}</small>
    </div>
  `).join('');
}

async function loadHomeTab() {
  if (!currentTournament) return;
  const container = document.getElementById('home-content');
  const approved = (currentTournament.registrations || []).filter(r => r.status === 'approved').length;
  const completedFixtures = (currentTournament.fixtures || []).filter(f => f.status === 'completed').length;
  const remainingFixtures = (currentTournament.fixtures || []).filter(f => f.status !== 'completed').length;
  const leader = (currentTournament.standings || []).length ? currentTournament.standings[0] : null;
  const venueSummary = (currentTournament.fixtures || []).slice(0, 5);

  const html = `
    <dl class="tournament-meta">
      <div><dt>Format</dt><dd>${escapeText(getFormatLabel(getTournamentFormatType(currentTournament)))}</dd></div>
      <div><dt>Status</dt><dd>${escapeText(String(currentTournament.status).replace(/_/g, ' '))}</dd></div>
      <div><dt>Teams</dt><dd>${escapeText(approved || 0)}</dd></div>
      <div><dt>Matches</dt><dd>${escapeText((currentTournament.fixtures || []).length)}</dd></div>
      <div><dt>Completed</dt><dd>${escapeText(completedFixtures)}</dd></div>
      <div><dt>Remaining</dt><dd>${escapeText(remainingFixtures)}</dd></div>
      <div><dt>Start</dt><dd>${currentTournament.starts_at ? new Date(currentTournament.starts_at).toLocaleDateString() : 'Not set'}</dd></div>
      <div><dt>Prize</dt><dd>${escapeText(currentTournament.prize_info || 'Not set')}</dd></div>
    </dl>

    <div class="tournament-state-box" style="margin-top: 1rem;">
      <h3>Current phase</h3>
      <p>${escapeText(currentTournament.status ? String(currentTournament.status).replace(/_/g, ' ') : 'Awaiting start')}</p>
      ${leader ? `<p><strong>Leader:</strong> ${escapeText(leader.team_name || leader.participant_name || 'No leader yet')}</p>` : '<p>No standings data yet.</p>'}
    </div>

    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:1rem; margin-top: 1.5rem;">
      <section>
        <h3>Recent matches</h3>
        ${renderRecentMatches((currentTournament.fixtures || []).filter(f => f.status === 'completed'))}
      </section>
      <section>
        <h3>Upcoming matches</h3>
        ${renderRecentMatches((currentTournament.fixtures || []).filter(f => f.status !== 'completed'))}
      </section>
    </div>

    <div style="margin-top: 2rem; display: flex; gap: 1rem; flex-wrap: wrap;">
      ${currentTournament.status === 'draft' ? `<button class="tournament-button secondary" data-action="open-registration">Open Registration</button>` : ''}
      ${['registration', 'draw'].includes(currentTournament.status) ? `<button class="tournament-button" data-action="generate-draw">Generate Draw</button>` : ''}
      <button class="tournament-button" data-action="cancel-tournament" style="background-color: #dc3545;">Cancel Tournament</button>
    </div>
  `;

  container.innerHTML = html;

  container.querySelector('[data-action="open-registration"]')?.addEventListener('click', async () => {
    try {
      const result = await tournamentRequest(`/${encodeURIComponent(currentTournament.id)}/open-registration`, { method: 'POST' });
      alert('Registration opened');
      currentTournament = result.data;
      updateTournamentHeader();
      loadHomeTab();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  });

  container.querySelector('[data-action="generate-draw"]')?.addEventListener('click', async () => {
    try {
      const result = await tournamentRequest(`/${encodeURIComponent(currentTournament.id)}/draw`, { method: 'POST' });
      alert('Draw generated successfully');
      currentTournament = result.data;
      updateTournamentHeader();
      loadHomeTab();
      loadFixturesTab();
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  });

  container.querySelector('[data-action="cancel-tournament"]')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to cancel this tournament?')) return;
    try {
      await tournamentRequest(`/${encodeURIComponent(currentTournament.id)}/cancel`, { method: 'POST' });
      alert('Tournament cancelled');
      setTimeout(() => window.location.href = 'admin-tournaments.html', 500);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  });
}

async function loadStandingsTab() {
  if (!currentTournament) return;
  const container = document.getElementById('standings-content');
  const format = getTournamentFormatType(currentTournament);

  if (format === 'knockout') {
    container.innerHTML = '<p class="tournament-state">Standings are not used for knockout-only tournaments.</p>';
    return;
  }

  try {
    const result = await tournamentRequest(`/${encodeURIComponent(currentTournament.id)}/standings`);
    const standings = result.data || [];
    container.innerHTML = standings.length
      ? `<div class="table-viewport"><table class="standings-table"><thead><tr><th>Rank</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead><tbody>${standings.map(row => `<tr><td>${row.rank}</td><td>${escapeText(row.team_name || row.participant_name || row.name || 'Participant')}</td><td>${row.played}</td><td>${row.wins}</td><td>${row.draws}</td><td>${row.losses}</td><td>${row.goals_for}</td><td>${row.goals_against}</td><td>${row.goal_difference}</td><td><strong>${row.points}</strong></td></tr>`).join('')}</tbody></table></div>`
      : '<p class="tournament-state">No standings are available yet.</p>';
  } catch (error) {
    container.innerHTML = `<p class="tournament-state error">${escapeText(error.message)}</p>`;
  }
}

async function loadStatsTab() {
  if (!currentTournament) return;
  const container = document.getElementById('stats-content');
  const fixtures = currentTournament.fixtures || [];
  const completed = fixtures.filter(f => f.status === 'completed').length;
  const groups = (currentTournament.groups || []).length;

  if (!completed && !groups) {
    container.innerHTML = '<p class="tournament-state">Statistics will appear once matches are played.</p>';
    return;
  }

  container.innerHTML = `
    <dl class="tournament-meta">
      <div><dt>Completed fixtures</dt><dd>${completed}</dd></div>
      <div><dt>Group stages</dt><dd>${groups}</dd></div>
      <div><dt>Registrations</dt><dd>${(currentTournament.registrations || []).length}</dd></div>
      <div><dt>Approved</dt><dd>${(currentTournament.registrations || []).filter(r => r.status === 'approved').length}</dd></div>
    </dl>
  `;
}

async function loadResultsTab() {
  if (!currentTournament) return;
  const container = document.getElementById('results-content');

  if (!currentTournament.rounds?.length && !currentTournament.fixtures?.length) {
    container.innerHTML = '<p class="tournament-state">No result controls are needed yet for this tournament.</p>';
    return;
  }

  const resultRows = (currentTournament.rounds || []).flatMap(round => round.tournament_matches || []).map(match => `
    <div class="admin-match-row">
      <strong>Match ${match.match_number}</strong>
      <span>${escapeText(match.participant_a ? (match.participant_a.team_name ? `${match.participant_a.participant_name} - ${match.participant_a.team_name}` : match.participant_a.participant_name) : 'TBD')} vs ${escapeText(match.participant_b ? (match.participant_b.team_name ? `${match.participant_b.participant_name} - ${match.participant_b.team_name}` : match.participant_b.participant_name) : 'TBD')} · ${escapeText(match.status)}</span>
    </div>
  `).join('') || '<p class="tournament-state">No match results are available yet.</p>';

  container.innerHTML = `<div class="fixture-list">${resultRows}</div>`;
}

// Teams Tab
async function loadTeamsTab() {
  if (!currentTournament) return;
  const container = document.getElementById('teams-content');

  if (currentTournament.status !== 'draft') {
    container.innerHTML = '<p>Teams can only be added when tournament is in draft status.</p>';
    return;
  }

  const teamList = (currentTournament.teams || []).map(item => {
    const team = item.teams || {};
    return `<div class="tournament-team-card"><img src="${escapeText(team.logo_url || '')}" alt="${escapeText(team.name || 'Team')} logo" onerror="this.style.display='none'"><div><strong>${escapeText(team.name || 'Team')}</strong><small>${escapeText(team.email || 'No email')}</small></div></div>`;
  }).join('') || '<p>No teams have been added to this tournament yet.</p>';

  container.innerHTML = `
    <div style="margin-bottom: 2rem;">
      <button class="tournament-button secondary" type="button" id="add-team-toggle">+ Add Team</button>
    </div>
    
    <form class="tournament-team-form" id="add-team-form" hidden>
      <div class="tournament-team-form-grid">
        <label>Team name<input name="team_name" placeholder="Arsenal" required></label>
        <label>Team logo<input name="team_logo_upload" type="file" accept="image/*"></label>
        <label>Email (optional)<input name="team_email" type="email" placeholder="optional@example.com"></label>
      </div>
      <div class="tournament-team-actions">
        <button type="button" class="tournament-button ghost" id="auto-fetch-logo">Auto Fetch Logo</button>
        <button type="submit" class="tournament-button">Save Team</button>
      </div>
      <input type="hidden" name="logo_url">
      <div class="team-logo-preview-wrap">
        <img class="team-logo-preview" src="" alt="Team logo preview" hidden>
        <span class="team-logo-status" role="status"></span>
      </div>
    </form>
    
    <div class="tournament-team-list">${teamList}</div>
  `;

  // Toggle form
  const form = container.querySelector('#add-team-form');
  container.querySelector('#add-team-toggle').addEventListener('click', () => {
    form.hidden = !form.hidden;
  });

  // Handle logo upload
  const fileInput = form.querySelector('[name="team_logo_upload"]');
  const preview = form.querySelector('.team-logo-preview');
  const hiddenInput = form.querySelector('[name="logo_url"]');
  const status = form.querySelector('.team-logo-status');

  fileInput.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      status.textContent = 'Uploading logo...';
      const upload = new FormData();
      upload.append('logo', file);
      const uploaded = await teamRequest('/upload-logo', { method: 'POST', body: upload });
      if (!uploaded?.data?.logo_url) throw new Error('No public logo URL returned');
      hiddenInput.value = uploaded.data.logo_url;
      preview.src = uploaded.data.logo_url;
      preview.hidden = false;
      status.textContent = 'Logo uploaded successfully.';
    } catch (error) {
      status.textContent = error.message || 'Upload failed.';
    }
  });

  // Handle auto fetch logo
  form.querySelector('#auto-fetch-logo').addEventListener('click', async () => {
    const teamName = form.querySelector('[name="team_name"]')?.value?.trim();
    if (!teamName) {
      status.textContent = 'Enter a team name first.';
      return;
    }
    try {
      status.textContent = 'Searching for team logo...';
      const fetcher = window.fetchAndCacheTeamLogo || window.fetchTeamData || null;
      const teamData = fetcher ? await fetcher(teamName) : null;
      if (!teamData || !teamData.logo) {
        status.textContent = 'No logo found. You can upload a logo manually instead.';
        return;
      }
      hiddenInput.value = teamData.logo;
      preview.src = teamData.logo;
      preview.hidden = false;
      status.textContent = 'Auto-fetched logo ready to save.';
    } catch (error) {
      status.textContent = error.message || 'Unable to fetch logo.';
    }
  });

  // Handle form submission
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const formData = new FormData(form);
    const name = String(formData.get('team_name') || '').trim();
    const email = String(formData.get('team_email') || '').trim();
    const logoUrl = String(formData.get('logo_url') || '').trim();

    if (!name) {
      status.textContent = 'Team name is required.';
      return;
    }
    if (!logoUrl) {
      status.textContent = 'Team logo is required. Use Auto Fetch or Manual Upload.';
      return;
    }

    try {
      status.textContent = 'Saving team to tournament...';
      await tournamentRequest(`/${encodeURIComponent(currentTournament.id)}/teams/create`, {
        method: 'POST',
        body: JSON.stringify({ name, email: email || null, logo_url: logoUrl })
      });
      status.textContent = 'Team saved successfully.';
      form.reset();
      preview.hidden = true;
      hiddenInput.value = '';
      
      // Reload tournament data
      const result = await tournamentRequest(`/${encodeURIComponent(currentTournament.id)}`);
      currentTournament = result.data;
      loadTeamsTab();
    } catch (error) {
      status.textContent = error.message || 'Unable to save team.';
    }
  });
}

// Draw Tab
async function loadDrawTab() {
  if (!currentTournament) return;
  const container = document.getElementById('draw-content');

  if (currentTournament.status === 'draft') {
    container.innerHTML = '<p>Open registration before generating a draw.</p>';
    return;
  }

  if (!['registration', 'draw', 'in_progress', 'completed'].includes(currentTournament.status)) {
    container.innerHTML = '<p>Draw is not available for this tournament.</p>';
    return;
  }

  if ((currentTournament.rounds || []).length === 0 && (currentTournament.fixtures || []).length === 0) {
    container.innerHTML = '<p>Draw has not been generated yet. Open the Overview tab to generate the draw.</p>';
    return;
  }

  // For knockout format, show bracket
  if ((currentTournament.rounds || []).length > 0) {
    const roundsHtml = (currentTournament.rounds || []).map(round => `
      <div class="bracket-round">
        <h4>${escapeText(String(round.stage).replace(/_/g, ' '))}</h4>
        ${(round.tournament_matches || []).map(match => `
          <div class="match-card">
            <p>Match ${match.match_number} <span class="match-status">${escapeText(match.status)}</span></p>
            <div class="match-participants">
              <span>${escapeText(match.participant_a ? (match.participant_a.team_name ? `${match.participant_a.participant_name} - ${match.participant_a.team_name}` : match.participant_a.participant_name) : 'TBD')}</span>
              <br>vs<br>
              <span>${escapeText(match.participant_b ? (match.participant_b.team_name ? `${match.participant_b.participant_name} - ${match.participant_b.team_name}` : match.participant_b.participant_name) : 'TBD')}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `).join('');

    container.innerHTML = `<div class="bracket-viewport"><div class="bracket">${roundsHtml}</div></div>`;
  } else if ((currentTournament.fixtures || []).length > 0) {
    // For league/group formats, show fixtures
    const fixturesHtml = (currentTournament.fixtures || []).map(fixture => `
      <div class="fixture-row">
        <span>${escapeText(fixture.stage || 'League')}</span>
        <strong>${escapeText(fixture.home_team || 'Home')} vs ${escapeText(fixture.away_team || 'Away')}</strong>
        <small>${escapeText(fixture.status)}</small>
      </div>
    `).join('');

    container.innerHTML = `<div class="fixture-list">${fixturesHtml}</div>`;
  }
}

// Fixtures Tab
async function loadFixturesTab() {
  if (!currentTournament) return;
  const container = document.getElementById('fixtures-content');

  const fixtures = currentTournament.fixtures || [];
  if (fixtures.length === 0) {
    container.innerHTML = '<p>No fixtures available. Generate a draw first.</p>';
    return;
  }

  const fixturesHtml = fixtures.map(fixture => `
    <div class="fixture-row">
      <span>${escapeText(fixture.stage || 'League')}</span>
      <strong>
        ${fixture.home_logo_url ? `<img class="team-logo" src="${escapeText(fixture.home_logo_url)}" alt="">` : ''}
        ${escapeText(fixture.home_team || 'Home')} 
        ${fixture.home_score != null ? `${fixture.home_score} - ${fixture.away_score}` : 'vs'}
        ${fixture.away_logo_url ? `<img class="team-logo" src="${escapeText(fixture.away_logo_url)}" alt="">` : ''}
        ${escapeText(fixture.away_team || 'Away')}
      </strong>
      <small>${escapeText(fixture.status)}</small>
    </div>
  `).join('');

  container.innerHTML = `<div class="fixture-list">${fixturesHtml}</div>`;
}

// Settings Tab
async function loadSettingsTab() {
  if (!currentTournament) return;
  const container = document.getElementById('settings-content');

  const isEditable = currentTournament.status === 'draft';

  container.innerHTML = `
    <form id="settings-form" ${isEditable ? '' : 'disabled'}>
      <label>Tournament Name<input type="text" name="name" value="${escapeText(currentTournament.name)}" ${isEditable ? '' : 'readonly'} required></label>
      <label>Description<textarea name="description" ${isEditable ? '' : 'readonly'}>${escapeText(currentTournament.description || '')}</textarea></label>
      <label>Participant Limit<input type="number" name="participant_limit" value="${currentTournament.participant_limit}" ${isEditable ? '' : 'readonly'} required></label>
      <label>Prize Info<input type="text" name="prize_info" value="${escapeText(currentTournament.prize_info || '')}" ${isEditable ? '' : 'readonly'}></label>
      <label>Rules<textarea name="rules" ${isEditable ? '' : 'readonly'}>${escapeText(currentTournament.rules || '')}</textarea></label>
      <label>Starts At<input type="datetime-local" name="starts_at" value="${currentTournament.starts_at ? new Date(currentTournament.starts_at).toISOString().slice(0, 16) : ''}" ${isEditable ? '' : 'readonly'}></label>
      <label>Ends At<input type="datetime-local" name="ends_at" value="${currentTournament.ends_at ? new Date(currentTournament.ends_at).toISOString().slice(0, 16) : ''}" ${isEditable ? '' : 'readonly'}></label>
      ${isEditable ? `<button type="submit" class="tournament-button">Save Changes</button>` : '<p><em>Tournament settings can only be edited in draft status.</em></p>'}
      <span id="settings-status" role="status"></span>
    </form>
  `;

  if (isEditable) {
    const form = container.querySelector('#settings-form');
    const status = container.querySelector('#settings-status');

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const formData = new FormData(form);
      const body = Object.fromEntries(formData);

      try {
        status.textContent = 'Saving...';
        const result = await tournamentRequest(`/${encodeURIComponent(currentTournament.id)}`, { method: 'PUT', body: JSON.stringify(body) });
        currentTournament = result.data;
        status.textContent = 'Settings saved successfully.';
        updateTournamentHeader();
      } catch (error) {
        status.textContent = `Error: ${error.message}`;
      }
    });
  }
}

// Initialize
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', loadTournament);
}
