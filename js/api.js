// All API calls to TheSportsDB
// Base URL uses free test key 123 — no registration needed

const BASE_URL = 'https://www.thesportsdb.com/api/v1/json/123';

// Search teams by name
async function searchTeams(name) {
  const response = await fetch(`${BASE_URL}/searchteams.php?t=${encodeURIComponent(name)}`);
  const data = await response.json();
  return data.teams || [];
}

// Get last 5 results for a team
async function getLastEvents(teamId) {
  const response = await fetch(`${BASE_URL}/eventslast.php?id=${teamId}`);
  const data = await response.json();
  return data.results || [];
}

// Get next 5 upcoming fixtures for a team
async function getNextEvents(teamId) {
  const response = await fetch(`${BASE_URL}/eventsnext.php?id=${teamId}`);
  const data = await response.json();
  return data.events || [];
}
// Get league standings table
async function getStandings(leagueId, season) {
  const response = await fetch(`${BASE_URL}/lookuptable.php?l=${leagueId}&s=${season}`);
  const data = await response.json();
  return data.table || [];
}

// Get upcoming fixtures for a league
async function getLeagueNextEvents(leagueId) {
  const response = await fetch(`${BASE_URL}/eventsnextleague.php?id=${leagueId}`);
  const data = await response.json();
  return data.events || [];
}

// Get head-to-head events between two teams
async function getH2HEvents(teamId1, teamId2) {
  const response = await fetch(`${BASE_URL}/eventsvs.php?id=${teamId1}&id2=${teamId2}`);
  const data = await response.json();
  return data.eventvs || [];
}