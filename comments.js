// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const { randomBytes } = require('crypto');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Comments
const commentsByPostId = {};

app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Create a comment
app.post('/posts/:id/comments', async (req, res) => {
  const commentId = randomBytes(4).toString('hex'); // Generate random id
  const { content } = req.body;

  // Get comments for a post
  const comments = commentsByPostId[req.params.id] || [];

  // Push new comment
  comments.push({ id: commentId, content, status: 'pending' });

  // Assign comments to post
  commentsByPostId[req.params.id] = comments;

  // Send event to event bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: 'pending'
    }
  });

  // Send response
  res.status(201).send(comments);
});

// Event listener
app.post('/events', async (req, res) => {
  console.log('Event received:', req.body.type);

  const { type, data } = req.body;

  // If comment is moderated
  if (type === 'CommentModerated') {
    const { postId, id, status, content } = data;

    // Get comments for a post
    const comments = commentsByPostId[postId];

    // Find comment in comments array
    const comment = comments.find(comment => comment.id === id);

    // Update status
    comment.status = status;

    // Send event to event bus
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: {
        id,
        status,
        postId,
        content
      }
    });
  }

  res.send({});
});

// Start server
app.listen(4001, () => {
  console.log('Listening on 4001');
});
