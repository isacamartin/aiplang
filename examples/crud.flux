# Complete CRUD — users management
# flux-web v1.0

%users dark /users

@users = []
~mount GET /api/users => @users

nav{AppName>/users:Users>/settings:Settings}
sect{User Management}
table @users {
  Name:name | Email:email | Plan:plan | Status:status
  empty: No users yet. Add one below.
  edit PUT /api/users/{id}
  delete DELETE /api/users/{id}
}
sect{Add User}
form POST /api/users => @users.push($result) {
  Full name : text : Alice Johnson
  Email : email : alice@company.com
  Plan : select : starter,pro,enterprise
}
foot{AppName © 2025}
