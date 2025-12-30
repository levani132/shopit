import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PostDocument = HydratedDocument<Post>;

@Schema({ timestamps: true, collection: 'posts' })
export class Post {
  @Prop({ required: true, trim: true })
  content!: string;

  @Prop({ type: [String], default: [] })
  images!: string[];

  @Prop({ type: Types.ObjectId, ref: 'Store', required: true })
  storeId!: Types.ObjectId;

  @Prop({ default: 0 })
  likesCount!: number;

  @Prop({ default: 0 })
  commentsCount!: number;
}

export const PostSchema = SchemaFactory.createForClass(Post);

// Indexes
PostSchema.index({ storeId: 1, createdAt: -1 });
