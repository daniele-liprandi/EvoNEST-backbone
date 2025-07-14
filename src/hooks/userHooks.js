// getUserNameById.js

export function getUserNameById(userId, users) {
  // Ensure samples is an array and contains data
  if (Array.isArray(users)) {
    return users.find(user => user._id === userId)?.name || users.find(user => user.id === userId)?.name || 'Unknown User ' + userId;
  }
  return '';
};

export function getUserIdByName(userName, users) {
  // Ensure samples is an array and contains data
  if (Array.isArray(users)) {
    return users.find(user => user.name === userName)?._id || 'Unknown Id';
  }
  return '';
};

export function getUserByProviderId(userProviderId, users) {
  // Ensure users is an array and contains data
  if (Array.isArray(users)) {
    // Look for user with sub field (NextAuth) or auth0id (legacy support)
    return users.find(user => user.sub === userProviderId || user.auth0id === userProviderId) || 'Unknown Provider Id';
  }
  return '';
}