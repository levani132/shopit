import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { RefreshToken, RefreshTokenSchema } from './schemas/refresh-token.schema';
import { Store, StoreSchema } from './schemas/store.schema';
import { Category, CategorySchema } from './schemas/category.schema';
import { Subcategory, SubcategorySchema } from './schemas/subcategory.schema';
import { Product, ProductSchema } from './schemas/product.schema';
import { Post, PostSchema } from './schemas/post.schema';
import { PostLike, PostLikeSchema } from './schemas/post-like.schema';
import { PostComment, PostCommentSchema } from './schemas/post-comment.schema';
import { InfoPage, InfoPageSchema } from './schemas/info-page.schema';
import { Order, OrderSchema } from './schemas/order.schema';
import {
  BalanceTransaction,
  BalanceTransactionSchema,
} from './schemas/balance-transaction.schema';
import {
  ServicePayment,
  ServicePaymentSchema,
} from './schemas/service-payment.schema';
import {
  Faq,
  FaqSchema,
  AboutContent,
  AboutContentSchema,
  ContactContent,
  ContactContentSchema,
  ContactSubmission,
  ContactSubmissionSchema,
  TermsContent,
  TermsContentSchema,
  PrivacyContent,
  PrivacyContentSchema,
} from './schemas/content.schema';

const schemas = MongooseModule.forFeature([
  { name: User.name, schema: UserSchema },
  { name: RefreshToken.name, schema: RefreshTokenSchema },
  { name: Store.name, schema: StoreSchema },
  { name: Category.name, schema: CategorySchema },
  { name: Subcategory.name, schema: SubcategorySchema },
  { name: Product.name, schema: ProductSchema },
  { name: Post.name, schema: PostSchema },
  { name: PostLike.name, schema: PostLikeSchema },
  { name: PostComment.name, schema: PostCommentSchema },
  { name: InfoPage.name, schema: InfoPageSchema },
  { name: Order.name, schema: OrderSchema },
  { name: BalanceTransaction.name, schema: BalanceTransactionSchema },
  { name: ServicePayment.name, schema: ServicePaymentSchema },
  { name: Faq.name, schema: FaqSchema },
  { name: AboutContent.name, schema: AboutContentSchema },
  { name: ContactContent.name, schema: ContactContentSchema },
  { name: ContactSubmission.name, schema: ContactSubmissionSchema },
  { name: TermsContent.name, schema: TermsContentSchema },
  { name: PrivacyContent.name, schema: PrivacyContentSchema },
]);

@Global()
@Module({
  imports: [schemas],
  exports: [schemas],
})
export class DatabaseModule {}
