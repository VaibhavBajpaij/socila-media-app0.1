require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { upload } = require("./config/multerconfig");

const userModel = require("./models/user");
const postModel = require("./models/post");

const app = express();

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Database connection
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ DB connection error:", err));

// Routes
app.get("/", (req, res) => {
  res.render("index");
});

// Register
app.post("/register", async (req, res, next) => {
  try {
    const { username, name, email, age, password } = req.body;

    let user = await userModel.findOne({ email });
    if (user) return res.status(400).send("User already registered");

    const hash = await bcrypt.hash(password, 10);

    user = await userModel.create({
      username,
      name,
      email,
      age,
      password: hash,
    });

    const token = jwt.sign({ email: user.email, userid: user._id }, process.env.JWT_SECRET);
    res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    res.redirect("/profile");
  } catch (err) {
    next(err);
  }
});

// Login page
app.get("/login", (req, res) => {
  res.render("login");
});

// Login action
app.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    let user = await userModel.findOne({ email });
    if (!user) return res.status(400).send("User not found");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.redirect("/login");

    const token = jwt.sign({ email: user.email, userid: user._id }, process.env.JWT_SECRET);
    res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    res.redirect("/profile");
  } catch (err) {
    next(err);
  }
});

// Profile (protected)
app.get("/profile", isLoggedIn, async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user.userid).populate("posts");
    if (!user) return res.send("User not found");

    res.render("profile", { user, userid: req.user.userid });
  } catch (err) {
    next(err);
  }
});

// Create Post (protected)
app.post("/post", isLoggedIn, async (req, res, next) => {
  try {
    let user = await userModel.findOne({ email: req.user.email });
    let post = await postModel.create({
      user: user._id,
      username: user.username,
      content: req.body.content,
    });

    user.posts.push(post._id);
    await user.save();

    res.redirect("/profile");
  } catch (err) {
    next(err);
  }
});

// Like / Unlike a post
app.get("/like/:postId", isLoggedIn, async (req, res, next) => {
  try {
    let post = await postModel.findById(req.params.postId);

    if (!post) return res.send("Post not found");

    if (!post.likes.includes(req.user.userid)) {
      post.likes.push(req.user.userid);
    } else {
      post.likes = post.likes.filter((id) => id.toString() !== req.user.userid);
    }

    await post.save();
    res.redirect("/profile");
  } catch (err) {
    next(err);
  }
});

app.get("/edit/:postId", isLoggedIn, async (req, res) => {
    let post = await postModel.findById(req.params.postId);
   if (!post) return res.send("Post not found");
   res.render("edit", { post });
});

app.post("/update/:postId", isLoggedIn, async (req, res) => {
    let post = await postModel.findOneAndUpdate(
      { _id: req.params.postId }, 
      { content: req.body.content }, 
      { new: true }
    );

   if (!post) return res.send("Post not found");
   res.redirect("/profile");
});

// Logout
app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

// Profile upload page
app.get("/profile/upload", isLoggedIn, (req, res) => {
  // Changed "profileupload" to "upload-profile" to match your file name
  res.render("upload-profile", { user: req.user });
});

// Handle upload
app.post("/upload", isLoggedIn, upload.single("image"), async (req, res, next) => {
  try {
    // FIX: Check if a file was actually uploaded. The error happens when req.file is undefined.
    if (!req.file) {
      console.error("Upload attempt failed: No file received.");
      return res.status(400).send("No file was uploaded. Please select an image.");
    }

    const user = await userModel.findById(req.user.userid);
    if (!user) return res.status(404).send("User not found");

    user.profilePicture = req.file.filename;
    await user.save();

    res.redirect("/profile");
  } catch (err) {
    console.error("Upload Error:", err);
    // FIX: Pass the error to the main error handler so the HTML error page is shown.
    next(err);
  }
});

// Middleware
function isLoggedIn(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect("/login");

  try {
    const data = jwt.verify(token, process.env.JWT_SECRET);
    req.user = data;
    next();
  } catch (err) {
    console.error("JWT Error:", err);
    return res.redirect("/login");
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Error - SocialSphere</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <style>
        body { background-color: #0a0a0a; color: white; font-family: 'Poppins', sans-serif; }
      </style>
    </head>
    <body class="min-h-screen flex items-center justify-center">
      <div class="container mx-auto px-4 text-center">
        <div class="p-8 rounded-xl max-w-md mx-auto">
          <i class="fas fa-exclamation-triangle text-5xl text-red-500 mb-4"></i>
          <h1 class="text-2xl font-bold mb-4 text-red-500">Oops! Something went wrong</h1>
          <p class="text-gray-300 mb-6">We encountered an error while processing your request.</p>
          <a href="/profile" class="bg-red-600 text-white py-2 px-6 rounded-md font-semibold">
            Return to Profile
          </a>
        </div>
      </div>
    </body>
    </html>
  `);
});

// 404 handler
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Page Not Found - SocialSphere</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <style>
        body { background-color: #0a0a0a; color: white; font-family: 'Poppins', sans-serif; }
      </style>
    </head>
    <body class="min-h-screen flex items-center justify-center">
      <div class="container mx-auto px-4 text-center">
        <div class="p-8 rounded-xl max-w-md mx-auto">
          <i class="fas fa-map-marker-alt text-5xl text-orange-500 mb-4"></i>
          <h1 class="text-2xl font-bold mb-4 text-orange-500">404 - Page Not Found</h1>
          <p class="text-gray-300 mb-6">The page you're looking for doesn't exist.</p>
          <a href="/profile" class="bg-red-600 text-white py-2 px-6 rounded-md font-semibold">
            Return to Profile
          </a>
        </div>
      </div>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
