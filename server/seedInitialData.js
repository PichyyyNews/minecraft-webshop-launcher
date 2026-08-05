const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = require('./config/db');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Wiki = require('./models/Wiki');
const Card = require('./models/Card');
const PointPackage = require('./models/PointPackage');
const RedeemCode = require('./models/RedeemCode');

const seedData = async () => {
    try {
        await connectDB();
        console.log('--- Starting Initial Data Seeding ---');

        // 1. Seed Categories
        console.log('Seeding Categories...');
        const categoriesData = [
            { name: 'Ranks', description: 'ยศและสิทธิพิเศษสำหรับผู้เล่นในเซิร์ฟเวอร์' },
            { name: 'Weapons & Armor', description: 'อาวุธ ชุดเกราะ และอุปกรณ์ต่อสู้ระดับตำนาน' },
            { name: 'Tools & Utility', description: 'เครื่องมือ อุปกรณ์ฟาร์ม และของอำนวยความสะดวก' },
            { name: 'Special Items', description: 'ไอเทมหายาก บล็อกพิเศษ และของรางวัล' },
            { name: 'Collectibles & Wallpapers', description: 'วอลเปเปอร์ ของสะสม และคอนเทนต์พิเศษ' }
        ];

        for (const cat of categoriesData) {
            await Category.findOneAndUpdate(
                { name: cat.name },
                { $set: cat },
                { upsert: true, new: true }
            );
        }
        console.log('✅ Categories seeded.');

        // 2. Seed Products
        console.log('Seeding Products...');
        const productsData = [
            {
                name: 'VIP Rank (ยศ VIP 30 วัน)',
                description: 'สิทธิพิเศษยศ VIP:\n• ฉายา [VIP] สีทองสุดเท่หน้าชื่อ\n• สามารถใช้คำสั่ง /fly บินในโซนสร้างบ้านได้\n• รับเซ็ตไอเทมเริ่มต้นรายวัน (/kit vip)\n• เข้าเซิร์ฟเวอร์ได้แม้ตอนเซิร์ฟเวอร์เต็ม',
                price: 150,
                category: 'Ranks',
                subcategory: 'ยศหลัก',
                isHide: false,
                sortOrder: 1,
                tag: 'HOT',
                tagColor: '#ffaa00',
                command: 'lp user [player] parent add vip',
                allowGift: true,
                displayType: 'image',
                imageUrl: 'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.1/items/gold_ingot.png'
            },
            {
                name: 'MVP Rank (ยศ MVP ถาวร)',
                description: 'สิทธิพิเศษยศ MVP เหนือระดับ:\n• ฉายา [MVP] สีฟ้าประกายระยิบระยับ\n• คำสั่งพิเศษ /fly, /heal, /hat, /workbench\n• สิทธิ์ขยายพื้นที่เซฟโซนสร้างบ้านเพิ่ม 2 เท่า\n• เอฟเฟกต์ออร่าอนุภาคเมื่อเดิน (/trails)',
                price: 350,
                category: 'Ranks',
                subcategory: 'ยศหลัก',
                isHide: false,
                sortOrder: 2,
                tag: 'POPULAR',
                tagColor: '#00aaaa',
                command: 'lp user [player] parent add mvp',
                allowGift: true,
                displayType: 'image',
                imageUrl: 'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.1/items/nether_star.png'
            },
            {
                name: 'Enchanted Diamond Sword (ดาบเพชรเทพ)',
                description: 'ดาบเพชรลงอาคมในตำนาน:\n• Sharpness V (ความคมกริบระดับ 5)\n• Fire Aspect II (ติดไฟเผาไหม้)\n• Unbreaking III (ความทนทานสูง)\n• Looting III (เพิ่มโอกาสดรอปไอเทม)',
                price: 50,
                category: 'Weapons & Armor',
                subcategory: 'ดาบ',
                isHide: false,
                sortOrder: 3,
                tag: 'SALE',
                tagColor: '#ff5555',
                command: 'give [player] diamond_sword{Enchantments:[{id:"minecraft:sharpness",lvl:5s},{id:"minecraft:fire_aspect",lvl:2s},{id:"minecraft:unbreaking",lvl:3s},{id:"minecraft:looting",lvl:3s}]} 1',
                allowGift: true,
                displayType: 'image',
                imageUrl: 'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.1/items/diamond_sword.png'
            },
            {
                name: 'Netherite Chestplate (เกราะเนเธอร์ไรต์มหาอุตม์)',
                description: 'ชุดเกราะอกเนเธอร์ไรต์ป้องกันสูงสุด:\n• Protection IV (ป้องกันความเสียหายทุกรูปแบบ)\n• Unbreaking III (ความทนทานก้าวหน้า)\n• Mending (ซ่อมแซมอัตโนมัติด้วย XP)',
                price: 120,
                category: 'Weapons & Armor',
                subcategory: 'ชุดเกราะ',
                isHide: false,
                sortOrder: 4,
                tag: 'BEST',
                tagColor: '#aa00aa',
                command: 'give [player] netherite_chestplate{Enchantments:[{id:"minecraft:protection",lvl:4s},{id:"minecraft:unbreaking",lvl:3s},{id:"minecraft:mending",lvl:1s}]} 1',
                allowGift: true,
                displayType: 'image',
                imageUrl: 'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.1/items/netherite_chestplate.png'
            },
            {
                name: 'Enchanted Golden Apple (แอปเปิ้ลทองคำ x64)',
                description: 'อาหารศักดิ์สิทธิ์เพิ่มพลังบัฟขั้นสุดยอด:\n• Absorption IV (เกราะหัวใจทองคำ)\n• Regeneration II (ฟื้นฟูเลือดรวดเร็ว)\n• Fire Resistance & Resistance (ทนไฟและการโจมตี)',
                price: 80,
                category: 'Special Items',
                subcategory: 'ไอเทมพิเศษ',
                isHide: false,
                sortOrder: 5,
                tag: '-20%',
                tagColor: '#55ff55',
                command: 'give [player] enchanted_golden_apple 64',
                allowGift: true,
                displayType: 'image',
                imageUrl: 'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.1/items/enchanted_golden_apple.png'
            },
            {
                name: 'Elytra Wings (ปีกเอลีตราทรงพลัง)',
                description: 'ปีกบินท่องโลกมายคราฟต์ไร้ขีดจำกัด:\n• Unbreaking III\n• Mending (ซ่อมด้วยหลอดประสบการณ์)\nแถมฟรี พลุจุดบินสะท้อนแสง Firework Rockets x64 บล็อก!',
                price: 200,
                category: 'Tools & Utility',
                subcategory: 'อุปกรณ์',
                isHide: false,
                sortOrder: 6,
                tag: 'RARE',
                tagColor: '#55ffff',
                command: 'give [player] elytra{Enchantments:[{id:"minecraft:unbreaking",lvl:3s},{id:"minecraft:mending",lvl:1s}]} 1',
                allowGift: true,
                displayType: 'image',
                imageUrl: 'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.1/items/elytra.png'
            },
            {
                name: 'Beacon & Nether Stars (เซ็ตประภาคารนำทาง)',
                description: 'เซ็ตประภาคาร Beacon และ Nether Star x4 สำหรับสร้างฐานประภาคารเสริมพลัง Speed II, Haste II และ Resistance II ในอาณาเขตบ้านของคุณ',
                price: 250,
                category: 'Special Items',
                subcategory: 'ไอเทมพิเศษ',
                isHide: false,
                sortOrder: 7,
                tag: 'NEW',
                tagColor: '#ff55ff',
                command: 'give [player] beacon 1',
                allowGift: true,
                displayType: 'image',
                imageUrl: 'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.1/blocks/beacon.png'
            },
            {
                name: 'Totem of Undying (เครื่องรางคืนชีพ x5)',
                description: 'เครื่องรางศักดิ์สิทธิ์คุ้มครองชีวิตจากความตาย เมื่อพลังชีวิตเหลือ 0 เครื่องรางจะทำงานทันที คืนชีวิตพร้อมมอบบัฟฟื้นฟูและเกราะดูดซับ!',
                price: 60,
                category: 'Special Items',
                subcategory: 'ไอเทมพิเศษ',
                isHide: false,
                sortOrder: 8,
                tag: 'POPULAR',
                tagColor: '#ffaa00',
                command: 'give [player] totem_of_undying 5',
                allowGift: true,
                displayType: 'image',
                imageUrl: 'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.1/items/totem_of_undying.png'
            },
            {
                name: 'Minecraft Collectibles & Wallpaper Pack 4K',
                description: 'ชุดภาพวอลเปเปอร์ทางการจาก Minecraft Collectibles รวมรูปวาด 4K ภาพฉากหลังไบโอม และคอนเทนต์งานศิลปะสะสมสุดพรีเมียม',
                price: 20,
                category: 'Collectibles & Wallpapers',
                subcategory: 'วอลเปเปอร์',
                isHide: false,
                sortOrder: 9,
                tag: 'OFFICIAL',
                tagColor: '#5555ff',
                command: 'say [player] ได้รับสิทธิ์เข้าถึง Wallpaper Pack เรียบร้อยแล้ว!',
                allowGift: true,
                displayType: 'image',
                imageUrl: 'https://images.unsplash.com/photo-1627856013091-fed6e4e30025?w=800&auto=format&fit=crop'
            }
        ];

        for (const prod of productsData) {
            await Product.findOneAndUpdate(
                { name: prod.name },
                { $set: prod },
                { upsert: true, new: true }
            );
        }
        console.log('✅ Products seeded.');

        // 3. Seed Wiki Articles
        console.log('Seeding Wiki Articles...');
        const wikisData = [
            {
                title: 'Minecraft Official Collectibles & Wallpapers Guide',
                content: `### คอลเลกชันของสะสมและวอลเปเปอร์มายคราฟต์
ยินดีต้อนรับสู่โลกของสะสมและงานศิลปะอย่างเป็นทางการจาก Minecraft! 

#### ไฮไลต์ของสะสมในซีซั่นนี้:
1. **4K Biome Wallpapers**: ภาพฉากหลังความละเอียดสูงครอบคลุมทุ่งหญ้า ป่าซากุระ และมิติเนเธอร์
2. **Character Artwork**: ภาพวาดอาร์ตเวิร์กตัวละครและมอนสเตอร์ทรงพลัง
3. **Soundtrack & Audio Clips**: เพลงประกอบฉากที่รังสรรค์อย่างปราณีต

สามารถสั่งซื้อแพ็กเกจวอลเปเปอร์และของสะสมได้ที่หน้า **Shop** ของเราเลย!`,
                imageUrl: 'https://images.unsplash.com/photo-1627856013091-fed6e4e30025?w=800&auto=format&fit=crop',
                author: 'Minecraft Team'
            },
            {
                title: 'คู่มือเริ่มต้นใช้งาน Webshop & การรับไอเทมในเกม',
                content: `### ขั้นตอนง่ายๆ ในการสั่งซื้อและรับไอเทม

1. **เข้าสู่ระบบ (Login)**: ล็อกอินด้วยชื่อตัวละครเดียวกับที่คุณใช้เล่นในเซิร์ฟเวอร์
2. **เติมเงิน (Top Up)**: เลือกแพ็กเกจพอยท์ตามต้องการผ่านระบบชำระเงิน
3. **เลือกซื้อสินค้า (Shop)**: เลือกสินค้าที่ต้องการแล้วกด **"สั่งซื้อสินค้าทันที"** หรือกดรูปภาพเพื่อดูรายละเอียด popup
4. **รับไอเทมอัตโนมัติ**: ระบบ RCON จะส่งคำสั่งเข้าสู่ตัวละครของคุณในเกมโดยทันที!`,
                imageUrl: 'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.1/items/chest.png',
                author: 'Server Admin'
            },
            {
                title: 'เปรียบเทียบสิทธิประโยชน์ยศ VIP และ MVP',
                content: `### ตารางเปรียบเทียบสิทธิพิเศษระหว่างยศ VIP และ MVP

| สิทธิประโยชน์ | ยศ VIP (150 P) | ยศ MVP (350 P) |
|---|---|---|
| อายุการใช้งาน | 30 วัน | ถาวร |
| บินในเขตสร้างบ้าน (/fly) | ✅ | ✅ |
| รับเซ็ตไอเทมประจำวัน (/kit) | ✅ (ชุดเพชร) | ✅ (ชุดเนเธอร์ไรต์) |
| คำสั่งซ่อมแซมไอเทม (/fix) | ❌ | ✅ |
| อนุภาคออร่าประจำตัว (/trails) | ❌ | ✅ |
| ขยายพื้นที่เซฟโซนสร้างบ้าน | 1 เท่า | 2 เท่า |`,
                imageUrl: 'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.1/items/nether_star.png',
                author: 'Server Staff'
            }
        ];

        for (const wiki of wikisData) {
            await Wiki.findOneAndUpdate(
                { title: wiki.title },
                { $set: wiki },
                { upsert: true, new: true }
            );
        }
        console.log('✅ Wiki articles seeded.');

        // 4. Seed Point Packages
        console.log('Seeding Point Packages...');
        const packagesData = [
            { name: 'Starter Pack', price: 50, points: 50, tag: '', tagColor: '#888888', imageUrl: 'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.1/items/iron_ingot.png' },
            { name: 'Popular Pack', price: 150, points: 165, tag: '+15 Bonus', tagColor: '#ffaa00', imageUrl: 'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.1/items/gold_ingot.png' },
            { name: 'Pro Pack', price: 300, points: 340, tag: 'BEST VALUE', tagColor: '#00aaaa', imageUrl: 'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.1/items/diamond.png' },
            { name: 'Ultimate Pack', price: 500, points: 600, tag: '+100 BONUS', tagColor: '#aa00aa', imageUrl: 'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.1/items/emerald.png' }
        ];

        for (const pkg of packagesData) {
            await PointPackage.findOneAndUpdate(
                { name: pkg.name },
                { $set: pkg },
                { upsert: true, new: true }
            );
        }
        console.log('✅ Point packages seeded.');

        // 5. Seed Gift Cards
        console.log('Seeding Homepage Feature Cards...');
        const cardsData = [
            {
                title: 'Premium Ranks',
                description: 'ปลดล็อกสิทธิพิเศษ คำสั่งพรีเมียม และคิทไอเทมสุดคุ้มเพื่อประสบการณ์การเล่นระดับยอดเยี่ยม',
                color: '#FFAA00',
                imageUrl: 'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.1/items/nether_star.png'
            },
            {
                title: 'Rare Items & Weapons',
                description: 'ครอบครองอาวุธ ชุดเกราะ และอุปกรณ์ทรงพลังที่จะช่วยให้คุณแข็งแกร่งที่สุดในเซิร์ฟเวอร์',
                color: '#55FF55',
                imageUrl: 'https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/1.20.1/items/diamond_sword.png'
            },
            {
                title: 'Collectibles & Wallpapers',
                description: 'ของสะสม อาร์ตเวิร์ก และวอลเปเปอร์ลิขสิทธิ์ความละเอียดสูงสำหรับแฟนมายคราฟต์ตัวจริง',
                color: '#55FFFF',
                imageUrl: 'https://images.unsplash.com/photo-1627856013091-fed6e4e30025?w=800&auto=format&fit=crop'
            }
        ];

        for (const card of cardsData) {
            await Card.findOneAndUpdate(
                { title: card.title },
                { $set: card },
                { upsert: true, new: true }
            );
        }
        console.log('✅ Feature cards seeded.');

        // 6. Seed Redeem Code
        console.log('Seeding Redeem Codes...');
        await RedeemCode.findOneAndUpdate(
            { code: 'WELCOME2026' },
            {
                $set: {
                    code: 'WELCOME2026',
                    rewardType: 'points',
                    points: 100,
                    maxUses: 1000
                }
            },
            { upsert: true, new: true }
        );
        console.log('✅ Redeem Code WELCOME2026 seeded.');

        console.log('🎉 --- Initial Data Seeding Completed Successfully! --- 🎉');
    } catch (error) {
        console.error('❌ Error during seeding:', error);
    } finally {
        mongoose.connection.close();
        process.exit();
    }
};

seedData();
