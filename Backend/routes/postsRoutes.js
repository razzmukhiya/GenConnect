const express = require('express');
const router = express.Router();
const postController = require('../controller/postController');

router.post('/posts', postController.createPost);

router.get('/posts', postController.getAllPosts);

router.get('/posts/user/:userId', postController.getUserPosts);

router.get('/posts/:postId', postController.getPostById);

router.put('/posts/:postId', postController.updatePost);

router.delete('/posts/:postId', postController.deletePost);

router.post('/posts/:postId/like', postController.likePost);

router.delete('/posts/:postId/like', postController.unlikePost);

router.get('/posts/:postId/like-status', postController.checkLikeStatus);

router.post('/posts/:postId/comments', postController.addComment);

router.get('/posts/:postId/comments', postController.getComments);

router.post('/posts/:postId/report', require('../controller/reportController').createReport);

module.exports = router;
