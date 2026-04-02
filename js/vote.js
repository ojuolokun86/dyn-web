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
    console.log('🔍 Vote page: Initializing...');
    const res = await fetch(`${API_BASE_URL}/events/current`);
    console.log('🔍 Vote page: Current events response:', res);
    const evt = await res.json();
    console.log('🔍 Vote page: Current events data:', evt);
    if (!evt.success || !evt.data) {
      console.log('🔍 Vote page: No event data from current endpoint');
      eventInfo.innerHTML = '<p>No active event right now.</p>';
      grid.innerHTML = '<p class="empty-state">No contenders</p>';
      return;
    }

    currentEvent = evt.data;
    console.log('🔍 Vote page: Current event set:', currentEvent);
    console.log('🔍 Vote page: Current event ID:', currentEvent.id, 'Type:', typeof currentEvent.id);
    eventInfo.innerHTML = `<h3>${escapeHtml(currentEvent.name)}</h3><p>${escapeHtml(currentEvent.description||'')}</p>`;

    // load vote tables and contenders
    await Promise.all([loadVoteTables(), loadContenders()]);
  } catch (err) {
    console.error('🔍 Vote page: Error initializing vote page:', err);
    eventInfo.innerHTML = '<p>Error loading event.</p>';
    grid.innerHTML = '<p class="empty-state">Unable to load contenders</p>';
  }
}

async function loadContenders() {
  const grid = document.getElementById('contendersGrid');
  grid.innerHTML = 'Loading contenders...';

  try {
    console.log('🔍 Vote page: Loading contenders for event:', currentEvent.id);
    const res = await fetch(`${API_BASE_URL}/events/${currentEvent.id}/contenders`);
    console.log('🔍 Vote page: Contenders response:', res);
    const result = await res.json();
    console.log('🔍 Vote page: Contenders data:', result);
    if (!result.success) {
      console.log('🔍 Vote page: Contenders API returned not success');
      grid.innerHTML = '<p class="empty-state">No contenders found</p>';
      return;
    }

    contenders = result.data || [];
    console.log('🔍 Vote page: Loaded contenders count:', contenders.length);
    if (contenders.length === 0) {
      console.log('🔍 Vote page: No contenders in data array');
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
    console.log('🔍 Vote page: Loading vote tables for event:', currentEvent.id);
    const res = await fetch(`${API_BASE_URL}/events/${currentEvent.id}/vote-tables`);
    console.log('🔍 Vote page: Vote tables response:', res);
    const result = await res.json();
    console.log('🔍 Vote page: Vote tables data:', result);

    if (!result.success) {
      console.log('🔍 Vote page: No vote tables configured');
      container.innerHTML = '<p class="small">No vote tables configured</p>';
      voteTables = [];
      return;
    }

    voteTables = result.data || [];
    console.log('🔍 Vote page: Loaded vote tables:', voteTables);
    console.log('🔍 Vote page: Number of vote tables:', voteTables.length);

    if (voteTables.length === 0) {
      console.log('🔍 Vote page: Vote tables array is empty');
      container.innerHTML = '<p class="small">No vote tables configured</p>';
      return;
    }

    // Ensure all IDs are strings for consistency
    voteTables = voteTables.map(vt => ({ ...vt, id: String(vt.id) }));
    console.log('🔍 Vote page: Processed vote tables:', voteTables);

    container.innerHTML = voteTables.map(vt => `
      <label class="vote-table-option"><input type="radio" name="voteTable" value="${vt.id}" data-points="${vt.points_per_vote}"> Table ${vt.table_number} — ${vt.points_per_vote} pts
      </label>
    `).join('');

    // radio change
    container.querySelectorAll('input[name="voteTable"]').forEach(r => {
      r.addEventListener('change', (e) => {
        selectedTableId = String(e.target.value); // Ensure string type
        console.log('🔍 Vote: Selected vote table:', selectedTableId, 'Type:', typeof selectedTableId);
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

  // Track votes per table for current event
  let votesRecord = JSON.parse(localStorage.getItem('votesRecord')) || {};
  const eventKey = `event_${currentEvent.id}`;
  if (!votesRecord[eventKey]) votesRecord[eventKey] = {};
  votesRecord[eventKey][selectedTableId] = true;
  localStorage.setItem('votesRecord', JSON.stringify(votesRecord));

  console.log('🔍 Vote: Recorded vote for table:', selectedTableId);
  console.log('🔍 Vote: Current votes record:', votesRecord[eventKey]);
  console.log('🔍 Vote: All vote tables:', voteTables.map(vt => ({ id: vt.id, table_number: vt.table_number })));

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
        msg.innerHTML = '<div class="message success">Vote recorded!</div>';
        // Check if all vote tables have been used
        const allVoted = voteTables.every(vt => votesRecord[eventKey][vt.id]);
        console.log('🔍 Vote: All voted check result:', allVoted, 'for tables:', voteTables.map(vt => vt.id), 'with record:', votesRecord[eventKey]);
        if (allVoted) {
          msg.innerHTML = '<div class="message success">All votes cast! Redirecting to results...</div>';
          setTimeout(() => {
            window.location.href = `results.html?eventId=${currentEvent.id}`;
          }, 1500);
        } else {
          msg.innerHTML += '<div class="message info">Vote for all tables to see results.</div>';
        }
        await loadContenders();
        return;
      } else if (r.error && r.error.includes('already voted')) {
        msg.innerHTML = '<div class="message error">You have already voted using this vote table</div>';
        // Check if all vote tables have been used
        const allVoted = voteTables.every(vt => votesRecord[eventKey][vt.id]);
        console.log('🔍 Vote: All voted check result (already voted):', allVoted);
        if (allVoted) {
          msg.innerHTML = '<div class="message success">All votes cast! Redirecting to results...</div>';
          setTimeout(() => {
            window.location.href = `results.html?eventId=${currentEvent.id}`;
          }, 1500);
        }
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
    // Check if all vote tables have been used
    const allVoted = voteTables.every(vt => votesRecord[eventKey][vt.id]);
    console.log('🔍 Vote: All voted check result (fallback):', allVoted, 'for tables:', voteTables.map(vt => vt.id), 'with record:', votesRecord[eventKey]);
    if (allVoted) {
      msg.innerHTML = '<div class="message success">All votes cast! Redirecting to results...</div>';
      setTimeout(() => {
        window.location.href = `results.html?eventId=${currentEvent.id}`;
      }, 1500);
    } else {
      msg.innerHTML += '<div class="message info">Vote for all tables to see results.</div>';
    }
    await loadContenders();
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/[&<>"]+/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c));
}

// Adding more detailed logging to debug the redirection issue
function handleVoteFromCard(voteTableId) {
    console.log(`Attempting to vote for table ID: ${voteTableId}`);

    fetch(`/api/events/${currentEvent.id}/vote`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tableId: voteTableId }),
    })
        .then(response => {
            console.log(`Vote response status: ${response.status}`);
            if (response.ok) {
                console.log('Vote successful, checking if all tables are voted.');
                checkIfAllTablesVoted();
            } else {
                // Handle non-JSON responses
                response.text().then(text => {
                    console.error('Vote failed with status:', response.status, 'Response:', text);
                    try {
                        const data = JSON.parse(text);
                        if (data.error === 'already_voted') {
                            console.log('Already voted for this table, checking if all tables are voted.');
                            checkIfAllTablesVoted();
                        } else {
                            console.error('Unexpected error:', data);
                        }
                    } catch (e) {
                        console.error('Response is not JSON:', text);
                    }
                }).catch(error => {
                    console.error('Error reading response:', error);
                });
            }
        })
        .catch(error => {
            console.error('Error during vote submission:', error);
        });
}

function checkIfAllTablesVoted() {
    console.log('Checking if all tables are voted.');
    const allTablesVoted = voteTables.every(table => table.voted);
    console.log(`All tables voted: ${allTablesVoted}`);
    if (allTablesVoted) {
        console.log('All tables voted, redirecting to results page.');
        alert('Thank you for voting! You can now view the results on the results page.');
        window.location.href = '/results.html';
    } else {
        console.log('Not all tables are voted yet.');
    }
}
