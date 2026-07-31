import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [activeTab, setActiveTab] = useState('activities');
  const [devMode, setDevMode] = useState(true); // Shadow Lead Dev Mode Toggle (ADR 0006)
  const [activeRole, setActiveRole] = useState('SHADOW_LEAD');

  // State containers for API data
  const [activities, setActivities] = useState([]);
  const [teams, setTeams] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [resources, setResources] = useState([]);
  const [leaderboard, setLeaderboard] = useState({ individual: [], team: [] });
  const [leaderboardTab, setLeaderboardTab] = useState('individual');

  // Fetch initial data from REST API
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [actRes, teamRes, chalRes, resRes, leadRes] = await Promise.all([
        fetch('/api/activities').then(r => r.json()),
        fetch('/api/teams').then(r => r.json()),
        fetch('/api/challenges').then(r => r.json()),
        fetch('/api/resources').then(r => r.json()),
        fetch('/api/leaderboard').then(r => r.json()),
      ]);

      setActivities(actRes || []);
      setTeams(teamRes || []);
      setChallenges(chalRes || []);
      setResources(resRes || []);
      setLeaderboard(leadRes || { individual: [], team: [] });
    } catch (err) {
      console.error('Error fetching API data:', err);
    }
  };

  const handleCompleteActivity = async (activityId) => {
    try {
      await fetch(`/api/activities/${activityId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'u1' }),
      });
      fetchData();
    } catch (err) {
      console.error('Error completing activity:', err);
    }
  };

  const handleAutoRandomizeTeams = async () => {
    try {
      await fetch('/api/teams/auto-randomize', { method: 'POST' });
      fetchData();
    } catch (err) {
      console.error('Error randomizing teams:', err);
    }
  };

  return (
    <div className="app-container">
      {/* Top Header Nav */}
      <header className="header-nav">
        <div className="brand-title">
          <span>⚡ FORGE</span>
          <span style={{ fontSize: '0.8rem', opacity: 0.6, letterSpacing: '2px' }}>OPERATION OVERTHINK</span>
        </div>

        <nav className="nav-tabs">
          {['activities', 'challenges', 'teams', 'resources', 'leaderboard'].map(tab => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </nav>
      </header>

      {/* Shadow Lead Dev Mode Bar (ADR 0006) */}
      <div className="dev-mode-bar">
        <div className="dev-mode-badge">
          <span>🕶️ SHADOW LEAD DEV MODE</span>
          <span className="badge badge-purple">{activeRole}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>Switch View:</span>
          <button
            className="btn-secondary"
            style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
            onClick={() => setActiveRole(activeRole === 'SHADOW_LEAD' ? 'OPERATIVE' : 'SHADOW_LEAD')}
          >
            {activeRole === 'SHADOW_LEAD' ? 'Simulate Operative View ⚡' : 'Switch to Shadow Lead 🕶️'}
          </button>
        </div>
      </div>

      {/* Main Tab Views with Framer Motion Layout Transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.2 }}
        >
          {/* 1. LEARNING ACTIVITIES MODULE */}
          {activeTab === 'activities' && (
            <div>
              <h2 style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📚 Learning Activities</span>
                <span className="badge badge-cyan">{activities.length} Total</span>
              </h2>
              <div className="grid-cards">
                {activities.map(act => (
                  <motion.div whileHover={{ scale: 1.02 }} key={act.id} className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span className="badge badge-cyan">{act.points} PTS</span>
                      {act.requires_proof === 1 && <span className="badge badge-purple">Proof Required</span>}
                    </div>
                    <h3 style={{ marginBottom: '0.5rem' }}>{act.title}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
                      {act.description}
                    </p>
                    <button className="btn-primary" onClick={() => handleCompleteActivity(act.id)}>
                      Mark Complete ⚡
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* 2. COLLABORATIVE CHALLENGES MODULE */}
          {activeTab === 'challenges' && (
            <div>
              <h2 style={{ marginBottom: '1rem' }}>🛡️ Collaborative Challenges</h2>
              <div className="grid-cards">
                {challenges.map(chal => (
                  <motion.div whileHover={{ scale: 1.02 }} key={chal.id} className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span className="badge badge-green">{chal.points} PTS</span>
                      <span className="badge badge-purple">Vanguard Submission</span>
                    </div>
                    <h3 style={{ marginBottom: '0.5rem' }}>{chal.title}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                      {chal.description}
                    </p>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Sprint Window: {chal.start_date} to {chal.end_date}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* 3. TEAMS & AUTO-RANDOMIZER MODULE */}
          {activeTab === 'teams' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>👥 Community Teams (~45 Cohort Roster)</h2>
                {activeRole === 'SHADOW_LEAD' && (
                  <button className="btn-primary" onClick={handleAutoRandomizeTeams}>
                    🎲 1-Click Auto-Randomize Teams (ADR 0007)
                  </button>
                )}
              </div>
              <div className="grid-cards">
                {teams.map(team => (
                  <div key={team.id} className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h3>{team.name}</h3>
                      <span className="badge badge-purple">Captain: {team.captain_name || 'Unassigned'}</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                      {team.description}
                    </p>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>Roster Members:</h4>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {team.members?.map(m => (
                        <li key={m.id} style={{ fontSize: '0.85rem', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
                          ⚡ {m.name} <span style={{ opacity: 0.5 }}>({m.role})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. RESOURCE REPOSITORY MODULE */}
          {activeTab === 'resources' && (
            <div>
              <h2 style={{ marginBottom: '1rem' }}>📁 Shared Resources & Material Stream</h2>
              <div className="grid-cards">
                {resources.map(res => (
                  <motion.div whileHover={{ scale: 1.02 }} key={res.id} className="glass-card">
                    <span className="badge badge-cyan" style={{ marginBottom: '0.5rem' }}>{res.category}</span>
                    <h3 style={{ marginBottom: '0.5rem' }}>{res.title}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      Uploaded by: {res.uploader_name} ({res.file_type})
                    </p>
                    <a href={res.url} target="_blank" rel="noreferrer" className="btn-secondary" style={{ display: 'inline-block', textDecoration: 'none' }}>
                      Open Link / File ↗
                    </a>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* 5. DUAL-VIEW LEADERBOARD MODULE (ADR 0010) */}
          {activeTab === 'leaderboard' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>🏆 Community Leaderboard</h2>
                <div className="nav-tabs" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <button
                    className={`tab-btn ${leaderboardTab === 'individual' ? 'active' : ''}`}
                    onClick={() => setLeaderboardTab('individual')}
                  >
                    Operatives (Individual)
                  </button>
                  <button
                    className={`tab-btn ${leaderboardTab === 'team' ? 'active' : ''}`}
                    onClick={() => setLeaderboardTab('team')}
                  >
                    Teams (Aggregated)
                  </button>
                </div>
              </div>

              <div className="glass-card">
                {leaderboardTab === 'individual' ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-card)', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '0.75rem' }}>Rank</th>
                        <th style={{ padding: '0.75rem' }}>Operative Name</th>
                        <th style={{ padding: '0.75rem' }}>Codename Role</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Total Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.individual?.map((u, idx) => (
                        <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.75rem', fontWeight: '800', color: idx === 0 ? '#f59e0b' : 'var(--text-primary)' }}>
                            #{idx + 1}
                          </td>
                          <td style={{ padding: '0.75rem', fontWeight: '600' }}>{u.name}</td>
                          <td style={{ padding: '0.75rem' }}><span className="badge badge-purple">{u.role}</span></td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '800', color: 'var(--accent-cyan)' }}>
                            {u.total_points} PTS
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-card)', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '0.75rem' }}>Rank</th>
                        <th style={{ padding: '0.75rem' }}>Team Name</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Aggregate Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.team?.map((t, idx) => (
                        <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.75rem', fontWeight: '800', color: idx === 0 ? '#f59e0b' : 'var(--text-primary)' }}>
                            #{idx + 1}
                          </td>
                          <td style={{ padding: '0.75rem', fontWeight: '600' }}>{t.name}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '800', color: 'var(--accent-success)' }}>
                            {t.team_points} PTS
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
