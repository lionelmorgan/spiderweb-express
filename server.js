//Configure the server details
const express = require('express');
const fs = require('fs'); //file system is fs
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const app = express();
const PORT = 5000;

const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"],
    },
  });

const imagesPath = path.join(__dirname, '../my-app/public/images');

// Ensure the images folder exists
if (!fs.existsSync(imagesPath)) {
    fs.mkdirSync(imagesPath, { recursive: true });
}

// Configure Multer to save to the React public/images folder
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, imagesPath); // Absolute path to save images
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// Create multer instance with storage configuration
const upload = multer({ storage: storage });

// Socket.io connection
io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", (data) => {
    socket.join(data);
    console.log(`User with ID: ${socket.id} joined room: ${data}`);
  });

  socket.on("send_message", (data) => {
    socket.to(data.room).emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

// Middleware to parse JSON request bodies
app.use(bodyParser.json());

// Enable CORS for requests from http://localhost:3000 react app
app.use(cors({
    origin: 'http://localhost:3000',  
    methods: ['GET', 'POST'],  // Allow GET and POST methods
    allowedHeaders: ['Content-Type'], 
}));

//GET endpoint located at the root of the server
app.get('/', (req, res) => {
    res.send('Hello from Express!');
});

// POST endpoint to add a comment
app.post('/add-comment', (req, res) => {
    const { postId, comment, username, profile } = req.body; // This is the request from the commentData in Post.js coming from the user's comment. We have to declare the commentData object so the express server can read it into the request body and process it to the continuing conditions and functions below.

    // Validate input
    if (!postId || !comment || !username || !profile) {
        return res.status(400).send({ message: 'Missing required fields' });
    }

// Read posts from posts.json and update
const postsPath = path.resolve(__dirname, '../my-app/public', 'posts.json');  // Use path.resolve correctly

// Read posts from posts.json and update
//file system is fs
fs.readFile(postsPath, 'utf8', (err, data) => { //JSON String coming into server converted using Stringify
    if (err) {
        console.log('Error reading posts.json file:', err); 
        return res.status(500).send({ message: 'Error reading posts.json file' });
    }

        const posts = JSON.parse(data); //parse the posts data back to a JSON object since posts.json is originally JSON Objects

        const post = posts.find(p => p.id === postId);
        if (!post) {
            return res.status(404).send({ message: 'Post not found' });
        }

        // Add the comment to the post
        const newComment = {
            id: String(post.comments.length + 1),  // Comment ID based on the current comments length
            user: { username, profile },
            comment,
            created: 'just now'  // Use time / date library to display actual times for your posts and comments (Refer to CIS 120 Javascript section for the Date library)
        };

        post.comments.push(newComment); //add newComment to the post

        // Save the updated posts back to posts.json
        fs.writeFile(postsPath, JSON.stringify(posts, null, 2), (err) => {
            if (err) {
                return res.status(500).send({ message: 'Error writing to posts.json file' });
            }

            res.send({ message: 'Comment added successfully', post });
        });
    });
});

// GET endpoint to fetch posts by username
app.get('/user-posts/:username', (req, res) => {
    const { username } = req.params;

    const postsPath = path.resolve(__dirname, '../my-app/public', 'posts.json');

    fs.readFile(postsPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading posts.json:', err);
            return res.status(500).json({ message: 'Server error while reading posts' });
        }

        const posts = JSON.parse(data);
        const userPosts = posts.filter(post => post.user.username === username);

        res.json(userPosts);
    });
});

// POST endpoint for adding a new post
app.post('/add-post', upload.single('image'), (req, res) => {
    const { description, username, profile } = req.body;
  
    // Validate required fields
    if (!req.file || !username || !description || !profile) {
      return res.status(400).json({ message: 'Missing required fields or image.' });
    }
  
    const postsPath = path.resolve(__dirname, '../my-app/public', 'posts.json');
  
    fs.readFile(postsPath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading posts.json:', err);
        return res.status(500).json({ message: 'Error reading posts.json' });
      }
  
      let posts = [];
      try {
        posts = JSON.parse(data);
      } catch (parseErr) {
        console.error('Error parsing posts.json:', parseErr);
      }
  
      const newPost = {
        id: (posts.length + 1).toString(),
        user: {
          username,
          profile
        },
        comments: [],
        likes: 0,
        image: `/images/${req.file.filename}`,
        description,
        created: 'just now'
      };
  
      posts.push(newPost);
  
      fs.writeFile(postsPath, JSON.stringify(posts, null, 2), (writeErr) => {
        if (writeErr) {
          console.error('Error writing to posts.json:', writeErr);
          return res.status(500).json({ message: 'Error saving post' });
        }
  
        return res.status(200).json({ message: 'Post added successfully', post: newPost });
      });
    });
  });

  //POST endpoint for adding a new user
  app.post('/signup', upload.single('profileImage'), (req, res) => {
    const { username, password, bio } = req.body;
  
    if (!username || !password || !req.file) {
      return res.status(400).json({ message: 'Missing required fields or image.' });
    }
  
    const usersPath = path.resolve(__dirname, '../my-app/public', 'users.json');
  
    fs.readFile(usersPath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading users.json:', err);
        return res.status(500).json({ message: 'Error reading users.json' });
      }
  
      let users = [];
      try {
        users = JSON.parse(data);
      } catch (parseErr) {
        console.error('Error parsing users.json:', parseErr);
      }
  
      /* 
      Check for existing user. Don't want username to be the same as
      another user
      */
      if (users.some(user => user.username === username)) {
        return res.status(400).json({ message: 'Username already exists' });
      }
  //new user object that matches the users.json format
      const newUser = {
        username,
        password,
        profile: `/images/${req.file.filename}`,
        bio
      };
  
      users.push(newUser);
  
      fs.writeFile(usersPath, JSON.stringify(users, null, 2), (writeErr) => {
        if (writeErr) {
          console.error('Error writing to users.json:', writeErr);
          return res.status(500).json({ message: 'Error saving user' });
        }
  
        return res.status(200).json({ message: 'Signup successful', user: newUser });
      });
    });
  });
  
// Start the server to listen on port 5000
app.listen(PORT, () => {
    console.log(`Express server is running on http://localhost:${PORT}`);
});

//socket.io server for Chat
server.listen(5001, () => {
    console.log(`Chat server is running on http://localhost:5001`);
  });
    