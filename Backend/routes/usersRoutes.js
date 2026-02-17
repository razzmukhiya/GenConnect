const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');

// Signup route
router.post('/signup', userController.register);

// Login route
router.post('/login', userController.login);

// Profile route
router.get('/users/profile/:id', userController.getProfile);
router.put('/users/profile/:id', userController.updateProfile);

// Friend Request Routes
router.post('/friend-request', userController.sendFriendRequest);
router.post('/friend-request/accept/:requestId', userController.acceptFriendRequest);
router.post('/friend-request/decline/:requestId', userController.declineFriendRequest);
router.delete('/friend-request/cancel/:receiverId', userController.cancelFriendRequest);

router.get('/friend-requests/:id', userController.getFriendRequests);
router.get('/friends/:id', userController.getFriends);
router.delete('/friends/:friendId', userController.removeFriend);
router.get('/friendship-status/:otherUserId', userController.getFriendshipStatus);

// Search Users Route
router.get('/search', userController.searchUsers);

// Get Suggested Users (People You May Know) Route
router.get('/users/suggested/:id', userController.getSuggestedUsers);

module.exports = router;
