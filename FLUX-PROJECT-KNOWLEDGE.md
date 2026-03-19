# FLUX — AI Web Language — Project Knowledge

## What you do in this project

When someone asks for a web page, dashboard, form, or app — you generate FLUX code.
You NEVER generate React, HTML, JSX, or any other format unless explicitly asked.
You ALWAYS output a complete, valid `.flux` file and nothing else (no explanation unless asked).

---

## FLUX syntax — complete reference

### File structure
```
%id theme /route          ← required first line
@var = defaultValue       ← reactive state (optional)
$computed = @expr         ← computed value (optional)
~mount METHOD /path => action    ← fetch on load (optional)
~interval N METHOD /path => action  ← polling every N ms (optional)
blocks...                 ← page content
---                       ← page separator (multi-page apps)
%id2 theme /route2        ← next page
...
```

### Meta line
```
%home dark /              → id=home, theme=dark, route=/
%dashboard dark /dashboard
%login light /login
%pricing light /pricing
```
Themes: `dark` `light` `acid`

### State
```
@users = []
@stats = {}
@count = 0
@loading = true
@filter = "all"
```

### Lifecycle queries
```
~mount GET /api/users => @users
~mount GET /api/stats => @stats
~mount POST /api/session {token:@token} => @user
~interval 10000 GET /api/stats => @stats
~interval 30000 GET /api/feed => @posts
```

### Blocks

**nav**
```
nav{Brand>/path:Label>/path:Label}
```
First field = brand name. Rest = links.

**hero**
```
hero{Title|Subtitle>/path:CTA label>/path:Second CTA}
```
First text = h1. Second text = paragraph. Links = CTA buttons.

**stats**
```
stats{value:label|value:label|value:label}
stats{@stats.users:Users|@stats.mrr:MRR|@stats.uptime:Uptime}
```

**rowN** (card grid, N = columns)
```
row3{icon>Title>Body|icon>Title>Body|icon>Title>Body}
row4{icon>Title>Body|icon>Title>Body|icon>Title>Body|icon>Title>Body}
```
Field 0 = icon name. Field 1 = card title. Field 2 = body text. Optional link field.

**sect**
```
sect{Title|Body paragraph text here}
sect{Title|First paragraph|Second paragraph}
```

**table** (reactive, bound to state array)
```
table @users {
  Name:name | Email:email | Plan:plan | Status:status | MRR:mrr
  empty: No users yet.
}
```
Format: `Header Label : object key`

**list** (reactive feed/list)
```
list @posts {
  title:title | body:body
}
```

**form** (POST/PUT/PATCH/DELETE with action)
```
form POST /api/users => @users.push($result) {
  Full name : text : Alice Johnson
  Email : email : alice@company.com
  Plan : select : starter,pro,enterprise
}
```
Field format: `Label : inputType : placeholder`
Input types: `text` `email` `password` `number` `tel` `date` `select`
For select: placeholder = comma-separated options

**form with redirect** (auth)
```
form POST /api/auth/login => redirect /dashboard {
  Email : email : you@company.com
  Password : password :
}
```

**if** (conditional block)
```
if @loading { sect{Loading...} }
if !@user.id { sect{Please sign in>/login:Sign in} }
if @error { alert{@error} }
```

**foot**
```
foot{© 2025 AppName}
foot{© 2025 AppName>/privacy:Privacy>/terms:Terms>/status:Status}
```

### Form actions
```
=> @list.push($result)     add API response to array
=> @var = $result          replace state with response
=> redirect /path          navigate to route after success
=> reload                  reload page
```

### Separators
| Token | Meaning |
|-------|---------|
| `\|` | next item / column |
| `>` | next field within item |
| `:` | subfield (stats: value:label, form: Label:type:placeholder, table: Header:key) |
| `---` | page separator |
| `@` | state variable |
| `$` | computed variable |
| `~` | lifecycle hook |
| `=>` | action / callback |

### Icons
`bolt` `rocket` `shield` `chart` `globe` `gear` `lock` `star` `heart`
`check` `alert` `user` `car` `money` `phone` `fire` `clock` `pin` `leaf`
`map` `flash` `eye` `tag` `plus` `minus` `edit` `trash` `search` `bell`
`home` `mail` `download` `upload` `link`

---

## Complete examples

### SaaS landing (static, no JS)
```flux
%home dark /

nav{AppName>/features:Features>/pricing:Pricing>/login:Sign in}
hero{Ship faster with AI|Deploy in seconds. Zero config, infinite scale.>/signup:Start for free>/demo:View demo}
row3{rocket>Deploy instantly>Push to git, live in 3 seconds. No config, no DevOps.|shield>Enterprise ready>SOC2, GDPR, SSO, RBAC. Everything built-in.|chart>Full observability>Errors, performance, usage. Real-time dashboards.}
foot{© 2025 AppName>/privacy:Privacy>/terms:Terms}
```

### Dashboard with live data
```flux
%dashboard dark /dashboard

@users = []
@stats = {}
~mount GET /api/users => @users
~mount GET /api/stats => @stats
~interval 10000 GET /api/stats => @stats

nav{AppName>/logout:Sign out}
stats{@stats.users:Users|@stats.mrr:MRR|@stats.retention:Retention}
sect{Users}
table @users {
  Name:name | Email:email | Plan:plan | Status:status | MRR:mrr
  empty: No users yet.
}
form POST /api/users => @users.push($result) {
  Full name : text : Alice Johnson
  Email : email : alice@company.com
  Plan : select : starter,pro,enterprise
}
foot{AppName Dashboard © 2025}
```

### Login
```flux
%login dark /login

nav{AppName}
hero{Welcome back|Sign in to continue.}
form POST /api/auth/login => redirect /dashboard {
  Email : email : you@company.com
  Password : password :
}
foot{© 2025 AppName}
```

### Pricing page
```flux
%pricing light /pricing

nav{AppName>/features:Features>/login:Sign in}
hero{Simple, transparent pricing|No hidden fees. Cancel anytime.}
row3{star>Starter>Free forever. 3 projects, 1GB, community support.>/signup:Get started|rocket>Pro>$29/month. Unlimited projects, priority support.>/signup:Start trial|shield>Enterprise>Custom pricing. SSO, SLA, dedicated support.>/contact:Talk to sales}
foot{© 2025 AppName · All plans include a 14-day free trial}
```

### Full multi-page SaaS app
```flux
%home dark /

@stats = {}
~mount GET /api/stats => @stats

nav{AppName>/dashboard:Dashboard>/pricing:Pricing>/login:Sign in}
hero{Ship faster with AI|Real-time data, zero config.>/dashboard:Open app>/pricing:See plans}
stats{@stats.users:Users|@stats.mrr:MRR|@stats.uptime:Uptime}
row3{rocket>Deploy instantly>3 seconds from push to live.|shield>Enterprise>SOC2, GDPR, SSO.|chart>Observability>Real-time errors and performance.}
foot{© 2025 AppName}

---

%dashboard dark /dashboard

@users = []
@stats = {}
~mount GET /api/users => @users
~mount GET /api/stats => @stats
~interval 10000 GET /api/stats => @stats

nav{AppName>/logout:Sign out}
stats{@stats.users:Users|@stats.mrr:MRR|@stats.retention:Retention}
sect{User database}
table @users {
  Name:name | Email:email | Plan:plan | Status:status | MRR:mrr
  empty: No users yet.
}
sect{Add user}
form POST /api/users => @users.push($result) {
  Full name : text : Alice Johnson
  Email : email : alice@company.com
  Plan : select : starter,pro,enterprise
}
foot{AppName © 2025}

---

%login dark /login

nav{AppName}
hero{Welcome back|Sign in to continue.}
form POST /api/auth/login => redirect /dashboard {
  Email : email : you@company.com
  Password : password :
}
foot{© 2025 AppName}
```

---

## How to use the output

1. Save as `app.flux`
2. Run: `fluxbuild app.flux --out dist/`
3. Deploy `dist/` to any static host (Vercel, Netlify, S3, Nginx)
4. Or open `demo/index.html` from the GitHub repo to preview live

GitHub: https://github.com/isacamartin/flux

---

## Rules for generating FLUX

1. Always output a complete `.flux` file — never partial
2. One `%` meta line per page section, always first
3. Use `---` on its own line to separate pages
4. `|` separates items, `>` separates fields, `:` separates subfields — never mix them up
5. All links start with `/` followed immediately by the path, then `:Label`
6. `table` and `list` always use `@varname` binding
7. `form` always has a `METHOD`, `/path`, and `=> action`
8. Static pages (no `@` bindings, no `~mount`, no `table/form`) need zero JS — keep them static
9. For auth flows always use `=> redirect /path`
10. Never add HTML, CSS, JS, React, or any other format — FLUX only
