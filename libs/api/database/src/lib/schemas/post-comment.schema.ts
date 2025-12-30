import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PostCommentDocument = HydratedDocument<PostComment>;

@Schema({ timestamps: true, collection: 'post_comments' })
export class PostComment {
  @Prop({ required: true, trim: true })
  content!: string;

  @Prop({ required: true, trim: true })
  authorName!: string;

  @Prop({ lowercase: true, trim: true })
  authorEmail?: string;

  @Prop({ type: Types.ObjectId, ref: 'Post', required: true })
  postId!: Types.ObjectId;
}

export const PostCommentSchema = SchemaFactory.createForClass(PostComment);

// Indexes
PostCommentSchema.index({ postId: 1, createdAt: -1 });
