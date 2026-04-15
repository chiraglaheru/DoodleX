import React, { useEffect, useState } from "react";
import { getFeed, likePost, unlikePost, getLikes } from "./api";
import { getComments, addComment } from "./api";

function Feed() {
  const [posts, setPosts] = useState([]);
  const [likes, setLikes] = useState({});
  const [likedPosts, setLikedPosts] = useState({});
  const [showHeart, setShowHeart] = useState(null);

  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [commentCount, setCommentCount] = useState({});
  const currentUserId = Number(localStorage.getItem("userId"));

  // LOAD FEED
  useEffect(() => {
  if (!currentUserId) return;

  getFeed(currentUserId).then(data => {
    setPosts(data || []);
  });
}, [currentUserId]);

  // LOAD LIKES
  useEffect(() => {
    posts.forEach(post => {
      getLikes(post.id).then(count => {
        setLikes(prev => ({ ...prev, [post.id]: count }));
      });
    });
  }, [posts]);

//comments count
  useEffect(() => {
  posts.forEach(post => {
    getComments(post.id).then(data => {
      setCommentCount(prev => ({
        ...prev,
        [post.id]: data.length
      }));
    });
  });
}, [posts]);

  // LIKE / UNLIKE
  const handleLike = async (postId) => {
    try {
      if (likedPosts[postId]) {
        await unlikePost(postId, currentUserId);

        setLikes(prev => ({
          ...prev,
          [postId]: Math.max((prev[postId] ?? 0) - 1, 0),
        }));

        setLikedPosts(prev => ({ ...prev, [postId]: false }));
      } else {
        await likePost(postId, currentUserId);

        setLikes(prev => ({
          ...prev,
          [postId]: (prev[postId] ?? 0) + 1,
        }));

        setLikedPosts(prev => ({ ...prev, [postId]: true }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // OPEN POST
  const openPost = async (post) => {
    setSelectedPost(post);
    const data = await getComments(post.id);
    setComments(data || []);
  };

  return (
    <div className="bg-black text-white min-h-screen">
      <div className="max-w-md mx-auto">

        <h1 className="text-xl font-semibold p-4">Feed</h1>

        {/* POSTS */}
        {posts.map(post => (
          <div
            key={post.id}
            className="mb-6 relative cursor-pointer"
            onClick={() => openPost(post)}
          >
            {/* HEADER */}
            <div className="flex items-center gap-3 px-3 py-2">
              <img
                src="https://i.pravatar.cc/150"
                alt=""
                className="w-8 h-8 rounded-full"
              />
              <span className="text-sm font-semibold">
                user_{post.userId}
              </span>
            </div>

            {/* IMAGE */}
            <img
              src={post.imageUrl}
              alt=""
              className="w-full"
              onDoubleClick={async (e) => {
                e.stopPropagation();

                if (!likedPosts[post.id]) {
                  await handleLike(post.id);
                }

                setShowHeart(post.id);
                setTimeout(() => setShowHeart(null), 700);
              }}
            />

            {showHeart === post.id && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-6xl animate-ping">❤️</span>
              </div>
            )}

            {/* ACTIONS */}
            <div
              className="px-3 py-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 text-xl">

                <button
                  onClick={() => handleLike(post.id)}
                  style={{
                    color: likedPosts[post.id] ? "red" : "white"
                  }}
                >
                  ❤️
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openPost(post);
                  }}
                >
                  💬
                </button>
                <span>📤</span>

              </div>

              <p className="text-sm font-semibold mt-1">
                {likes[post.id] ?? 0} likes
              </p>
              <p className="text-sm text-gray-400">
                {commentCount[post.id] > 0
                  ? `View all ${commentCount[post.id]} comments`
                  : "No comments"}
              </p>

              <p className="text-sm">
                <b>user_{post.userId}</b> {post.caption}
              </p>

            </div>

          </div>
        ))}

      </div>

      {/* 🔥 MODAL (OUTSIDE MAP — VERY IMPORTANT) */}
      {selectedPost && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50"
          onClick={() => setSelectedPost(null)}
        >

          <div
            className="bg-white text-black w-[700px] flex"
            onClick={(e) => e.stopPropagation()}
          >
            {/* LEFT */}
            <img
              src={selectedPost.imageUrl}
              className="w-1/2 object-cover"
              alt=""
            />

            {/* RIGHT */}
            <div className="w-1/2 p-4 flex flex-col">

              <p className="mb-2">{selectedPost.caption}</p>

              <button onClick={() => handleLike(selectedPost.id)}>
                ❤️ {likes[selectedPost.id] ?? 0}
              </button>

              {/* COMMENTS */}
              <div className="flex-1 overflow-y-auto mt-3">
                {comments.map(c => (
                  <p key={c.id} className="text-sm mb-1">
                    {c.text}
                  </p>
                ))}
              </div>

              {/* ADD COMMENT */}
              <div className="flex gap-2 mt-2">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="border flex-1 p-1"
                  placeholder="Add comment..."
                />

                <button
                  onClick={async () => {
                    if (!newComment.trim()) return;

                    await addComment(selectedPost.id, currentUserId, newComment);

                    const updated = await getComments(selectedPost.id);
                    setComments(updated);
                    setCommentCount(prev => ({
                    ...prev,
                    [selectedPost.id]: updated.length
                    }));

                    setNewComment("");
                  }}
                  
                  className="bg-blue-500 text-white px-3"
                >
                  Post
                </button>
              </div>

              <button
                onClick={() => setSelectedPost(null)}
                className="mt-3 border p-1"
              >
                Close
              </button>

            </div>

          </div>

        </div>
      )}
    </div>
  );
}

export default Feed;