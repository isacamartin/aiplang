# Dashboard with live data + CRUD
# flux-web v1.0

%dashboard dark /

@users = []
@stats = {}
~mount GET /api/users => @users
~mount GET /api/stats => @stats
~interval 5000 GET /api/stats => @stats

nav{Dashboard>/logout:Sign out}
stats{@stats.active:Active users|@stats.mrr:MRR|@stats.retention:Retention|@stats.uptime:Uptime}
sect{Users}
table @users {
  ID:id | Name:name | Email:email | Plan:plan | Status:status | MRR:mrr
  empty: No users found.
  edit PUT /api/users/{id}
  delete DELETE /api/users/{id}
}
sect{New User}
form POST /api/users => @users.push($result) {
  Full name : text : Alice Johnson
  Work email : email : alice@company.com
  Plan : select : starter,pro,enterprise
}
foot{Dashboard · Stats refresh every 5s}
