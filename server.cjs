const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');
const { createWorker } = require('tesseract.js');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database setup
const dbPath = path.join(__dirname, 'omni.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('Error opening database', err);
  else console.log('Connected to SQLite database');
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    content_hash TEXT,
    mime_type TEXT,
    original_name TEXT,
    smart_name TEXT,
    raw_content TEXT,
    summary TEXT,
    metadata TEXT,
    tags TEXT,
    storage_url TEXT,
    thumbnail_url TEXT,
    file_size INTEGER,
    processing_status TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Sovereignty Core Tables
  db.run(`CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    settings TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS organization_members (
    id TEXT PRIMARY KEY,
    organization_id TEXT REFERENCES organizations(id),
    user_id TEXT,
    role TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS audit_logs_immutable (
    id TEXT PRIMARY KEY,
    organization_id TEXT REFERENCES organizations(id),
    user_id TEXT,
    action TEXT,
    resource_type TEXT,
    resource_id TEXT,
    metadata TEXT DEFAULT '{}',
    risk_score REAL DEFAULT 0,
    is_suspicious BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS emergency_actions (
    id TEXT PRIMARY KEY,
    organization_id TEXT REFERENCES organizations(id),
    action_type TEXT,
    status TEXT DEFAULT 'pending',
    reason TEXT,
    initiated_by TEXT,
    confirmations TEXT DEFAULT '[]',
    requires_confirmations INTEGER DEFAULT 2,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS system_lockdowns (
    id TEXT PRIMARY KEY,
    organization_id TEXT REFERENCES organizations(id),
    level TEXT,
    is_active BOOLEAN DEFAULT 1,
    activated_by TEXT,
    activated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS system_metrics (
    id TEXT PRIMARY KEY,
    organization_id TEXT REFERENCES organizations(id),
    metric_type TEXT,
    metric_value REAL,
    metadata TEXT DEFAULT '{}',
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS admin_command_history (
    id TEXT PRIMARY KEY,
    organization_id TEXT REFERENCES organizations(id),
    admin_id TEXT,
    command_raw TEXT,
    execution_status TEXT,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS command_templates (
    id TEXT PRIMARY KEY,
    organization_id TEXT,
    name TEXT,
    template TEXT,
    category TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Seed default org
  db.run(`INSERT OR IGNORE INTO organizations (id, name, slug) VALUES ('default-org', 'Omni Corp', 'omni-corp')`);
  db.run(`INSERT OR IGNORE INTO organization_members (id, organization_id, user_id, role) VALUES ('default-mem', 'default-org', 'ffc13a83-6efb-4e96-a25e-2c4d55e8e91a', 'owner')`);
});

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Helpers
const performOCR = async (filePath) => {
  try {
    const worker = await createWorker('fra');
    const { data: { text } } = await worker.recognize(filePath);
    await worker.terminate();
    return text;
  } catch (err) {
    console.error('OCR Error:', err);
    return "";
  }
};

// Routes
app.get('/api/:table', (req, res) => {
  const { table } = req.params;
  
  // Custom logic for known tables
  if (table === 'nodes') {
    return db.all("SELECT * FROM nodes ORDER BY created_at DESC", [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows.map(row => ({
        ...row,
        metadata: JSON.parse(row.metadata || '{}'),
        tags: JSON.parse(row.tags || '[]')
      })));
    });
  }

  // Generic fallback for other tables (user_roles, organizations, etc.)
  db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`, (err, rows) => {
    if (err || rows.length === 0) {
      console.log(`Table ${table} not found, returning empty array`);
      return res.json([]);
    }
    db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
      if (err) return res.json([]);
      res.json(rows);
    });
  });
});

app.post('/api/rpc/:fn', (req, res) => {
  const { fn } = req.params;
  const params = req.body;
  console.log(`RPC Call: ${fn}`, params);

  switch (fn) {
    case 'check_contextual_access':
      res.json({ allowed: true, visibility: 'full', mfa_required: false });
      break;
    
    case 'scan_content_for_dlp':
      res.json({ violations: [], risk_score: 0 });
      break;
    
    case 'initiate_emergency_action':
      const id = Date.now().toString();
      db.run(`INSERT INTO emergency_actions (id, organization_id, action_type, reason, initiated_by) VALUES (?, ?, ?, ?, ?)`,
        [id, params.p_organization_id, params.p_action_type, params.p_reason, params.p_initiated_by],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json(id);
        });
      break;

    case 'is_organization_locked_down':
      res.json({ is_locked: false });
      break;

    case 'execute_admin_command':
      res.json(`Command ${params.p_command} executed successfully (simulated)`);
      break;

    case 'get_command_suggestions':
      res.json({ suggestions: [], count: 0 });
      break;

    default:
      console.warn(`Unhandled RPC: ${fn}`);
      res.json({ success: true, message: `Simulated success for ${fn}` });
  }
});

app.post('/api/nodes', upload.single('file'), async (req, res) => {
  const { id, user_id, content_hash, mime_type, original_name, smart_name, summary, metadata, tags, processing_status } = req.body;
  const storage_url = req.file ? `/uploads/${req.file.filename}` : null;
  const file_size = req.file ? req.file.size : req.body.file_size;

  const query = `INSERT INTO nodes (id, user_id, content_hash, mime_type, original_name, smart_name, summary, metadata, tags, storage_url, file_size, processing_status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  const values = [
    id || Date.now().toString(),
    user_id || 'local-user',
    content_hash,
    mime_type || (req.file ? req.file.mimetype : null),
    original_name || (req.file ? req.file.originalname : null),
    smart_name,
    summary,
    typeof metadata === 'string' ? metadata : JSON.stringify(metadata || {}),
    typeof tags === 'string' ? tags : JSON.stringify(tags || []),
    storage_url,
    file_size,
    processing_status || 'completed'
  ];

  db.run(query, values, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, message: 'Node created successfully' });
  });
});

app.patch('/api/nodes/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  delete updates.id;
  if (updates.metadata) updates.metadata = JSON.stringify(updates.metadata);
  if (updates.tags) updates.tags = JSON.stringify(updates.tags);
  updates.updated_at = new Date().toISOString();

  const keys = Object.keys(updates);
  const values = Object.values(updates);
  const setString = keys.map(key => `${key} = ?`).join(', ');

  db.run(`UPDATE nodes SET ${setString} WHERE id = ?`, [...values, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Node updated successfully' });
  });
});

app.delete('/api/nodes/:id', (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM nodes WHERE id = ?", id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Node deleted successfully' });
  });
});

// Watch 'scanned_documents' folder
const watcher = chokidar.watch('scanned_documents', {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true
});

watcher.on('add', async (filePath) => {
  const fileName = path.basename(filePath);
  const ext = path.extname(fileName).toLowerCase();
  console.log(`New file detected: ${fileName}`);
  
  // Wait a bit for the file to be fully written
  setTimeout(async () => {
    try {
      if (!fs.existsSync(filePath)) return;
      
      const stats = fs.statSync(filePath);
      const destPath = path.join(__dirname, 'uploads', fileName);
      fs.copyFileSync(filePath, destPath);
      
      const mimeType = ext === '.pdf' ? 'application/pdf' : 
                       ['.jpg', '.jpeg', '.png'].includes(ext) ? 'image/jpeg' : 'text/plain';
      
      let text = "";
      // Only OCR images
      if (['.jpg', '.jpeg', '.png'].includes(ext)) {
        text = await performOCR(destPath);
      } else if (ext === '.txt') {
        text = fs.readFileSync(destPath, 'utf8');
      }
      
      const nodeData = {
        id: Date.now().toString(),
        user_id: 'local-user',
        mime_type: mimeType,
        original_name: fileName,
        smart_name: `Scanned_${fileName}`,
        summary: `Document scanné détecté automatiquement. ${text ? 'Contenu extrait.' : ''}`,
        raw_content: text,
        metadata: JSON.stringify({ source: 'scanner', date: new Date().toISOString() }),
        tags: JSON.stringify(['Scanned', 'Local']),
        storage_url: `/uploads/${fileName}`,
        file_size: stats.size,
        processing_status: 'completed'
      };

      db.run(`INSERT INTO nodes (id, user_id, mime_type, original_name, smart_name, summary, raw_content, metadata, tags, storage_url, file_size, processing_status)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [nodeData.id, nodeData.user_id, nodeData.mime_type, nodeData.original_name, nodeData.smart_name, nodeData.summary, nodeData.raw_content, nodeData.metadata, nodeData.tags, nodeData.storage_url, nodeData.file_size, nodeData.processing_status]);
      
      console.log(`Auto-imported: ${fileName}`);
    } catch (err) {
      console.error(`Error auto-importing ${fileName}:`, err);
    }
  }, 2000);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
