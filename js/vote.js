// Voting page client logic
document.addEventListener('DOMContentLoaded', () => {
  initVotePage();
});

let currentEvent = null;
let contenders = [];
let voteTables = [];
let selectedContenderId = null;
let selectedTableId = null;

async function initVotePage() {
  const eventInfo = document.getElementById('currentEventInfo');
  const grid = document.getElementById('contendersGrid');

  try {
    const res = await fetch(`${API_BASE_URL}/events/current`);
    const evt = await res.json();
    if (!evt.success || !evt.data) {
      eventInfo.innerHTML = '<p>No active event right now.</p>';
      grid.innerHTML = '<p class="empty-state">No contenders</p>';
      return;
    }

    currentEvent = evt.data;
    eventInfo.innerHTML = `<h3>${escapeHtml(currentEvent.name)}</h3><p>${escapeHtml(currentEvent.description||'')}</p>`;

    // load vote tables and contenders
    await Promise.all([loadVoteTables(), loadContenders()]);
  } catch (err) {
    console.error('Error initializing vote page', err);
    eventInfo.innerHTML = '<p>Error loading event.</p>';
    grid.innerHTML = '<p class="empty-state">Unable to load contenders</p>';
  }
}

async function loadContenders() {
  const grid = document.getElementById('contendersGrid');
  grid.innerHTML = 'Loading contenders...';

  try {
    const res = await fetch(`${API_BASE_URL}/events/${currentEvent.id}/contenders`);
    const result = await res.json();
    if (!result.success) {
      grid.innerHTML = '<p class="empty-state">No contenders found</p>';
      return;
    }

    contenders = result.data || [];
    if (contenders.length === 0) {
      grid.innerHTML = '<p class="empty-state">No contenders added yet</p>';
      return;
    }

    grid.innerHTML = contenders.map((c, index) => `
      <div class="contender-video-card" data-id="${c.id}" style="animation-delay: ${index * 0.1}s">
        <div class="video-container" onclick="playVideo('${c.video}', '${c.name}')">
          ${c.video ? `
            <video src="${c.video}" muted loop playsinline>
              Your browser does not support the video tag.
            </video>
            <div class="video-overlay">
              <div class="play-button">▶</div>
            </div>
          ` : `
            <div class="video-container" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
              <div class="no-video-placeholder" style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; font-size: 48px; opacity: 0.5;">
                🎬
              </div>
            </div>
          `}
        </div>
        <div class="vote-card-content">
          <h3 class="vote-card-name">${escapeHtml(c.name)}</h3>
          <div class="vote-card-meta">
            <span class="vote-meta-tag">${escapeHtml(c.class || 'Unknown')}</span>
            <span class="vote-meta-tag">${escapeHtml(c.country || 'Unknown')}</span>
          </div>
          <p class="vote-card-description">${escapeHtml(c.description || '')}</p>
          <button class="vote-card-button" onclick="selectContender('${c.id}')">Select for Voting</button>
        </div>
      </div>
    `).join('');

    // attach listeners
    document.querySelectorAll('[data-action="select"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        selectContender(id);
      });
    });
  } catch (err) {
    console.error('Error loading contenders', err);
    grid.innerHTML = '<p class="empty-state">Error loading contenders</p>';
  }
}

async function loadVoteTables() {
  const container = document.getElementById('voteTablesContainer');
  container.innerHTML = 'Loading...';
  try {
    const res = await fetch(`${API_BASE_URL}/events/${currentEvent.id}/vote-tables`);
    const result = await res.json();
    if (!result.success) {
      container.innerHTML = '<p class="small">No vote tables configured</p>';
      voteTables = [];
      return;
    }

    voteTables = result.data || [];
    if (voteTables.length === 0) {
      container.innerHTML = '<p class="small">No vote tables configured</p>';
      return;
    }

    container.innerHTML = voteTables.map(vt => `
      <label class="vote-table-option"><input type="radio" name="voteTable" value="${vt.id}" data-points="${vt.points_per_vote}"> Table ${vt.table_number} — ${vt.points_per_vote} pts
      </label>
    `).join('');

    // radio change
    container.querySelectorAll('input[name="voteTable"]').forEach(r => {
      r.addEventListener('change', (e) => {
        selectedTableId = e.target.value;
      });
    });
  } catch (err) {
    console.error('Error loading vote tables', err);
    container.innerHTML = '<p class="small">Error loading vote tables</p>';
  }
}

// Play video in modal
function playVideo(videoUrl, contenderName) {
  if (!videoUrl) return;
  
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease-out;
  `;
  
  modal.innerHTML = `
    <div style="background: white; border-radius: 20px; overflow: hidden; max-width: 90%; max-height: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.5); animation: slideInUp 0.5s ease-out;">
      <div style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center;">
        <h3 style="margin: 0; font-size: 24px;">🎬 ${escapeHtml(contenderName)}</h3>
      </div>
      <video controls autoplay style="width: 100%; max-height: 500px; object-fit: cover;">
        <source src="${videoUrl}" type="video/mp4">
        Your browser does not support the video tag.
      </video>
      <div style="padding: 15px; text-align: center; background: #f8f9fa;">
        <button onclick="this.closest('div[style*=fixed]').remove()" style="background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 600;">Close</button>
      </div>
    </div>
  `;
  
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  
  document.body.appendChild(modal);
}

function selectContender(id) {
  selectedContenderId = id;
  const c = contenders.find(x => x.id === id);
  document.getElementById('selectedContenderName').textContent = c ? c.name : 'Select a contender';
  document.getElementById('voteControls').classList.remove('hidden');
  
  // Add visual selection feedback
  document.querySelectorAll('.contender-video-card').forEach(card => {
    card.classList.remove('selected');
  });
  const selectedCard = document.querySelector(`[data-id="${id}"]`);
  if (selectedCard) {
    selectedCard.classList.add('selected');
    selectedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'castVoteBtn') handleCastVote();
});

async function handleCastVote() {
  const msg = document.getElementById('voteMessage');
  msg.innerHTML = '';
  if (!selectedContenderId) {
    msg.innerHTML = '<div class="message error">Please select a contender</div>';
    return;
  }
  if (!selectedTableId && voteTables.length>0) {
    msg.innerHTML = '<div class="message error">Please select a vote table</div>';
    return;
  }

  // Try to call backend vote endpoint if exists
  try {
    const payload = { contenderId: selectedContenderId, voteTableId: selectedTableId };
    const res = await fetch(`${API_BASE_URL}/events/${currentEvent.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const r = await res.json();
      if (r.success) {
        msg.innerHTML = '<div class="message success">Vote recorded! Redirecting to results...</div>';
        // redirect to results page after 1.5 seconds
        setTimeout(() => {
          window.location.href = `results.html?eventId=${currentEvent.id}`;
        }, 1500);
        return;
      }
    }
  } catch (err) {
    // endpoint may not exist — fall back to local update
    console.warn('vote endpoint failed, falling back to local update', err);
  }

  // Fallback: update local snapshot and UI
  const idx = contenders.findIndex(c => c.id === selectedContenderId);
  if (idx !== -1) {
    const points = voteTables.find(v=>v.id===selectedTableId)?.points_per_vote || 1;
    contenders[idx].total_points = (contenders[idx].total_points||0) + points;
    // Update localStorage snapshot
    const snapshot = JSON.parse(localStorage.getItem('contenders')) || [];
    const sIdx = snapshot.findIndex(s=>s.id===selectedContenderId);
    if (sIdx !== -1) snapshot[sIdx].total_points = contenders[idx].total_points;
    localStorage.setItem('contenders', JSON.stringify(snapshot));
    msg.innerHTML = '<div class="message success">Vote recorded locally (offline mode).</div>';
    await loadContenders();
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/[&<>"]+/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c));
}
