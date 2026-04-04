# Facebook-style Online/Offline Status

**Steps:**
- [ ] Backend: Track onlineUsers Set, emit 'userStatus' events
- [ ] Backend: Routes emit online friends list
- [ ] Frontend Messages.jsx: Socket listeners + API call for online status
- [ ] Frontend: Update friends/onlineFriends with status, UI icons (● green/red)
- [ ] CSS: Style online/offline dots under avatars

**COMPLETED ✅ Facebook-style Online Status**

**Features:**
- [x] Backend tracks onlineUsers, emits userOnline/userOffline/onlineUsers
- [x] /friends/:id/online-status API endpoint
- [x] Frontend fetches + socket updates friends.isOnline
- [x] Live status dots (green ● Online, gray ● Offline)
- [x] Online friends bar shows active friends
- [x] Status updates in realtime across tabs

**Test:** Open 2 tabs → watch status change live under avatars!
