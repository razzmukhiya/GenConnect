const pool = require("../db/connection");
const bcrypt = require('bcryptjs');

exports.createUser = async (fullName, email, number, dateOfBirth, gender, password) => {
  try {
    console.log("Starting registration process...");

    // Check if email already exists
    const [existingUser] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (existingUser.length > 0) {
      throw new Error("Email already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

// Create users table if not exists (plain text - no keys)
await pool.execute(`
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fullName VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    number VARCHAR(20) NOT NULL,
    dateOfBirth DATE NOT NULL,
    gender ENUM('male', 'female', 'other') NOT NULL,
    password VARCHAR(255) NOT NULL,
    public_key TEXT NULL,
    public_key_fingerprint VARCHAR(64) NULL,
    coverPhoto VARCHAR(500),
    avatar VARCHAR(500),
    posts INT DEFAULT 0,
    followers INT DEFAULT 0,
    following INT DEFAULT 0,
    isBanned TINYINT(1) DEFAULT 0,
    bannedBy INT NULL,
    banReason TEXT NULL,
    bannedAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_isBanned (isBanned)
  )
`);

// Add public_key and public_key_fingerprint columns if they don't exist (for existing tables)
    // First check if columns exist to avoid duplicate errors
    try {
      const [cols] = await pool.execute(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'public_key'`, [process.env.DB_DATABASE || 'genconnect']);
      if (cols.length === 0) {
        await pool.execute(`ALTER TABLE users ADD COLUMN public_key TEXT NULL`);
      }
    } catch (e) {
      // Ignore if table doesn't exist or other error
    }
    try {
      const [cols] = await pool.execute(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'public_key_fingerprint'`, [process.env.DB_DATABASE || 'genconnect']);
      if (cols.length === 0) {
        await pool.execute(`ALTER TABLE users ADD COLUMN public_key_fingerprint VARCHAR(64) NULL`);
      }
    } catch (e) {
      // Ignore if table doesn't exist or other error
    }

    // Insert user data (plain text - no keys)
    const [result] = await pool.execute(
      'INSERT INTO users (fullName, email, number, dateOfBirth, gender, password) VALUES (?, ?, ?, ?, ?, ?)',
      [fullName, email, number, dateOfBirth, gender, hashedPassword]
    );

    console.log("User created successfully:", result);
    return { id: result.insertId };
  } catch (err) {
    console.error("Registration error:", err);

    if (err.message === "Email already exists") {
      throw new Error("Email already exists");
    }
    throw new Error(`Registration failed: ${err.message}`);
  }
};

exports.findUserByEmailOrPhone = async (emailOrPhone) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ? OR number = ?',
      [emailOrPhone, emailOrPhone]
    );
    return rows[0] || null;
  } catch (err) {
    console.error("Find user error:", err);
    throw new Error(`Find user failed: ${err.message}`);
  }
};

exports.createProfile = async (userId) => {
  try {
    // Create profiles table if not exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        coverPhoto VARCHAR(500),
        avatar VARCHAR(500),
        posts INT DEFAULT 0,
        followers INT DEFAULT 0,
        following INT DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Insert profile data
    const [result] = await pool.execute(
      'INSERT INTO profiles (user_id) VALUES (?)',
      [userId]
    );

    console.log("Profile created successfully:", result);
    return { id: result.insertId };
  } catch (err) {
    console.error("Profile creation error:", err);
    throw new Error(`Profile creation failed: ${err.message}`);
  }
};

exports.getProfileByUserId = async (userId) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM profiles WHERE user_id = ?',
      [userId]
    );
    return rows[0] || null;
  } catch (err) {
    console.error("Get profile error:", err);
    throw new Error(`Get profile failed: ${err.message}`);
  }
};

exports.createFollowing = async (userId, followingUserId) => {
  try {
    // Create following table if not exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS following (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        following_user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (following_user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_follow (user_id, following_user_id)
      )
    `);

    // Insert following relationship
    const [result] = await pool.execute(
      'INSERT INTO following (user_id, following_user_id) VALUES (?, ?)',
      [userId, followingUserId]
    );

    console.log("Following relationship created successfully:", result);
    return { id: result.insertId };
  } catch (err) {
    console.error("Create following error:", err);
    throw new Error(`Create following failed: ${err.message}`);
  }
};

exports.getFollowing = async (userId) => {
  try {
    // Create following table if not exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS following (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        following_user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (following_user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_follow (user_id, following_user_id)
      )
    `);

    const [rows] = await pool.execute(
      'SELECT u.id, u.fullName, u.email FROM following f JOIN users u ON f.following_user_id = u.id WHERE f.user_id = ?',
      [userId]
    );
    return rows;
  } catch (err) {
    console.error("Get following error:", err);
    throw new Error(`Get following failed: ${err.message}`);
  }
};

exports.getFollowers = async (userId) => {
  try {
    // Create following table if not exists
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS following (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        following_user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (following_user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_follow (user_id, following_user_id)
      )
    `);

    const [rows] = await pool.execute(
      'SELECT u.id, u.fullName, u.email FROM following f JOIN users u ON f.user_id = u.id WHERE f.following_user_id = ?',
      [userId]
    );
    return rows;
  } catch (err) {
    console.error("Get followers error:", err);
    throw new Error(`Get followers failed: ${err.message}`);
  }
};

exports.unfollowUser = async (userId, followingUserId) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM following WHERE user_id = ? AND following_user_id = ?',
      [userId, followingUserId]
    );
    return result.affectedRows > 0;
  } catch (err) {
    console.error("Unfollow error:", err);
    throw new Error(`Unfollow failed: ${err.message}`);
  }
};

exports.updateProfile = async (userId, coverPhoto, avatar) => {
  try {
    const [result] = await pool.execute(
      'UPDATE profiles SET coverPhoto = ?, avatar = ? WHERE user_id = ?',
      [coverPhoto, avatar, userId]
    );
    return result.affectedRows > 0;
  } catch (err) {
    console.error("Update profile error:", err);
    throw new Error(`Update profile failed: ${err.message}`);
  }
};

// Friend Requests Table Functions

exports.createFriendRequestTable = async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS friend_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_request (sender_id, receiver_id)
      )
    `);
  } catch (err) {
    console.error("Create friend_requests table error:", err);
    throw new Error(`Create friend_requests table failed: ${err.message}`);
  }
};

exports.sendFriendRequest = async (senderId, receiverId) => {
  try {
    // Create table if not exists
    await exports.createFriendRequestTable();

    // Check if request already exists
    const [existingRequest] = await pool.execute(
      'SELECT id FROM friend_requests WHERE sender_id = ? AND receiver_id = ?',
      [senderId, receiverId]
    );
    
    if (existingRequest.length > 0) {
      throw new Error("Friend request already sent");
    }

    // Check if they are already friends
    const [existingFriendship] = await pool.execute(
      'SELECT id FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [senderId, receiverId, receiverId, senderId]
    );

    if (existingFriendship.length > 0) {
      throw new Error("You are already friends");
    }

    // Send friend request
    const [result] = await pool.execute(
      'INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES (?, ?, ?)',
      [senderId, receiverId, 'pending']
    );

    console.log("Friend request sent successfully:", result);
    return { id: result.insertId };
  } catch (err) {
    console.error("Send friend request error:", err);
    throw new Error(`Send friend request failed: ${err.message}`);
  }
};

exports.acceptFriendRequest = async (requestId, userId) => {
  try {
    // Get the friend request
    const [request] = await pool.execute(
      'SELECT * FROM friend_requests WHERE id = ? AND receiver_id = ? AND status = ?',
      [requestId, userId, 'pending']
    );

    if (request.length === 0) {
      throw new Error("Friend request not found or already processed");
    }

    const senderId = request[0].sender_id;

    // Create friends table if not exists
    await exports.createFriendsTable();

    // Add friendship (both directions)
    await pool.execute(
      'INSERT INTO friends (user_id, friend_id) VALUES (?, ?)',
      [userId, senderId]
    );
    await pool.execute(
      'INSERT INTO friends (user_id, friend_id) VALUES (?, ?)',
      [senderId, userId]
    );

    // Delete the friend request from the table
    await pool.execute(
      'DELETE FROM friend_requests WHERE id = ?',
      [requestId]
    );

    console.log("Friend request accepted and removed from friend_requests table");
    return true;
  } catch (err) {
    console.error("Accept friend request error:", err);
    throw new Error(`Accept friend request failed: ${err.message}`);
  }
};


exports.declineFriendRequest = async (requestId, userId) => {
  try {
    // Get the friend request
    const [request] = await pool.execute(
      'SELECT * FROM friend_requests WHERE id = ? AND receiver_id = ? AND status = ?',
      [requestId, userId, 'pending']
    );

    if (request.length === 0) {
      throw new Error("Friend request not found or already processed");
    }

    // Update request status to rejected
    await pool.execute(
      'UPDATE friend_requests SET status = ? WHERE id = ?',
      ['rejected', requestId]
    );

    console.log("Friend request declined successfully");
    return true;
  } catch (err) {
    console.error("Decline friend request error:", err);
    throw new Error(`Decline friend request failed: ${err.message}`);
  }
};

exports.cancelFriendRequest = async (senderId, receiverId) => {
  try {
    // Check if the pending request exists
    const [request] = await pool.execute(
      'SELECT * FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = ?',
      [senderId, receiverId, 'pending']
    );

    if (request.length === 0) {
      throw new Error("Friend request not found or already processed");
    }

    // Delete the friend request
    await pool.execute(
      'DELETE FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = ?',
      [senderId, receiverId, 'pending']
    );

    console.log("Friend request cancelled successfully");
    return true;
  } catch (err) {
    console.error("Cancel friend request error:", err);
    throw new Error(`Cancel friend request failed: ${err.message}`);
  }
};


exports.getFriendRequests = async (userId) => {
  try {
    // Create table if not exists
    await exports.createFriendRequestTable();

    const [rows] = await pool.execute(
      `SELECT fr.id, fr.sender_id, fr.receiver_id, fr.status, fr.created_at, 
              u.fullName as senderName, u.email as senderEmail 
       FROM friend_requests fr 
       JOIN users u ON fr.sender_id = u.id 
       WHERE fr.receiver_id = ? AND fr.status = ? 
       ORDER BY fr.created_at DESC`,
      [userId, 'pending']
    );

    return rows;
  } catch (err) {
    console.error("Get friend requests error:", err);
    throw new Error(`Get friend requests failed: ${err.message}`);
  }
};

exports.getSentFriendRequests = async (userId) => {
  try {
    // Create table if not exists
    await exports.createFriendRequestTable();

    const [rows] = await pool.execute(
      `SELECT fr.id, fr.sender_id, fr.receiver_id, fr.status, fr.created_at, 
              u.fullName as receiverName, u.email as receiverEmail 
       FROM friend_requests fr 
       JOIN users u ON fr.receiver_id = u.id 
       WHERE fr.sender_id = ? AND fr.status = ? 
       ORDER BY fr.created_at DESC`,
      [userId, 'pending']
    );

    return rows;
  } catch (err) {
    console.error("Get sent friend requests error:", err);
    throw new Error(`Get sent friend requests failed: ${err.message}`);
  }
};

// Friends Table Functions

exports.createFriendsTable = async () => {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS friends (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        friend_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_friendship (user_id, friend_id)
      )
    `);
  } catch (err) {
    console.error("Create friends table error:", err);
    throw new Error(`Create friends table failed: ${err.message}`);
  }
};

exports.getFriends = async (userId) => {
  try {
    // Create friends table if not exists
    await exports.createFriendsTable();

    const [rows] = await pool.execute(
      `SELECT u.id, u.fullName, u.email, p.avatar, f.created_at as friendship_date 
       FROM friends f 
       JOIN users u ON f.friend_id = u.id 
       LEFT JOIN profiles p ON u.id = p.user_id 
       WHERE f.user_id = ? 
       ORDER BY f.created_at DESC`,
      [userId]
    );

    return rows;
  } catch (err) {
    console.error("Get friends error:", err);
    throw new Error(`Get friends failed: ${err.message}`);
  }
};

exports.removeFriend = async (userId, friendId) => {
  try {
    // Remove friendship (both directions)
    const [result1] = await pool.execute(
      'DELETE FROM friends WHERE user_id = ? AND friend_id = ?',
      [userId, friendId]
    );
    const [result2] = await pool.execute(
      'DELETE FROM friends WHERE user_id = ? AND friend_id = ?',
      [friendId, userId]
    );

    console.log("Friend removed successfully");
    return result1.affectedRows > 0 || result2.affectedRows > 0;
  } catch (err) {
    console.error("Remove friend error:", err);
    throw new Error(`Remove friend failed: ${err.message}`);
  }
};

exports.areFriends = async (userId, otherUserId) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id FROM friends WHERE user_id = ? AND friend_id = ?',
      [userId, otherUserId]
    );
    return rows.length > 0;
  } catch (err) {
    console.error("Are friends error:", err);
    throw new Error(`Are friends check failed: ${err.message}`);
  }
};

exports.getFriendshipStatus = async (userId, otherUserId) => {
  try {
    // Check if already friends
    const [friendship] = await pool.execute(
      'SELECT id FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
      [userId, otherUserId, otherUserId, userId]
    );

    if (friendship.length > 0) {
      return 'friends';
    }

    // Check if there's a pending request sent by user
    const [sentRequest] = await pool.execute(
      'SELECT id FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = ?',
      [userId, otherUserId, 'pending']
    );

    if (sentRequest.length > 0) {
      return 'request_sent';
    }

    // Check if there's a pending request received by user
    const [receivedRequest] = await pool.execute(
      'SELECT id FROM friend_requests WHERE sender_id = ? AND receiver_id = ? AND status = ?',
      [otherUserId, userId, 'pending']
    );

    if (receivedRequest.length > 0) {
      return 'request_received';
    }

    return 'none';
  } catch (err) {
    console.error("Get friendship status error:", err);
    throw new Error(`Get friendship status failed: ${err.message}`);
  }
};

// Search Users Function
exports.searchUsers = async (currentUserId, searchQuery) => {
  try {
    const searchPattern = `%${searchQuery}%`;
    
    const [rows] = await pool.execute(
      `SELECT u.id, u.fullName, u.email, u.number, p.avatar 
       FROM users u 
       LEFT JOIN profiles p ON u.id = p.user_id 
       WHERE u.id != ? 
       AND (u.fullName LIKE ? OR u.email LIKE ? OR u.number LIKE ?) 
       LIMIT 20`,
      [currentUserId, searchPattern, searchPattern, searchPattern]
    );

    // Filter out users who are already friends or have pending requests
    const filteredUsers = [];
    for (const user of rows) {
      const status = await exports.getFriendshipStatus(currentUserId, user.id);
      if (status === 'none') {
        filteredUsers.push(user);
      }
    }

    return filteredUsers;
  } catch (err) {
    console.error("Search users error:", err);
    throw new Error(`Search users failed: ${err.message}`);
  }
};


// Get Suggested Users (People You May Know) Function (Mutual Friends)
exports.getSuggestedUsers = async (userId, limit = 10) => {
  try {
    // Ensure friends table exists
    await exports.createFriendsTable();

    // Candidates are users who are not already friends (status == none) and not self.
    // Score candidates by number of mutual friends.

    // Step 1: get my friends ids
    const [myFriendsRows] = await pool.execute(
      `SELECT friend_id FROM friends WHERE user_id = ?`,
      [userId]
    );

    const myFriendIds = myFriendsRows.map(r => r.friend_id);

    if (myFriendIds.length === 0) {
      // Fallback: if no friends, return recent users (excluding self and current friendship statuses)
      const [rows] = await pool.execute(
        `SELECT u.id, u.fullName, u.email, u.number, p.avatar
         FROM users u
         LEFT JOIN profiles p ON u.id = p.user_id
         WHERE u.id != ?
         ORDER BY u.createdAt DESC
         LIMIT ?`,
        [userId, limit]
      );

      const suggestedUsers = [];
      for (const user of rows) {
        const status = await exports.getFriendshipStatus(userId, user.id);
        if (status === 'none') {
          suggestedUsers.push(user);
        }
        if (suggestedUsers.length >= limit) break;
      }

      return suggestedUsers;
    }

    // Step 2: compute mutual counts for each candidate
    // mutual = count of myFriends who are also friends with candidate
    // friends table is directional (user_id, friend_id). We insert both directions on acceptance,
    // so mutual friend relationship is represented in both directions.
    const placeholders = myFriendIds.map(() => '?').join(',');

    const [candidates] = await pool.execute(
      `SELECT 
          u.id,
          u.fullName,
          u.email,
          u.number,
          p.avatar,
          COUNT(DISTINCT mf.friend_id) AS mutualCount
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        INNER JOIN friends mf ON mf.friend_id = u.id AND mf.user_id IN (${placeholders})
        WHERE u.id != ?
        GROUP BY u.id, u.fullName, u.email, u.number, p.avatar
        HAVING mutualCount > 0
        ORDER BY mutualCount DESC, u.createdAt DESC
        LIMIT 200`,
      [...myFriendIds, userId]
    );

    // Step 3: filter mutual candidates by friendship status (exclude already-friends / pending)
    const suggestedUsers = [];
    for (const cand of candidates) {
      const status = await exports.getFriendshipStatus(userId, cand.id);
      if (status === 'none') {
        suggestedUsers.push({
          ...cand,
          mutualCount: cand.mutualCount ? Number(cand.mutualCount) : 0
        });
      }
      if (suggestedUsers.length >= limit) break;
    }

    // Step 4 (always-fill): if we still need more suggestions, add random/non-friend users with mutualCount = 0
    if (suggestedUsers.length < limit) {
      const remaining = limit - suggestedUsers.length;

      // Exclude self and users we already suggested
      const alreadySuggestedIds = suggestedUsers.map(u => u.id);

      // Build a safe WHERE NOT IN clause
      const excludeIds = [userId, ...alreadySuggestedIds];
      const excludePlaceholders = excludeIds.map(() => '?').join(',');

      // Fetch a bigger pool, then filter by friendship status in JS
      const [fallbackRows] = await pool.execute(
        `SELECT u.id, u.fullName, u.email, u.number, p.avatar
         FROM users u
         LEFT JOIN profiles p ON u.id = p.user_id
         WHERE u.id NOT IN (${excludePlaceholders})
         ORDER BY u.createdAt DESC
         LIMIT 200`,
        excludeIds
      );

      for (const user of fallbackRows) {
        const status = await exports.getFriendshipStatus(userId, user.id);
        if (status === 'none') {
          suggestedUsers.push({
            ...user,
            mutualCount: 0
          });
        }
        if (suggestedUsers.length >= limit) break;
      }
    }

    return suggestedUsers;

  } catch (err) {
    console.error("Get suggested users error:", err);
    throw new Error(`Get suggested users failed: ${err.message}`);
  }
};


exports.getPublicKeyById = async (id) => {
  try {
    const [rows] = await pool.execute(
      'SELECT public_key FROM users WHERE id = ?',
      [id]
    );
    return rows[0]?.public_key || null;
  } catch (err) {
    console.error("Get public key error:", err);
    throw new Error(`Get public key failed: ${err.message}`);
  }
};



