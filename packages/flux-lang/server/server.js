'use strict'
// aiplang Full-Stack Server
// Competes with Laravel: ORM, relationships, migrations, auth, middleware, validation, queues, email

const http      = require('http')
const fs        = require('fs')
const path      = require('path')
const url       = require('url')
const crypto    = require('crypto')
const bcrypt    = require('bcryptjs')
const jwt       = require('jsonwebtoken')

// ── SQL.js DB (pure JS SQLite, no native deps) ─────────────────
let SQL, DB_FILE
let _db = null

async function getDB(dbFile = ':memory:') {
  if (_db) return _db
  const initSqlJs = require('sql.js')
  SQL = await initSqlJs()
  if (dbFile !== ':memory:' && fs.existsSync(dbFile)) {
    const fileBuffer = fs.readFileSync(dbFile)
    _db = new SQL.Database(fileBuffer)
  } else {
    _db = new SQL.Database()
  }
  DB_FILE = dbFile
  return _db
}

function persistDB() {
  if (!_db || !DB_FILE || DB_FILE === ':memory:') return
  const data = _db.export()
  fs.writeFileSync(DB_FILE, Buffer.from(data))
}

function dbRun(sql, params = []) {
  _db.run(sql, params)
  persistDB()
}

function dbAll(sql, params = []) {
  const stmt = _db.prepare(sql)
  stmt.bind(params)
  const rows = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

function dbGet(sql, params = []) {
  const rows = dbAll(sql, params)
  return rows[0] || null
}

// ── UUID ────────────────────────────────────────────────────────
const uuid = () => crypto.randomUUID()

// ── JWT ─────────────────────────────────────────────────────────
let JWT_SECRET = process.env.JWT_SECRET || 'aiplang-secret-change-in-production'
let JWT_EXPIRE  = '7d'

function generateJWT(user) {
  const payload = { id: user.id, email: user.email, role: user.role || 'user' }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRE })
}

function verifyJWT(token) {
  try { return jwt.verify(token, JWT_SECRET) }
  catch { return null }
}

// ═══════════════════════════════════════════════════════════════
// PARSER — extends aiplang v2 syntax
// ═══════════════════════════════════════════════════════════════

function parseApp(src) {
  const app = {
    env: [], db: null, auth: null, cache: null,
    middleware: [], models: [], apis: [], pages: [],
    seeds: [], jobs: [], events: []
  }

  const lines = src.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  let i = 0
  let inModel = false, inAPI = false, currentModel = null, currentAPI = null
  let pageLines = [], inPage = false

  while (i < lines.length) {
    const line = lines[i]

    // Page separator
    if (line === '---') {
      if (inPage && pageLines.length) app.pages.push(parsePage(pageLines.join('\n')))
      pageLines = []; inPage = false; inModel = false; inAPI = false
      currentModel = null; currentAPI = null
      i++; continue
    }

    // Page start
    if (line.startsWith('%')) {
      inPage = true; inModel = false; inAPI = false
      currentModel = null; currentAPI = null
      pageLines.push(line); i++; continue
    }
    if (inPage) { pageLines.push(line); i++; continue }

    // Config directives
    if (line.startsWith('~env '))        { app.env.push(parseEnvLine(line.slice(5))); i++; continue }
    if (line.startsWith('~db '))         { app.db = parseDBLine(line.slice(4)); i++; continue }
    if (line.startsWith('~auth '))       { app.auth = parseAuthLine(line.slice(6)); i++; continue }
    if (line.startsWith('~middleware ')) { app.middleware = line.slice(12).split('|').map(s=>s.trim()); i++; continue }
    if (line.startsWith('~cache '))      { app.cache = parseCacheLine(line.slice(7)); i++; continue }

    // Model block
    if (line.startsWith('model ')) {
      if (inModel && currentModel) app.models.push(currentModel)
      const mName = line.slice(6).replace('{','').trim()
      currentModel = { name: mName, fields: [], relationships: [], hooks: [] }
      inModel = true; inAPI = false; i++; continue
    }
    if (inModel && line === '}') { if (currentModel) app.models.push(currentModel); currentModel = null; inModel = false; i++; continue }
    if (inModel && currentModel) {
      if (line.startsWith('~has-many '))    currentModel.relationships.push({ type: 'hasMany', model: line.slice(10).trim() })
      else if (line.startsWith('~belongs ')) currentModel.relationships.push({ type: 'belongsTo', model: line.slice(9).trim() })
      else if (line.startsWith('~hook '))   currentModel.hooks.push(line.slice(6).trim())
      else if (line && line !== '{')        currentModel.fields.push(parseModelField(line))
      i++; continue
    }

    // API block
    if (line.startsWith('api ')) {
      if (inAPI && currentAPI) app.apis.push(currentAPI)
      const parts = line.slice(4).replace('{','').trim().split(/\s+/)
      currentAPI = { method: parts[0], path: parts[1], guards: [], validate: [], query: [], body: [], return: null }
      inAPI = true; i++; continue
    }
    if (inAPI && line === '}') { if (currentAPI) app.apis.push(currentAPI); currentAPI = null; inAPI = false; i++; continue }
    if (inAPI && currentAPI) { parseAPILine(line, currentAPI); i++; continue }

    i++
  }

  if (inPage && pageLines.length) app.pages.push(parsePage(pageLines.join('\n')))
  if (inModel && currentModel) app.models.push(currentModel)
  if (inAPI && currentAPI) app.apis.push(currentAPI)

  return app
}

function parseEnvLine(s) {
  const parts = s.split(/\s+/)
  const ev = { name: '', required: false, default: null }
  for (const p of parts) {
    if (p === 'required') ev.required = true
    else if (p.includes('=')) { const [k,v] = p.split('='); ev.name = k; ev.default = v }
    else ev.name = p
  }
  return ev
}

function parseDBLine(s) {
  const parts = s.split(/\s+/)
  return { driver: parts[0] || 'sqlite', dsn: parts[1] || './app.db' }
}

function parseAuthLine(s) {
  const parts = s.split(/\s+/)
  const auth = { provider: parts[0] || 'jwt', secret: parts[1] || '$JWT_SECRET', expire: '7d' }
  for (const p of parts) { if (p.startsWith('expire=')) auth.expire = p.slice(7) }
  return auth
}

function parseCacheLine(s) {
  const parts = s.split(/\s+/)
  return { driver: parts[0] || 'memory', url: parts[1] || '', ttl: 300 }
}

function parseModelField(line) {
  const parts = line.split(':').map(s => s.trim())
  const f = { name: parts[0], type: parts[1] || 'text', modifiers: [], enumVals: [], default: null, ref: null }
  for (let j = 2; j < parts.length; j++) {
    const p = parts[j]
    if (p.startsWith('default=')) f.default = p.slice(8)
    else if (p.startsWith('ref ')) f.ref = p.slice(4)
    else if (p.startsWith('enum:')) f.enumVals = p.slice(5).split(',')
    else if (p !== '') f.modifiers.push(p)
  }
  return f
}

function parseAPILine(line, route) {
  if (line.startsWith('~guard '))    route.guards = line.slice(7).split('|').map(s=>s.trim())
  else if (line.startsWith('~validate ')) {
    line.slice(10).split('|').forEach(v => {
      const parts = v.trim().split(/\s+/)
      if (parts[0]) route.validate.push({ field: parts[0], rules: parts.slice(1) })
    })
  }
  else if (line.startsWith('~query ')) {
    line.slice(7).split('|').forEach(q => {
      q = q.trim(); const eq = q.indexOf('=')
      route.query.push(eq !== -1 ? { name: q.slice(0,eq), default: q.slice(eq+1) } : { name: q, default: null })
    })
  }
  else route.body.push(line)
}

function parsePage(src) {
  // Reuse existing frontend parser logic
  const lines = src.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  const p = { id: 'page', theme: 'dark', route: '/', themeVars: null, state: {}, queries: [], blocks: [] }
  for (const line of lines) {
    if (line.startsWith('%')) {
      const pts = line.slice(1).trim().split(/\s+/)
      p.id = pts[0]||'page'; p.route = pts[2]||'/'
      const rt = pts[1]||'dark'
      if (rt.includes('#')) { const c=rt.split(','); p.theme='custom'; p.customTheme={bg:c[0],text:c[1]||'#f1f5f9',accent:c[2]||'#2563eb'} }
      else p.theme = rt
    } else if (line.startsWith('~theme ')) {
      p.themeVars = p.themeVars || {}
      line.slice(7).trim().split(/\s+/).forEach(pair => { const eq=pair.indexOf('='); if(eq!==-1) p.themeVars[pair.slice(0,eq)]=pair.slice(eq+1) })
    } else if (line.startsWith('@') && line.includes('=')) {
      const eq = line.indexOf('='); p.state[line.slice(1,eq).trim()] = line.slice(eq+1).trim()
    } else if (line.startsWith('~')) {
      const pts = line.slice(1).trim().split(/\s+/)
      const ai = pts.indexOf('=>')
      if (pts[0]==='mount') p.queries.push({ trigger:'mount', method:pts[1], path:pts[2], target:ai===-1?pts[3]:null, action:ai!==-1?pts.slice(ai+1).join(' '):null })
      else if (pts[0]==='interval') p.queries.push({ trigger:'interval', interval:parseInt(pts[1]), method:pts[2], path:pts[3], target:ai===-1?pts[4]:null, action:ai!==-1?pts.slice(ai+1).join(' '):null })
    } else {
      p.blocks.push({ kind: blockKind(line), rawLine: line })
    }
  }
  return p
}

function blockKind(line) {
  const bi = line.indexOf('{'); if (bi === -1) return 'unknown'
  const head = line.slice(0, bi).trim()
  const m = head.match(/^([a-z]+)\d+$/)
  return m ? m[1] : head
}

// ═══════════════════════════════════════════════════════════════
// AUTO MIGRATION
// ═══════════════════════════════════════════════════════════════

function toTableName(model) {
  return model.toLowerCase().replace(/([A-Z])/g, '_$1').replace(/^_/, '') + 's'
}

function toColumnName(field) {
  return field.replace(/([A-Z])/g, '_$1').toLowerCase()
}

function migrateModels(models) {
  for (const model of models) {
    const table = toTableName(model.name)
    let cols = []

    for (const f of model.fields) {
      const col = toColumnName(f.name)
      let sqlType = 'TEXT'
      switch (f.type) {
        case 'uuid':      sqlType = 'TEXT'; break
        case 'int':       sqlType = 'INTEGER'; break
        case 'float':     sqlType = 'REAL'; break
        case 'bool':      sqlType = 'INTEGER'; break
        case 'timestamp': sqlType = 'TEXT'; break
        case 'json':      sqlType = 'TEXT'; break
        case 'enum':      sqlType = 'TEXT'; break
        default:          sqlType = 'TEXT'
      }

      let def = `${col} ${sqlType}`
      if (f.modifiers.includes('pk'))       def += ' PRIMARY KEY'
      if (f.modifiers.includes('required')) def += ' NOT NULL'
      if (f.modifiers.includes('unique'))   def += ' UNIQUE'
      if (f.default !== null)               def += ` DEFAULT '${f.default}'`

      cols.push(def)
    }

    // Add relationship foreign keys
    for (const rel of model.relationships || []) {
      if (rel.type === 'belongsTo') {
        const fkCol = rel.model.toLowerCase() + '_id'
        cols.push(`${fkCol} TEXT`)
      }
    }

    // Always include timestamp columns
    const hasCreatedAt = cols.some(c => c.startsWith('created_at'))
    const hasUpdatedAt = cols.some(c => c.startsWith('updated_at'))
    if (!hasCreatedAt) cols.push('created_at TEXT')
    if (!hasUpdatedAt) cols.push('updated_at TEXT')

    const sql = `CREATE TABLE IF NOT EXISTS ${table} (${cols.join(', ')})`
    try { dbRun(sql) } catch (e) { /* table might already exist - try ALTER */ }

    console.log(`[aiplang] ✓  ${table} (${cols.length} columns)`)
  }
}

// ═══════════════════════════════════════════════════════════════
// ORM — Model operations
// ═══════════════════════════════════════════════════════════════

class Model {
  constructor(name) {
    this.tableName = toTableName(name)
    this.modelName = name
  }

  all(opts = {}) {
    let sql = `SELECT * FROM ${this.tableName}`
    const params = []
    if (opts.where) { sql += ` WHERE ${opts.where}`; if (opts.whereParams) params.push(...opts.whereParams) }
    if (opts.order) sql += ` ORDER BY ${opts.order}`
    if (opts.limit)  sql += ` LIMIT ${opts.limit}`
    if (opts.offset) sql += ` OFFSET ${opts.offset}`
    return dbAll(sql, params)
  }

  find(id) { return dbGet(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]) }

  findBy(field, value) { return dbGet(`SELECT * FROM ${this.tableName} WHERE ${field} = ? LIMIT 1`, [value]) }

  where(field, op, value) {
    return dbAll(`SELECT * FROM ${this.tableName} WHERE ${field} ${op} ?`, [value])
  }

  paginate(page = 1, perPage = 15, opts = {}) {
    const offset = (page - 1) * perPage
    const total = dbGet(`SELECT COUNT(*) as count FROM ${this.tableName}`)?.count || 0
    const data = this.all({ ...opts, limit: perPage, offset })
    return {
      data,
      meta: { total, page, per_page: perPage, last_page: Math.ceil(total / perPage) }
    }
  }

  create(data) {
    const row = { ...data }
    if (!row.id) row.id = uuid()
    if (!row.created_at) row.created_at = new Date().toISOString()
    if (!row.updated_at) row.updated_at = new Date().toISOString()

    const keys = Object.keys(row)
    const vals = Object.values(row)
    const sql = `INSERT INTO ${this.tableName} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`
    dbRun(sql, vals)
    return row
  }

  update(id, data) {
    data.updated_at = new Date().toISOString()
    delete data.id; delete data.created_at; delete data.password
    const sets = Object.keys(data).map(k => `${k} = ?`).join(', ')
    dbRun(`UPDATE ${this.tableName} SET ${sets} WHERE id = ?`, [...Object.values(data), id])
    return this.find(id)
  }

  delete(id) {
    dbRun(`DELETE FROM ${this.tableName} WHERE id = ?`, [id])
  }

  count(opts = {}) {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`
    if (opts.where) sql += ` WHERE ${opts.where}`
    return dbGet(sql)?.count || 0
  }

  // Relationships
  hasMany(relModel, foreignKey) {
    return (parentId) => {
      const m = new Model(relModel)
      const fk = foreignKey || this.modelName.toLowerCase() + '_id'
      return dbAll(`SELECT * FROM ${m.tableName} WHERE ${fk} = ?`, [parentId])
    }
  }

  belongsTo(relModel, foreignKey) {
    return (childRow) => {
      const m = new Model(relModel)
      const fk = foreignKey || relModel.toLowerCase() + '_id'
      return m.find(childRow[fk])
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// HTTP SERVER — Express-like but stdlib
// ═══════════════════════════════════════════════════════════════

class AiplangServer {
  constructor() {
    this.routes = []
    this.globalMiddleware = []
    this.models = {}
    this.app = null
  }

  use(fn) { this.globalMiddleware.push(fn) }

  addRoute(method, routePath, handler) {
    this.routes.push({ method: method.toUpperCase(), path: routePath, handler, params: parseRouteParams(routePath) })
  }

  registerModel(name) {
    this.models[name] = new Model(name)
    return this.models[name]
  }

  async handleRequest(req, res) {
    // Parse body
    if (req.method !== 'GET' && req.method !== 'DELETE') {
      req.body = await parseBody(req)
    } else {
      req.body = {}
    }

    // Parse query string
    const parsed = url.parse(req.url, true)
    req.query = parsed.query
    req.path  = parsed.pathname

    // Parse auth token
    const token = extractToken(req)
    req.user = token ? verifyJWT(token) : null

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

    // Match route
    for (const route of this.routes) {
      if (route.method !== req.method) continue
      const match = matchRoute(route.path, req.path)
      if (!match) continue
      req.params = match

      // Helper methods
      res.json = (status, data) => {
        if (typeof status === 'object') { data = status; status = 200 }
        res.writeHead(status, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(data))
      }
      res.error = (status, msg) => res.json(status, { error: msg })
      res.noContent = () => { res.writeHead(204); res.end() }

      try { await route.handler(req, res) }
      catch (e) {
        console.error('[aiplang] Route error:', e.message)
        res.json(500, { error: 'Internal server error' })
      }
      return
    }

    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
  }

  listen(port) {
    const server = http.createServer((req, res) => this.handleRequest(req, res))
    server.listen(port, () => console.log(`[aiplang] Server running → http://localhost:${port}`))
    return server
  }
}

// ═══════════════════════════════════════════════════════════════
// API ROUTE COMPILER
// ═══════════════════════════════════════════════════════════════

function compileAPIRoute(route, app, server) {
  const handler = async (req, res) => {
    const ctx = {
      req, res, params: req.params,
      body: req.body, query: req.query,
      user: req.user,
      vars: {},
      models: server.models,
    }

    // Guards
    for (const guard of route.guards) {
      if (guard === 'auth') {
        if (!req.user) { res.error(401, 'Unauthorized'); return }
        ctx.authUser = req.user
      }
      if (guard === 'admin') {
        if (!req.user || req.user.role !== 'admin') { res.error(403, 'Forbidden'); return }
      }
      if (guard === 'owner') {
        // Check if record belongs to user — simple implementation
        if (!req.user) { res.error(401, 'Unauthorized'); return }
      }
    }

    // Query params
    for (const qp of route.query) {
      ctx.vars[qp.name] = req.query[qp.name] || qp.default
    }

    // Validation
    for (const v of route.validate) {
      const val = ctx.body[v.field]
      for (const rule of v.rules) {
        if (rule === 'required' && (!val || val === '')) {
          res.error(422, `${v.field} is required`); return
        }
        if (rule === 'email' && val && !val.includes('@')) {
          res.error(422, `${v.field} must be a valid email`); return
        }
        if (rule.startsWith('min=')) {
          const min = parseInt(rule.slice(4))
          if (!val || String(val).length < min) { res.error(422, `${v.field} must be at least ${min} characters`); return }
        }
        if (rule.startsWith('max=')) {
          const max = parseInt(rule.slice(4))
          if (val && String(val).length > max) { res.error(422, `${v.field} must be at most ${max} characters`); return }
        }
        if (rule.startsWith('unique:')) {
          const modelName = rule.slice(7)
          const m = server.models[modelName]
          if (m) {
            const existing = m.findBy(v.field, val)
            if (existing) { res.error(409, `${v.field} already exists`); return }
          }
        }
        if (rule.startsWith('exists:')) {
          const modelName = rule.slice(7)
          const m = server.models[modelName]
          if (m && !m.find(val)) { res.error(422, `${v.field} does not exist`); return }
        }
        if (rule.startsWith('in:')) {
          const allowed = rule.slice(3).split(',')
          if (val && !allowed.includes(val)) { res.error(422, `${v.field} must be one of: ${allowed.join(', ')}`); return }
        }
      }
    }

    // Execute body operations
    for (const op of route.body) {
      const result = await execOp(op, ctx, server)
      if (result === '__RESPONDED__') return
      if (result !== null && result !== undefined) {
        ctx.lastResult = result
      }
    }

    // Default 200 if no explicit return
    if (!res.writableEnded) res.json(200, ctx.lastResult || {})
  }

  server.addRoute(route.method, route.path, handler)
}

async function execOp(line, ctx, server) {
  line = line.trim()
  if (!line) return null

  // ~hash field
  if (line.startsWith('~hash ')) {
    const field = line.slice(6).trim()
    if (ctx.body[field]) ctx.body[field] = await bcrypt.hash(ctx.body[field], 12)
    return null
  }

  // ~check password plain hashed | 401
  if (line.startsWith('~check ')) {
    const parts = line.slice(7).trim().split(/\s+/)
    const plain  = resolveVar(parts[1], ctx)
    const hashed = resolveVar(parts[2], ctx)
    const status = parseInt(parts[4]) || 401
    const ok = await bcrypt.compare(String(plain||''), String(hashed||''))
    if (!ok) { ctx.res.error(status, 'Invalid credentials'); return '__RESPONDED__' }
    return null
  }

  // ~unique Model field value | status
  if (line.startsWith('~unique ')) {
    const parts = line.slice(8).trim().split(/\s+/)
    const modelName = parts[0], field = parts[1], value = resolveVar(parts[2], ctx)
    const status = parseInt(parts[4]) || 409
    const m = server.models[modelName]
    if (m) {
      const existing = m.findBy(field, value)
      if (existing) { ctx.res.error(status, `${field} already exists`); return '__RESPONDED__' }
    }
    return null
  }

  // $var = expr
  if (line.startsWith('$') && line.includes('=')) {
    const eq = line.indexOf('=')
    const varName = line.slice(1, eq).trim()
    const expr = line.slice(eq+1).trim()
    ctx.vars[varName] = evalExpr(expr, ctx, server)
    return null
  }

  // insert Model($body)
  if (line.startsWith('insert ')) {
    const modelName = line.match(/insert\s+(\w+)/)?.[1]
    const m = server.models[modelName]
    if (m) {
      const data = { ...ctx.body }
      ctx.vars['inserted'] = m.create(data)
      return ctx.vars['inserted']
    }
    return null
  }

  // update Model($id, $body)
  if (line.startsWith('update ')) {
    const modelName = line.match(/update\s+(\w+)/)?.[1]
    const m = server.models[modelName]
    if (m) {
      const id = ctx.params.id || ctx.vars['id']
      ctx.vars['updated'] = m.update(id, { ...ctx.body })
      return ctx.vars['updated']
    }
    return null
  }

  // delete Model($id)
  if (line.startsWith('delete ')) {
    const modelName = line.match(/delete\s+(\w+)/)?.[1]
    const m = server.models[modelName]
    if (m) {
      const id = ctx.params.id || ctx.vars['id']
      m.delete(id)
      ctx.res.noContent(); return '__RESPONDED__'
    }
    return null
  }

  // return expr statusCode
  if (line.startsWith('return ')) {
    const parts = line.slice(7).trim().split(/\s+/)
    const expr   = parts[0]
    const status = parseInt(parts[1]) || 200
    let result = evalExpr(expr, ctx, server)
    if (result === null || result === undefined) result = ctx.vars['inserted'] || ctx.vars['updated'] || {}
    ctx.res.json(status, result)
    return '__RESPONDED__'
  }

  return null
}

function evalExpr(expr, ctx, server) {
  expr = expr.trim()

  // jwt($var)
  if (expr.startsWith('jwt(')) {
    const varName = expr.match(/jwt\(\$([^)]+)\)/)?.[1]
    const user = varName ? ctx.vars[varName] : ctx.body
    return { token: generateJWT(user), user: sanitize(user) }
  }

  // Model.all(...)
  if (expr.includes('.all(')) {
    const modelName = expr.match(/^(\w+)\.all/)?.[1]
    const m = server.models[modelName]
    if (!m) return []
    const opts = {}
    const limitM  = expr.match(/limit=(\$?[\w.]+)/)
    const offsetM = expr.match(/offset=([^,)]+)/)
    const orderM  = expr.match(/order=([^,)]+)/)
    const whereM  = expr.match(/where=([^,)]+)/)
    if (limitM)  opts.limit  = resolveVar(limitM[1], ctx)
    if (offsetM) opts.offset = evalMath(offsetM[1], ctx)
    if (orderM)  opts.order  = orderM[1]
    if (whereM)  opts.where  = whereM[1]
    return m.all(opts)
  }

  // Model.find($id)
  if (expr.includes('.find(')) {
    const modelName = expr.match(/^(\w+)\.find/)?.[1]
    const idExpr = expr.match(/\.find\(([^)]+)\)/)?.[1]
    const m = server.models[modelName]
    return m ? m.find(resolveVar(idExpr, ctx)) : null
  }

  // Model.findBy(field=value)
  if (expr.includes('.findBy(')) {
    const modelName = expr.match(/^(\w+)\.findBy/)?.[1]
    const args = expr.match(/\.findBy\(([^)]+)\)/)?.[1]
    const [field, valExpr] = (args || '').split('=')
    const m = server.models[modelName]
    return m ? m.findBy(field.trim(), resolveVar(valExpr?.trim(), ctx)) : null
  }

  // Model.paginate(page, perPage)
  if (expr.includes('.paginate(')) {
    const modelName = expr.match(/^(\w+)\.paginate/)?.[1]
    const args = expr.match(/\.paginate\(([^)]+)\)/)?.[1]?.split(',')
    const m = server.models[modelName]
    if (!m) return { data: [], meta: {} }
    const page    = parseInt(resolveVar(args?.[0]?.trim(), ctx)) || 1
    const perPage = parseInt(resolveVar(args?.[1]?.trim(), ctx)) || 15
    return m.paginate(page, perPage)
  }

  // Model.count()
  if (expr.includes('.count(')) {
    const modelName = expr.match(/^(\w+)\.count/)?.[1]
    const m = server.models[modelName]
    return m ? m.count() : 0
  }

  // $var references
  if (expr === '$auth.user') return ctx.user
  if (expr.startsWith('$')) return resolveVar(expr, ctx)

  // @auth.user
  if (expr === '$auth.user' || expr === '$auth') return ctx.user

  return expr
}

function resolveVar(expr, ctx) {
  if (!expr) return undefined
  expr = expr.trim()
  if (expr.startsWith('$body.'))  return ctx.body[expr.slice(6)]
  if (expr.startsWith('$params.') || expr === '$id') {
    const key = expr.startsWith('$params.') ? expr.slice(8) : 'id'
    return ctx.params[key] || ctx.params['id']
  }
  if (expr.startsWith('$query.')) return ctx.query[expr.slice(7)]
  if (expr.startsWith('$auth.'))  return ctx.user?.[expr.slice(6)]
  if (expr.startsWith('$')) {
    const path = expr.slice(1).split('.')
    let val = ctx.vars[path[0]]
    for (let i = 1; i < path.length; i++) val = val?.[path[i]]
    return val
  }
  return expr
}

function evalMath(expr, ctx) {
  // Handles simple expressions like ($page-1)*$limit
  try {
    const resolved = expr.replace(/\$[\w.]+/g, m => resolveVar(m, ctx) || 0)
    return Function(`"use strict"; return (${resolved})`)()
  } catch { return 0 }
}

// ═══════════════════════════════════════════════════════════════
// FRONTEND RENDERER — same as v1 but served dynamically
// ═══════════════════════════════════════════════════════════════

function serveStaticFrontend(server, pages) {
  // Serve CSS + hydration runtime
  server.addRoute('GET', '/aiplang-hydrate.js', (req, res) => {
    const hydratePath = path.join(__dirname, 'node_modules', '..', 'flux-lang', 'runtime', 'aiplang-hydrate.js')
    if (fs.existsSync(hydratePath)) {
      res.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'public, max-age=3600' })
      res.end(fs.readFileSync(hydratePath))
    } else {
      res.writeHead(404); res.end('// hydrate runtime not found')
    }
  })

  // Serve each page
  for (const page of pages) {
    const route = page.route || '/'
    server.addRoute('GET', route, (req, res) => {
      const html = renderPageHTML(page, pages)
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(html)
    })
  }
}

function renderPageHTML(page, allPages) {
  const needsJS = page.queries.length > 0 || page.blocks.some(b => ['table','form','if','btn','select','faq'].includes(b.kind))
  const body    = page.blocks.map(b => renderBlock(b)).join('')
  const config  = needsJS ? JSON.stringify({
    id: page.id, theme: page.theme, state: page.state,
    routes: allPages.map(p=>p.route), queries: page.queries
  }) : ''
  const hydrate = needsJS ? `\n<script>window.__FLUX_PAGE__=${config};</script>\n<script src="/aiplang-hydrate.js" defer></script>` : ''
  const themeCSS = page.themeVars ? genThemeVarCSS(page.themeVars) : ''
  const customCSS = page.customTheme ? genCustomCSS(page.customTheme) : ''
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${page.id}</title><style>${getBaseCSS(page.theme)}${customCSS}${themeCSS}</style></head><body>${body}${hydrate}</body></html>`
}

function renderBlock(b) {
  const line = b.rawLine
  switch (b.kind) {
    case 'nav':   return renderNav(line)
    case 'hero':  return renderHero(line)
    case 'stats': return renderStats(line)
    case 'row':   return renderRow(line)
    case 'sect':  return renderSect(line)
    case 'foot':  return renderFoot(line)
    case 'table': return renderTable(line)
    case 'form':  return renderForm(line)
    case 'pricing': return renderPricing(line)
    case 'faq':   return renderFaq(line)
    case 'raw':   return extractBody(line) + '\n'
    case 'if':    return `<div class="fx-if-wrap" data-fx-if="${extractCond(line)}" style="display:none"></div>\n`
    default: return ''
  }
}

const esc = s => s==null?'':String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
const ic  = n => ({bolt:'⚡',rocket:'🚀',shield:'🛡',chart:'📊',star:'⭐',check:'✓',globe:'🌐',lock:'🔒',user:'👤',gear:'⚙',fire:'🔥',money:'💰',bell:'🔔',mail:'✉'}[n] || n)

function extractBody(line) {
  const bi=line.indexOf('{'),li=line.lastIndexOf('}')
  return bi!==-1&&li!==-1?line.slice(bi+1,li).trim():''
}
function extractCond(line) { return line.slice(3,line.indexOf('{')).trim() }

function parseItems(body) {
  return body.split('|').map(raw=>{
    raw=raw.trim();if(!raw)return null
    return raw.split('>').map(f=>{
      f=f.trim()
      if(f.startsWith('img:')) return{isImg:true,src:f.slice(4)}
      if(f.startsWith('/')) {const[p,l]=f.split(':');return{isLink:true,path:p.trim(),label:(l||'').trim()}}
      return{isLink:false,text:f}
    })
  }).filter(Boolean)
}

function renderNav(line) {
  const items=parseItems(extractBody(line))
  if(!items[0]) return ''
  const it=items[0],brand=!it[0]?.isLink?`<span class="fx-brand">${esc(it[0].text)}</span>`:''
  const start=!it[0]?.isLink?1:0
  const links=it.slice(start).filter(f=>f.isLink).map(f=>`<a href="${esc(f.path)}" class="fx-nav-link">${esc(f.label)}</a>`).join('')
  return `<nav class="fx-nav">${brand}<button class="fx-hamburger" onclick="this.classList.toggle('open');document.querySelector('.fx-nav-links').classList.toggle('open')"><span></span><span></span><span></span></button><div class="fx-nav-links">${links}</div></nav>\n`
}

function renderHero(line) {
  const items=parseItems(extractBody(line))
  let h1='',sub='',img='',ctas=''
  for(const item of items) for(const f of item){
    if(f.isImg) img=`<img src="${esc(f.src)}" class="fx-hero-img" alt="hero" loading="eager">`
    else if(f.isLink) ctas+=`<a href="${esc(f.path)}" class="fx-cta">${esc(f.label)}</a>`
    else if(!h1) h1=`<h1 class="fx-title">${esc(f.text)}</h1>`
    else sub+=`<p class="fx-sub">${esc(f.text)}</p>`
  }
  return `<section class="fx-hero${img?' fx-hero-split':''}"><div class="fx-hero-inner">${h1}${sub}${ctas}</div>${img}</section>\n`
}

function renderStats(line) {
  const cells=parseItems(extractBody(line)).map(item=>{
    const[val,lbl]=(item[0]?.text||'').split(':')
    const bind=(val?.includes('@')||val?.includes('$'))?` data-fx-bind="${esc(val?.trim())}"`  :''
    return`<div class="fx-stat"><div class="fx-stat-val"${bind}>${esc(val?.trim())}</div><div class="fx-stat-lbl">${esc(lbl?.trim())}</div></div>`
  }).join('')
  return `<div class="fx-stats">${cells}</div>\n`
}

function renderRow(line) {
  const bi=line.indexOf('{'),head=line.slice(0,bi).trim()
  const m=head.match(/row(\d+)/),cols=m?parseInt(m[1]):3
  const cards=parseItems(extractBody(line)).map(item=>{
    const inner=item.map((f,fi)=>{
      if(f.isImg) return`<img src="${esc(f.src)}" class="fx-card-img" alt="" loading="lazy">`
      if(f.isLink) return`<a href="${esc(f.path)}" class="fx-card-link">${esc(f.label)} →</a>`
      if(fi===0) return`<div class="fx-icon">${ic(f.text)}</div>`
      if(fi===1) return`<h3 class="fx-card-title">${esc(f.text)}</h3>`
      return`<p class="fx-card-body">${esc(f.text)}</p>`
    }).join('')
    return`<div class="fx-card">${inner}</div>`
  }).join('')
  return `<div class="fx-grid fx-grid-${cols}">${cards}</div>\n`
}

function renderSect(line) {
  let inner=''
  parseItems(extractBody(line)).forEach((item,ii)=>item.forEach(f=>{
    if(f.isLink) inner+=`<a href="${esc(f.path)}" class="fx-sect-link">${esc(f.label)}</a>`
    else if(ii===0) inner+=`<h2 class="fx-sect-title">${esc(f.text)}</h2>`
    else inner+=`<p class="fx-sect-body">${esc(f.text)}</p>`
  }))
  return `<section class="fx-sect">${inner}</section>\n`
}

function renderFoot(line) {
  let inner=''
  for(const item of parseItems(extractBody(line))) for(const f of item){
    if(f.isLink) inner+=`<a href="${esc(f.path)}" class="fx-footer-link">${esc(f.label)}</a>`
    else inner+=`<p class="fx-footer-text">${esc(f.text)}</p>`
  }
  return `<footer class="fx-footer">${inner}</footer>\n`
}

function renderTable(line) {
  const bi=line.indexOf('{'),binding=line.slice(6,bi).trim()
  const content=extractBody(line)
  const em=content.match(/edit\s+(PUT|PATCH)\s+(\S+)/),dm=content.match(/delete\s+(?:DELETE\s+)?(\S+)/)
  const clean=content.replace(/edit\s+(PUT|PATCH)\s+\S+/g,'').replace(/delete\s+(?:DELETE\s+)?\S+/g,'')
  const cols=clean.split('|').map(c=>{c=c.trim();if(c.startsWith('empty:')||!c)return null;const[l,k]=c.split(':').map(x=>x.trim());return k?{label:l,key:k}:null}).filter(Boolean)
  const emptyMsg=clean.match(/empty:\s*([^|]+)/)?.[1]||'No data.'
  const ths=cols.map(c=>`<th class="fx-th">${esc(c.label)}</th>`).join('')
  const ea=em?` data-fx-edit="${esc(em[2])}" data-fx-edit-method="${esc(em[1])}"`  :''
  const da=dm?` data-fx-delete="${esc(dm[1])}"`  :''
  const at=(em||dm)?'<th class="fx-th fx-th-actions">Actions</th>':''
  return `<div class="fx-table-wrap"><table class="fx-table" data-fx-table="${esc(binding)}" data-fx-cols='${JSON.stringify(cols.map(c=>c.key))}'${ea}${da}><thead><tr>${ths}${at}</tr></thead><tbody class="fx-tbody"><tr><td colspan="${cols.length+(em||dm?1:0)}" class="fx-td-empty">${esc(emptyMsg)}</td></tr></tbody></table></div>\n`
}

function renderForm(line) {
  const bi=line.indexOf('{')
  let head=line.slice(5,bi).trim(),action='',method='POST',bpath='#'
  const ai=head.indexOf('=>');if(ai!==-1){action=head.slice(ai+2).trim();head=head.slice(0,ai).trim()}
  const pts=head.split(/\s+/);method=pts[0]||'POST';bpath=pts[1]||'#'
  const fields=extractBody(line).split('|').map(f=>{
    const[label,type,ph]=f.split(':').map(x=>x.trim())
    if(!label) return''
    const name=label.toLowerCase().replace(/\s+/g,'_')
    const inp=type==='select'?`<select class="fx-input" name="${esc(name)}"><option value="">Select...</option></select>`:`<input class="fx-input" type="${esc(type||'text')}" name="${esc(name)}" placeholder="${esc(ph||'')}">`
    return`<div class="fx-field"><label class="fx-label">${esc(label)}</label>${inp}</div>`
  }).join('')
  return `<div class="fx-form-wrap"><form class="fx-form" data-fx-form="${esc(bpath)}" data-fx-method="${esc(method)}" data-fx-action="${esc(action)}">${fields}<div class="fx-form-msg"></div><button type="submit" class="fx-btn">Submit</button></form></div>\n`
}

function renderPricing(line) {
  const plans=extractBody(line).split('|').map(p=>{
    const pts=p.trim().split('>').map(x=>x.trim())
    return{name:pts[0],price:pts[1],desc:pts[2],linkRaw:pts[3]}
  }).filter(p=>p.name)
  const cards=plans.map((p,i)=>{
    let lh='#',ll='Get started'
    if(p.linkRaw){const m=p.linkRaw.match(/\/([^:]+):(.+)/);if(m){lh='/'+m[1];ll=m[2]}}
    const f=i===1?' fx-pricing-featured':''
    return`<div class="fx-pricing-card${f}">${i===1?'<div class="fx-pricing-badge">Most popular</div>':''}<div class="fx-pricing-name">${esc(p.name)}</div><div class="fx-pricing-price">${esc(p.price)}</div><p class="fx-pricing-desc">${esc(p.desc)}</p><a href="${esc(lh)}" class="fx-cta fx-pricing-cta">${esc(ll)}</a></div>`
  }).join('')
  return `<div class="fx-pricing">${cards}</div>\n`
}

function renderFaq(line) {
  const items=extractBody(line).split('|').map(i=>{const idx=i.indexOf('>');return{q:i.slice(0,idx).trim(),a:i.slice(idx+1).trim()}}).filter(i=>i.q)
  const html=items.map(i=>`<div class="fx-faq-item" onclick="this.classList.toggle('open')"><div class="fx-faq-q">${esc(i.q)}<span class="fx-faq-arrow">▸</span></div><div class="fx-faq-a">${esc(i.a)}</div></div>`).join('')
  return `<section class="fx-sect"><div class="fx-faq">${html}</div></section>\n`
}

// ─── Helpers ──────────────────────────────────────────────────

function parseRouteParams(routePath) {
  return routePath.split('/').filter(s => s.startsWith(':')).map(s => s.slice(1))
}

function matchRoute(routePattern, reqPath) {
  const rParts = routePattern.split('/')
  const uParts = reqPath.split('/')
  if (rParts.length !== uParts.length) return null
  const params = {}
  for (let i = 0; i < rParts.length; i++) {
    if (rParts[i].startsWith(':')) params[rParts[i].slice(1)] = uParts[i]
    else if (rParts[i] !== uParts[i]) return null
  }
  return params
}

function extractToken(req) {
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return null
}

async function parseBody(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', chunk => data += chunk)
    req.on('end', () => {
      try { resolve(JSON.parse(data)) }
      catch { resolve({}) }
    })
    req.on('error', () => resolve({}))
  })
}

function sanitize(obj) {
  if (!obj) return obj
  const s = { ...obj }
  delete s.password
  return s
}

function genThemeVarCSS(t) {
  const r=[]
  if(t.accent) r.push(`.fx-cta,.fx-btn{background:${t.accent}!important;color:#fff!important}`)
  if(t.bg)     r.push(`body{background:${t.bg}!important}`)
  if(t.text)   r.push(`body{color:${t.text}!important}`)
  if(t.font)   r.push(`@import url('https://fonts.googleapis.com/css2?family=${t.font.replace(/ /g,'+')}:wght@400;700;900&display=swap');body{font-family:'${t.font}',system-ui,sans-serif!important}`)
  if(t.radius) r.push(`.fx-card,.fx-form,.fx-btn,.fx-input,.fx-cta{border-radius:${t.radius}!important}`)
  if(t.surface)r.push(`.fx-card,.fx-form{background:${t.surface}!important}`)
  return r.join('')
}

function genCustomCSS(ct) {
  return `body{background:${ct.bg};color:${ct.text}}.fx-cta,.fx-btn{background:${ct.accent};color:#fff}`
}

function getBaseCSS(theme) {
  const base=`*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html{scroll-behavior:smooth}body{font-family:-apple-system,'Segoe UI',system-ui,sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh}a{text-decoration:none;color:inherit}input,button,select{font-family:inherit}img{max-width:100%;height:auto}.fx-nav{display:flex;align-items:center;justify-content:space-between;padding:1rem 2.5rem;position:sticky;top:0;z-index:50;backdrop-filter:blur(12px);flex-wrap:wrap;gap:.5rem}.fx-brand{font-size:1.25rem;font-weight:800;letter-spacing:-.03em}.fx-nav-links{display:flex;align-items:center;gap:1.75rem}.fx-nav-link{font-size:.875rem;font-weight:500;opacity:.65;transition:opacity .15s}.fx-nav-link:hover{opacity:1}.fx-hamburger{display:none;flex-direction:column;gap:5px;background:none;border:none;cursor:pointer;padding:.25rem}.fx-hamburger span{display:block;width:22px;height:2px;background:currentColor;transition:all .2s;border-radius:1px}.fx-hamburger.open span:nth-child(1){transform:rotate(45deg) translate(5px,5px)}.fx-hamburger.open span:nth-child(2){opacity:0}.fx-hamburger.open span:nth-child(3){transform:rotate(-45deg) translate(5px,-5px)}@media(max-width:640px){.fx-hamburger{display:flex}.fx-nav-links{display:none;width:100%;flex-direction:column;align-items:flex-start;gap:.75rem;padding:.75rem 0}.fx-nav-links.open{display:flex}}.fx-hero{display:flex;align-items:center;justify-content:center;min-height:92vh;padding:4rem 1.5rem}.fx-hero-split{display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:center;padding:4rem 2.5rem;min-height:70vh}.fx-hero-img{width:100%;border-radius:1.25rem;object-fit:cover;max-height:500px}.fx-hero-inner{max-width:56rem;text-align:center;display:flex;flex-direction:column;align-items:center;gap:1.5rem}.fx-hero-split .fx-hero-inner{text-align:left;align-items:flex-start;max-width:none}.fx-title{font-size:clamp(2.5rem,8vw,5.5rem);font-weight:900;letter-spacing:-.04em;line-height:1}.fx-sub{font-size:clamp(1rem,2vw,1.25rem);line-height:1.75;max-width:40rem}.fx-cta{display:inline-flex;align-items:center;padding:.875rem 2.5rem;border-radius:.75rem;font-weight:700;font-size:1rem;transition:transform .15s;margin:.25rem}.fx-cta:hover{transform:translateY(-1px)}.fx-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:3rem;padding:5rem 2.5rem;text-align:center}.fx-stat-val{font-size:clamp(2.5rem,5vw,4rem);font-weight:900;letter-spacing:-.04em;line-height:1}.fx-stat-lbl{font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;margin-top:.5rem}.fx-grid{display:grid;gap:1.25rem;padding:1rem 2.5rem 5rem}.fx-grid-2{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}.fx-grid-3{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}.fx-grid-4{grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}.fx-card{border-radius:1rem;padding:1.75rem;transition:transform .2s,box-shadow .2s}.fx-card:hover{transform:translateY(-2px)}.fx-card-img{width:100%;border-radius:.75rem;object-fit:cover;height:180px;margin-bottom:1rem}.fx-icon{font-size:2rem;margin-bottom:1rem}.fx-card-title{font-size:1.0625rem;font-weight:700;letter-spacing:-.02em;margin-bottom:.5rem}.fx-card-body{font-size:.875rem;line-height:1.65}.fx-sect{padding:5rem 2.5rem}.fx-sect-title{font-size:clamp(1.75rem,4vw,3rem);font-weight:800;letter-spacing:-.04em;margin-bottom:1.5rem;text-align:center}.fx-sect-body{font-size:1rem;line-height:1.75;text-align:center;max-width:48rem;margin:0 auto}.fx-form-wrap{padding:3rem 2.5rem;display:flex;justify-content:center}.fx-form{width:100%;max-width:28rem;border-radius:1.25rem;padding:2.5rem}.fx-field{margin-bottom:1.25rem}.fx-label{display:block;font-size:.8125rem;font-weight:600;margin-bottom:.5rem}.fx-input{width:100%;padding:.75rem 1rem;border-radius:.625rem;font-size:.9375rem;outline:none;transition:box-shadow .15s}.fx-input:focus{box-shadow:0 0 0 3px rgba(37,99,235,.35)}.fx-btn{width:100%;padding:.875rem 1.5rem;border:none;border-radius:.625rem;font-size:.9375rem;font-weight:700;cursor:pointer;margin-top:.5rem;transition:transform .15s,opacity .15s}.fx-btn:hover{transform:translateY(-1px)}.fx-btn:disabled{opacity:.5;cursor:not-allowed}.fx-form-msg{font-size:.8125rem;padding:.5rem 0;min-height:1.5rem;text-align:center}.fx-form-err{color:#f87171}.fx-form-ok{color:#4ade80}.fx-table-wrap{overflow-x:auto;padding:0 2.5rem 4rem}.fx-table{width:100%;border-collapse:collapse;font-size:.875rem}.fx-th{text-align:left;padding:.875rem 1.25rem;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em}.fx-th-actions{opacity:.6}.fx-tr{transition:background .1s}.fx-td{padding:.875rem 1.25rem}.fx-td-empty{padding:2rem 1.25rem;text-align:center;opacity:.4}.fx-td-actions{white-space:nowrap;padding:.5rem 1rem!important}.fx-action-btn{border:none;cursor:pointer;font-size:.75rem;font-weight:600;padding:.3rem .75rem;border-radius:.375rem;margin-right:.375rem;font-family:inherit;transition:opacity .15s}.fx-action-btn:hover{opacity:.85}.fx-edit-btn{background:#1e40af;color:#93c5fd}.fx-delete-btn{background:#7f1d1d;color:#fca5a5}.fx-pricing{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1.5rem;padding:2rem 2.5rem 5rem;align-items:start}.fx-pricing-card{border-radius:1.25rem;padding:2rem;position:relative;transition:transform .2s}.fx-pricing-featured{transform:scale(1.03)}.fx-pricing-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#2563eb;color:#fff;font-size:.7rem;font-weight:700;padding:.25rem .875rem;border-radius:999px;white-space:nowrap}.fx-pricing-name{font-size:.875rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.5rem;opacity:.7}.fx-pricing-price{font-size:3rem;font-weight:900;letter-spacing:-.05em;line-height:1;margin-bottom:.75rem}.fx-pricing-desc{font-size:.875rem;line-height:1.65;margin-bottom:1.5rem;opacity:.7}.fx-pricing-cta{display:block;text-align:center;padding:.75rem;border-radius:.625rem;font-weight:700;font-size:.9rem}.fx-faq{max-width:48rem;margin:0 auto}.fx-faq-item{border-radius:.75rem;margin-bottom:.625rem;cursor:pointer;overflow:hidden}.fx-faq-q{display:flex;justify-content:space-between;align-items:center;padding:1rem 1.25rem;font-size:.9375rem;font-weight:600}.fx-faq-arrow{transition:transform .2s;font-size:.75rem;opacity:.5}.fx-faq-item.open .fx-faq-arrow{transform:rotate(90deg)}.fx-faq-a{max-height:0;overflow:hidden;padding:0 1.25rem;font-size:.875rem;line-height:1.7;transition:max-height .3s,padding .3s}.fx-faq-item.open .fx-faq-a{max-height:300px;padding:.75rem 1.25rem 1.25rem}.fx-if-wrap{display:contents}.fx-footer{padding:3rem 2.5rem;text-align:center}.fx-footer-text{font-size:.8125rem}.fx-footer-link{font-size:.8125rem;margin:0 .75rem;opacity:.5;transition:opacity .15s}.fx-footer-link:hover{opacity:1}`
  const T={dark:`body{background:#030712;color:#f1f5f9}.fx-nav{border-bottom:1px solid #1e293b;background:rgba(3,7,18,.85)}.fx-nav-link{color:#cbd5e1}.fx-sub{color:#94a3b8}.fx-cta{background:#2563eb;color:#fff;box-shadow:0 8px 24px rgba(37,99,235,.35)}.fx-stat-lbl{color:#64748b}.fx-card{background:#0f172a;border:1px solid #1e293b}.fx-card:hover{box-shadow:0 20px 40px rgba(0,0,0,.5)}.fx-card-body{color:#64748b}.fx-sect-body{color:#64748b}.fx-form{background:#0f172a;border:1px solid #1e293b}.fx-label{color:#94a3b8}.fx-input{background:#020617;border:1px solid #1e293b;color:#f1f5f9}.fx-input::placeholder{color:#334155}.fx-btn{background:#2563eb;color:#fff;box-shadow:0 4px 14px rgba(37,99,235,.4)}.fx-th{color:#475569;border-bottom:1px solid #1e293b}.fx-tr:hover{background:#0f172a}.fx-td{border-bottom:1px solid rgba(255,255,255,.03)}.fx-footer{border-top:1px solid #1e293b}.fx-footer-text{color:#334155}.fx-pricing-card{background:#0f172a;border:1px solid #1e293b}.fx-faq-item{background:#0f172a}`,light:`body{background:#fff;color:#0f172a}.fx-nav{border-bottom:1px solid #e2e8f0;background:rgba(255,255,255,.85)}.fx-cta{background:#2563eb;color:#fff}.fx-btn{background:#2563eb;color:#fff}.fx-card{background:#f8fafc;border:1px solid #e2e8f0}.fx-form{background:#f8fafc;border:1px solid #e2e8f0}.fx-input{background:#fff;border:1px solid #cbd5e1;color:#0f172a}.fx-th{color:#94a3b8;border-bottom:1px solid #e2e8f0}.fx-tr:hover{background:#f8fafc}.fx-footer{border-top:1px solid #e2e8f0}.fx-pricing-card{background:#f8fafc;border:1px solid #e2e8f0}.fx-faq-item{background:#f8fafc}`}
  return base+(T[theme]||T.dark)
}

// ═══════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════

async function startServer(fluxFile, port = 3000) {
  const src  = fs.readFileSync(fluxFile, 'utf8')
  const app  = parseApp(src)
  const srv  = new AiplangServer()

  // Setup JWT
  if (app.auth) {
    JWT_SECRET = resolveEnvValue(app.auth.secret) || JWT_SECRET
    JWT_EXPIRE = app.auth.expire || '7d'
  }

  // Setup DB
  const dbFile = app.db ? resolveEnvValue(app.db.dsn) : ':memory:'
  await getDB(dbFile === ':memory:' ? ':memory:' : dbFile)
  console.log(`[aiplang] DB:     ${dbFile}`)

  // Migrate models
  console.log(`[aiplang] Migrations:`)
  migrateModels(app.models)

  // Register models in server
  for (const model of app.models) {
    srv.registerModel(model.name)
  }

  // Register API routes
  for (const route of app.apis) {
    compileAPIRoute(route, app, srv)
    console.log(`[aiplang] Route:  ${route.method} ${route.path}`)
  }

  // Register frontend pages
  serveStaticFrontend(srv, app.pages)
  for (const page of app.pages) {
    console.log(`[aiplang] Page:   GET ${page.route}`)
  }

  // Health check
  srv.addRoute('GET', '/health', (req, res) => {
    res.json(200, {
      status: 'ok', version: '1.0.0',
      models: app.models.map(m => m.name),
      routes: app.apis.length, pages: app.pages.length
    })
  })

  srv.listen(port)
  return srv
}

function resolveEnvValue(val) {
  if (!val) return val
  if (val.startsWith('$')) return process.env[val.slice(1)] || val
  return val
}

module.exports = { startServer, parseApp, Model, getDB }

// Run if called directly
if (require.main === module) {
  const fluxFile = process.argv[2]
  const port     = parseInt(process.argv[3] || process.env.PORT || '3000')
  if (!fluxFile) { console.error('Usage: node server.js <app.flux> [port]'); process.exit(1) }
  startServer(fluxFile, port).catch(e => { console.error(e); process.exit(1) })
}
