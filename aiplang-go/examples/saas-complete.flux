# SaaS app completo em aiplang v2
# Frontend + Backend + Database + Auth em 1 arquivo
# ~80 tokens vs ~15,000 tokens em Next.js + Express + Prisma

~env DATABASE_URL required
~env JWT_SECRET required
~env PORT=3000

~db sqlite ./saas.db
~auth jwt $JWT_SECRET expire=7d
~middleware cors | rate-limit 100/min | log

model User {
  id         : uuid      : pk auto
  name       : text      : required
  email      : text      : required unique
  password   : text      : required hashed
  plan       : enum      : starter,pro,enterprise : default=starter
  role       : enum      : user,admin : default=user
  created_at : timestamp : auto
  updated_at : timestamp : auto
}

model Subscription {
  id         : uuid      : pk auto
  user_id    : ref User  : required
  plan       : text      : required
  status     : enum      : active,cancelled : default=active
  created_at : timestamp : auto
}

api POST /api/auth/register {
  ~validate name required | email required email | password min=8
  ~unique User email $body.email | 409
  insert User($body)
  return jwt($inserted) 201
}

api POST /api/auth/login {
  ~validate email required | password required
  $user = User.findBy(email=$body.email)
  ~check password $body.password $user.password | 401
  return jwt($user) 200
}

api GET /api/me {
  ~guard auth
  return $auth.user
}

api GET /api/users {
  ~guard admin
  ~query page=1 limit=20
  return User.all(limit=$limit, offset=($page-1)*$limit, order=created_at desc)
}

api GET /api/users/:id {
  ~guard auth
  return User.find($id) | 404
}

api PUT /api/users/:id {
  ~guard auth | owner
  ~validate name? | email? email
  update User($id, $body)
  return $updated
}

api DELETE /api/users/:id {
  ~guard auth | admin
  delete User($id)
  return 204
}

api GET /api/stats {
  ~guard admin
  return User.all(order=created_at desc, limit=1000)
}

%home dark /

nav{SaaSApp>/pricing:Pricing>/login:Sign in>/signup:Get started}
hero{Ship faster with AI|Zero config, infinite scale. Deploy in 3 seconds.>/signup:Start free>/demo:View demo}
row3{rocket>Deploy instantly>Push to git, live in 3 seconds. No config, no DevOps.|shield>Enterprise ready>SOC2, GDPR, SSO, RBAC. Everything built-in.|chart>Full observability>Errors, performance, usage. Real-time dashboards.}
testimonial{Sarah Chen, CEO @ Acme|"Cut our deployment time by 90%. Absolutely game-changing for our team."|img:https://i.pravatar.cc/64?img=47}
foot{© 2025 SaaSApp>/privacy:Privacy>/terms:Terms>/status:Status}

---

%pricing light /pricing

nav{SaaSApp>/login:Sign in}
hero{Simple, transparent pricing|No hidden fees. Cancel anytime.}
pricing{Starter>Free>3 projects, 1GB, community support>/signup:Get started|Pro>$29/mo>Unlimited projects, priority support, analytics>/signup:Start trial|Enterprise>Custom>SSO, SLA, dedicated CSM, on-prem>/contact:Talk to sales}
faq{How do I get started?>Sign up free, no credit card required. Deploy your first app in 5 minutes.|Can I cancel anytime?>Yes. Cancel with one click, no questions asked, no penalties.|Do you offer refunds?>Full refund within 14 days, no questions asked.}
foot{© 2025 SaaSApp · All paid plans include a 14-day free trial}

---

%signup dark /signup

nav{SaaSApp>/login:Sign in}
hero{Create your account|Start for free. No credit card required.}
form POST /api/auth/register => redirect /dashboard { Name:text:Alice Johnson | Email:email:alice@company.com | Password:password: }
foot{© 2025 SaaSApp}

---

%login dark /login

nav{SaaSApp>/signup:Get started}
hero{Welcome back|Sign in to your account.}
form POST /api/auth/login => redirect /dashboard { Email:email:you@company.com | Password:password: }
foot{© 2025 SaaSApp}

---

%dashboard dark /dashboard

@user = {}
@users = []
@stats = {}
~mount GET /api/me => @user
~mount GET /api/users => @users
~mount GET /api/stats => @stats
~interval 30000 GET /api/stats => @stats

nav{SaaSApp>/logout:Sign out}
stats{@stats.total:Total users|@stats.active:Active|@stats.pro:Pro plan|@stats.arr:ARR}
sect{User database}
table @users { Name:name | Email:email | Plan:plan | Role:role | Status:status | edit PUT /api/users/{id} | delete /api/users/{id} | empty: No users yet. }
foot{SaaSApp Dashboard © 2025}
