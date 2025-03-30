//Configure the server details
const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = 5000;


// Middleware to parse JSON request bodies
app.use(bodyParser.json());

// Enable CORS for requests from http://localhost:3000 only
app.use(cors({
    origin: 'http://localhost:3000',  // Allow requests only from this URL
    methods: ['GET', 'POST'],  // Allow GET and POST methods
    allowedHeaders: ['Content-Type'],  // Allow Content-Type header for JSON
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
fs.readFile(postsPath, 'utf8', (err, data) => {
    if (err) {
        console.log('Error reading posts.json file:', err); // Log the error for debugging
        return res.status(500).send({ message: 'Error reading posts.json file' });
    }

        const posts = JSON.parse(data);

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

        post.comments.push(newComment);

        // Save the updated posts back to posts.json
        fs.writeFile(postsPath, JSON.stringify(posts, null, 2), (err) => {
            if (err) {
                return res.status(500).send({ message: 'Error writing to posts.json file' });
            }

            res.send({ message: 'Comment added successfully', post });
        });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Express server is running on http://localhost:${PORT}`);
});
