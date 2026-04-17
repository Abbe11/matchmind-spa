// MatchMind — Main Application Logic

// APP STATE
const state = {
  currentTeam: null,
  h2hTeamA: null,
  h2hTeamB: null,
  currentStandingsLeague: { id: '4328', season: '2024-2025' },
  currentFixturesLeague: '4328',
};

// HELPERS
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(timeStr) {
  if (!timeStr) return 'TBD';
  return timeStr.slice(0, 5);
}

function showSection(name) {
  document.querySelectorAll('.section').forEach(s => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });
  const target = document.getElementById(`section-${name}`);
  if (target) {
    target.classList.add('active');
    target.classList.remove('hidden');
  }
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === name);
  });
  document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === name);
  });
}

function teamImg(src, alt = '') {
  const url = src || '';
  return `<img src="${url}" alt="${alt}" onerror="this.style.display='none'" />`;
}

// NAVIGATION
document.querySelectorAll('.nav-btn, .mobile-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const section = btn.dataset.section;
    showSection(section);
    if (section === 'standings') loadStandings();
    if (section === 'fixtures')  loadFixtures();
    if (section === 'favourites') renderFavourites();
  });
});

// SEARCH
const searchInput   = document.getElementById('search-input');
const searchBtn     = document.getElementById('search-btn');
const searchResults = document.getElementById('search-results');
const searchLoading = document.getElementById('search-loading');
const searchEmpty   = document.getElementById('search-empty');

async function doSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  searchResults.innerHTML = '';
  searchEmpty.classList.add('hidden');
  searchLoading.classList.remove('hidden');

  try {
    const teams = await searchTeams(query);
    searchLoading.classList.add('hidden');

    const soccerTeams = teams.filter(t => t.strSport === 'Soccer');

    if (!soccerTeams.length) {
      searchEmpty.classList.remove('hidden');
      return;
    }

    searchResults.innerHTML = soccerTeams.map(team => `
      <div class="team-card" data-id="${team.idTeam}">
        ${teamImg(team.strTeamBadge, team.strTeam)}
        <div>
          <div class="team-card-name">${team.strTeam}</div>
          <div class="team-card-meta">${team.strLeague || '—'} · ${team.strCountry || '—'}</div>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.team-card').forEach(card => {
      card.addEventListener('click', () => {
        const teamObj = soccerTeams.find(t => t.idTeam === card.dataset.id);
        loadTeamProfile(teamObj);
      });
    });

  } catch (err) {
    searchLoading.classList.add('hidden');
    searchResults.innerHTML = `<p class="text-red-400 col-span-2">Error fetching results. Please try again.</p>`;
  }
}

searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

// TEAM PROFILE
async function loadTeamProfile(team) {
  state.currentTeam = team;
  showSection('team');

  document.getElementById('team-header').innerHTML = `
    <div class="w-20 h-20 flex-shrink-0 bg-[#1e2a38] rounded-xl flex items-center justify-center p-2">
      ${teamImg(team.strTeamBadge, team.strTeam)}
    </div>
    <div>
      <h2 class="font-display text-4xl lg:text-5xl">${team.strTeam}</h2>
      <p class="text-gray-400 text-sm mt-1">
        ${team.strLeague || '—'} &nbsp;·&nbsp;
        ${team.strCountry || '—'} &nbsp;·&nbsp;
        Founded ${team.intFormedYear || '—'}
      </p>
      ${team.strStadium ? `<p class="text-gray-500 text-xs mt-1">🏟️ ${team.strStadium}</p>` : ''}
    </div>
  `;

  const desc = team.strDescriptionEN || 'No description available for this team.';
  document.getElementById('team-desc-text').textContent = desc.slice(0, 600) + (desc.length > 600 ? '...' : '');

  updateFavBtn(team.idTeam);

  document.getElementById('team-form').innerHTML = '<div class="text-gray-500 text-sm">Loading...</div>';
  document.getElementById('team-next-events').innerHTML = '<div class="text-gray-500 text-sm">Loading...</div>';

  try {
    const [lastEvents, nextEvents] = await Promise.all([
      getLastEvents(team.idTeam),
      getNextEvents(team.idTeam)
    ]);
    renderTeamForm(lastEvents, team.strTeam);
    renderLastEvents(lastEvents);
    renderNextEvents(nextEvents);
  } catch (err) {
    document.getElementById('team-form').innerHTML = '<p class="text-red-400 text-sm">Could not load events.</p>';
  }
}

function renderTeamForm(events, teamName) {
  const container = document.getElementById('team-form');
  if (!events.length) {
    container.innerHTML = '<p class="text-gray-500 text-sm">No recent results.</p>';
    return;
  }
  const badges = events.slice(0, 5).map(e => {
    const homeScore = parseInt(e.intHomeScore);
    const awayScore = parseInt(e.intAwayScore);
    const isHome = e.strHomeTeam === teamName;
    let result = 'D';
    if (!isNaN(homeScore) && !isNaN(awayScore)) {
      if (homeScore === awayScore) result = 'D';
      else if ((isHome && homeScore > awayScore) || (!isHome && awayScore > homeScore)) result = 'W';
      else result = 'L';
    }
    return `<div class="form-badge ${result}" title="${e.strHomeTeam} vs ${e.strAwayTeam}">${result}</div>`;
  });
  container.innerHTML = badges.join('');
}

function renderLastEvents(events) {
  const container = document.getElementById('team-last-events');
  if (!events.length) {
    container.innerHTML = '<p class="text-gray-500 text-sm mt-3">No recent results available.</p>';
    return;
  }
  container.innerHTML = events.slice(0, 5).map(e => `
    <div class="event-card mt-2">
      <div>
        <div class="event-teams">${e.strHomeTeam} vs ${e.strAwayTeam}</div>
        <div class="event-date">${formatDate(e.dateEvent)}</div>
      </div>
      <div class="event-score">${e.intHomeScore ?? '?'} – ${e.intAwayScore ?? '?'}</div>
    </div>
  `).join('');
}

function renderNextEvents(events) {
  const container = document.getElementById('team-next-events');
  if (!events.length) {
    container.innerHTML = '<p class="text-gray-500 text-sm">No upcoming fixtures found.</p>';
    return;
  }
  container.innerHTML = events.slice(0, 5).map(e => `
    <div class="event-card">
      <div>
        <div class="event-teams">${e.strHomeTeam} vs ${e.strAwayTeam}</div>
        <div class="event-date">${formatDate(e.dateEvent)} · ${formatTime(e.strTime)}</div>
      </div>
      <div class="text-gray-500 text-xs">${e.strLeague || ''}</div>
    </div>
  `).join('');
}

document.getElementById('back-btn').addEventListener('click', () => showSection('search'));

// STANDINGS
async function loadStandings() {
  const { id, season } = state.currentStandingsLeague;
  const tableContainer = document.getElementById('standings-table');
  const loading = document.getElementById('standings-loading');

  tableContainer.innerHTML = '';
  loading.classList.remove('hidden');

  try {
    const table = await getStandings(id, season);
    loading.classList.add('hidden');

    if (!table.length) {
      tableContainer.innerHTML = '<p class="text-gray-500 p-6">No standings data available.</p>';
      return;
    }

    const header = `
      <div class="standings-row standings-header">
        <span>#</span><span></span><span>Team</span>
        <span class="text-center">P</span><span class="text-center">W</span>
        <span class="text-center">D</span><span class="text-center">L</span>
        <span class="text-center">GD</span><span class="text-center">Pts</span>
      </div>
    `;

    const rows = table.map((row, i) => `
      <div class="standings-row">
        <span class="text-gray-500 text-xs">${i + 1}</span>
        <span>${teamImg(row.strTeamBadge, row.strTeam)}</span>
        <span class="font-medium text-sm truncate">${row.strTeam}</span>
        <span class="text-center text-gray-400">${row.intPlayed}</span>
        <span class="text-center text-green-400">${row.intWin}</span>
        <span class="text-center text-yellow-400">${row.intDraw}</span>
        <span class="text-center text-red-400">${row.intLoss}</span>
        <span class="text-center text-gray-300">${row.intGoalDifference > 0 ? '+' : ''}${row.intGoalDifference}</span>
        <span class="text-center"><span class="pts-badge">${row.intPoints}</span></span>
      </div>
    `).join('');

    tableContainer.innerHTML = header + rows;

  } catch (err) {
    loading.classList.add('hidden');
    tableContainer.innerHTML = '<p class="text-red-400 p-6">Error loading standings.</p>';
  }
}

document.querySelectorAll('#section-standings .league-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#section-standings .league-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.currentStandingsLeague = { id: btn.dataset.id, season: btn.dataset.season };
    loadStandings();
  });
});

// FIXTURES
async function loadFixtures() {
  const container = document.getElementById('fixtures-list');
  const loading   = document.getElementById('fixtures-loading');

  container.innerHTML = '';
  loading.classList.remove('hidden');

  try {
    const events = await getLeagueNextEvents(state.currentFixturesLeague);
    loading.classList.add('hidden');

    if (!events.length) {
      container.innerHTML = '<p class="text-gray-500">No upcoming fixtures found.</p>';
      return;
    }

    container.innerHTML = events.map(e => `
      <div class="fixture-card">
        <div class="fixture-team">
          ${teamImg(e.strHomeTeamBadge, e.strHomeTeam)}
          <span>${e.strHomeTeam}</span>
        </div>
        <div class="fixture-vs">
          <div class="fixture-time">${formatTime(e.strTime)}</div>
          <div class="fixture-date-label">${formatDate(e.dateEvent)}</div>
        </div>
        <div class="fixture-team right">
          ${teamImg(e.strAwayTeamBadge, e.strAwayTeam)}
          <span>${e.strAwayTeam}</span>
        </div>
      </div>
    `).join('');

  } catch (err) {
    loading.classList.add('hidden');
    container.innerHTML = '<p class="text-red-400">Error loading fixtures.</p>';
  }
}

document.querySelectorAll('#section-fixtures .league-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#section-fixtures .league-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.currentFixturesLeague = btn.dataset.leagueId;
    loadFixtures();
  });
});

// HEAD TO HEAD
function setupH2HSearch(inputId, dropdownId, selectedId, teamKey) {
  const input    = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  const selected = document.getElementById(selectedId);
  let debounceTimer;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const query = input.value.trim();
    if (!query) { dropdown.classList.add('hidden'); return; }

    debounceTimer = setTimeout(async () => {
      try {
        const teams  = await searchTeams(query);
        const soccer = teams.filter(t => t.strSport === 'Soccer').slice(0, 6);
        if (!soccer.length) { dropdown.classList.add('hidden'); return; }

        dropdown.innerHTML = soccer.map(t => `
          <div class="h2h-dropdown-item" data-id="${t.idTeam}">
            ${teamImg(t.strTeamBadge, t.strTeam)}
            <span>${t.strTeam}</span>
          </div>
        `).join('');
        dropdown.classList.remove('hidden');

        dropdown.querySelectorAll('.h2h-dropdown-item').forEach(item => {
          item.addEventListener('click', () => {
            const teamObj = soccer.find(t => t.idTeam === item.dataset.id);
            state[teamKey] = teamObj;
            input.value = teamObj.strTeam;
            dropdown.classList.add('hidden');
            selected.innerHTML = `
              <div class="selected-pill">
                ${teamImg(teamObj.strTeamBadge, teamObj.strTeam)}
                ${teamObj.strTeam}
              </div>
            `;
            document.getElementById('h2h-compare-btn').disabled = !(state.h2hTeamA && state.h2hTeamB);
          });
        });

      } catch (err) { console.error(err); }
    }, 350);
  });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
}

setupH2HSearch('h2h-team-a', 'h2h-results-a', 'h2h-selected-a', 'h2hTeamA');
setupH2HSearch('h2h-team-b', 'h2h-results-b', 'h2h-selected-b', 'h2hTeamB');

document.getElementById('h2h-compare-btn').addEventListener('click', async () => {
  if (!state.h2hTeamA || !state.h2hTeamB) return;
  const display = document.getElementById('h2h-results-display');
  const loading = document.getElementById('h2h-loading');

  display.innerHTML = '';
  loading.classList.remove('hidden');

  try {
    const events = await getH2HEvents(state.h2hTeamA.idTeam, state.h2hTeamB.idTeam);
    loading.classList.add('hidden');

    if (!events.length) {
      display.innerHTML = '<p class="text-gray-500">No head-to-head history found.</p>';
      return;
    }

    let aWins = 0, bWins = 0, draws = 0;
    events.forEach(e => {
      const hs  = parseInt(e.intHomeScore);
      const as_ = parseInt(e.intAwayScore);
      if (isNaN(hs) || isNaN(as_)) return;
      const aIsHome = e.strHomeTeam === state.h2hTeamA.strTeam;
      const aScore  = aIsHome ? hs : as_;
      const bScore  = aIsHome ? as_ : hs;
      if (aScore > bScore) aWins++;
      else if (bScore > aScore) bWins++;
      else draws++;
    });

    display.innerHTML = `
      <div class="h2h-summary mb-6">
        <div>
          <div class="h2h-stat-value text-primary">${aWins}</div>
          <div class="h2h-team-name mt-2">${state.h2hTeamA.strTeam}</div>
          <div class="h2h-stat-label">Wins</div>
        </div>
        <div>
          <div class="h2h-stat-value text-gray-400">${draws}</div>
          <div class="h2h-stat-label mt-2">Draws</div>
          <div class="text-xs text-gray-600 mt-1">${events.length} matches</div>
        </div>
        <div>
          <div class="h2h-stat-value text-white">${bWins}</div>
          <div class="h2h-team-name mt-2">${state.h2hTeamB.strTeam}</div>
          <div class="h2h-stat-label">Wins</div>
        </div>
      </div>
      <h4 class="font-display text-xl text-gray-400 mb-3">MATCH HISTORY</h4>
      <div class="space-y-2">
        ${events.slice(0, 10).map(e => `
          <div class="event-card">
            <div>
              <div class="event-teams">${e.strHomeTeam} vs ${e.strAwayTeam}</div>
              <div class="event-date">${formatDate(e.dateEvent)} · ${e.strLeague || ''}</div>
            </div>
            <div class="event-score">${e.intHomeScore ?? '?'} – ${e.intAwayScore ?? '?'}</div>
          </div>
        `).join('')}
      </div>
    `;

  } catch (err) {
    loading.classList.add('hidden');
    display.innerHTML = '<p class="text-red-400">Error loading H2H data.</p>';
  }
});

// FAVOURITES
function getFavourites() {
  return JSON.parse(localStorage.getItem('matchmind_favourites') || '[]');
}

function saveFavourites(favs) {
  localStorage.setItem('matchmind_favourites', JSON.stringify(favs));
}

function isFavourite(teamId) {
  return getFavourites().some(f => f.idTeam === teamId);
}

function addFavourite(team) {
  const favs = getFavourites();
  if (!favs.some(f => f.idTeam === team.idTeam)) {
    favs.push({
      idTeam: team.idTeam,
      strTeam: team.strTeam,
      strLeague: team.strLeague,
      strTeamBadge: team.strTeamBadge,
      strCountry: team.strCountry
    });
    saveFavourites(favs);
  }
}

function removeFavourite(teamId) {
  saveFavourites(getFavourites().filter(f => f.idTeam !== teamId));
}

function updateFavBtn(teamId) {
  const btn = document.getElementById('fav-btn');
  if (isFavourite(teamId)) {
    btn.textContent = '⭐ Saved';
    btn.classList.add('border-primary', 'text-primary');
  } else {
    btn.textContent = '⭐ Save';
    btn.classList.remove('border-primary', 'text-primary');
  }
}

document.getElementById('fav-btn').addEventListener('click', () => {
  if (!state.currentTeam) return;
  const id = state.currentTeam.idTeam;
  if (isFavourite(id)) removeFavourite(id);
  else addFavourite(state.currentTeam);
  updateFavBtn(id);
});

function renderFavourites() {
  const grid  = document.getElementById('favourites-grid');
  const empty = document.getElementById('favourites-empty');
  const favs  = getFavourites();

  if (!favs.length) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  grid.innerHTML = favs.map(team => `
    <div class="fav-card" data-id="${team.idTeam}">
      <button class="fav-remove-btn" data-id="${team.idTeam}">✕ Remove</button>
      ${teamImg(team.strTeamBadge, team.strTeam)}
      <div class="fav-card-name">${team.strTeam}</div>
      <div class="fav-card-meta">${team.strLeague || '—'} · ${team.strCountry || '—'}</div>
    </div>
  `).join('');

  grid.querySelectorAll('.fav-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.classList.contains('fav-remove-btn')) return;
      const team = favs.find(f => f.idTeam === card.dataset.id);
      if (team) loadTeamProfile(team);
    });
  });

  grid.querySelectorAll('.fav-remove-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      removeFavourite(btn.dataset.id);
      renderFavourites();
    });
  });
}

// INIT
showSection('search');