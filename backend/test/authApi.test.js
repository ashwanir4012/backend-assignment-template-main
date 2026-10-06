const test = require("node:test");
const assert = require("node:assert/strict");

const Student = require("../src/models/Student");
const app = require("../src/app");

test("auth API registers, logs in, protects /me, and rejects duplicate emails", async () => {
  const original = { exists: Student.exists, create: Student.create, findOne: Student.findOne, findById: Student.findById };
  const user = {
    _id: "507f1f77bcf86cd799439011", fullName: "Riya Sharma", email: "riya@example.com",
    role: "student", targetCountries: [], interestedFields: [], preferredIntake: "",
    profileComplete: false, comparePassword: async (password) => password === "SecurePass123!",
  };
  let exists = false;
  Student.exists = async () => (exists ? { _id: user._id } : null);
  Student.create = async (payload) => { exists = true; return { ...user, ...payload }; };
  Student.findOne = async () => (exists ? user : null);
  Student.findById = () => ({ select: async () => (exists ? user : null) });
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    const register = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ fullName: "Riya Sharma", email: user.email, password: "SecurePass123!" }),
    });
    const registered = await register.json();
    assert.equal(register.status, 201);
    assert.ok(registered.data.token);
    assert.equal(registered.data.student.role, "student");

    const duplicate = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ fullName: "Riya Sharma", email: user.email, password: "SecurePass123!" }),
    });
    assert.equal(duplicate.status, 409);

    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: user.email, password: "SecurePass123!" }),
    });
    const loggedIn = await login.json();
    assert.equal(login.status, 200);

    const me = await fetch(`${baseUrl}/api/auth/me`, { headers: { authorization: `Bearer ${loggedIn.data.token}` } });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).data.student.email, user.email);
    const invalidToken = await fetch(`${baseUrl}/api/auth/me`, { headers: { authorization: "Bearer invalid" } });
    assert.equal(invalidToken.status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    Object.assign(Student, original);
  }
});
