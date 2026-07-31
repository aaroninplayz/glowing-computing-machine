// Centralized API Service

const BASE_URL = '/api';

function getHeaders(userId = null, customHeaders = {}) {
  const headers = { ...customHeaders };
  if (userId) {
    headers['x-user-id'] = userId;
  }
  return headers;
}

export async function fetchCurrentUser(userId = null) {
  const res = await fetch(`${BASE_URL}/auth/me`, { headers: getHeaders(userId) });
  if (!res.ok) throw new Error('Failed to fetch user profile');
  return res.json();
}

export async function fetchTasks(userId = null) {
  const res = await fetch(`${BASE_URL}/tasks`, { headers: getHeaders(userId) });
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

export async function suggestTask({ title, description, total_points, task_type, mode, user_id }) {
  const res = await fetch(`${BASE_URL}/tasks/suggest`, {
    method: 'POST',
    headers: getHeaders(user_id, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ title, description, total_points, task_type, mode, user_id })
  });
  if (!res.ok) throw new Error('Failed to suggest task');
  return res.json();
}

export async function upvoteTask(taskId, userId = null) {
  const res = await fetch(`${BASE_URL}/tasks/${taskId}/upvote`, {
    method: 'POST',
    headers: getHeaders(userId, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ user_id: userId })
  });
  if (!res.ok) throw new Error('Failed to upvote task');
  return res.json();
}

export async function assignTask(taskId, { team_id, user_id, task_type, assigned_by }) {
  const res = await fetch(`${BASE_URL}/tasks/${taskId}/assign`, {
    method: 'POST',
    headers: getHeaders(assigned_by, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ team_id, user_id, task_type, assigned_by })
  });
  if (!res.ok) throw new Error('Failed to assign task');
  return res.json();
}

export async function submitTaskProof(taskId, formData, userId = null) {
  const res = await fetch(`${BASE_URL}/tasks/${taskId}/submit`, {
    method: 'POST',
    headers: getHeaders(userId),
    body: formData
  });
  if (!res.ok) throw new Error('Failed to submit proof');
  return res.json();
}

export async function approveTask(taskId, { submission_id, reviewed_by } = {}) {
  const res = await fetch(`${BASE_URL}/tasks/${taskId}/approve`, {
    method: 'POST',
    headers: getHeaders(reviewed_by, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ submission_id, reviewed_by })
  });
  if (!res.ok) throw new Error('Failed to approve task');
  return res.json();
}

export async function fetchTeams(userId = null) {
  const res = await fetch(`${BASE_URL}/teams`, { headers: getHeaders(userId) });
  if (!res.ok) throw new Error('Failed to fetch teams');
  return res.json();
}

export async function createTeam({ name, captain_id, member_ids, task_id, created_by }) {
  const res = await fetch(`${BASE_URL}/teams`, {
    method: 'POST',
    headers: getHeaders(created_by, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name, captain_id, member_ids, task_id })
  });
  if (!res.ok) throw new Error('Failed to create team');
  return res.json();
}

export async function overridePoints(teamId, userId, customPointShare, currentUserId = null) {
  const res = await fetch(`${BASE_URL}/teams/${teamId}/points/override`, {
    method: 'POST',
    headers: getHeaders(currentUserId, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ user_id: userId, custom_point_share: customPointShare })
  });
  if (!res.ok) throw new Error('Failed to override points');
  return res.json();
}

export async function dissolveTeam(teamId, reason = 'MANUAL', currentUserId = null) {
  const res = await fetch(`${BASE_URL}/teams/${teamId}/dissolve`, {
    method: 'POST',
    headers: getHeaders(currentUserId, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ reason })
  });
  if (!res.ok) throw new Error('Failed to dissolve team');
  return res.json();
}

export async function fetchHallOfFame(userId = null) {
  const res = await fetch(`${BASE_URL}/hall-of-fame`, { headers: getHeaders(userId) });
  if (!res.ok) throw new Error('Failed to fetch Hall of Fame data');
  return res.json();
}

export async function awardTitle(data, userId = null) {
  const res = await fetch(`${BASE_URL}/hall-of-fame/award`, {
    method: 'POST',
    headers: getHeaders(userId, { 'Content-Type': 'application/json' }),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to award title');
  return res.json();
}
