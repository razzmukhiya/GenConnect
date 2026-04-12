const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const upload = require('../middleware/uploadMiddleware');

// Signup route
router.post('/signup', userController.register);

// Login route
router.post('/login', userController.login);

// Profile routes
router.get('/profile/:id', userController.getProfile);
router.put('/profile/:id', upload.fields([
  {name: 'avatarFile', maxCount: 1},
  {name: 'coverPhotoFile', maxCount: 1}
]), userController.updateProfile);
router.get('/profile/:id/posts', userController.getUserPosts);

// Friend Request Routes
router.post('/friend-request', userController.sendFriendRequest);
router.post('/friend-request/accept/:requestId', userController.acceptFriendRequest);
router.post('/friend-request/decline/:requestId', userController.declineFriendRequest);
router.delete('/friend-request/cancel/:receiverId', userController.cancelFriendRequest);

router.get('/friend-requests/:id', userController.getFriendRequests);
router.get('/friends/:id', userController.getFriends);
router.get('/friends/:id/online-status', (req, res) => {
    let onlineUsers = [];
    if (global.io && global.io.sockets && global.io.sockets.adapter && global.io.sockets.adapter.rooms) {
        onlineUsers = Array.from(global.io.sockets.adapter.rooms.keys()).filter(room => room !== undefined && !String(room).startsWith('socket.') && !isNaN(room));
    }
    res.json({ success: true, onlineFriends: onlineUsers });
});
router.delete('/friends/:friendId', userController.removeFriend);
router.get('/friendship-status/:otherUserId', userController.getFriendshipStatus);

// Search Users Route
router.get('/search', userController.searchUsers);

// Get Suggested Users (People You May Know) Route
router.get('/users/suggested/:id', userController.getSuggestedUsers);
router.get('/users/public-key/:id', userController.getPublicKey);
router.put('/users/:id/keys', userController.setPublicKey);

module.exports = router;
