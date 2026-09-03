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

function tournamentAdminMarkup(tournament) {
  const canOpen = tournament.status === 'draft';
  const canDraw = ['registration', 'draw'].includes(tournament.status);
  const formatType = getTournamentFormatType(tournament);
  return `<article class="admin-tournament-card">
    <div class="tournament-card-header"><h3>${escapeAdminTournamentText(tournament.name)}</h3><span class="tournament-status ${escapeAdminTournamentText(tournament.status)}">${escapeAdminTournamentText(String(tournament.status || '').replace(/_/g, ' '))}</span></div>
    <p>${escapeAdminTournamentText(tournament.description || 'Free community tournament')}</p>
    <dl class="tournament-meta"><div><dt>Format</dt><dd>${escapeAdminTournamentText(getFormatLabel(formatType))}</dd></div><div><dt>Limit</dt><dd>${escapeAdminTournamentText(tournament.participant_limit)}</dd></div><div><dt>Starts</dt><dd>${escapeAdminTournamentText(tournament.starts_at ? new Date(tournament.starts_at).toLocaleDateString() : 'Not set')}</dd></div><div><dt>Prize</dt><dd>${escapeAdminTournamentText(tournament.prize_info || 'Not set')}</dd></div></dl>
    <div class="tournament-action-row">
      ${canOpen ? `<button class="tournament-button secondary" data-action="open" data-id="${tournament.id}" type="button">Open registration</button>` : ''}
      ${canDraw ? `<button class="tournament-button" data-action="draw" data-id="${tournament.id}" type="button">Generate draw</button>` : ''}
      <button class="tournament-button ghost" data-action="details" data-id="${tournament.id}" type="button">Open tournament</button>
      <button class="tournament-button" data-action="cancel" data-id="${tournament.id}" type="button">Cancel</button>
    </div>
    <div id="details-${tournament.id}"></div>
  </article>`;
}

function escapeAdminTournamentText(value) {
  const text = value == null ? '' : String(value);
  if (typeof document === 'undefined') return text;
  const element = document.createElement('span');
  element.textContent = text;
  return element.innerHTML;
}

function adminParticipantLabel(participant) {
  if (!participant) return 'TBD';
  const name = String(participant.participant_name || 'Participant').trim();
  const team = String(participant.team_name || '').trim();
  return team ? `${name} - ${team}` : name;
}

function parseAdminJson(value, label) {
  if (!String(value || '').trim()) return [];
  try { return JSON.parse(value); } catch (error) { throw new Error(`${label} must be valid JSON.`); }
}

function updateFormatFields() {
  const format = document.getElementById('format-type-select')?.value || 'knockout';
  const options = document.getElementById('format-options');
  const show = format !== 'knockout';
  if (options) options.hidden = !show;
  const visible = {
    'group-fields': format === 'group_knockout',
    'league-fields': ['league', 'group_knockout', 'league_phase_knockout'].includes(format),
    'pot-fields': format === 'league_phase_knockout',
    'qualification-fields': ['group_knockout', 'league_phase_knockout'].includes(format)
  };
  Object.entries(visible).forEach(([id, isVisible]) => { const section = document.getElementById(id); if (section) section.hidden = !isVisible; });
}

function validateAdminFormat(config) {
  if (!Number.isInteger(config.participant_count) || config.participant_count < 2) throw new Error('Participant count must be at least 2.');
  if (config.group_count !== undefined && (!Number.isInteger(config.group_count) || config.group_count < 1)) throw new Error('Group count must be at least 1.');
  if (config.teams_per_group !== undefined && (!Number.isInteger(config.teams_per_group) || config.teams_per_group < 2)) throw new Error('Teams per group must be at least 2.');
  if (config.matches_per_team !== undefined && (!Number.isInteger(config.matches_per_team) || config.matches_per_team < 1)) throw new Error('Matches per team must be at least 1.');
  if (config.seeded_pots !== undefined && (!Number.isInteger(config.seeded_pots) || config.seeded_pots < 1)) throw new Error('Seeded pots must be at least 1.');
  if (config.teams_per_pot !== undefined && (!Number.isInteger(config.teams_per_pot) || config.teams_per_pot < 1)) throw new Error('Teams per pot must be at least 1.');
  if (config.teams_per_pot && config.seeded_pots * config.teams_per_pot < config.participant_count) throw new Error('Seeded pots do not contain enough team slots.');
  const seen = new Set();
  (config.qualification_bands || []).forEach(band => { if (!Number.isInteger(band.from_rank) || !Number.isInteger(band.to_rank) || band.from_rank < 1 || band.to_rank < band.from_rank) throw new Error('Qualification bands contain an invalid rank range.'); for (let rank = band.from_rank; rank <= band.to_rank; rank++) { if (seen.has(rank)) throw new Error('Qualification bands cannot overlap.'); seen.add(rank); } });
}

function buildAdminFormatConfig(form) {
  const values = Object.fromEntries(new FormData(form));
  const number = name => values[name] === '' || values[name] == null ? undefined : Number(values[name]);
  const config = { format_type: values.format_type, participant_count: Number(values.participant_limit), group_count: number('group_count'), teams_per_group: number('teams_per_group'), matches_per_team: number('matches_per_team'), home_away: form.elements.home_away?.checked || false, seeded_pots: number('seeded_pots'), teams_per_pot: number('teams_per_pot'), direct_qualifiers: number('direct_qualifiers') || 0, playoff_qualifiers: number('playoff_qualifiers') || 0, qualification_bands: parseAdminJson(values.qualification_bands, 'Qualification bands'), tie_breakers: parseAdminJson(values.tie_breakers, 'Tie-breakers'), rules: { free_registration: true } };
  validateAdminFormat(config);
  return config;
}

async function loadAdminTournaments() {
  const container = document.getElementById('admin-tournaments');
  try {
    const result = await tournamentRequest('?scope=admin');
    container.innerHTML = (result.data || []).map(tournamentAdminMarkup).join('') || '<p>No tournaments yet.</p>';
  } catch (error) { container.innerHTML = `<div class="tournament-state error"><h3>Unable to load tournaments</h3><p>${escapeAdminTournamentText(error.message)}</p></div>`; return; }

  container.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', async () => {
    try {
      const id = encodeURIComponent(button.dataset.id);
      if (button.dataset.action === 'open') await tournamentRequest(`/${id}/open-registration`, { method: 'POST' });
      if (button.dataset.action === 'draw') await tournamentRequest(`/${id}/draw`, { method: 'POST' });
      if (button.dataset.action === 'cancel') await tournamentRequest(`/${id}/cancel`, { method: 'POST' });
      if (button.dataset.action === 'details') return window.location.href = `admin-tournament-detail.html?id=${button.dataset.id}`;
      await loadAdminTournaments();
    } catch (error) { alert(error.message); }
  }));
}

function renderTournamentTeams(tournamentId, tournament) {
  const teamList = (tournament.teams || []).map(item => {
    const team = item.teams || {};
    return `<div class="tournament-team-card"><img src="${escapeAdminTournamentText(team.logo_url || '')}" alt="${escapeAdminTournamentText(team.name || 'Team')} logo" onerror="this.style.display='none'"><div><strong>${escapeAdminTournamentText(team.name || 'Team')}</strong><small>${escapeAdminTournamentText(team.email || 'No email')}</small></div></div>`;
  }).join('') || '<p>No teams have been added to this tournament yet.</p>';

  return `
    <section class="tournament-admin-section">
      <div class="tournament-section-header">
        <h3>Teams</h3>
        <button class="tournament-button secondary" type="button" data-team-toggle="${tournamentId}">+ Add Team</button>
      </div>
      <form class="tournament-team-form" data-tournament-team-form="${tournamentId}" hidden>
        <div class="tournament-team-form-grid">
          <label>Team name<input name="team_name" placeholder="Arsenal" required></label>
          <label>Team logo<input name="team_logo_upload" type="file" accept="image/*"></label>
          <label>Email (optional)<input name="team_email" type="email" placeholder="optional@example.com"></label>
        </div>
        <div class="tournament-team-actions">
          <button type="button" class="tournament-button ghost" data-team-fetch="${tournamentId}">Auto Fetch Logo</button>
          <button type="submit" class="tournament-button">Save Team</button>
        </div>
        <input type="hidden" name="logo_url">
        <div class="team-logo-preview-wrap">
          <img class="team-logo-preview" src="" alt="Team logo preview" hidden>
          <span class="team-logo-status" role="status"></span>
        </div>
      </form>
      <div class="tournament-team-list">${teamList}</div>
    </section>
  `;
}

async function loadTournamentDetails(id) {
  const result = await tournamentRequest(`/${encodeURIComponent(id)}`);
  const target = document.getElementById(`details-${id}`);
  target.innerHTML = `<div class="admin-details"><h3>Configuration</h3><p>${escapeAdminTournamentText(result.data.format_config?.format_type || 'Knockout')} · ${escapeAdminTournamentText(result.data.registrations?.length || 0)} selected teams · ${(result.data.fixtures || []).length} fixtures · ${(result.data.groups || []).length} groups · ${(result.data.qualifications || []).length} qualifications</p>${renderTournamentTeams(id, result.data)}<h3>Registrations</h3>${(result.data.registrations || []).map(registration => `<div class="registration-row"><strong>${escapeAdminTournamentText(registration.participant_name)}</strong><span>${escapeAdminTournamentText(registration.team_name || 'Individual')} · ${escapeAdminTournamentText(registration.status)}</span>${registration.status === 'pending' ? `<div class="registration-actions"><button class="tournament-button secondary" type="button" data-approve="${registration.id}">Approve</button><button class="tournament-button" type="button" data-reject="${registration.id}">Reject</button></div>` : ''}</div>`).join('') || '<p>No registrations yet.</p>'}<h3>Matches</h3>${(result.data.rounds || []).flatMap(round => round.tournament_matches || []).map(match => `<div class="admin-match-row"><strong>Match ${match.match_number}</strong><span>${escapeAdminTournamentText(adminParticipantLabel(match.participant_a))} vs ${escapeAdminTournamentText(adminParticipantLabel(match.participant_b))} · ${escapeAdminTournamentText(match.status)}</span>${match.status === 'scheduled' && match.participant_a_id && match.participant_b_id ? `<form class="match-result-form" data-result="${match.id}"><select name="winner_id" aria-label="Match winner" required><option value="">Choose winner</option><option value="${match.participant_a_id}">${escapeAdminTournamentText(adminParticipantLabel(match.participant_a))}</option><option value="${match.participant_b_id}">${escapeAdminTournamentText(adminParticipantLabel(match.participant_b))}</option></select><input name="score_a" type="number" min="0" placeholder="A score" aria-label="Participant A score" required><input name="score_b" type="number" min="0" placeholder="B score" aria-label="Participant B score" required><button class="tournament-button secondary" type="submit">Submit result</button></form>` : ''}</div>`).join('') || '<p>No matches yet.</p>'}</div>`;
  target.querySelectorAll('[data-approve], [data-reject]').forEach(button => button.addEventListener('click', async () => {
    await tournamentRequest(`/${id}/registrations/${button.dataset.approve || button.dataset.reject}`, { method: 'PATCH', body: JSON.stringify({ status: button.dataset.approve ? 'approved' : 'rejected' }) });
    loadTournamentDetails(id);
  }));
  target.querySelectorAll('[data-result]').forEach(form => form.addEventListener('submit', async event => {
    event.preventDefault();
    await tournamentRequest(`/${id}/matches/${form.dataset.result}/result`, { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    loadTournamentDetails(id);
  }));

  target.querySelectorAll('[data-team-toggle]').forEach(button => {
    button.addEventListener('click', () => {
      const form = target.querySelector(`[data-tournament-team-form="${button.dataset.teamToggle}"]`);
      if (form) form.hidden = !form.hidden;
    });
  });

  target.querySelectorAll('[data-team-fetch]').forEach(button => {
    button.addEventListener('click', async () => {
      const form = target.querySelector(`[data-tournament-team-form="${button.dataset.teamFetch}"]`);
      const teamName = form?.querySelector('[name="team_name"]')?.value?.trim();
      const status = form?.querySelector('.team-logo-status');
      const preview = form?.querySelector('.team-logo-preview');
      const hiddenInput = form?.querySelector('[name="logo_url"]');
      if (!teamName) { if (status) status.textContent = 'Enter a team name first.'; return; }
      try {
        if (status) status.textContent = 'Searching for team logo...';
        const fetcher = window.fetchAndCacheTeamLogo || window.fetchTeamData || null;
        const teamData = fetcher ? await fetcher(teamName) : null;
        if (!teamData || !teamData.logo) {
          if (status) status.textContent = 'No logo found. You can upload a logo manually instead.';
          return;
        }
        if (hiddenInput) hiddenInput.value = teamData.logo;
        if (preview) { preview.src = teamData.logo; preview.hidden = false; }
        if (status) status.textContent = 'Auto-fetched logo ready to save.';
      } catch (error) {
        if (status) status.textContent = error.message || 'Unable to fetch logo.';
      }
    });
  });

  target.querySelectorAll('[data-tournament-team-form]').forEach(form => {
    const fileInput = form.querySelector('[name="team_logo_upload"]');
    const status = form.querySelector('.team-logo-status');
    const preview = form.querySelector('.team-logo-preview');
    const hiddenInput = form.querySelector('[name="logo_url"]');

    fileInput?.addEventListener('change', async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        if (status) status.textContent = 'Uploading logo to storage...';
        const upload = new FormData();
        upload.append('logo', file);
        const uploaded = await teamRequest('/upload-logo', { method: 'POST', body: upload });
        if (!uploaded?.data?.logo_url) throw new Error('No public logo URL returned');
        if (hiddenInput) hiddenInput.value = uploaded.data.logo_url;
        if (preview) { preview.src = uploaded.data.logo_url; preview.hidden = false; }
        if (status) status.textContent = 'Manual logo uploaded successfully.';
      } catch (error) {
        if (status) status.textContent = error.message || 'Manual upload failed.';
      }
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const formData = new FormData(form);
      const name = String(formData.get('team_name') || '').trim();
      const email = String(formData.get('team_email') || '').trim();
      const logoUrl = String(formData.get('logo_url') || '').trim();
      if (!name) { if (status) status.textContent = 'Team name is required.'; return; }
      if (!logoUrl) { if (status) status.textContent = 'Team logo is required. Use Auto Fetch or Manual Upload.'; return; }
      try {
        if (status) status.textContent = 'Saving team to tournament...';
        await tournamentRequest(`/${encodeURIComponent(id)}/teams/create`, { method: 'POST', body: JSON.stringify({ name, email: email || null, logo_url: logoUrl }) });
        if (status) status.textContent = 'Team saved successfully.';
        form.reset();
        if (preview) preview.hidden = true;
        if (hiddenInput) hiddenInput.value = '';
        await loadTournamentDetails(id);
      } catch (error) {
        if (status) status.textContent = error.message || 'Unable to save team.';
      }
    });
  });
}

document.getElementById('tournament-form')?.addEventListener('submit', async event => {
  event.preventDefault();
  const status = document.getElementById('form-status');
  try {
    const form = event.target;
    const body = Object.fromEntries(new FormData(form));
    const config = buildAdminFormatConfig(form);
    const participantLimit = Number(body.participant_limit || 0);
    if (!Number.isInteger(participantLimit) || participantLimit < 2) throw new Error('Participant limit must be at least 2.');
    body.participant_limit = String(participantLimit);
    body.category_id = form.elements.category_id?.value || null;
    const created = await tournamentRequest('', { method: 'POST', body: JSON.stringify(body) });
    await tournamentRequest(`/${encodeURIComponent(created.data.id)}/format-config`, { method: 'POST', body: JSON.stringify(config) });
    status.textContent = 'Tournament created. Opening workspace...';
    event.target.reset();
    updateFormatFields();
    loadAdminTournaments();
    window.location.href = `admin-tournament-detail.html?id=${created.data.id}`;
  } catch (error) { status.textContent = error.message; }
});

document.getElementById('format-type-select')?.addEventListener('change', updateFormatFields);
document.getElementById('new-tournament-button')?.addEventListener('click', () => {
  const panel = document.getElementById('tournament-create-panel');
  if (panel) panel.hidden = !panel.hidden;
});
document.getElementById('cancel-tournament-create')?.addEventListener('click', () => {
  const panel = document.getElementById('tournament-create-panel');
  if (panel) panel.hidden = true;
  document.getElementById('tournament-form')?.reset();
  updateFormatFields();
});
updateFormatFields();
if (typeof document !== 'undefined') { loadAdminTournaments(); }

document.getElementById('refresh-admin-tournaments')?.addEventListener('click', loadAdminTournaments);
