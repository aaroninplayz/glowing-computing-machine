// Centralized API Service

const BASE_URL = '/api';

export async function fetchCurrentUser(userId = null) {
  const headers = {};
  if (userId) headers['x-user-id'] = userId;
  const res = await fetch(`${BASE_URL}/auth/me`, { headers });
  if (!res.ok) throw new Error('Failed to fetch user profile');
  return res.json();
}

export async function fetchTasks() {
  const res = await fetch(`${BASE_URL}/tasks`);
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

export async function suggestTask({ title, description, total_points, user_id }) {
  const res = await fetch(`${BASE_URL}/tasks/suggest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, total_points, user_id })
  });
  if (!res.ok) throw new Error('Failed to suggest task');
  return res.json();
}

export async function upvoteTask(taskId, userId = null) {
  const res = await fetch(`${BASE_URL}/tasks/${taskId}/upvote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId })
  });
  if (!res.ok) throw new Error('Failed to upvote task');
  return res.json();
}

export async function assignTask(taskId, { team_id, user_id, assigned_by }) {
  const res = await fetch(`${BASE_URL}/tasks/${taskId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team_id, user_id, assigned_by })
  });
  if (!res.ok) throw new Error('Failed to assign task');
  return res.json();
}

export async function submitTaskProof(taskId, formData) {
  const res = await fetch(`${BASE_URL}/tasks/${taskId}/submit`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('Failed to submit proof');
  return res.json();
}

export async function approveTask(taskId, { submission_id, reviewed_by } = {}) {
  const res = await fetch(`${BASE_URL}/tasks/${taskId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ submission_id, reviewed_by })
  });
  if (!res.ok) throw new Error('Failed to approve task');
  return res.json();
}

export async function fetchTeams() {
  const res = await fetch(`${BASE_URL}/teams`);
  if (!res.ok) throw new Error('Failed to fetch teams');
  return res.json();
}

export async function overridePoints(teamId, userId, customPointShare) {
  const res = await fetch(`${BASE_URL}/teams/${teamId}/points/override`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, custom_point_share: customPointShare })
  });
  if (!res.ok) throw new Error('Failed to override points');
  return res.json();
}

export async function dissolveTeam(teamId, reason = 'MANUAL') {
  const res = await fetch(`${BASE_URL}/teams/${teamId}/dissolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason })
  });
  if (!res.ok) throw new Error('Failed to dissolve team');
  return res.json();
}

export async function fetchHallOfFame() {
  const res = await fetch(`${BASE_URL}/hall-of-fame`);
  if (!res.ok) throw new Error('Failed to fetch Hall of Fame data');
  return res.json();
}

export async function awardTitle(data) {
  const res = await fetch(`${BASE_URL}/hall-of-fame/award`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to award title');
  return res.json();
}
