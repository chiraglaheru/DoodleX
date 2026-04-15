const BASE_URL = "http://localhost:8081";

// FOLLOW
export const checkFollow = async (userId, followerId) => {
  const res = await fetch(
    `${BASE_URL}/users/${userId}/is-following?followerId=${followerId}`
  );
  return res.json();
};

export const follow = async (userId, followerId) => {
  await fetch(
    `${BASE_URL}/users/${userId}/follow?followerId=${followerId}`,
    { method: "POST" }
  );
};

export const unfollow = async (userId, followerId) => {
  await fetch(
    `${BASE_URL}/users/${userId}/unfollow?followerId=${followerId}`,
    { method: "DELETE" }
  );
};

// CREATE POST
export const createPost = async (file, caption, userId) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("caption", caption);
  formData.append("userId", userId);

  const res = await fetch(`${BASE_URL}/posts`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Backend error:", text);
    throw new Error("Upload failed");
  }

  return res.json();
};

// PROFILE
export const getProfile = async (userId) => {
  const res = await fetch(`${BASE_URL}/users/${userId}/profile`);
  return res.json();
};

// LIKE
export const likePost = async (postId, userId) => {
  const res = await fetch(
    `${BASE_URL}/posts/${postId}/like?userId=${userId}`,
    { method: "POST" }
  );
  return res.text();
};

export const unlikePost = async (postId, userId) => {
  const res = await fetch(
    `${BASE_URL}/posts/${postId}/like?userId=${userId}`,
    { method: "DELETE" }
  );
  return res.text();
};

export const getLikes = async (postId) => {
  const res = await fetch(`${BASE_URL}/posts/${postId}/likes`);
  return res.json();
};

// FEED
export const getFeed = async (userId) => {
  const res = await fetch(`${BASE_URL}/posts/feed?userId=${userId}`);
  return res.json();
};

// COMMENTS
export const getComments = async (postId) => {
  const res = await fetch(`${BASE_URL}/comments/${postId}`);
  return res.json();
};

export const addComment = async (postId, userId, text) => {
  const res = await fetch(`${BASE_URL}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      postId,
      userId,
      text,
    }),
  });

  return res.json();
};

// LOGIN 
export const loginUser = async (email, password) => {
  const res = await fetch(`${BASE_URL}/users/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  if (!res.ok) {
    throw new Error("Login Failed");
  }
 
  return res.json();
};

//register
export const registerUser = async (name, email, password) => {
  const res = await fetch("http://localhost:8081/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      email,
      password,
    }),
  });

  if (!res.ok) {
    throw new Error("Signup failed");
  }

  return res.json();
};