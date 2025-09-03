# 🌐 Social Sphere

Social Sphere is a minimal, modern **social media web app** where users can sign up, log in, create posts, edit/delete them, and manage their profile. Built with **Node.js, Express, MongoDB, EJS, and Tailwind CSS**.

<p align="left">
  <a href="https://nodejs.org/"><img alt="Node" src="https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white"></a>
  <a href="https://expressjs.com/"><img alt="Express" src="https://img.shields.io/badge/Express.js-4+-000000?logo=express&logoColor=white"></a>
  <a href="https://www.mongodb.com/"><img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-6+-47A248?logo=mongodb&logoColor=white"></a>
  <a><img alt="License" src="https://img.shields.io/badge/License-MIT-blue"></a>
</p>

---

## ✨ Features
- 🔐 **Authentication** – Register, login, JWT + cookies  
- 👤 **Profile Management** – View profile, avatar (optional)  
- 📝 **Posts** – Create, edit, delete posts  
- 🎨 **UI** – EJS + Tailwind responsive design  
- 🛡️ **Security** – Password hashing with bcrypt  
- ⚙️ **Config** – `.env` driven environment variables  

---

## 🧰 Tech Stack
- **Backend**: Node.js, Express  
- **Templating**: EJS  
- **Database**: MongoDB (Mongoose)  
- **Auth**: JWT, cookies (`cookie-parser`)  
- **Styling**: Tailwind + custom CSS  
- **Security**: `bcrypt` for password hashing  

---

## 📦 Getting Started

### 1) Clone the repo
```bash
git clone https://github.com/VaibhavBajpaij/socila-media-app0.1.git
cd socila-media-app0.1
2) Install dependencies
bash
Copy code
npm install
3) Configure environment variables
Create a .env file:

env
Copy code
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/social_sphere
JWT_SECRET=supersecretchangeme
JWT_COOKIE_NAME=token
JWT_EXPIRES_IN=7d
4) Run MongoDB
Local: mongod

Or use MongoDB Atlas

5) Start the app
bash
Copy code
npm start
# or (if nodemon installed)
npm run dev
👉 Visit: http://localhost:3000

🗂️ Project Structure
pgsql
Copy code
socila-media-app0.1/
├─ public/
│  ├─ css/style.css
│  └─ images/
├─ views/             # EJS templates
│  ├─ partials/
│  ├─ index.ejs
│  ├─ login.ejs
│  ├─ register.ejs
│  ├─ profile.ejs
│  └─ edit-post.ejs
├─ models/
│  ├─ user.js
│  └─ post.js
├─ routes/
│  ├─ auth.js
│  └─ post.js
├─ middleware/
│  └─ auth.js
├─ app.js
├─ .env
├─ package.json
└─ README.md
🔌 Example Code
middleware/auth.js
js
Copy code
const jwt = require('jsonwebtoken');

function isLoggedIn(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).send('You must be logged in');
    const data = jwt.verify(token, process.env.JWT_SECRET);
    req.user = data;
    next();
  } catch (err) {
    return res.status(401).send('Invalid or expired token');
  }
}

module.exports = { isLoggedIn };
routes/post.js
js
Copy code
const express = require('express');
const router = express.Router();
const Post = require('../models/post');
const { isLoggedIn } = require('../middleware/auth');

// Create Post
router.post('/create', isLoggedIn, async (req, res) => {
  await Post.create({ content: req.body.content, author: req.user.id });
  res.redirect('/profile');
});

// Edit Post
router.get('/edit/:id', isLoggedIn, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).send('Post not found');
  res.render('edit-post', { post });
});

// Update Post
router.post('/update/:id', isLoggedIn, async (req, res) => {
  await Post.findByIdAndUpdate(req.params.id, { content: req.body.content });
  res.redirect('/profile');
});

// Delete Post
router.post('/delete/:id', isLoggedIn, async (req, res) => {
  await Post.findByIdAndDelete(req.params.id);
  res.redirect('/profile');
});

