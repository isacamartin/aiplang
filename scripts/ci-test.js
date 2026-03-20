// aiplang CI integration test
// Run: node scripts/ci-test.js (from repo root or packages/aiplang-pkg)
'use strict'

const http = require('http')
const { spawn } = require('child_process')
const fs   = require('fs')
const path = require('path')

// Paths work whether run from repo root or packages/aiplang-pkg
const ROOT   = path.resolve(__dirname, '..')
const SERVER = path.join(ROOT, 'packages/aiplang-pkg/server/server.js')
const DB     = '/tmp/aiplang-ci.db'
const PORT   = 19999

try { fs.unlinkSync(DB) } catch {}

// Write test .aip without leading spaces
fs.writeFileSync('/tmp/aiplang-ci.aip', [
  '~env JWT_SECRET=ci-test-secret-2025',
  '~db sqlite ' + DB,
  '~auth jwt $JWT_SECRET expire=1h',
  '',
  'model User {',
  '  id       : uuid : pk auto',
  '  email    : text : required unique',
  '  password : text : required hashed',
  '}',
  '',
  'model Item {',
  '  id     : uuid : pk auto',
  '  titulo : text : required',
  '  ~belongs User',
  '}',
  '',
  'api POST /api/auth/register {',
  '  ~validate email required email | password min=8',
  '  ~unique User email $body.email | 409',
  '  ~hash password',
  '  insert User($body)',
  '  return jwt($inserted) 201',
  '}',
  '',
  'api POST /api/auth/login {',
  '  $user = User.findBy(email=$body.email)',
  '  ~check password $body.password $user.password | 401',
  '  return jwt($user) 200',
  '}',
  '',
  'api GET /api/me {',
  '  ~guard auth',
  '  return $auth.user',
  '}',
  '',
  'api GET /api/items {',
  '  ~guard auth',
  '  return Item.all(order=created_at desc)',
  '}',
  '',
  'api POST /api/items {',
  '  ~guard auth',
  '  ~validate titulo required',
  '  insert Item($body)',
  '  return $inserted 201',
  '}',
  '',
  'api GET /api/stats { return User.count() }',
  '',
  '%home dark /',
  'nav{CI Test}',
  'hero{aiplang CI}',
  'foot{OK}',
].join('\n'))

const srv = spawn(process.execPath, [SERVER, '/tmp/aiplang-ci.aip', String(PORT)], {
  stdio: 'pipe',
  env: { ...process.env, JWT_SECRET: 'ci-test-secret-2025' }
})

let slog = ''
srv.stdout.on('data', d => slog += d)
srv.stderr.on('data', d => {})

const results = []
let exitCode = 0

function check(name, ok, detail = '') {
  results.push([name, ok])
  const icon = ok ? '✓' : '✗'
  console.log(`  ${icon}  ${name}${detail ? ' — ' + detail : ''}`)
  if (!ok) exitCode = 1
}

async function req(method, p, body, token) {
  return new Promise(resolve => {
    const d = body ? JSON.stringify(body) : null
    const h = { 'Content-Type': 'application/json' }
    if (token) h['Authorization'] = 'Bearer ' + token
    if (d) h['Content-Length'] = Buffer.byteLength(d)
    const r = http.request(
      { hostname: 'localhost', port: PORT, path: p, method, headers: h },
      res => {
        let b = ''
        res.on('data', c => b += c)
        res.on('end', () => {
          try { resolve([res.statusCode, JSON.parse(b)]) }
          catch { resolve([res.statusCode, b]) }
        })
      }
    )
    r.on('error', () => resolve([0, {}]))
    if (d) r.write(d)
    r.end()
  })
}

setTimeout(async () => {
  if (!slog.includes('Server →')) {
    console.error('✗ Server failed to start')
    console.error(slog)
    process.exit(1)
  }
  console.log('  ✓  Server started\n')

  let s, d, tok = '', rtok = ''

  // Auth
  ;[s,d] = await req('POST','/api/auth/register',{email:'ci@t.com',password:'senha1234'})
  tok = d.token || ''
  rtok = d.refresh_token || ''
  check('Register 201', s===201)
  check('JWT returned', tok.length > 20)
  check('Refresh token returned', rtok.length > 20)

  ;[s,d] = await req('POST','/api/auth/login',{email:'ci@t.com',password:'senha1234'})
  tok = d.token || ''
  check('Login 200', s===200)

  ;[s,d] = await req('POST','/api/auth/login',{email:'ci@t.com',password:'wrong'})
  check('Wrong password → 401', s===401)

  ;[s,d] = await req('POST','/api/auth/register',{email:'ci@t.com',password:'senha1234'})
  check('Duplicate email → 409', s===409)

  ;[s,d] = await req('POST','/api/auth/register',{email:'bad',password:'x'})
  check('Validation → 422', s===422)

  // Guards
  ;[s,d] = await req('GET','/api/me')
  check('No token → 401', s===401)

  ;[s,d] = await req('GET','/api/me',null,tok)
  check('/me with token → 200', s===200 && d.email==='ci@t.com')

  ;[s,d] = await req('GET','/api/me',null,'bad.token.here')
  check('Invalid token → 401', s===401)

  // CRUD
  ;[s,d] = await req('POST','/api/items',{titulo:'Test item'},tok)
  check('Create item → 201', s===201 && !!d.id)

  ;[s,d] = await req('GET','/api/items',null,tok)
  check('List items → 200', s===200 && Array.isArray(d) && d.length>=1)

  // JWT refresh — must run BEFORE brute-force test (which blocks /api/auth/*)
  if (rtok) {
    ;[s,d] = await req('POST','/api/auth/refresh',{refresh_token: rtok})
    check('Refresh token → new token', s===200 && !!d.token)
    check('Refresh returns new refresh_token', !!d.refresh_token)
    ;[s,d] = await req('POST','/api/auth/refresh',{refresh_token:'bad.token.x'})
    check('Invalid refresh → 401', s===401)
  } else {
    check('Refresh token → new token', false, 'no rtok')
  }

  // Health
  ;[s,d] = await req('GET','/health')
  check('Health → 200', s===200)
  check('Version in health', typeof d.version === 'string')

  // Stats
  ;[s,d] = await req('GET','/api/stats')
  check('Stats → 200', s===200)

  // Frontend page
  const html = await new Promise(resolve => {
    const r = http.request({hostname:'localhost',port:PORT,path:'/',method:'GET'}, res => {
      let b=''; res.on('data',c=>b+=c); res.on('end',()=>resolve(b))
    })
    r.on('error',()=>resolve(''))
    r.end()
  })
  check('Frontend page renders', html.includes('fx-nav') && html.length > 5000)

  // Brute-force protection — run LAST (blocks auth routes after)
  for (let i=0;i<22;i++) await req('POST','/api/auth/login',{email:'x@x.com',password:'x'})
  ;[s,d] = await req('POST','/api/auth/login',{email:'x@x.com',password:'x'})
  check('Brute-force → 429', s===429)

  // Summary
  const passed = results.filter(([,ok])=>ok).length
  console.log(`\n  ${'─'.repeat(44)}`)
  console.log(`  ${passed}/${results.length} tests passed`)
  if (exitCode !== 0) {
    console.log('\n  Failed:')
    results.filter(([,ok])=>!ok).forEach(([n])=>console.log('    ✗ '+n))
  }

  srv.kill()
  process.exit(exitCode)
}, 5000)
