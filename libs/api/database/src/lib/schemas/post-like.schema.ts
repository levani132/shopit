import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PostLikeDocument = HydratedDocument<PostLike>;

@Schema({ timestamps: true, collection: 'post_likes' })
export class PostLike {
  @Prop({ required: true })
  visitorId: string;

  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  postId: Types.ObjectId;
}

export const PostLikeSchema = SchemaFactory.createForClass(PostLike);

// Indexes - ensure one like per visitor per post
PostLikeSchema.index({ postId: 1, visitorId: 1 }, { unique: true });
PostLikeSchema.index({ postId: 1 });
