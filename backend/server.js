const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const pool = new Pool({
  user: 'timejoy_admin',
  host: 'localhost',
  database: 'timejoy',
  password: 'your_secure_password', // IMPORTANT: Ensure this matches your DB setup
  port: 5432,
});

// Helper to map DB User to Frontend User object structure
const mapUser = (u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    registeredAt: u.registered_at,
    lastLoginAt: u.last_login_at
});

// --- AUTH ---

app.post('/api/login', async (req, res) => {
  const { username, email } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1) AND LOWER(email) = LOWER($2)', [username, email]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
      res.json(mapUser(user));
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/register', async (req, res) => {
  const { username, email } = req.body;
  const id = 'user_' + Date.now();
  try {
    await pool.query(
      'INSERT INTO users (id, username, email, role, registered_at, last_login_at) VALUES ($1, $2, $3, $4, NOW(), NOW())',
      [id, username, email, 'USER']
    );
    res.json({ id, username, email, role: 'USER', registeredAt: new Date(), lastLoginAt: new Date() });
  } catch (err) {
    if (err.code === '23505') res.status(400).json({ message: 'Username or Email already exists' });
    else res.status(500).json({ message: err.message });
  }
});

// --- USERS ---

app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users ORDER BY registered_at DESC');
        res.json(result.rows.map(mapUser));
    } catch(e) { res.status(500).json({message: e.message}); }
});

// Update Profile
app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { username, email } = req.body;
    try {
        const result = await pool.query(
            'UPDATE users SET username = $1, email = $2 WHERE id = $3 RETURNING *',
            [username, email, id]
        );
        if (result.rows.length > 0) res.json(mapUser(result.rows[0]));
        else res.status(404).json({ message: 'User not found' });
    } catch (err) {
        if (err.code === '23505') res.status(400).json({ message: 'Username or Email already taken' });
        else res.status(500).json({ message: err.message });
    }
});

// Reset Email (Admin)
app.post('/api/users/:id/reset-email', async (req, res) => {
    const { id } = req.params;
    try {
        // Fetch username first to construct email
        const uRes = await pool.query('SELECT username FROM users WHERE id = $1', [id]);
        if (uRes.rows.length === 0) return res.status(404).json({message: 'User not found'});
        
        const newEmail = `${uRes.rows[0].username}@timejoy.com`;
        await pool.query('UPDATE users SET email = $1 WHERE id = $2', [newEmail, id]);
        res.json({ success: true });
    } catch(e) { res.status(500).json({message: e.message}); }
});

// --- LOGS ---

app.get('/api/logs', async (req, res) => {
  const { userId } = req.query;
  let query = 'SELECT * FROM logs';
  let params = [];
  if (userId) {
    query += ' WHERE user_id = $1';
    params.push(userId);
  }
  try {
      const result = await pool.query(query, params);
      const mapped = result.rows.map(r => ({
          id: r.id,
          userId: r.user_id,
          date: r.date,
          startTime: r.start_time,
          endTime: r.end_time,
          duration: parseFloat(r.duration),
          activityTypeId: r.activity_type_id,
          satisfactionTagId: r.satisfaction_tag_id,
          details: r.details,
          createdAt: r.created_at
      }));
      res.json(mapped);
  } catch(e) { res.status(500).json({message: e.message}); }
});

app.post('/api/logs', async (req, res) => {
  const { userId, date, startTime, endTime, duration, activityTypeId, satisfactionTagId, details } = req.body;
  const id = 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  try {
      await pool.query(
        'INSERT INTO logs (id, user_id, date, start_time, end_time, duration, activity_type_id, satisfaction_tag_id, details) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
        [id, userId, date, startTime, endTime, duration, activityTypeId, satisfactionTagId, details]
      );
      res.json({ success: true });
  } catch(e) { res.status(500).json({message: e.message}); }
});

// --- CONFIG (Activity Types & Tags) ---

// Activity Types
app.get('/api/config/activity-types', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM activity_types ORDER BY order_index');
        if (result.rows.length === 0) return res.status(404).send(); // Trigger frontend default
        res.json(result.rows.map(r => ({
            id: r.id, name: r.name, color: r.color, isVisible: r.is_visible, order: r.order_index
        })));
    } catch(e) { res.status(500).json({message: e.message}); }
});

app.post('/api/config/activity-types', async (req, res) => {
    const { types } = req.body; 
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM activity_types');
        for (const t of types) {
            await client.query(
                'INSERT INTO activity_types (id, name, color, is_visible, order_index) VALUES ($1, $2, $3, $4, $5)',
                [t.id, t.name, t.color, t.isVisible, t.order]
            );
        }
        await client.query('COMMIT');
        res.json({ success: true });
    } catch(e) {
        await client.query('ROLLBACK');
        res.status(500).json({message: e.message});
    } finally {
        client.release();
    }
});

// Satisfaction Tags
app.get('/api/config/satisfaction-tags', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM satisfaction_tags ORDER BY order_index');
        if (result.rows.length === 0) return res.status(404).send();
        res.json(result.rows.map(r => ({
            id: r.id, name: r.name, color: r.color, emoji: r.emoji, isVisible: r.is_visible, order: r.order_index, score: r.score
        })));
    } catch(e) { res.status(500).json({message: e.message}); }
});

app.post('/api/config/satisfaction-tags', async (req, res) => {
    const { tags } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM satisfaction_tags');
        for (const t of tags) {
            await client.query(
                'INSERT INTO satisfaction_tags (id, name, color, emoji, is_visible, order_index, score) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [t.id, t.name, t.color, t.emoji, t.isVisible, t.order, t.score]
            );
        }
        await client.query('COMMIT');
        res.json({ success: true });
    } catch(e) {
        await client.query('ROLLBACK');
        res.status(500).json({message: e.message});
    } finally {
        client.release();
    }
});

app.listen(3001, () => {
  console.log('TimeJoy Backend running on port 3001');
});
