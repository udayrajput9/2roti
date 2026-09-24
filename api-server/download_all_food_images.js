const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');
const db = require('./src/config/database');

const websiteFoodDir = path.join(__dirname, '../website/public/images/food');
const adminFoodDir = path.join(__dirname, '../admin-web/public/images/food');

if (!fs.existsSync(websiteFoodDir)) fs.mkdirSync(websiteFoodDir, { recursive: true });
if (!fs.existsSync(adminFoodDir)) fs.mkdirSync(adminFoodDir, { recursive: true });

const dishes = [
  // Curries (Main Website)
  { id: 1, name: 'Chicken Curry', file: 'chicken_curry.jpg', url: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&auto=format&fit=crop&q=80' },
  { id: 2, name: 'Vegetable Curry', file: 'vegetable_curry.jpg', url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80' },
  { id: 3, name: 'Paneer Curry', file: 'paneer_curry.jpg', url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80' },
  { id: 4, name: 'Mutton Curry', file: 'mutton_curry.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Odia_Mutton_Curry_%28Mansha_Tarkari%29.jpg' },

  // Thalis (Main Website)
  { id: 5, name: 'Chicken Thali', file: 'chicken_thali.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Chicken_Thali_Kolhapuri.jpg' },
  { id: 6, name: 'Veg Thali', file: 'veg_thali.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/8/8b/North_Indian_Vegetarian_Thali-MB51.jpg' },
  { id: 7, name: 'Paneer Thali', file: 'paneer_thali.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/5/58/Shahi_Paneer_%26_Butter_Naan.jpg' },
  { id: 8, name: 'Mutton Thali', file: 'mutton_thali.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Mutton_Thali%2C_Children%27s_Chicken_Thali_Surmai_Rawa_Fry%2C_Maratha_Samrat_Pune.jpg' },

  // Biryanis (Main Website)
  { id: 9, name: 'Veg Biryani', file: 'veg_biryani.jpg', url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80' },
  { id: 10, name: 'Chicken Biryani', file: 'chicken_biryani.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Hyderabadi_Chicken_Biryani.jpg' },
  { id: 11, name: 'Egg Biryani', file: 'egg_biryani.jpg', url: 'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=600&auto=format&fit=crop&q=80' },

  // Pizzas (Main Website)
  { id: 12, name: 'Paneer Pizza', file: 'paneer_pizza.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/c/c6/Paneer_Tikka_Pizza.jpg' },
  { id: 13, name: 'Onion Pizza', file: 'onion_pizza.jpg', url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&auto=format&fit=crop&q=80' },

  // Outlet Items
  { id: 14, name: 'Mattar Panner', file: 'mattar_paneer.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Matar_Paneer_Curry_1.jpg' },
  { id: 15, name: 'Chawal+roti(pack)', file: 'chawal_roti_pack.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Indian_thali_with_poori_and_rice.jpg' },
  { id: 16, name: 'Tandoori roti', file: 'tandoori_roti.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Butter-tandoori-roti.jpg' },
  { id: 17, name: 'Egg kari', file: 'egg_kari.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/d/de/Egg_curry_pic.jpg' },
  { id: 18, name: 'chicken kari', file: 'chicken_kari.jpg', url: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=80' },
  { id: 19, name: 'mutton kari', file: 'mutton_kari.jpg', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80' },
  { id: 20, name: 'Aalu Paratha', file: 'aalu_paratha.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Aloo_Paratha_North_Indian.jpg' },
  { id: 21, name: 'Lacchha Paratha', file: 'lacchha_paratha.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Lachha-paratha.jpg' },
  { id: 22, name: 'Chola Bhatura(Full)', file: 'chola_bhatura.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Chole_Bhature_from_Nagpur.JPG' },
  { id: 23, name: 'Puri sabji', file: 'puri_sabji.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/5/50/Fluffy_Poori_%28cropped%29.JPG' },
  { id: 24, name: 'Sadi Sabji', file: 'sadi_sabji.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Aloo_Gobi_Sabzi.jpg' },
  { id: 25, name: 'sada Thali', file: 'sada_thali.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Indian_Thali_01.jpg' },
  { id: 26, name: 'Chicken thali (Outlet)', file: 'chicken_thali_outlet.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/d/da/Malwani_Chicken_Thali.jpg' },
  { id: 27, name: 'Fried Rice', file: 'fried_rice.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/7/79/Vegetable_Fried_Rice.jpg' },
  { id: 28, name: 'Chicken Rice', file: 'chicken_rice.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/7/71/Fried_rice_with_chicken_%2817234644521%29.jpg' },
  { id: 29, name: 'Paneer Rice', file: 'paneer_rice.jpg', url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&auto=format&fit=crop&q=80' },
  { id: 30, name: 'Egg Roll', file: 'egg_roll.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/Egg_Roll_1414.JPG' },
  { id: 31, name: 'Chicken Roll', file: 'chicken_roll.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/f/fc/Kolkata_Rolls.jpg' },
  { id: 32, name: 'Paneer Roll', file: 'paneer_roll.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/7/75/Paneer_kathi_roll_homemade.jpg' },
  { id: 33, name: 'Veg Roll', file: 'veg_roll.jpg', url: 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=600&auto=format&fit=crop&q=80' },
  { id: 34, name: 'Veg Biryani (Outlet)', file: 'veg_biryani_outlet.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/5/5a/%22Hyderabadi_Dum_Biryani%22.jpg' },
  { id: 35, name: 'Chicken Biryani (Outlet)', file: 'chicken_biryani_outlet.jpg', url: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=600&auto=format&fit=crop&q=80' },
  { id: 36, name: 'Egg Biryani (Outlet)', file: 'egg_biryani_outlet.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Egg_Curry_2022.jpg' },
  { id: 37, name: 'Paneer Pizza (Outlet)', file: 'paneer_pizza_outlet.jpg', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80' },
  { id: 38, name: 'Onion Pizza (Outlet)', file: 'onion_pizza_outlet.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/8/84/Pizza_with_sausage%2C_onion%2C_pepperoni%2C_olives_and_cheeses.jpg' },
  { id: 39, name: 'Special Paneer Do Pyaza', file: 'special_paneer_do_pyaza.jpg', url: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&auto=format&fit=crop&q=80' },
  { id: 40, name: 'Masala Kulcha', file: 'masala_kulcha.jpg', url: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Chole_Kulcha_Meal_-_Order_Food_Online_in_Mumbai_%2831013272937%29.jpg' }
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TwoRoti/1.0 (contact@2roti.com)',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed with status code: ${res.statusCode} for ${url}`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve());
      });
      file.on('error', err => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}

async function run() {
  console.log(`Starting download of ${dishes.length} distinct authentic food photos...`);

  for (let i = 0; i < dishes.length; i++) {
    const dish = dishes[i];
    const targetFile = path.join(websiteFoodDir, dish.file);
    const adminTargetFile = path.join(adminFoodDir, dish.file);

    try {
      if (!fs.existsSync(targetFile) || fs.statSync(targetFile).size < 5000) {
        process.stdout.write(`[${i + 1}/${dishes.length}] Downloading ${dish.name} -> ${dish.file}... `);
        await downloadFile(dish.url, targetFile);
        console.log(`DONE (${(fs.statSync(targetFile).size / 1024).toFixed(1)} KB)`);
      } else {
        console.log(`[${i + 1}/${dishes.length}] ${dish.name} already exists (${(fs.statSync(targetFile).size / 1024).toFixed(1)} KB).`);
      }

      // Copy to admin-web public folder as well
      fs.copyFileSync(targetFile, adminTargetFile);

      // Update Database
      const localUrl = `/images/food/${dish.file}`;
      await db('menu_items').where('id', dish.id).update({ image_url: localUrl });

      // Polite pause
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error(`\nFailed for ${dish.name}: ${err.message}`);
    }
  }

  console.log('\nAll images downloaded and database successfully updated with local paths!');
  process.exit(0);
}

run();
