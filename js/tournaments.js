'use strict';

function escapeTournamentText(value) {
  const text = value == null ? '' : String(value);
  if (typeof document === 'undefined') return text.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const element = document.createElement('span');
  element.textContent = text;
  return element.innerHTML;
}

function formatTournamentDate(value) {
  if (!value) return 'Not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not set' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function tournamentStatusLabel(status) {
  return String(status || 'draft').replace(/_/g, ' ');
}

function participantLabel(participant) {
  if (!participant) return 'TBD';
  const name = String(participant.participant_name || 'Participant').trim();
  const team = String(participant.team_name || '').trim();
  return team ? `${name} - ${team}` : name;
}

function participantVisual(participant) {
  const label = participantLabel(participant);
  const logo = participant?.team?.logo_url;
  return `${logo ? `<img class="team-logo" src="${escapeTournamentText(logo)}" alt="">` : ''}<span>${escapeTournamentText(label)}</span>`;
}

function isAdminManagedTournament(tournament) {
  const sourceType = String(tournament?.source_type || '').trim().toLowerCase();
  return sourceType === 'league_category' || Boolean(tournament?.category_id) || (sourceType && sourceType !== 'custom');
}

function renderTournamentMeta(tournament) {
  return `<dl class="tournament-meta">
    <div><dt>Dates</dt><dd>${formatTournamentDate(tournament.starts_at)} - ${formatTournamentDate(tournament.ends_at)}</dd></div>
    <div><dt>Registration</dt><dd>${formatTournamentDate(tournament.registration_closes_at)} close</dd></div>
    <div><dt>Format</dt><dd>${escapeTournamentText(tournament.format_config?.format_type || tournament.format_type || tournament.tournament_type || 'single elimination')}</dd></div>
    <div><dt>Players</dt><dd>Up to ${escapeTournamentText(tournament.participant_limit)}</dd></div>
  </dl>`;
}

async function loadTournaments() {
  const container = document.getElementById('tournaments');
  try {
    const response = await fetch(`${window.API_BASE_URL}/tournaments`);
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load tournaments');
    const tournaments = result.data || [];
    container.setAttribute('aria-busy', 'false');
    document.getElementById('tournament-count').textContent = tournaments.length ? `${tournaments.length} tournament${tournaments.length === 1 ? '' : 's'}` : '';
    container.innerHTML = tournaments.length ? tournaments.map(renderTournament).join('') : '<div class="tournament-state"><h2>No tournaments yet</h2><p>New community competitions will appear here.</p></div>';
    container.querySelectorAll('[data-tournament-id]').forEach(button => button.addEventListener('click', () => showTournament(button.dataset.tournamentId)));
  } catch (error) {
    container.setAttribute('aria-busy', 'false');
    container.innerHTML = `<div class="tournament-state error"><h2>Unable to load tournaments</h2><p>${escapeTournamentText(error.message)}</p><button class="tournament-button" type="button" onclick="loadTournaments()">Try again</button></div>`;
  }
}

function renderTournament(tournament) {
  const publicRegistrationAllowed = tournament.status === 'registration' && !isAdminManagedTournament(tournament);

  return `<article class="tournament-card">
    <div class="tournament-card-header"><h2>${escapeTournamentText(tournament.name)}</h2><span class="tournament-status ${escapeTournamentText(tournament.status)}">${escapeTournamentText(tournamentStatusLabel(tournament.status))}</span></div>
    <p>${escapeTournamentText(tournament.description || 'Community tournament registration and fixtures.')}</p>
    ${renderTournamentMeta(tournament)}
    ${tournament.prize_info ? `<p><strong>Prize:</strong> ${escapeTournamentText(tournament.prize_info)}</p>` : ''}
    <div class="tournament-action-row"><button class="tournament-button ghost" data-tournament-id="${escapeTournamentText(tournament.id)}" type="button">View draw</button>${publicRegistrationAllowed ? `<button class="tournament-button secondary" data-register-toggle="${escapeTournamentText(tournament.id)}" type="button">Register free</button>` : ''}</div>
    ${publicRegistrationAllowed ? `<form class="tournament-registration-form" data-register-id="${escapeTournamentText(tournament.id)}" hidden><input name="name" placeholder="Participant name" aria-label="Participant name" required><input name="email" type="email" placeholder="Email address" aria-label="Email address" required><input name="team_name" placeholder="Team name (optional)" aria-label="Team name, optional"><button class="tournament-button" type="submit">Submit registration</button><span role="status"></span></form>` : ''}
  </article>`;
}

function renderStandings(standings) {
  return `<div class="table-viewport"><table class="standings-table"><thead><tr><th>Rank</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead><tbody>${(standings || []).map(row => `<tr><td>${row.rank}</td><td>${row.logo_url ? `<img class="team-logo" src="${escapeTournamentText(row.logo_url)}" alt="">` : ''}${escapeTournamentText(row.team_name || row.participant_name || row.name || 'Participant')}</td><td>${row.played}</td><td>${row.wins}</td><td>${row.draws}</td><td>${row.losses}</td><td>${row.goals_for}</td><td>${row.goals_against}</td><td>${row.goal_difference}</td><td><strong>${row.points}</strong></td></tr>`).join('') || '<tr><td colspan="10">No results yet.</td></tr>'}</tbody></table></div>`;
}

function cleanFixtureTeamLabel(label, fallback = 'Team') {
  const value = String(label || '').trim();
  if (!value) return fallback;
  const duplicateCollapse = value.replace(/^(.*?)(?:\s*-\s*\1)\s*$/i, '$1');
  if (duplicateCollapse && duplicateCollapse !== value) return duplicateCollapse;
  return value;
}

function renderFixtures(fixtures, groups) {
  const groupNames = new Map((groups || []).map(group => [group.id, group.name]));
  return `<div class="fixture-list">${(fixtures || []).map(fixture => {
    const homeLabel = cleanFixtureTeamLabel(fixture.home_team || fixture.home_registration_name || 'Home');
    const awayLabel = cleanFixtureTeamLabel(fixture.away_team || fixture.away_registration_name || 'Away');
    return `<article class="fixture-row"><span>${escapeTournamentText(fixture.stage === 'group' ? (groupNames.get(fixture.group_id) || 'Group') : `Round ${fixture.round_number}`)}</span><strong>${fixture.home_logo_url ? `<img class="team-logo" src="${escapeTournamentText(fixture.home_logo_url)}" alt="">` : ''}${escapeTournamentText(homeLabel)} ${fixture.home_score == null ? 'vs' : `${fixture.home_score} - ${fixture.away_score}` } ${fixture.away_logo_url ? `<img class="team-logo" src="${escapeTournamentText(fixture.away_logo_url)}" alt="">` : ''}${escapeTournamentText(awayLabel)}</strong><small>${escapeTournamentText(fixture.status)}${fixture.deadline ? ` · ${formatTournamentDate(fixture.deadline)}` : ''}</small></article>`;
  }).join('') || '<p class="tournament-state">No fixtures yet.</p>'}</div>`;
}

function renderQualifications(qualifications, registrations) {
  const names = new Map((registrations || []).map(item => [item.id, participantLabel(item)]));
  return `<div class="qualification-list">${(qualifications || []).map(item => `<span>${escapeTournamentText(names.get(item.registration_id) || 'Team')} · ${escapeTournamentText(item.status)}${item.destination_stage ? ` · ${escapeTournamentText(item.destination_stage)}` : ''}</span>`).join('') || '<p class="tournament-state">Qualification has not been generated yet.</p>'}</div>`;
}

async function showTournament(id) {
  const response = await fetch(`${window.API_BASE_URL}/tournaments/${encodeURIComponent(id)}`);
  const result = await response.json();
  if (!response.ok || !result.success) return;
  const tournament = result.data;
  const details = document.getElementById('tournament-details');
  const format = tournament.format_config?.format_type || tournament.format_type || 'knockout';
  const formatLabel = format.replace(/_/g, ' ');
  const activeView = 'overview';

  const overview = `
    <section class="mobile-tournament-overview">
      <div class="mobile-tournament-logo-wrap">
        <div class="mobile-tournament-logo">🏆</div>
      </div>
      <div class="mobile-tournament-summary">
        <h3>${escapeTournamentText(tournament.name)}</h3>
        <p>${escapeTournamentText(formatLabel)}</p>
      </div>
      <div class="mobile-tournament-meta-grid">
        <div><span>Status</span><strong>${escapeTournamentText(tournamentStatusLabel(tournament.status))}</strong></div>
        <div><span>Teams</span><strong>${escapeTournamentText((tournament.teams || []).length || '0')}</strong></div>
        <div><span>Fixtures</span><strong>${escapeTournamentText((tournament.fixtures || []).length || '0')}</strong></div>
        <div><span>Start</span><strong>${formatTournamentDate(tournament.starts_at)}</strong></div>
      </div>
      ${tournament.description ? `<p class="mobile-tournament-description">${escapeTournamentText(tournament.description)}</p>` : ''}
    </section>
  `;

  const standings = async () => {
    const standingsResponse = await fetch(`${window.API_BASE_URL}/tournaments/${encodeURIComponent(id)}/standings`);
    const standingsResult = await standingsResponse.json();
    return renderStandings(standingsResult.success ? standingsResult.data : []);
  };

  const fixtures = async () => renderFixtures(tournament.fixtures, tournament.groups);
  const stats = `
    <section class="mobile-tournament-stats">
      <div class="mobile-tournament-stat-card"><span>Registrations</span><strong>${escapeTournamentText((tournament.registrations || []).length || '0')}</strong></div>
      <div class="mobile-tournament-stat-card"><span>Approved</span><strong>${escapeTournamentText((tournament.registrations || []).filter(item => item.status === 'approved').length || '0')}</strong></div>
      <div class="mobile-tournament-stat-card"><span>Completed</span><strong>${escapeTournamentText((tournament.fixtures || []).filter(item => item.status === 'completed').length || '0')}</strong></div>
      <div class="mobile-tournament-stat-card"><span>Prize</span><strong>${escapeTournamentText(tournament.prize_info || 'No prize set')}</strong></div>
    </section>
  `;

  const shellContent = `
    <div class="mobile-tournament-shell" data-tournament-shell="${escapeTournamentText(tournament.id)}">
      <header class="mobile-tournament-header">
        <button class="mobile-tournament-back" type="button" aria-label="Back to tournaments" onclick="document.getElementById('tournament-details').innerHTML=''">←</button>
        <div class="mobile-tournament-header-text">
          <h2>${escapeTournamentText(tournament.name)}</h2>
          <p>${escapeTournamentText(formatLabel)}</p>
        </div>
        <div class="mobile-tournament-actions">
          <button type="button" aria-label="Share">↗</button>
          <button type="button" aria-label="More menu">⋮</button>
        </div>
      </header>

      <nav class="mobile-tournament-nav" aria-label="Tournament pages">
        <button type="button" class="active" data-tournament-view="overview">Home</button>
        <button type="button" data-tournament-view="fixtures">Fixtures</button>
        <button type="button" data-tournament-view="standings">Standings</button>
        <button type="button" data-tournament-view="stats">Stats</button>
      </nav>

      <div class="mobile-tournament-body">
        ${overview}
      </div>
    </div>
  `;

  details.innerHTML = shellContent;

  const body = details.querySelector('.mobile-tournament-body');
  const navButtons = details.querySelectorAll('[data-tournament-view]');

  const setActiveView = async (view) => {
    navButtons.forEach(button => {
      button.classList.toggle('active', button.dataset.tournamentView === view);
    });

    if (view === 'overview') {
      body.innerHTML = overview;
      return;
    }

    if (view === 'fixtures') {
      body.innerHTML = await fixtures();
      return;
    }

    if (view === 'standings') {
      body.innerHTML = await standings();
      return;
    }

    body.innerHTML = stats;
  };

  navButtons.forEach(button => {
    button.addEventListener('click', () => setActiveView(button.dataset.tournamentView));
  });

  details.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.addEventListener('submit', async event => {
  const form = event.target.closest('[data-register-id]');
  if (!form) return;
  event.preventDefault();
  const status = form.querySelector('[role="status"]');
  const body = Object.fromEntries(new FormData(form));
  status.textContent = 'Submitting...';
  try {
    const response = await fetch(`${window.API_BASE_URL}/tournaments/${encodeURIComponent(form.dataset.registerId)}/registrations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || 'Registration failed.');
    status.textContent = 'Registration submitted for admin approval.';
    form.reset();
  } catch (error) { status.textContent = error.message; }
});

document.addEventListener('click', event => {
  const toggle = event.target.closest('[data-register-toggle]');
  if (!toggle) return;
  const form = document.querySelector(`[data-register-id="${CSS.escape(toggle.dataset.registerToggle)}"]`);
  if (form) { form.hidden = !form.hidden; if (!form.hidden) form.querySelector('input')?.focus(); }
});

document.getElementById('refresh-tournaments')?.addEventListener('click', loadTournaments);
document.getElementById('mobileMenuToggle')?.addEventListener('click', () => document.getElementById('navbarNav')?.classList.toggle('active'));

if (typeof document !== 'undefined') loadTournaments();

if (typeof module !== 'undefined') module.exports = { escapeTournamentText, renderTournament };
