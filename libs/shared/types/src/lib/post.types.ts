/**
 * Post, Like, and Comment type definitions (Social Feed)
 */

export interface Post {
  id: string;
  content: string;
  images: string[];
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostLike {
  id: string;
  visitorId: string;
  postId: string;
  createdAt: Date;
}

export interface PostComment {
  id: string;
  content: string;
  authorName: string;
  authorEmail: string | null;
  postId: string;
  createdAt: Date;
}

export interface CreatePostDto {
  content: string;
  images?: string[];
}

export interface UpdatePostDto {
  content?: string;
  images?: string[];
}

export interface CreateCommentDto {
  content: string;
  authorName: string;
  authorEmail?: string;
}

export interface PostResponse {
  id: string;
  content: string;
  images: string[];
  likesCount: number;
  commentsCount: number;
  isLikedByMe: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PostDetailResponse extends PostResponse {
  comments: CommentResponse[];
}

export interface CommentResponse {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
}

export interface PostListResponse {
  posts: PostResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}
