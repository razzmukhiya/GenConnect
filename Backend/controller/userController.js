const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/connection');
const userModel = require('../models/userModel');

exports.register = async (req, res) => {
  try {
    const { fullName, email, number, dateOfBirth, gender, password } = req.body;

    // Create user (password will be hashed in the model)
    const userResult = await userModel.createUser(
      fullName,
      email,
      number,
      dateOfBirth,
      gender,
      password
    );

    // Create profile
    await userModel.createProfile(userResult.id);

    res.status(201).json({ success: true, message: 'User registered successfully', userId: userResult.id });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;

    // Find user by email or phone
    const user = await userModel.findUserByEmailOrPhone(emailOrPhone);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });

    // Return user data (excluding password) and token
    const { password: _, ...userData } = user;
    res.json({ success: true, message: 'Login successful', user: userData, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.params.id;

    // Get user data
    const [userRows] = await db.execute(
      'SELECT id, fullName, email, number, dateOfBirth, gender, createdAt FROM users WHERE id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get profile data
    const profile = await userModel.getProfileByUserId(userId);

    // Get following and followers count
    const following = await userModel.getFollowing(userId);
    const followers = await userModel.getFollowers(userId);

    // Combine user and profile data
    const user = {
      ...userRows[0],
      coverPhoto: profile?.coverPhoto || null,
      avatar: profile?.avatar || null,
      posts: profile?.posts || 0,
      followers: followers.length,
      following: following.length
    };

    res.json({ success: true, user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.followUser = async (req, res) => {
  try {
    const followingUserId = req.params.id;
    const userId = req.body.userId; // Assuming userId is sent in body or from auth middleware

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    if (userId === followingUserId) {
      return res.status(400).json({ success: false, message: 'Cannot follow yourself' });
    }

    await userModel.createFollowing(userId, followingUserId);
    res.json({ success: true, message: 'User followed successfully' });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.unfollowUser = async (req, res) => {
  try {
    const followingUserId = req.params.id;
    const userId = req.body.userId; // Assuming userId is sent in body or from auth middleware

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    const success = await userModel.unfollowUser(userId, followingUserId);
    if (success) {
      res.json({ success: true, message: 'User unfollowed successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Follow relationship not found' });
    }
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getFollowing = async (req, res) => {
  try {
    const userId = req.params.id;
    const following = await userModel.getFollowing(userId);
    res.json({ success: true, following });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getFollowers = async (req, res) => {
  try {
    const userId = req.params.id;
    const followers = await userModel.getFollowers(userId);
    res.json({ success: true, followers });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    const { fullName, email, number, dateOfBirth, gender, coverPhoto, avatar } = req.body;

    // Update user data (basic fields)
    const [userResult] = await db.execute(
      'UPDATE users SET fullName = ?, email = ?, number = ?, dateOfBirth = ?, gender = ? WHERE id = ?',
      [fullName, email, number, dateOfBirth, gender, userId]
    );

    if (userResult.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update profile data (coverPhoto and avatar)
    await userModel.updateProfile(userId, coverPhoto, avatar);

    // Get updated user data
    const [userRows] = await db.execute(
      'SELECT id, fullName, email, number, dateOfBirth, gender, createdAt FROM users WHERE id = ?',
      [userId]
    );

    // Get profile data
    const profile = await userModel.getProfileByUserId(userId);

    // Get following and followers count
    const following = await userModel.getFollowing(userId);
    const followers = await userModel.getFollowers(userId);

    // Combine user and profile data
    const user = {
      ...userRows[0],
      coverPhoto: profile?.coverPhoto || null,
      avatar: profile?.avatar || null,
      posts: profile?.posts || 0,
      followers: followers.length,
      following: following.length
    };

    res.json({ success: true, user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Friend Request Controllers

exports.sendFriendRequest = async (req, res) => {
  try {
    const senderId = req.body.userId; // Assuming userId is sent in body or from auth middleware
    const { receiverId } = req.body;

    if (!senderId) {
      return res.status(400).json({ success: false, message: 'Sender ID required' });
    }

    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'Receiver ID required' });
    }

    if (senderId === receiverId) {
      return res.status(400).json({ success: false, message: 'Cannot send friend request to yourself' });
    }

    await userModel.sendFriendRequest(senderId, receiverId);
    res.json({ success: true, message: 'Friend request sent successfully' });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.acceptFriendRequest = async (req, res) => {
  try {
    const userId = req.body.userId; // Assuming userId is sent in body or from auth middleware
    const { requestId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    if (!requestId) {
      return res.status(400).json({ success: false, message: 'Request ID required' });
    }

    await userModel.acceptFriendRequest(requestId, userId);
    res.json({ success: true, message: 'Friend request accepted successfully' });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.declineFriendRequest = async (req, res) => {
  try {
    const userId = req.body.userId; // Assuming userId is sent in body or from auth middleware
    const { requestId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    if (!requestId) {
      return res.status(400).json({ success: false, message: 'Request ID required' });
    }

    await userModel.declineFriendRequest(requestId, userId);
    res.json({ success: true, message: 'Friend request declined successfully' });
  } catch (error) {
    console.error('Decline friend request error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.cancelFriendRequest = async (req, res) => {
  try {
    const userId = req.body.userId; // Assuming userId is sent in body or from auth middleware
    const { receiverId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    if (!receiverId) {
      return res.status(400).json({ success: false, message: 'Receiver ID required' });
    }

    await userModel.cancelFriendRequest(userId, receiverId);
    res.json({ success: true, message: 'Friend request cancelled successfully' });
  } catch (error) {
    console.error('Cancel friend request error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.getFriendRequests = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    const requests = await userModel.getFriendRequests(userId);
    res.json({ success: true, friendRequests: requests });
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getFriends = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    const friends = await userModel.getFriends(userId);
    res.json({ success: true, friends });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.removeFriend = async (req, res) => {
  try {
    const userId = req.body.userId; // Assuming userId is sent in body or from auth middleware
    const { friendId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    if (!friendId) {
      return res.status(400).json({ success: false, message: 'Friend ID required' });
    }

    const success = await userModel.removeFriend(userId, friendId);
    if (success) {
      res.json({ success: true, message: 'Friend removed successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Friendship not found' });
    }
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getFriendshipStatus = async (req, res) => {
  try {
    const userId = req.query.userId; // userId is sent as query parameter for GET request
    const { otherUserId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    if (!otherUserId) {
      return res.status(400).json({ success: false, message: 'Other user ID required' });
    }

    const status = await userModel.getFriendshipStatus(userId, otherUserId);
    res.json({ success: true, status });
  } catch (error) {
    console.error('Get friendship status error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


exports.searchUsers = async (req, res) => {
  try {
    const userId = req.query.userId;
    const { query } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    if (!query) {
      return res.status(400).json({ success: false, message: 'Search query required' });
    }

    const users = await userModel.searchUsers(userId, query);
    res.json({ success: true, users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


exports.getSuggestedUsers = async (req, res) => {
  try {
    const userId = req.params.id;
    const limit = req.query.limit || 10;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID required' });
    }

    const suggestedUsers = await userModel.getSuggestedUsers(userId, parseInt(limit));
    res.json({ success: true, users: suggestedUsers });
  } catch (error) {
    console.error('Get suggested users error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
