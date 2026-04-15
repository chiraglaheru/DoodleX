import React, { useEffect, useState } from "react";
import { checkFollow, follow, unfollow } from "./api";
import {
  getProfile,
  createPost,
  likePost,
  unlikePost,
  getLikes,
  getComments,
  addComment,
} from "./api";

function Profile() {
  const [profile, setProfile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("");

  const [likes, setLikes] = useState({});
  const [likedPosts, setLikedPosts] = useState({});

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  const [isFollowing, setIsFollowing] = useState(false);
  const currentUserId = Number(localStorage.getItem("userId"));

  //lOGIN
  useEffect(() => {
  localStorage.setItem("userId", 16);
  }, []);

  // LOAD PROFILE
  useEffect(() => {
  if (!currentUserId) return;
  getProfile(currentUserId).then(setProfile);
}, [currentUserId]);

  // CHECK FOLLOW STATUS
  useEffect(() => {
  if (!profile || !currentUserId) return;

  checkFollow(profile.user.id, currentUserId).then(setIsFollowing);
}, [profile, currentUserId]);

  // LOAD LIKES
  useEffect(() => {
    if (!profile) return;

    profile.posts.forEach((post) => {
      getLikes(post.id).then((count) => {
        setLikes((prev) => ({ ...prev, [post.id]: count }));
      });
    });
  }, [profile]);

  // LIKE FUNCTION
  const handleLike = async (postId) => {
    try {
      if (likedPosts[postId]) {
        await unlikePost(postId, currentUserId);

        setLikes((prev) => ({
          ...prev,
          [postId]: Math.max((prev[postId] ?? 0) - 1, 0),
        }));

        setLikedPosts((prev) => ({ ...prev, [postId]: false }));
      } else {
        await likePost(postId, currentUserId);

        setLikes((prev) => ({
          ...prev,
          [postId]: (prev[postId] ?? 0) + 1,
        }));

        setLikedPosts((prev) => ({ ...prev, [postId]: true }));
      }
    } catch (err) {
      console.error(err);
      alert("Like failed");
    }
  };

  // LOADING GUARD (VERY IMPORTANT)
  if (!profile) {
    return <h1 className="text-center mt-10">Loading...</h1>;
  }

  const userId = profile.user.id;

  return (
    <div className="max-w-3xl mx-auto px-4">

      {/* PROFILE HEADER */}
      <div className="flex flex-col items-center text-center gap-3">
        <img
          src="https://i.pravatar.cc/150"
          className="w-24 h-24 rounded-full object-cover"
          alt=""
        />

        <h2 className="font-semibold">{profile.user.name}</h2>

        <div className="flex gap-6 text-sm">
          <span><b>{profile.posts.length}</b> posts</span>
          <span><b>{profile.followersCount}</b> followers</span>
          <span><b>{profile.followingCount}</b> following</span>
        </div>

        <p className="text-gray-500">{profile.user.bio}</p>

        <div className="flex gap-3">
          <button
            onClick={async () => {
              if (isFollowing) {
                await unfollow(userId, currentUserId);
                setIsFollowing(false);
              } else {
                await follow(userId, currentUserId);
                setIsFollowing(true);
              }
            }}
            className="px-4 py-1 border rounded"
          >
            {isFollowing ? "Unfollow" : "Follow"}
          </button>

          <button className="bg-gray-200 px-4 py-1 rounded">
            Message
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="bg-black text-white px-4 py-1 rounded"
          >
            +
          </button>
        </div>
      </div>

      {/* POSTS GRID */}
      <div className="grid grid-cols-3 gap-1 mt-6">
        {profile.posts.map((post) => (
          <div
            key={post.id}
            className="relative cursor-pointer"
            onClick={async () => {
              setSelectedPost(post);
              const data = await getComments(post.id);
              setComments(data || []);
            }}
          >
            <img
              src={post.imageUrl}
              className="w-full aspect-square object-cover"
              alt=""
              onDoubleClick={(e) => {
                e.stopPropagation();
                handleLike(post.id);
              }}
            />

            <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 hover:opacity-100 flex items-center justify-center text-white">
              ❤️ {likes[post.id] ?? 0}
            </div>
          </div>
        ))}
      </div>

      {/* UPLOAD MODAL */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white p-4 w-[400px] rounded"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files[0];
                setSelectedFile(file);
                setPreview(URL.createObjectURL(file));
              }}
            />

            {preview && <img src={preview} className="mt-2" alt="" />}

            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="caption"
              className="border w-full mt-2"
            />

            <button
              onClick={async () => {
                const newPost = await createPost(selectedFile, caption, currentUserId);

                setProfile({
                  ...profile,
                  posts: [newPost, ...profile.posts],
                });

                setShowModal(false);
                setPreview(null);
                setCaption("");
              }}
              className="bg-blue-500 text-white mt-2 px-4 py-1"
            >
              Share
            </button>
          </div>
        </div>
      )}

      {/* POST MODAL */}
      {selectedPost && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="bg-white w-[700px] flex"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedPost.imageUrl}
              className="w-1/2 object-cover"
              alt=""
            />

            <div className="p-4 w-1/2 flex flex-col">

              <p>{selectedPost.caption}</p>

              <button onClick={() => handleLike(selectedPost.id)}>
                ❤️ {likes[selectedPost.id] ?? 0}
              </button>

              <div className="flex-1 overflow-y-auto">
                {comments.map((c) => (
                  <p key={c.id}>{c.text}</p>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="border flex-1"
                />

                <button
                  onClick={async () => {
                    if (!newComment.trim()) return;

                    await addComment(selectedPost.id, currentUserId, newComment);

                    const updated = await getComments(selectedPost.id);
                    setComments(updated);

                    setNewComment("");
                  }}
                >
                  Post
                </button>
              </div>

              <button
                onClick={() => setSelectedPost(null)}
                className="mt-2 border p-1"
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

export default Profile;