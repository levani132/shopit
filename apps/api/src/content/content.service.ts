import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Faq,
  FaqDocument,
  AboutContent,
  AboutContentDocument,
  ContactContent,
  ContactContentDocument,
  ContactSubmission,
  ContactSubmissionDocument,
  TermsContent,
  TermsContentDocument,
  PrivacyContent,
  PrivacyContentDocument,
} from '@sellit/api/database';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    @InjectModel(Faq.name) private faqModel: Model<FaqDocument>,
    @InjectModel(AboutContent.name) private aboutModel: Model<AboutContentDocument>,
    @InjectModel(ContactContent.name) private contactModel: Model<ContactContentDocument>,
    @InjectModel(ContactSubmission.name) private submissionModel: Model<ContactSubmissionDocument>,
    @InjectModel(TermsContent.name) private termsModel: Model<TermsContentDocument>,
    @InjectModel(PrivacyContent.name) private privacyModel: Model<PrivacyContentDocument>,
  ) {}

  // ===== FAQ Methods =====
  async getAllFaqs(): Promise<FaqDocument[]> {
    return this.faqModel.find().sort({ order: 1, createdAt: 1 }).exec();
  }

  async getActiveFaqs(): Promise<FaqDocument[]> {
    return this.faqModel.find({ isActive: true }).sort({ order: 1 }).exec();
  }

  async createFaq(data: Partial<Faq>): Promise<FaqDocument> {
    const faq = new this.faqModel(data);
    return faq.save();
  }

  async updateFaq(id: string, data: Partial<Faq>): Promise<FaqDocument | null> {
    return this.faqModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async deleteFaq(id: string): Promise<void> {
    await this.faqModel.findByIdAndDelete(id).exec();
  }

  // ===== About Content Methods =====
  async getAboutContent(): Promise<AboutContentDocument | null> {
    let content = await this.aboutModel.findOne().exec();
    if (!content) {
      content = await this.aboutModel.create({});
    }
    return content;
  }

  async updateAboutContent(data: Partial<AboutContent>): Promise<AboutContentDocument> {
    let content = await this.aboutModel.findOne().exec();
    if (!content) {
      content = await this.aboutModel.create(data);
    } else {
      Object.assign(content, data);
      await content.save();
    }
    return content;
  }

  // ===== Contact Content Methods =====
  async getContactContent(): Promise<ContactContentDocument | null> {
    let content = await this.contactModel.findOne().exec();
    if (!content) {
      content = await this.contactModel.create({});
    }
    return content;
  }

  async updateContactContent(data: Partial<ContactContent>): Promise<ContactContentDocument> {
    let content = await this.contactModel.findOne().exec();
    if (!content) {
      content = await this.contactModel.create(data);
    } else {
      Object.assign(content, data);
      await content.save();
    }
    return content;
  }

  // ===== Contact Submissions =====
  async createSubmission(data: { name: string; email: string; subject: string; message: string }): Promise<ContactSubmissionDocument> {
    const submission = new this.submissionModel(data);
    return submission.save();
  }

  async getSubmissions(status?: string): Promise<ContactSubmissionDocument[]> {
    const query = status ? { status } : {};
    return this.submissionModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async updateSubmissionStatus(id: string, status: string, adminNotes?: string): Promise<ContactSubmissionDocument | null> {
    return this.submissionModel.findByIdAndUpdate(id, { status, adminNotes }, { new: true }).exec();
  }

  // ===== Terms Content Methods =====
  async getTermsContent(): Promise<TermsContentDocument | null> {
    let content = await this.termsModel.findOne().exec();
    if (!content) {
      content = await this.termsModel.create({});
    }
    return content;
  }

  async updateTermsContent(data: Partial<TermsContent>): Promise<TermsContentDocument> {
    let content = await this.termsModel.findOne().exec();
    if (!content) {
      content = await this.termsModel.create({ ...data, lastUpdated: new Date() });
    } else {
      Object.assign(content, { ...data, lastUpdated: new Date() });
      await content.save();
    }
    return content;
  }

  // ===== Privacy Content Methods =====
  async getPrivacyContent(): Promise<PrivacyContentDocument | null> {
    let content = await this.privacyModel.findOne().exec();
    if (!content) {
      content = await this.privacyModel.create({});
    }
    return content;
  }

  async updatePrivacyContent(data: Partial<PrivacyContent>): Promise<PrivacyContentDocument> {
    let content = await this.privacyModel.findOne().exec();
    if (!content) {
      content = await this.privacyModel.create({ ...data, lastUpdated: new Date() });
    } else {
      Object.assign(content, { ...data, lastUpdated: new Date() });
      await content.save();
    }
    return content;
  }

  // ===== Seed Initial FAQs =====
  async seedInitialFaqs(): Promise<void> {
    const existingCount = await this.faqModel.countDocuments().exec();
    if (existingCount > 0) {
      this.logger.log('FAQs already exist, skipping seed');
      return;
    }

    const initialFaqs: Partial<Faq>[] = [
      // General
      {
        questionKa: 'რა არის ShopIt?',
        questionEn: 'What is ShopIt?',
        answerKa: 'ShopIt არის პლატფორმა, რომელიც საშუალებას გაძლევთ შექმნათ საკუთარი ონლაინ მაღაზია უფასოდ და მარტივად. თქვენ შეგიძლიათ გაყიდოთ პროდუქტები, მიიღოთ გადახდები და გამოიყენოთ ჩვენი მიწოდების სერვისი.',
        answerEn: 'ShopIt is a platform that allows you to create your own online store for free and easily. You can sell products, receive payments, and use our delivery service.',
        category: 'general',
        order: 1,
      },
      {
        questionKa: 'რამდენი ღირს ShopIt-ის გამოყენება?',
        questionEn: 'How much does ShopIt cost?',
        answerKa: 'ShopIt-ის გამოყენება სრულიად უფასოა! ჩვენ ვიღებთ მხოლოდ 10%-იან საკომისიოს თითოეული გაყიდვიდან. სხვა დამალული საფასური არ არსებობს.',
        answerEn: 'Using ShopIt is completely free! We only charge a 10% commission on each sale. There are no other hidden fees.',
        category: 'general',
        order: 2,
      },
      // Sellers
      {
        questionKa: 'როგორ შევქმნა მაღაზია?',
        questionEn: 'How do I create a store?',
        answerKa: 'მაღაზიის შექმნა მარტივია: დარეგისტრირდით როგორც გამყიდველი, შეავსეთ მაღაზიის ინფორმაცია, დაამატეთ პროდუქტები და გამოაქვეყნეთ მაღაზია. მთელი პროცესი რამდენიმე წუთს მოითხოვს.',
        answerEn: 'Creating a store is easy: register as a seller, fill in store information, add products, and publish your store. The whole process takes just a few minutes.',
        category: 'sellers',
        order: 1,
      },
      {
        questionKa: 'როგორ მივიღო თანხა გაყიდვიდან?',
        questionEn: 'How do I receive money from sales?',
        answerKa: 'გაყიდვიდან მიღებული თანხა ავტომატურად აისახება თქვენს ბალანსზე მას შემდეგ, რაც შეკვეთა მიწოდებული იქნება. თანხის გამოტანა შეგიძლიათ ნებისმიერ დროს თქვენს საბანკო ანგარიშზე.',
        answerEn: 'Money from sales is automatically credited to your balance after the order is delivered. You can withdraw funds to your bank account at any time.',
        category: 'sellers',
        order: 2,
      },
      {
        questionKa: 'რა საკომისიოს იღებს ShopIt?',
        questionEn: 'What commission does ShopIt charge?',
        answerKa: 'ShopIt იღებს 10%-იან საკომისიოს თითოეული გაყიდვიდან. მიწოდების საფასურიდან საკომისიო არ იკვეთება - მიწოდების მთელ საფასურს იღებს კურიერი.',
        answerEn: 'ShopIt charges a 10% commission on each sale. No commission is deducted from the delivery fee - the courier receives the full delivery amount.',
        category: 'sellers',
        order: 3,
      },
      // Buyers
      {
        questionKa: 'როგორ შევიძინო პროდუქტი?',
        questionEn: 'How do I purchase a product?',
        answerKa: 'აირჩიეთ პროდუქტი, დაამატეთ კალათაში, შეავსეთ მიწოდების მისამართი და გადაიხადეთ. თქვენ შეგიძლიათ გადაიხადოთ ნებისმიერი ქართული ბანკის ბარათით.',
        answerEn: 'Select a product, add it to your cart, enter your delivery address, and pay. You can pay with any Georgian bank card.',
        category: 'buyers',
        order: 1,
      },
      {
        questionKa: 'რამდენ ხანში მივიღებ შეკვეთას?',
        questionEn: 'How long will it take to receive my order?',
        answerKa: 'მიწოდების ვადა დამოკიდებულია მაღაზიის მდებარეობასა და მიწოდების მისამართზე. თბილისში მიწოდება ჩვეულებრივ 1-3 დღეს მოითხოვს, თბილისის გარეთ - 3-5 დღეს.',
        answerEn: 'Delivery time depends on the store location and delivery address. Delivery in Tbilisi usually takes 1-3 days, outside Tbilisi - 3-5 days.',
        category: 'buyers',
        order: 2,
      },
      // Couriers
      {
        questionKa: 'როგორ გავხდე კურიერი?',
        questionEn: 'How do I become a courier?',
        answerKa: 'დარეგისტრირდით როგორც კურიერი, შეავსეთ საჭირო ინფორმაცია და დაელოდეთ დადასტურებას. დადასტურების შემდეგ შეძლებთ შეკვეთების მიღებას.',
        answerEn: 'Register as a courier, fill in the required information, and wait for approval. After approval, you can start accepting orders.',
        category: 'couriers',
        order: 1,
      },
      {
        questionKa: 'რამდენს ვშოულობ კურიერად?',
        questionEn: 'How much do I earn as a courier?',
        answerKa: 'კურიერი იღებს მიწოდების საფასურის 80%-ს. მიწოდების საფასური გამოითვლება მანძილისა და საჭირო ტრანსპორტის მიხედვით.',
        answerEn: 'Couriers receive 80% of the delivery fee. The delivery fee is calculated based on distance and required transport.',
        category: 'couriers',
        order: 2,
      },
      // Payments
      {
        questionKa: 'რა გადახდის მეთოდები არის ხელმისაწვდომი?',
        questionEn: 'What payment methods are available?',
        answerKa: 'ამჟამად ვიღებთ გადახდებს ნებისმიერი ქართული ბანკის ბარათით. მომავალში დავამატებთ სხვა გადახდის მეთოდებსაც.',
        answerEn: 'Currently we accept payments from any Georgian bank card. We will add more payment methods in the future.',
        category: 'payments',
        order: 1,
      },
      {
        questionKa: 'როდის შემიძლია თანხის გამოტანა?',
        questionEn: 'When can I withdraw my funds?',
        answerKa: 'თანხის გამოტანა შეგიძლიათ ნებისმიერ დროს, როდესაც თქვენი ბალანსი აღემატება მინიმალურ გამოტანის ოდენობას (20 ლარი).',
        answerEn: 'You can withdraw funds at any time when your balance exceeds the minimum withdrawal amount (20 GEL).',
        category: 'payments',
        order: 2,
      },
    ];

    await this.faqModel.insertMany(initialFaqs);
    this.logger.log(`Seeded ${initialFaqs.length} initial FAQs`);
  }
}

