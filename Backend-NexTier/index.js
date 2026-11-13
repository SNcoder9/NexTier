const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = require('./db');
const app = express();
const uploadDirectory = path.join(__dirname, 'uploads');
const authSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const revokedTokens = new Map();
let userPreferencesTableReady;
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, callback) => callback(null, uploadDirectory),
        filename: (req, file, callback) => {
            const extension = ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' })[file.mimetype];
            callback(null, `${crypto.randomUUID()}${extension}`);
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, callback) => {
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) {
            return callback(new Error('Profile picture must be a JPG, PNG, WEBP, or GIF image'));
        }
        callback(null, true);
    },
});

app.use(cors());
app.use(express.json());
fs.mkdirSync(uploadDirectory, { recursive: true });
app.use('/uploads', express.static(uploadDirectory, { maxAge: '1d', immutable: true }));

const createToken = (userId) => {
    const payload = Buffer.from(JSON.stringify({
        sub: String(userId),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    })).toString('base64url');
    const signature = crypto.createHmac('sha256', authSecret).update(payload).digest('base64url');
    return `${payload}.${signature}`;
};

const verifyToken = (token) => {
    const [payload, signature] = String(token || '').split('.');
    if (!payload || !signature) return null;
    const expected = crypto.createHmac('sha256', authSecret).update(payload).digest();
    let supplied;
    try {
        supplied = Buffer.from(signature, 'base64url');
    } catch {
        return null;
    }
    if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return null;

    try {
        const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
        if (!claims.sub || !Number.isInteger(claims.exp) || claims.exp <= Math.floor(Date.now() / 1000)) return null;
        return claims;
    } catch {
        return null;
    }
};

const hashPassword = (password, salt = crypto.randomBytes(16).toString('base64url')) => {
    const hash = crypto.scryptSync(password, salt, 32).toString('base64url');
    return `scrypt$${salt}$${hash}`;
};

const passwordMatches = (password, savedPassword) => {
    if (savedPassword.startsWith('scrypt$')) {
        const [, salt, savedHash] = savedPassword.split('$');
        if (!salt || !savedHash) return false;
        const expected = Buffer.from(savedHash, 'base64url');
        const actual = crypto.scryptSync(password, salt, 32);
        return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
    }

    const supplied = Buffer.from(password);
    const saved = Buffer.from(savedPassword);
    return supplied.length === saved.length && crypto.timingSafeEqual(supplied, saved);
};

app.post('/api/auth/login', async (req, res) => {
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!email || !password || email.length > 40 || password.length > 128) {
        return res.status(400).json({ error: 'Enter a valid email address and password' });
    }

    try {
        const [users] = await db.query(
            'SELECT user_id, user_name, email_id, pword, profile_pic FROM users WHERE LOWER(email_id) = LOWER(?) LIMIT 1',
            [email]
        );
        const account = users[0];
        if (!account || !passwordMatches(password, account.pword)) {
            return res.status(401).json({ error: 'Email or password is incorrect' });
        }

        if (!account.pword.startsWith('scrypt$')) {
            await db.query('UPDATE users SET pword = ? WHERE user_id = ?', [hashPassword(password), account.user_id]);
        }

        const { pword, ...safeUser } = account;
        res.json({ token: createToken(account.user_id), user: safeUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to sign in' });
    }
});

app.use('/api', async (req, res, next) => {
    const authorization = req.get('authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    const claims = verifyToken(token);
    if (!claims || revokedTokens.has(token)) return res.status(401).json({ error: 'Please sign in again' });

    try {
        const [users] = await db.query(
            'SELECT user_id, user_name, email_id, profile_pic FROM users WHERE user_id = ?',
            [claims.sub]
        );
        if (!users[0]) return res.status(401).json({ error: 'Account no longer exists' });
        req.user = users[0];
        req.token = token;
        req.tokenExpiresAt = claims.exp;
        if (req.params.userId && String(req.params.userId) !== String(req.user.user_id)) {
            return res.status(403).json({ error: 'You cannot access another user’s data' });
        }
        next();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to verify account' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    const now = Math.floor(Date.now() / 1000);
    for (const [token, expiresAt] of revokedTokens) {
        if (expiresAt <= now) revokedTokens.delete(token);
    }
    revokedTokens.set(req.token, req.tokenExpiresAt);
    res.status(200).json({ message: 'Signed out successfully' });
});

app.get('/api/user', (req, res) => {
    res.json(req.user);
});

const ensureUserPreferencesTable = async () => {
    if (!userPreferencesTableReady) {
        userPreferencesTableReady = db.query(`
            CREATE TABLE IF NOT EXISTS user_preferences (
                user_id BIGINT NOT NULL PRIMARY KEY,
                theme ENUM('light', 'dark', 'system') NOT NULL DEFAULT 'light',
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
        `).catch(error => {
            userPreferencesTableReady = null;
            throw error;
        });
    }

    await userPreferencesTableReady;
};

app.get('/api/user/preferences', async (req, res) => {
    try {
        await ensureUserPreferencesTable();
        const [preferences] = await db.query(
            'SELECT theme FROM user_preferences WHERE user_id = ?',
            [req.user.user_id]
        );
        res.json({ theme: preferences[0]?.theme || 'light' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch appearance preferences' });
    }
});

app.put('/api/user/preferences', async (req, res) => {
    const { theme } = req.body;
    if (!['light', 'dark', 'system'].includes(theme)) {
        return res.status(400).json({ error: 'Theme must be light, dark, or system' });
    }

    try {
        await ensureUserPreferencesTable();
        await db.query(
            `INSERT INTO user_preferences (user_id, theme) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE theme = ?`,
            [req.user.user_id, theme, theme]
        );
        res.json({ theme });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save appearance preferences' });
    }
});

app.put('/api/user', async (req, res) => {
    const userName = typeof req.body.user_name === 'string' ? req.body.user_name.trim() : '';
    const email = typeof req.body.email_id === 'string' ? req.body.email_id.trim() : '';
    if (!userName || userName.length > 40 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 40) {
        return res.status(400).json({ error: 'Enter a name (up to 40 characters) and a valid email (up to 40 characters)' });
    }

    try {
        const [duplicates] = await db.query(
            'SELECT user_id FROM users WHERE LOWER(email_id) = LOWER(?) AND user_id <> ? LIMIT 1',
            [email, req.user.user_id]
        );
        if (duplicates.length) return res.status(409).json({ error: 'That email is already used by another account' });

        await db.query('UPDATE users SET user_name = ?, email_id = ? WHERE user_id = ?', [userName, email, req.user.user_id]);
        const [users] = await db.query(
            'SELECT user_id, user_name, email_id, profile_pic FROM users WHERE user_id = ?',
            [req.user.user_id]
        );
        res.json(users[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

app.post('/api/user/profile-picture', upload.single('profile_picture'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Choose an image file to upload' });

    try {
        await db.query('UPDATE users SET profile_pic = ? WHERE user_id = ?', [`/uploads/${req.file.filename}`, req.user.user_id]);
        if (req.user.profile_pic?.startsWith('/uploads/')) {
            const oldFile = path.basename(req.user.profile_pic);
            fs.promises.unlink(path.join(uploadDirectory, oldFile)).catch(() => {});
        }
        res.json({ profile_pic: `/uploads/${req.file.filename}` });
    } catch (error) {
        fs.promises.unlink(req.file.path).catch(() => {});
        console.error(error);
        res.status(500).json({ error: 'Failed to update profile picture' });
    }
});

app.get('/api/foods', async (req, res) => {
    try {
        const [foods] = await db.query('SELECT * FROM foods ORDER BY food_name');
        res.json(foods);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch foods' });
    }
});

app.post('/api/foods', async (req, res) => {
    const { food_name, category, Kcal, protien, carbs, fat, fibre } = req.body;
    const name = typeof food_name === 'string' ? food_name.trim() : '';
    const foodCategory = typeof category === 'string' ? category.trim() : '';
    const nutrients = { Kcal, protien, carbs, fat, fibre };

    if (!name || name.length > 40 || foodCategory.length > 50) {
        return res.status(400).json({ error: 'Food name (up to 40 characters) and a category (up to 50 characters) are required' });
    }

    if (Object.values(nutrients).some(value => value === '' || value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 9999.99)) {
        return res.status(400).json({ error: 'Nutritional values must be numbers between 0 and 9999.99' });
    }

    try {
        const [duplicates] = await db.query('SELECT food_id FROM foods WHERE LOWER(food_name) = LOWER(?) LIMIT 1', [name]);
        if (duplicates.length > 0) {
            return res.status(409).json({ error: 'A food with this name already exists' });
        }

        const [result] = await db.query(
            'INSERT INTO foods (food_name, category, Kcal, protien, carbs, fat, fibre) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, foodCategory || 'Food', Number(Kcal), Number(protien), Number(carbs), Number(fat), Number(fibre)]
        );
        const [foods] = await db.query('SELECT * FROM foods WHERE food_id = ?', [result.insertId]);

        res.status(201).json(foods[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create food' });
    }
});

app.get('/api/workouts', async (req, res) => {
    try {
        const [workouts] = await db.query('SELECT * FROM workout ORDER BY workout_name');
        res.json(workouts);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch workouts' });
    }
});

app.post('/api/workouts', async (req, res) => {
    const name = typeof req.body.workout_name === 'string' ? req.body.workout_name.trim() : '';
    const caloriesPerUnit = req.body.kcal;

    if (!name || name.length > 40) {
        return res.status(400).json({ error: 'Workout name (up to 40 characters) is required' });
    }

    if (caloriesPerUnit === '' || caloriesPerUnit === null || caloriesPerUnit === undefined
        || !Number.isFinite(Number(caloriesPerUnit)) || Number(caloriesPerUnit) < 0 || Number(caloriesPerUnit) > 9999.99) {
        return res.status(400).json({ error: 'Calories per rep/unit must be a number between 0 and 9999.99' });
    }

    try {
        const [duplicates] = await db.query('SELECT workout_id FROM workout WHERE LOWER(workout_name) = LOWER(?) LIMIT 1', [name]);
        if (duplicates.length > 0) {
            return res.status(409).json({ error: 'A workout with this name already exists' });
        }

        const [result] = await db.query(
            'INSERT INTO workout (workout_name, kcal) VALUES (?, ?)',
            [name, Number(caloriesPerUnit)]
        );
        const [workouts] = await db.query('SELECT * FROM workout WHERE workout_id = ?', [result.insertId]);
        res.status(201).json(workouts[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create workout' });
    }
});

app.get('/api/workout-logs/:userId/:date', async (req, res) => {
    const { date } = req.params;
    if (String(req.params.userId) !== String(req.user.user_id)) return res.status(403).json({ error: 'You cannot access another user’s data' });
    try {
        const [rows] = await db.query(
            `SELECT wl.log_id, wl.workout_id, w.workout_name, w.kcal AS calories_per_rep,
                    wl.reps_completed, wl.total_calories_burned, wl.log_date
             FROM workout_logs wl
             JOIN workout w ON w.workout_id = wl.workout_id
             WHERE wl.user_id = ? AND wl.log_date = ?
             ORDER BY wl.log_id DESC`,
            [req.user.user_id, date]
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch workout logs' });
    }
});

app.get('/api/workout-logs/weekly/:userId/:date', async (req, res) => {
    const { date } = req.params;
    if (String(req.params.userId) !== String(req.user.user_id)) return res.status(403).json({ error: 'You cannot access another user’s data' });
    try {
        const [rows] = await db.query(
            `SELECT DATE_FORMAT(log_date, '%Y-%m-%d') AS log_date, COUNT(*) AS workout_count,
                    COALESCE(SUM(total_calories_burned), 0) AS calories_burned,
                    COALESCE(SUM(reps_completed), 0) AS reps_completed
             FROM workout_logs
             WHERE user_id = ? AND log_date BETWEEN DATE_SUB(?, INTERVAL 6 DAY) AND ?
             GROUP BY workout_logs.log_date
             ORDER BY workout_logs.log_date`,
            [req.user.user_id, date, date]
        );
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch weekly workout progress' });
    }
});

app.post('/api/workout-logs', async (req, res) => {
    const { workout_id, log_date, reps_completed } = req.body;
    const reps = Number(reps_completed);
    if (!workout_id || !log_date || !Number.isInteger(reps) || reps <= 0 || reps > 100000) {
        return res.status(400).json({ error: 'workout_id, log_date and a positive reps/units count are required' });
    }

    try {
        const [workouts] = await db.query('SELECT * FROM workout WHERE workout_id = ?', [workout_id]);
        if (workouts.length === 0) return res.status(404).json({ error: 'Workout not found' });

        const totalCalories = Number(workouts[0].kcal) * reps;
        const [result] = await db.query(
            `INSERT INTO workout_logs (user_id, workout_id, log_date, reps_completed, total_calories_burned)
             VALUES (?, ?, ?, ?, ?)`,
            [req.user.user_id, workout_id, log_date, reps, totalCalories]
        );

        res.status(201).json({ message: 'Workout logged successfully', log_id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to log workout' });
    }
});

app.delete('/api/workout-logs/:id', async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM workout_logs WHERE log_id = ? AND user_id = ?', [req.params.id, req.user.user_id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Workout log not found' });
        res.status(200).json({ message: 'Workout log deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete workout log' });
    }
});

app.get('/api/nutrition/:userId/:date', async (req, res) => {
    const { date } = req.params;
    if (String(req.params.userId) !== String(req.user.user_id)) return res.status(403).json({ error: 'You cannot access another user’s data' });
    try {
        const query = `
            SELECT
                fl.log_id AS logId,
                fl.food_id,
                f.food_name AS name,
                fl.servings_consumed AS qty,
                f.Kcal,
                f.protien,
                f.carbs,
                f.fat,
                f.fibre
            FROM food_logs fl
            JOIN foods f ON f.food_id = fl.food_id
            WHERE fl.user_id = ? AND fl.log_date = ?
            ORDER BY fl.log_id DESC
        `;
        const [rows] = await db.query(query, [req.user.user_id, date]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch nutrition entries' });
    }
});

app.post('/api/nutrition', async (req, res) => {
    const { food_id, log_date, servings_consumed } = req.body;
    try {
        const [foods] = await db.query('SELECT * FROM foods WHERE food_id = ?', [food_id]);
        if (foods.length === 0) return res.status(404).json({ error: 'Food not found' });

        const food = foods[0];
        const total_calories = Number(food.Kcal) * Number(servings_consumed || 1);
        const total_fat = Number(food.fat) * Number(servings_consumed || 1);
        const total_carbs = Number(food.carbs) * Number(servings_consumed || 1);
        const total_protein = Number(food.protien) * Number(servings_consumed || 1);
        const total_fibre = Number(food.fibre) * Number(servings_consumed || 1);

        const query = `
            INSERT INTO food_logs
            (user_id, food_id, log_date, servings_consumed, total_calories, total_fat, total_carbs, total_protein, total_fibre)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.query(query, [req.user.user_id, food_id, log_date, servings_consumed || 1, total_calories, total_fat, total_carbs, total_protein, total_fibre]);

        res.status(201).json({
            message: 'Nutrition logged successfully',
            log_id: result.insertId,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to log nutrition' });
    }
});

app.delete('/api/nutrition/:id', async (req, res) => {
    const logId = req.params.id;
    try {
        const [result] = await db.query('DELETE FROM food_logs WHERE log_id = ? AND user_id = ?', [logId, req.user.user_id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Log not found' });
        res.status(200).json({ message: 'Nutrition log deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete' });
    }
});

app.post('/api/hydration', async (req, res) => {
    const { amount_ml, log_date } = req.body;
    try {
        if (!log_date || Number(amount_ml) <= 0) {
            return res.status(400).json({ error: 'log_date and a positive amount_ml are required' });
        }

        await db.query(
            'INSERT INTO hydration_logs (user_id, log_date, amount_ml) VALUES (?, ?, ?)',
            [req.user.user_id, log_date, amount_ml]
        );

        res.status(201).json({ message: 'Hydration logged successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to log hydration' });
    }
});

app.get('/api/hydration/:userId/:date', async (req, res) => {
    const { date } = req.params;
    if (String(req.params.userId) !== String(req.user.user_id)) return res.status(403).json({ error: 'You cannot access another user’s data' });
    try {
        const query = `
            SELECT COALESCE(SUM(amount_ml), 0) AS todays_water_ml
            FROM hydration_logs
            WHERE user_id = ? AND log_date = ?
        `;
        const [results] = await db.query(query, [req.user.user_id, date]);
        res.json(results[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch hydration' });
    }
});

app.get('/api/nutrition/today/:userId', async (req, res) => {
    if (String(req.params.userId) !== String(req.user.user_id)) return res.status(403).json({ error: 'You cannot access another user’s data' });
    try {
        const query = `
            SELECT
                COALESCE(SUM(total_calories), 0) AS todays_calories,
                COALESCE(SUM(total_fat), 0) AS todays_fat,
                COALESCE(SUM(total_carbs), 0) AS todays_carbs,
                COALESCE(SUM(total_protein), 0) AS todays_protein
            FROM food_logs
            WHERE user_id = ? AND log_date = CURDATE()
        `;
        const [results] = await db.query(query, [req.user.user_id]);
        res.json(results[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch today\'s summary' });
    }
});

app.get('/api/hydration/today/:userId', async (req, res) => {
    if (String(req.params.userId) !== String(req.user.user_id)) return res.status(403).json({ error: 'You cannot access another user’s data' });
    try {
        const query = `
            SELECT COALESCE(SUM(amount_ml), 0) AS todays_water_ml
            FROM hydration_logs
            WHERE user_id = ? AND log_date = CURDATE()
        `;
        const [results] = await db.query(query, [req.user.user_id]);
        res.json(results[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch hydration' });
    }
});

app.get('/api/nutrition/week/:userId', async (req, res) => {
    if (String(req.params.userId) !== String(req.user.user_id)) return res.status(403).json({ error: 'You cannot access another user’s data' });

    try {
        const query = `
            SELECT
                COALESCE(SUM(total_calories), 0) AS weekly_calories,
                COALESCE(SUM(total_fat), 0) AS weekly_fat,
                COALESCE(SUM(total_carbs), 0) AS weekly_carbs,
                COALESCE(SUM(total_protein), 0) AS weekly_protein
            FROM food_logs
            WHERE user_id = ? AND log_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        `;
        const [results] = await db.query(query, [req.user.user_id]);
        res.json(results[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch weekly summary' });
    }
});

app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
        return res.status(status).json({ error: status === 413 ? 'Profile picture must be 5 MB or smaller' : 'Invalid profile picture upload' });
    }
    if (error) {
        return res.status(400).json({ error: error.message || 'Invalid request' });
    }
    next();
});

app.listen(process.env.PORT || 5000, () => {
    console.log(`Server running successfully on port ${process.env.PORT || 5000}`);
});